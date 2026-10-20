/**
 * Брони столов (из iiko, только чтение) и визиты под них.
 *
 * Брони загружает services/iiko-reserves.js (upsertReserves). Здесь — всё, что делается с ними у нас:
 *  — ко времени брони создаётся визит без официанта (waiter_id = NULL, «Общие столы») с именем, телефоном и числом гостей;
 *  — стол занят прежними гостями — второй визит не создаём, запоминаем конфликт и показываем официанту;
 *  — бронь отменена, а гостей нет — визит закрывается; гость не пришёл — уведомление и пометка «не пришли»;
 *  — гость сканирует QR и входит за стол (enterTable) → «Пришли гости по брони», в карточке стола «пришли»;
 *  — список броней и поиск по имени для официанта и админки.
 * Модуль не импортирует table-session.js (его enterTable вызывает arriveByQr отсюда).
 */
import pool from '../db/pool.js';
import { uuidOrNull } from '../lib/uuid.js';
import { httpError } from '../lib/http.js';
import {
  RESERVE_TZ, STATE_LABELS, clockText, formatPhone, maskPhone, planReserve, reserveSettings, reserveState, reserveTexts,
  reserveWindow, searchReserves,
} from '../lib/iiko-reserve-sync.js';
import { withSessionMutex } from '../lib/session-mutex.js';
import { NOTIFY_TYPES } from '../lib/table-workflow-config.js';
import { createWaiterNotification } from './waiter-notifications.js';

// ── Загрузка из iiko ────────────────────────────────────────────────────────

/** Стол брони у нас: первый из столов iiko, который есть в схеме QR точки. */
function ourTables(restaurant, iikoTableIds, tableMap) {
  const numbers = [];
  for (const id of iikoTableIds) {
    const n = tableMap.get(String(id));
    if (!n || numbers.includes(n)) continue;
    if (/^\d+$/.test(n) && restaurant.tables_count && Number(n) > restaurant.tables_count) continue; // стола нет в схеме QR
    numbers.push(n);
  }
  return numbers;
}

/**
 * Сохранить брони точки (normalizeReserve → таблица reservations). Наши отметки (стол создан, пришли, не пришли)
 * не затираются; стол и время брони подхватываются из iiko, пока под неё не создан визит.
 */
export async function upsertReserves(restaurant, list, tableMap) {
  let saved = 0;
  for (const r of list) {
    const tables = ourTables(restaurant, r.tableIds, tableMap);
    await pool.query(
      `INSERT INTO reservations
         (restaurant_id, iiko_reserve_id, starts_at, duration_min, table_number, table_numbers, iiko_table_ids,
          guest_name, phone, guests_count, comment, iiko_status, seen_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11, $12, NOW())
       ON CONFLICT (restaurant_id, iiko_reserve_id) DO UPDATE SET
         starts_at = EXCLUDED.starts_at,
         duration_min = EXCLUDED.duration_min,
         table_number = CASE WHEN reservations.table_created_at IS NULL THEN EXCLUDED.table_number ELSE reservations.table_number END,
         table_numbers = EXCLUDED.table_numbers,
         iiko_table_ids = EXCLUDED.iiko_table_ids,
         guest_name = EXCLUDED.guest_name,
         phone = COALESCE(EXCLUDED.phone, reservations.phone),
         guests_count = EXCLUDED.guests_count,
         comment = EXCLUDED.comment,
         -- статус неизвестен (iiko его не прислал) — оставляем прежний, кроме «отменена → снова действует»
         iiko_status = CASE WHEN $13::boolean OR EXCLUDED.iiko_status <> 'new' THEN EXCLUDED.iiko_status
                            WHEN reservations.iiko_status = 'cancelled' THEN 'new' ELSE reservations.iiko_status END,
         seen_at = NOW(), updated_at = NOW()`,
      [restaurant.id, r.id, r.startsAt, r.durationMin, tables[0] || null, JSON.stringify(tables), JSON.stringify(r.tableIds),
        r.guestName || null, r.phone, r.guestsCount, r.comment || null, r.status, r.statusKnown],
    );
    saved++;
  }
  return saved;
}

/**
 * Брони, которых больше нет в ответе iiko (удалены), считаем отменёнными — но не сразу: бронь должна пропасть
 * из нескольких опросов подряд (staleMin минут), один неполный ответ ничего не отменяет.
 */
export async function cancelMissing(restaurantId, window, { staleMin = 4 } = {}) {
  const { rowCount } = await pool.query(
    `UPDATE reservations SET iiko_status = 'cancelled', updated_at = NOW()
     WHERE restaurant_id = $1 AND iiko_status = 'new' AND starts_at >= $2 AND starts_at < $3
       AND seen_at < NOW() - ($4 || ' minutes')::interval`,
    [restaurantId, window.from, window.to, String(staleMin)],
  );
  return rowCount;
}

/** Обновить статус брони по данным status_by_id (New / Started / Closed / отмена). */
export async function applyStatuses(restaurantId, list) {
  for (const r of list) {
    if (!r.statusKnown) continue;
    await pool.query(
      'UPDATE reservations SET iiko_status = $3, updated_at = NOW() WHERE restaurant_id = $1 AND iiko_reserve_id = $2 AND iiko_status <> $3',
      [restaurantId, r.id, r.status],
    );
  }
}

// ── Визиты под брони ────────────────────────────────────────────────────────

const rowToReserve = (r) => ({
  id: r.id,
  status: r.iiko_status,
  startsAt: r.starts_at,
  endsAt: new Date(new Date(r.starts_at).getTime() + (r.duration_min || 120) * 60_000),
  arrivedAt: r.arrived_at,
  noShowAt: r.no_show_at,
  tableCreatedAt: r.table_created_at,
  tableNumber: r.table_number,
  conflictNotifiedAt: r.conflict_notified_at,
  guestName: r.guest_name,
  guestsCount: r.guests_count,
});

/** Открытый визит на столе брони с признаками для planReserve: пустой ли он и не брошен ли прежней бронью. */
async function occupant(restaurantId, table) {
  const { rows } = await pool.query(
    `SELECT s.id, s.reservation_id,
       (cardinality(s.guest_ids) = 0 AND s.iiko_order_id IS NULL AND s.iiko_orders = '{}'::jsonb AND NOT s.opened_in_iiko
         AND NOT EXISTS (SELECT 1 FROM table_order_items i WHERE i.session_id = s.id)
         AND NOT EXISTS (SELECT 1 FROM reservations a WHERE a.id = s.reservation_id AND a.arrived_at IS NOT NULL)) AS empty,
       EXISTS (SELECT 1 FROM reservations o WHERE o.id = s.reservation_id AND o.no_show_at IS NOT NULL AND o.arrived_at IS NULL) AS stale_no_show
     FROM table_sessions s
     WHERE s.restaurant_id = $1 AND s.table_number = $2 AND s.status = 'open' LIMIT 1`,
    [restaurantId, String(table)],
  );
  const s = rows[0];
  return s ? { id: s.id, reservationId: s.reservation_id, empty: s.empty, staleNoShow: s.stale_no_show } : null;
}

async function closeVisit(sessionId) {
  await pool.query(
    `UPDATE table_sessions SET status = 'closed', workflow_status = 'closed', closed_at = NOW(),
       locked_by = NULL, locked_until = NULL, updated_at = NOW()
     WHERE id = $1 AND status = 'open'`,
    [sessionId],
  );
  await pool.query('UPDATE waiter_notifications SET is_read = TRUE WHERE session_id = $1 AND is_read = FALSE', [sessionId]);
}

async function notify(row, session, type, body, payload = {}) {
  const texts = reserveTexts({ ...rowToReserve(row), guestName: row.guest_name, guestsCount: row.guests_count, tableNumber: row.table_number });
  await createWaiterNotification({
    restaurantId: row.restaurant_id,
    sessionId: session?.id || row.session_id || null,
    tableNumber: row.table_number,
    type,
    title: texts.title,
    body: body(texts),
    payload: { reservationId: row.id, sessionId: session?.id || row.session_id || null, ...payload },
  });
}

/**
 * Создать визит под бронь: без официанта (waiter_id = NULL — «Общие столы»), с именем, телефоном и числом гостей.
 * null — стол успели занять (гость отсканировал QR раньше): вызывающий разберёт как конфликт.
 */
async function createVisit(row, { arrivedBy = null } = {}) {
  const { rows } = await pool.query(
    `INSERT INTO table_sessions (restaurant_id, table_number, workflow_status, guest_count, reservation_id, reserve_guest_name, reserve_phone, waiter_id)
     VALUES ($1, $2, 'browsing', $3, $4, $5, $6, NULL)
     ON CONFLICT (restaurant_id, table_number) WHERE status = 'open' DO NOTHING
     RETURNING *`,
    [row.restaurant_id, row.table_number, row.guests_count || 1, row.id, row.guest_name || null, row.phone || null],
  );
  const session = rows[0];
  if (!session) return null;
  await pool.query(
    `UPDATE reservations SET session_id = $2, table_created_at = NOW(), conflict_session_id = NULL, conflict_at = NULL,
       arrived_at = CASE WHEN $3::text IS NOT NULL THEN COALESCE(arrived_at, NOW()) ELSE arrived_at END,
       arrived_by = CASE WHEN $3::text IS NOT NULL THEN COALESCE(arrived_by, $3) ELSE arrived_by END,
       updated_at = NOW()
     WHERE id = $1`,
    [row.id, session.id, arrivedBy],
  );
  return session;
}

/** Решение по одной брони (под очередью стола: параллельно с импортом заказов с кассы и входом гостя). */
async function processOne(row, now) {
  const { leadMin, noShowMin } = reserveSettings();
  return withSessionMutex(`import:${row.restaurant_id}:${row.table_number || row.id}`, async () => {
    const session = row.table_number ? await occupant(row.restaurant_id, row.table_number) : null;
    const plan = planReserve({ reserve: rowToReserve(row), session, now, leadMs: leadMin * 60_000, noShowMs: noShowMin * 60_000 });
    if (plan.action === 'replace') {
      // прежняя бронь не пришла, её пустой визит держит стол — освобождаем и создаём новый
      await closeVisit(session.id);
      plan.action = 'create';
    }
    switch (plan.action) {
      case 'create': {
        const created = await createVisit(row, { arrivedBy: row.iiko_status === 'started' ? 'iiko' : null });
        if (!created) return 'conflict';
        console.log(`бронь: стол ${row.table_number} — визит создан под бронь`);
        if (row.iiko_status !== 'started') await notify(row, created, NOTIFY_TYPES.RESERVATION, (t) => t.created);
        return 'create';
      }
      case 'conflict':
        await pool.query(
          `UPDATE reservations SET conflict_session_id = $2, conflict_at = COALESCE(conflict_at, NOW()),
             conflict_notified_at = COALESCE(conflict_notified_at, NOW()), updated_at = NOW() WHERE id = $1`,
          [row.id, session.id],
        );
        if (plan.notify) await notify(row, session, NOTIFY_TYPES.RESERVATION_CONFLICT, (t) => t.conflict, { conflictSessionId: session.id });
        return 'conflict';
      case 'close':
      case 'expire':
        await closeVisit(session.id);
        console.log(`бронь: стол ${row.table_number} — пустой визит закрыт (${plan.action === 'close' ? 'бронь отменена' : 'гости не пришли'})`);
        return plan.action;
      case 'no_show': {
        const { rows } = await pool.query(
          'UPDATE reservations SET no_show_at = NOW(), updated_at = NOW() WHERE id = $1 AND no_show_at IS NULL AND arrived_at IS NULL RETURNING id',
          [row.id],
        );
        if (rows[0]) await notify(row, session, NOTIFY_TYPES.RESERVATION_NO_SHOW, (t) => t.noShow);
        return 'no_show';
      }
      case 'arrive_iiko':
        await pool.query("UPDATE reservations SET arrived_at = COALESCE(arrived_at, NOW()), arrived_by = COALESCE(arrived_by, 'iiko'), updated_at = NOW() WHERE id = $1", [row.id]);
        return 'arrive_iiko';
      default:
        return 'none';
    }
  });
}

/** Пройти по броням точки: создать столы, закрыть отменённые, отметить «не пришли». Возвращает счётчик действий. */
export async function processReserves(restaurantId, now = Date.now()) {
  const { rows } = await pool.query(
    `SELECT * FROM reservations
     WHERE restaurant_id = $1 AND starts_at > NOW() - INTERVAL '12 hours' AND starts_at < NOW() + INTERVAL '1 day'
       AND (iiko_status IN ('new', 'started') OR session_id IS NOT NULL)
     ORDER BY starts_at`,
    [restaurantId],
  );
  const stats = {};
  for (const row of rows) {
    try {
      const a = await processOne(row, now);
      if (a !== 'none') stats[a] = (stats[a] || 0) + 1;
    } catch (e) {
      console.warn(`бронь ${row.id}:`, e.message);
    }
  }
  return stats;
}

// ── Гость пришёл ────────────────────────────────────────────────────────────

/**
 * Первый гость вошёл за стол по QR (enterTable). Если визит создан под бронь и «пришли» ещё не отмечено —
 * отмечаем и шлём уведомление «Пришли гости по брони». true — это было прибытие брони (обычное «гость за столом» не шлём).
 */
export async function arriveByQr(session) {
  if (!session?.reservation_id) return false;
  const { rows } = await pool.query(
    `UPDATE reservations SET arrived_at = NOW(), arrived_by = 'qr', updated_at = NOW()
     WHERE id = $1 AND arrived_at IS NULL RETURNING *`,
    [session.reservation_id],
  );
  if (!rows[0]) return false;
  await notify(rows[0], session, NOTIFY_TYPES.RESERVATION_ARRIVED, (t) => t.arrived);
  return true;
}

async function loadReserve(restaurantId, id) {
  const { rows } = await pool.query('SELECT * FROM reservations WHERE id = $1 AND restaurant_id = $2', [uuidOrNull(id), restaurantId]);
  if (!rows[0]) throw httpError(404, 'Бронь не найдена');
  return rows[0];
}

/**
 * Посадить сейчас: открыть стол брони досрочно. Визит уже есть — вернуть его; стола ещё нет — создать (без официанта);
 * стол занят другими гостями — 409 с ID их визита, чтобы официант увидел, кто там сидит.
 * arrived=true — заодно отметить «гости пришли» (сели без QR).
 */
export async function seatReservation(restaurantId, id, { arrived = false } = {}) {
  const row = await loadReserve(restaurantId, id);
  if (row.iiko_status === 'cancelled') throw httpError(409, 'Бронь отменена в iiko', { code: 'RESERVE_CANCELLED' });
  if (!row.table_number) throw httpError(409, 'У брони нет стола из нашей схемы — рассадите гостей вручную («+ Открыть стол»)', { code: 'NO_TABLE' });
  return withSessionMutex(`import:${row.restaurant_id}:${row.table_number}`, async () => {
    const session = await occupant(row.restaurant_id, row.table_number);
    let sessionId = session?.id;
    if (session && String(session.reservationId) !== String(row.id)) {
      throw httpError(409, `Стол ${row.table_number} занят другими гостями`, { code: 'TABLE_BUSY', details: { sessionId: session.id } });
    }
    if (!session) {
      const created = await createVisit(row, { arrivedBy: arrived ? 'waiter' : null });
      if (!created) throw httpError(409, `Стол ${row.table_number} только что заняли`, { code: 'TABLE_BUSY' });
      sessionId = created.id;
      console.log(`бронь: стол ${row.table_number} — посажены досрочно`);
    } else if (arrived) {
      await pool.query("UPDATE reservations SET arrived_at = COALESCE(arrived_at, NOW()), arrived_by = COALESCE(arrived_by, 'waiter'), updated_at = NOW() WHERE id = $1", [row.id]);
    }
    return { sessionId, tableNumber: row.table_number };
  });
}

/** Официант вручную отметил «Гости пришли» (сели без QR). */
export const markArrived = (restaurantId, id) => seatReservation(restaurantId, id, { arrived: true });

// ── Списки и поиск ──────────────────────────────────────────────────────────

/** Бронь для API: телефон только в маске (полный — отдельным запросом по нажатию «показать»). */
function toApi(r, now) {
  const reserve = {
    startsAt: r.starts_at, status: r.iiko_status, arrivedAt: r.arrived_at, noShowAt: r.no_show_at,
    sessionId: r.open_session_id, tableCreatedAt: r.table_created_at,
  };
  const state = reserveState(reserve, now);
  const tables = r.table_numbers || [];
  return {
    id: r.id,
    time: clockText(r.starts_at, RESERVE_TZ),
    startsAt: r.starts_at,
    endsAt: new Date(new Date(r.starts_at).getTime() + (r.duration_min || 120) * 60_000),
    durationMin: r.duration_min,
    guestName: r.guest_name || '',
    guests: r.guests_count,
    table: r.table_number,
    tables,
    phoneMasked: maskPhone(r.phone),
    hasPhone: Boolean(r.phone),
    comment: r.comment || '',
    iikoStatus: r.iiko_status,
    state,
    stateLabel: STATE_LABELS[state],
    sessionId: r.open_session_id || null,
    tableCreated: Boolean(r.table_created_at),
    // Стол брони занят прежними гостями: показываем, пока они не ушли
    conflict: Boolean(r.conflict_at) && !r.open_session_id && r.iiko_status !== 'cancelled' && !r.arrived_at,
    conflictSessionId: r.conflict_session_id || null,
    canSeat: Boolean(r.table_number) && r.iiko_status !== 'cancelled',
  };
}

/** Брони точки на сегодня (рабочие сутки) по времени; q — поиск по имени гостя. */
export async function listReserves(restaurantId, { q = '', now = new Date() } = {}) {
  const w = reserveWindow(now);
  const { rows } = await pool.query(
    `SELECT r.*, (SELECT s.id FROM table_sessions s WHERE s.id = r.session_id AND s.status = 'open') AS open_session_id,
            (SELECT c.id FROM table_sessions c WHERE c.id = r.conflict_session_id AND c.status = 'open') AS open_conflict_id
     FROM reservations r
     WHERE r.restaurant_id = $1 AND r.starts_at >= $2 AND r.starts_at < $3
     ORDER BY r.starts_at, r.guest_name`,
    [restaurantId, w.from, w.to],
  );
  // конфликт показываем, только пока чужой визит ещё открыт
  const prepared = rows.map((r) => ({ ...r, conflict_at: r.open_conflict_id ? r.conflict_at : null }));
  const found = searchReserves(prepared.map((r) => ({ ...r, guestName: r.guest_name, phone: r.phone, startsAt: r.starts_at })), q);
  const items = found.map((f) => ({ ...toApi(f, now), sameName: f.sameName }));
  return { items, query: q, sameNames: [...new Set(items.filter((i) => i.sameName).map((i) => i.guestName))] };
}

/** Полный телефон брони — по нажатию «показать». */
export async function reservePhone(restaurantId, id) {
  const row = await loadReserve(restaurantId, id);
  return { phone: row.phone ? formatPhone(row.phone) : '' };
}
