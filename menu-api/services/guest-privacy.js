/**
 * Персональные данные гостя (152-ФЗ): выгрузка («Скачать мои данные»), удаление («Удалить мои данные»)
 * и плановая уборка по срокам хранения.
 *
 * Удаление — одна транзакция. Что остаётся: суммы и состав заказов (бухгалтерия и статистика ресторана), но без связи с человеком:
 * имя стирается, идентификатор гостя заменяется нулевым UUID, чтобы число гостей за столом и доли оплаты не менялись.
 */
import pool from '../db/pool.js';
import { ERASED_GUEST_ID, RETENTION } from '../lib/privacy.js';
import { audit } from './staff-auth.js';

/** Последние 10 цифр номера — так брони из iiko (разный формат записи телефона) сопоставляются с гостем */
const phoneTail = (phone) => String(phone || '').replace(/\D/g, '').slice(-10);
const RESERVE_PHONE_MATCH = "right(regexp_replace(COALESCE(phone, ''), '\\D', '', 'g'), 10) = $1";

/** Визиты гостя: он за столом или оформил визит */
const GUEST_SESSIONS = 'SELECT id FROM table_sessions WHERE guest_id = $1 OR $1 = ANY(guest_ids)';

/** Стереть гостя целиком. Возвращает сводку (без ПДн) или null, если гостя нет. */
export async function eraseGuest(guestId, { reason = 'self' } = {}) {
  const client = await pool.connect();
  let summary = null;
  try {
    await client.query('BEGIN');
    const { rows: [g] } = await client.query('SELECT id, phone, name FROM guests WHERE id = $1 FOR UPDATE', [guestId]);
    if (!g) {
      await client.query('ROLLBACK');
      return null;
    }
    const id = String(g.id);
    const tail = phoneTail(g.phone);
    const count = {};
    const run = async (key, sql, params) => {
      const r = await client.query(sql, params);
      count[key] = r.rowCount;
      return r;
    };

    // Визиты гостя нужны ниже (до того, как guest_id в них обнулится внешним ключом)
    const { rows: sess } = await client.query(GUEST_SESSIONS, [id]);
    const sessionIds = sess.map((s) => s.id);

    await run('items', 'UPDATE table_order_items SET guest_id = $2, guest_name = NULL WHERE guest_id = $1', [id, ERASED_GUEST_ID]);
    await run('payments', `UPDATE table_payments SET
         guest_id = CASE WHEN guest_id = $1::uuid THEN $2::uuid ELSE guest_id END,
         guest_ids = CASE WHEN guest_ids::text LIKE '%' || $1::text || '%' THEN replace(guest_ids::text, $1::text, $2::text)::jsonb ELSE guest_ids END
       WHERE session_id = ANY($3::uuid[]) AND (guest_id = $1::uuid OR guest_ids::text LIKE '%' || $1::text || '%')`,
    [id, ERASED_GUEST_ID, sessionIds]);
    // Визиты: гость в списке заменяется нулевым UUID; запросы счёта и удалённые на кассе позиции — без имён этого гостя
    await run('sessions', `UPDATE table_sessions SET
         guest_ids = array_replace(guest_ids, $1::uuid, $2::uuid),
         bill_requests = COALESCE((SELECT jsonb_agg(
             CASE WHEN e::text LIKE '%' || $1::text || '%'
               THEN (replace(e::text, $1::text, $2::text)::jsonb - 'by' - 'names') || '{"by":null}'::jsonb
               ELSE e END) FROM jsonb_array_elements(bill_requests) e), '[]'::jsonb),
         removed_items = COALESCE((SELECT jsonb_agg(
             CASE WHEN e->>'guestId' = $1::text
               THEN (e - 'guestName') || jsonb_build_object('guestId', $2::text, 'guestName', NULL)
               ELSE e END) FROM jsonb_array_elements(removed_items) e), '[]'::jsonb)
       WHERE id = ANY($3::uuid[])`, [id, ERASED_GUEST_ID, sessionIds]);
    // Отзывы: оценка остаётся для статистики, текст и связь с человеком — нет
    await run('feedback', `UPDATE visit_feedback SET guest_id = NULL, comment = NULL
       WHERE guest_id = $1::uuid OR (guest_id IS NULL AND session_id IN (
         SELECT id FROM table_sessions WHERE guest_ids = ARRAY[$1::uuid] OR (guest_id = $1 AND cardinality(guest_ids) <= 1)))`, [id]);
    // Уведомления персоналу: имя гостя в тексте и в данных
    if (g.name && g.name.trim().length >= 2) {
      await run('notifications', `UPDATE waiter_notifications SET
           title = replace(title, $2, 'Гость'), body = replace(body, $2, 'Гость'),
           payload = CASE WHEN payload IS NULL THEN payload ELSE (payload - 'guestName' - 'phone') END
         WHERE session_id = ANY($1::uuid[])`, [sessionIds, g.name.trim()]);
    } else {
      await run('notifications', `UPDATE waiter_notifications SET payload = (payload - 'guestName' - 'phone')
         WHERE session_id = ANY($1::uuid[]) AND payload IS NOT NULL`, [sessionIds]);
    }
    await run('feedbackNotes', `UPDATE waiter_notifications SET body = 'Отзыв удалён по запросу гостя', payload = (payload - 'comment')
       WHERE session_id = ANY($1::uuid[]) AND type = 'negative_feedback' AND payload IS NOT NULL`, [sessionIds]);
    // Брони по телефону: стираем имя, телефон и комментарий (в них мог быть кто угодно, но по номеру — это он)
    if (tail.length === 10) {
      await run('reservations', `UPDATE reservations SET phone = NULL, guest_name = NULL, comment = NULL, updated_at = NOW()
         WHERE ${RESERVE_PHONE_MATCH}`, [tail]);
      await run('sessionReserves', `UPDATE table_sessions SET reserve_phone = NULL, reserve_guest_name = NULL
         WHERE right(regexp_replace(COALESCE(reserve_phone, ''), '\\D', '', 'g'), 10) = $1`, [tail]);
    }
    await run('push', 'DELETE FROM guest_push_subscriptions WHERE guest_id = $1', [id]);
    await run('tokens', 'DELETE FROM guest_tokens WHERE guest_id = $1', [id]);
    await run('guest', 'DELETE FROM guests WHERE id = $1', [id]); // table_sessions.guest_id → NULL по внешнему ключу
    await client.query('COMMIT');
    summary = { sessions: sessionIds.length, ...count };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
  // Событие без ПДн: кто и что — не пишем, только причина и счётчики
  await audit(null, 'guest.erase', 'guest', null, { reason, ...summary });
  return summary;
}

const iso = (d) => (d ? new Date(d).toISOString() : null);

/** Все данные гостя, которые мы храним о нём. Секретов (ключи push-подписок, токены, данные карты) нет. */
export async function exportGuestData(guestId) {
  const { rows: [g] } = await pool.query('SELECT * FROM guests WHERE id = $1', [guestId]);
  if (!g) return null;
  const id = String(g.id);
  const { rows: visits } = await pool.query(
    `SELECT s.id, s.table_number, s.status, s.payment_status, s.total, s.created_at, s.closed_at, s.paid_at, r.name AS restaurant
     FROM table_sessions s JOIN restaurants r ON r.id = s.restaurant_id
     WHERE s.guest_id = $1 OR $1 = ANY(s.guest_ids)
     ORDER BY s.created_at DESC`,
    [id],
  );
  const ids = visits.map((v) => v.id);
  const [items, payments, feedback, reserves, push] = await Promise.all([
    pool.query(
      `SELECT session_id, name, quantity, price, line_total, created_at, sent_at, options_text
       FROM table_order_items WHERE guest_id = $1 ORDER BY created_at`, [id],
    ),
    pool.query(
      `SELECT session_id, amount, tip_amount, method, status, created_at, paid_at FROM table_payments
       WHERE session_id = ANY($1::uuid[]) AND (guest_id = $2::uuid OR guest_ids::text LIKE '%' || $2::text || '%')
       ORDER BY created_at`, [ids, id],
    ),
    pool.query(
      `SELECT session_id, rating, comment, created_at FROM visit_feedback
       WHERE guest_id = $1 OR (guest_id IS NULL AND session_id = ANY($2::uuid[])
         AND session_id IN (SELECT id FROM table_sessions WHERE guest_ids = ARRAY[$1::uuid]))
       ORDER BY created_at`, [id, ids],
    ),
    phoneTail(g.phone).length === 10
      ? pool.query(
        `SELECT starts_at, table_number, guests_count, guest_name, comment, iiko_status FROM reservations
         WHERE ${RESERVE_PHONE_MATCH} ORDER BY starts_at DESC`, [phoneTail(g.phone)],
      )
      : { rows: [] },
    pool.query('SELECT created_at FROM guest_push_subscriptions WHERE guest_id = $1', [id]),
  ]);
  const by = (rows) => rows.reduce((m, r) => ((m[r.session_id] ||= []).push(r), m), {});
  const itemsBy = by(items.rows);
  const paysBy = by(payments.rows);
  const fbBy = by(feedback.rows);
  return {
    exportedAt: new Date().toISOString(),
    note: 'Данные, которые QR-меню хранит о вас. Данные других гостей за вашим столом сюда не входят.',
    profile: {
      name: g.name, phone: g.phone, allergens: g.allergens || [], fujiAppLinked: Boolean(g.fuji_user_id),
      visitsCount: g.visits_count, lastVisitAt: iso(g.last_visit_at), createdAt: iso(g.created_at),
    },
    consents: {
      personalData: { givenAt: iso(g.consent_at), policyVersion: g.consent_version },
      aiHelper: { given: Boolean(g.ai_consent), changedAt: iso(g.ai_consent_at) },
    },
    visits: visits.map((v) => ({
      id: v.id,
      restaurant: v.restaurant,
      table: v.table_number,
      status: v.status,
      paymentStatus: v.payment_status,
      tableTotal: Number(v.total),
      openedAt: iso(v.created_at),
      closedAt: iso(v.closed_at),
      orders: (itemsBy[v.id] || []).map((i) => ({
        name: i.name, options: i.options_text || null, quantity: i.quantity, price: Number(i.price), sum: Number(i.line_total),
        addedAt: iso(i.created_at), sentAt: iso(i.sent_at),
      })),
      payments: (paysBy[v.id] || []).map((p) => ({
        amount: Number(p.amount), tip: Number(p.tip_amount), method: p.method, status: p.status, createdAt: iso(p.created_at), paidAt: iso(p.paid_at),
      })),
      feedback: (fbBy[v.id] || []).map((f) => ({ rating: f.rating, comment: f.comment, createdAt: iso(f.created_at) })),
    })),
    reservations: reserves.rows.map((r) => ({
      startsAt: iso(r.starts_at), table: r.table_number, guestsCount: r.guests_count, name: r.guest_name, comment: r.comment, status: r.iiko_status,
    })),
    pushSubscriptions: push.rows.map((p) => ({ createdAt: iso(p.created_at) })),
  };
}

/**
 * Уборка по срокам хранения (раз в сутки):
 *  - запросы к ИИ-помощнику (ai_query_log) — 90 дней;
 *  - гости без визитов GUEST_RETENTION_DAYS (3 года) — удаляются как по их запросу;
 *  - брони старше года — стираются имя, телефон и комментарий.
 */
export async function runPrivacyCleanup() {
  const out = { aiQueries: 0, guests: 0, reservations: 0 };
  const { rowCount } = await pool.query("DELETE FROM ai_query_log WHERE created_at < NOW() - ($1 || ' days')::interval", [String(RETENTION.aiQueryLogDays)]);
  out.aiQueries = rowCount;

  // Гость за открытым столом не трогаем, даже если давно не заходил
  const { rows: stale } = await pool.query(
    `SELECT g.id FROM guests g
     WHERE COALESCE(g.last_visit_at, g.created_at) < NOW() - ($1 || ' days')::interval
       AND NOT EXISTS (SELECT 1 FROM table_sessions s WHERE s.status = 'open' AND (s.guest_id = g.id OR g.id = ANY(s.guest_ids)))
     ORDER BY g.created_at LIMIT 500`,
    [String(RETENTION.guestDays)],
  );
  for (const { id } of stale) {
    try {
      if (await eraseGuest(id, { reason: 'retention' })) out.guests += 1;
    } catch (e) {
      console.warn('уборка гостей:', e.message);
    }
  }

  const days = String(RETENTION.reservationDays);
  const r1 = await pool.query(
    `UPDATE reservations SET phone = NULL, guest_name = NULL, comment = NULL
     WHERE starts_at < NOW() - ($1 || ' days')::interval AND (phone IS NOT NULL OR guest_name IS NOT NULL OR comment IS NOT NULL)`, [days],
  );
  out.reservations = r1.rowCount;
  await pool.query(
    `UPDATE table_sessions SET reserve_phone = NULL, reserve_guest_name = NULL
     WHERE created_at < NOW() - ($1 || ' days')::interval AND (reserve_phone IS NOT NULL OR reserve_guest_name IS NOT NULL)`, [days],
  );
  if (out.aiQueries || out.guests || out.reservations) {
    await audit(null, 'privacy.cleanup', 'retention', null, out);
  }
  return out;
}
