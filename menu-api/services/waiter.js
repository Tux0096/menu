/**
 * Терминал официанта и контроль сервиса для управляющего.
 */
import pool from '../db/pool.js';
import { NOTIFY_TYPES, WAITER_RESPONSE_SLA_MS, WORKFLOW } from '../lib/table-workflow-config.js';
import {
  addItemsToOrder, createTableOrder, isIikoDemo, isTerminalGroupError, pickAliveTerminalGroup, withIikoCreds,
} from '../iiko-client.js';
import { createWaiterNotification } from './waiter-notifications.js';
import { getSource, MAIN, productSourceMap } from './sources.js';
import {
  getSessionContext,
  getSessionView,
  httpError,
  lockSession,
  mapSession,
  recalcTotal,
  resolveIikoTableId,
  tableGuests,
  withTransaction,
} from './table-session.js';

const EDIT_LOCK_MS = 2 * 60 * 1000;

export async function listActiveSessions(restaurantId) {
  const { rows } = await pool.query(
    `SELECT id FROM table_sessions
     WHERE restaurant_id = $1
       AND (status = 'open' OR (status = 'paid' AND paid_at > NOW() - INTERVAL '30 minutes'))
     ORDER BY
       CASE workflow_status
         WHEN 'cart_ready' THEN 0 WHEN 'reorder_pending' THEN 0 WHEN 'bill_requested' THEN 1
         WHEN 'waiter_review' THEN 2 WHEN 'in_production' THEN 3 ELSE 4 END,
       updated_at DESC`,
    [restaurantId],
  );
  const result = [];
  for (const row of rows) {
    const ctx = await getSessionContext(row.id);
    if (ctx) result.push(mapSession(ctx));
  }
  return result;
}

function assertEditable(ctx, staff) {
  const { session } = ctx;
  if (session.payment_status === 'paid') throw httpError(409, 'Счёт уже оплачен');
  const lockedByOther = session.locked_by && session.locked_by !== staff.id
    && session.locked_until && new Date(session.locked_until) > new Date();
  if (lockedByOther) throw httpError(409, 'Стол сейчас редактирует другой официант', { code: 'EDIT_LOCKED' });
}

/** Взять стол в работу (блокировка редактирования на 2 минуты). */
export async function takeSession(sessionId, staff) {
  await withTransaction(async (client) => {
    const ctx = await lockSession(client, sessionId);
    assertEditable(ctx, staff);
    await client.query(
      `UPDATE table_sessions SET locked_by = $2, locked_until = NOW() + ($3 || ' milliseconds')::interval,
         waiter_id = COALESCE(waiter_id, $2),
         workflow_status = CASE WHEN workflow_status IN ('cart_ready', 'reorder_pending') THEN 'waiter_review' ELSE workflow_status END,
         updated_at = NOW()
       WHERE id = $1`,
      [sessionId, staff.id, String(EDIT_LOCK_MS)],
    );
  });
  await markSessionNotificationsRead(sessionId);
  return getSessionView(sessionId);
}

/**
 * Официант правит состав (кейс 7): количество гостей, позиции, места (seatNumber), курс подачи.
 * Уже отправленные на кухню позиции не удаляются — только меняется место/курс.
 */
/** Имена мест от официанта: { "3": "Мария" } — место 1–30, имя до 40 символов, пустое — удалить. */
function cleanSeatNames(current, patch) {
  const out = { ...(current || {}) };
  for (const [k, v] of Object.entries(patch || {})) {
    const seat = Math.floor(Number(k));
    if (!(seat >= 1 && seat <= 30)) continue;
    const name = String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
    if (name) out[seat] = name; else delete out[seat];
  }
  return out;
}

export async function updateOrder(sessionId, staff, { items = [], guestCount, seatNames } = {}) {
  await withTransaction(async (client) => {
    const ctx = await lockSession(client, sessionId);
    assertEditable(ctx, staff);
    const lockedIds = new Set(ctx.items.filter((i) => i.is_locked).map((i) => i.id));
    // Место = гость за столом (по порядку присоединения); место без гостя — имя от официанта или номер места
    const guests = tableGuests(ctx);
    const names = seatNames ? cleanSeatNames(ctx.session.seat_names, seatNames) : (ctx.session.seat_names || {});
    const guestOf = (seat) => guests.find((g) => g.seat === Number(seat))
      || (names[Number(seat)] ? { id: null, name: names[Number(seat)] } : null);

    for (const it of items.filter((i) => i.id && lockedIds.has(i.id))) {
      const g = guestOf(it.seatNumber);
      await client.query(
        'UPDATE table_order_items SET seat_number = $2, course = $3, guest_id = $4, guest_name = $5, updated_at = NOW() WHERE id = $1',
        [it.id, it.seatNumber || null, it.course || null, g?.id || null, g?.name || null],
      );
    }

    await client.query('DELETE FROM table_order_items WHERE session_id = $1 AND is_locked = FALSE', [sessionId]);
    const nextBatch = Math.max(0, ...ctx.items.filter((i) => i.is_locked).map((i) => i.batch_no)) + 1;
    const sources = await productSourceMap(ctx.restaurant.id, items.map((i) => i.iikoProductId).filter(Boolean));
    for (const it of items.filter((i) => !(i.id && lockedIds.has(i.id)))) {
      const qty = Math.floor(Number(it.quantity) || 0);
      if (qty <= 0 || !it.iikoProductId) continue;
      if (!/^[0-9a-f-]{36}$/i.test(String(it.iikoProductId))) throw httpError(400, `«${it.name}»: нет ID блюда в iiko`);
      const price = Math.max(0, Number(it.price) || 0);
      await client.query(
        `INSERT INTO table_order_items
           (session_id, product_id, iiko_product_id, name, price, quantity, line_total, seat_number, course, batch_no, is_locked,
            guest_id, guest_name, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,FALSE,$11,$12,$13)`,
        [sessionId, it.productId || null, it.iikoProductId, String(it.name || 'Позиция').slice(0, 300),
          price, qty, price * qty, it.seatNumber || null, it.course || null, nextBatch,
          guestOf(it.seatNumber)?.id || null, guestOf(it.seatNumber)?.name || null,
          sources.get(String(it.iikoProductId)) || 'main'],
      );
    }
    await recalcTotal(client, sessionId);

    const gc = Math.floor(Number(guestCount) || 0);
    await client.query(
      `UPDATE table_sessions SET
         guest_count = CASE WHEN $2 > 0 THEN $2 ELSE guest_count END,
         workflow_status = CASE WHEN workflow_status IN ('browsing','building_cart','cart_ready','reorder_pending')
                                THEN 'waiter_review' ELSE workflow_status END,
         locked_by = $3, locked_until = NOW() + ($4 || ' milliseconds')::interval,
         waiter_id = COALESCE(waiter_id, $3), seat_names = $5::jsonb, updated_at = NOW()
       WHERE id = $1`,
      [sessionId, gc, staff.id, String(EDIT_LOCK_MS), JSON.stringify(names)],
    );
  });
  return getSessionView(sessionId);
}

/** Запомнить рабочую терминальную группу источника и сбросить кэш столов (у другой группы свои ID столов). */
async function saveTerminalGroup(restaurantId, code, terminalGroupId) {
  if (code === MAIN) await pool.query('UPDATE restaurants SET terminal_group_id = $2 WHERE id = $1', [restaurantId, terminalGroupId]);
  else await pool.query('UPDATE restaurant_sources SET terminal_group_id = $3 WHERE restaurant_id = $1 AND code = $2', [restaurantId, code, terminalGroupId]);
  await pool.query(
    `DELETE FROM restaurant_table_cache WHERE restaurant_id = $1 AND ${code === MAIN ? "table_number NOT LIKE '%:%'" : 'table_number LIKE $2'}`,
    code === MAIN ? [restaurantId] : [restaurantId, `${code}:%`],
  );
  console.log(`iiko: терминальная группа ${code === MAIN ? 'кухни' : code} → ${terminalGroupId}`);
}

/**
 * «В работу» (кейс 8): отправить новые позиции в iiko на стол.
 * Позиции делятся по источникам iiko: кухня — в iiko ресторана, алкоголь — в iiko бара
 * (свой заказ на тот же стол). При ошибке одного iiko остальное уходит, не отправленное остаётся
 * в корзине, официант видит причину и может повторить.
 */
export async function sendToKitchen(sessionId, staff) {
  const ctx = await getSessionContext(sessionId);
  if (!ctx) throw httpError(404, 'Визит не найден');
  assertEditable(ctx, staff);
  const { session, restaurant } = ctx;
  const pending = ctx.items.filter((i) => !i.is_locked);
  if (!pending.length) throw httpError(400, 'Нет новых позиций для отправки');

  const demo = isIikoDemo();
  const orders = { ...(session.iiko_orders || {}) };
  if (session.iiko_order_id && !orders[MAIN]) orders[MAIN] = { orderId: session.iiko_order_id, tableId: session.iiko_table_id };
  const groups = new Map();
  for (const i of pending) {
    const code = i.source || MAIN;
    if (!groups.has(code)) groups.set(code, []);
    groups.get(code).push(i);
  }

  const sentIds = [];
  const errors = [];
  for (const [code, items] of groups) {
    const src = await getSource(restaurant, code);
    try {
      await withIikoCreds(src.creds, async () => {
        // Имя гостя, место и курс — комментарием к позиции (печатается на чеке); по порядку курсов
        const delta = [...items]
          .sort((a, b) => (a.course || 1) - (b.course || 1))
          .map((i) => ({
            productId: i.iiko_product_id,
            amount: i.quantity,
            comment: [i.guest_name || null, i.seat_number ? `место ${i.seat_number}` : null, i.course ? `курс ${i.course}` : null]
              .filter(Boolean).join(', ') || undefined,
          }));
        let orderId = orders[code]?.orderId;
        if (!orderId) {
          let tableId = orders[code]?.tableId || (code === MAIN ? session.iiko_table_id : null);
          let terminalGroupId = src.terminal_group_id;
          const resolveTable = async () => {
            if (tableId || demo) return;
            tableId = await resolveIikoTableId(
              { id: restaurant.id, organization_id: src.organization_id, terminal_group_id: terminalGroupId },
              session.table_number, code,
            );
            if (!tableId) throw new Error(`Стол №${session.table_number} не найден в схеме зала iiko`);
          };
          const create = () => createTableOrder({
            organizationId: src.organization_id,
            terminalGroupId,
            tableIds: tableId ? [tableId] : [],
            items: delta,
            guestCount: session.guest_count || 1,
          });
          // Касса должна быть на связи: иначе iiko примет заказ, но он зависнет и не дойдёт до кассы
          if (!demo) {
            const picked = await pickAliveTerminalGroup(src.organization_id, terminalGroupId).catch(() => null);
            if (picked && picked.id && picked.id !== terminalGroupId) {
              terminalGroupId = picked.id;
              await saveTerminalGroup(restaurant.id, code, terminalGroupId);
              tableId = null;
            } else if (picked && !picked.id && picked.list.some((t) => t.id === terminalGroupId && t.isAlive === false)) {
              throw new Error(`Касса ${code === MAIN ? 'кухни' : `«${src.name || code}»`} в iiko не на связи — включите iikoFront на этой кассе и повторите. `
                + `Кассы: ${picked.list.map((t) => `${t.name || t.id}${t.isAlive ? ' — на связи' : t.isAlive === false ? ' — не на связи' : ''}`).join('; ')}`);
            }
          }
          await resolveTable();
          let created;
          try {
            created = await create();
          } catch (e) {
            if (demo || !isTerminalGroupError(e)) throw e;
            // iiko не принял заказ через эту кассу — пробуем другие терминальные группы организации
            const { list } = await pickAliveTerminalGroup(src.organization_id, terminalGroupId);
            const others = list.filter((t) => t.id !== terminalGroupId && t.isAlive !== false)
              .sort((x, y) => Number(Boolean(y.isAlive)) - Number(Boolean(x.isAlive)));
            let lastErr = e;
            const cacheKey = code === MAIN ? String(session.table_number) : `${code}:${session.table_number}`;
            const dropCache = () => pool.query(
              'DELETE FROM restaurant_table_cache WHERE restaurant_id = $1 AND table_number = $2', [restaurant.id, cacheKey],
            );
            const firstGroup = terminalGroupId;
            for (const t of others) {
              try {
                terminalGroupId = t.id;
                tableId = null;
                await dropCache();
                await resolveTable();
                created = await create();
                await saveTerminalGroup(restaurant.id, code, terminalGroupId);
                lastErr = null;
                break;
              } catch (e2) { lastErr = e2; }
            }
            if (lastErr) {
              if (others.length) { terminalGroupId = firstGroup; await dropCache(); }
              const raw = e.response?.data?.errorDescription || e.message || '';
              const names = list.map((t) => `${t.name || t.id}${t.isAlive ? ' — на связи' : t.isAlive === false ? ' — не на связи' : ''}`).join('; ');
              throw new Error(/server version/i.test(raw)
                ? 'iiko Cloud не знает версию сервера iiko этого ресторана («0.0.0») и не принимает заказы на стол (нужна 7.1.5+). '
                  + 'Касса на связи — нужна синхронизация iikoRMS/iikoFront с iiko Cloud: обратитесь в поддержку iiko или к интегратору. '
                  + `Кассы: ${names || 'нет'}`
                : raw);
            }
          }
          if (created?.orderInfo?.creationStatus === 'Error') {
            throw new Error(created.orderInfo.errorInfo?.message || 'iiko отклонил заказ');
          }
          orderId = created?.orderInfo?.id || created?.order?.id || created?.id || null;
          if (!orderId) throw new Error('iiko не вернул номер заказа');
          orders[code] = { orderId, tableId: tableId || null };
        } else {
          await addItemsToOrder({ organizationId: src.organization_id, orderId, items: delta });
        }
      });
      sentIds.push(...items.map((i) => i.id));
    } catch (e) {
      const reason = e.response?.data?.errorDescription || e.response?.data?.message || e.message || 'Ошибка iiko';
      errors.push(groups.size > 1 || code !== MAIN ? `${src.name}: ${reason}` : reason);
    }
  }

  if (sentIds.length) {
    await pool.query(
      `UPDATE table_order_items SET is_locked = TRUE, synced_to_iiko = TRUE, sent_at = NOW(), kitchen_status = COALESCE(kitchen_status, 'Added'), updated_at = NOW()
       WHERE id = ANY($1::uuid[])`,
      [sentIds],
    );
  }
  const errorText = errors.length ? errors.join('; ') : null;
  await pool.query(
    `UPDATE table_sessions SET iiko_orders = $2, iiko_order_id = COALESCE($3, iiko_order_id),
       iiko_table_id = COALESCE($4, iiko_table_id), iiko_last_error = $5,
       workflow_status = CASE WHEN $6 AND workflow_status <> 'bill_requested' THEN $7 ELSE workflow_status END,
       sent_to_production_at = CASE WHEN $6 THEN NOW() ELSE sent_to_production_at END,
       waiter_id = COALESCE(waiter_id, $8),
       locked_by = CASE WHEN $6 AND $5::text IS NULL THEN NULL ELSE locked_by END,
       locked_until = CASE WHEN $6 AND $5::text IS NULL THEN NULL ELSE locked_until END,
       wait_notified_at = NULL, updated_at = NOW()
     WHERE id = $1`,
    [sessionId, JSON.stringify(orders), orders[MAIN]?.orderId || null, orders[MAIN]?.tableId || null,
      errorText, sentIds.length > 0, WORKFLOW.IN_PRODUCTION, staff.id],
  );
  if (errors.length) {
    await createWaiterNotification({
      restaurantId: restaurant.id,
      sessionId,
      tableNumber: session.table_number,
      type: NOTIFY_TYPES.IIKO_ERROR,
      title: `Стол №${session.table_number} — ошибка iiko`,
      body: `${errorText}.${sentIds.length ? ' Остальное отправлено.' : ''} Не отправленное сохранено, можно повторить.`,
      payload: { sessionId },
    });
    throw httpError(502, `iiko: ${errorText}${sentIds.length ? ' (остальные позиции отправлены)' : ''}`);
  }
  await markSessionNotificationsRead(sessionId);
  return getSessionView(sessionId);
}

export async function releaseSession(sessionId, staff) {
  await pool.query(
    'UPDATE table_sessions SET locked_by = NULL, locked_until = NULL WHERE id = $1 AND locked_by = $2',
    [sessionId, staff.id],
  );
  return getSessionView(sessionId);
}

/** Официант принял оплату на своём терминале / закрыл стол. */
export async function closeSession(sessionId, staff) {
  // Стол закрывается только в меню (заказы iiko не трогаем — счёт закрыт на кассе)
  await pool.query(
    `UPDATE table_sessions SET
       status = CASE WHEN payment_status = 'paid' THEN 'closed' ELSE 'closed' END,
       workflow_status = CASE WHEN payment_status = 'paid' THEN 'paid' ELSE 'closed' END,
       closed_at = NOW(), locked_by = NULL, locked_until = NULL, updated_at = NOW()
     WHERE id = $1`,
    [sessionId],
  );
  await markSessionNotificationsRead(sessionId);
  return getSessionView(sessionId);
}

async function markSessionNotificationsRead(sessionId) {
  await pool.query(
    'UPDATE waiter_notifications SET is_read = TRUE WHERE session_id = $1 AND is_read = FALSE',
    [sessionId],
  );
}

// ── Контроль сервиса (управляющий) ──────────────────────────────────────────

export async function getHallDashboard(restaurantId) {
  const sessions = await listActiveSessions(restaurantId);
  const open = sessions.filter((s) => s.status === 'open');

  const { rows: [today] } = await pool.query(
    `SELECT
       COUNT(*)::int AS visits,
       COUNT(*) FILTER (WHERE sent_to_production_at IS NOT NULL)::int AS orders,
       COUNT(*) FILTER (WHERE payment_status = 'paid')::int AS paid,
       COALESCE(SUM(total) FILTER (WHERE sent_to_production_at IS NOT NULL), 0)::float AS revenue,
       COALESCE(AVG(EXTRACT(EPOCH FROM (sent_to_production_at - cart_ready_at)) / 60)
         FILTER (WHERE sent_to_production_at IS NOT NULL AND cart_ready_at IS NOT NULL
                 AND sent_to_production_at >= cart_ready_at), 0)::float AS avg_response_min
     FROM table_sessions
     WHERE restaurant_id = $1 AND created_at::date = CURRENT_DATE`,
    [restaurantId],
  );
  const { rows: [pay] } = await pool.query(
    `SELECT COALESCE(SUM(p.amount), 0)::float AS paid_sum, COALESCE(SUM(p.tip_amount), 0)::float AS tips
     FROM table_payments p JOIN table_sessions s ON s.id = p.session_id
     WHERE s.restaurant_id = $1 AND p.created_at::date = CURRENT_DATE AND p.status = 'completed'`,
    [restaurantId],
  );
  const { rows: [fb] } = await pool.query(
    `SELECT COUNT(*)::int AS count, COALESCE(AVG(f.rating), 0)::float AS avg,
            COUNT(*) FILTER (WHERE f.rating <= 3)::int AS low
     FROM visit_feedback f JOIN table_sessions s ON s.id = f.session_id
     WHERE s.restaurant_id = $1 AND f.created_at > NOW() - INTERVAL '30 days'`,
    [restaurantId],
  );
  const { rows: calls } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM waiter_notifications
     WHERE restaurant_id = $1 AND is_read = FALSE AND type IN ('call_waiter', 'bill_requested', 'wait_too_long')`,
    [restaurantId],
  );
  const { rows: waiters } = await pool.query(
    `SELECT u.name, COUNT(s.id)::int AS tables,
            COALESCE(SUM(s.total), 0)::float AS revenue,
            COALESCE(AVG(f.rating), 0)::float AS rating,
            COALESCE(SUM(p.tip_amount), 0)::float AS tips
     FROM table_sessions s
     JOIN staff_users u ON u.id = s.waiter_id
     LEFT JOIN visit_feedback f ON f.session_id = s.id
     LEFT JOIN table_payments p ON p.session_id = s.id AND p.status = 'completed'
     WHERE s.restaurant_id = $1 AND s.created_at::date = CURRENT_DATE
     GROUP BY u.name ORDER BY revenue DESC`,
    [restaurantId],
  );

  return {
    slaMinutes: Math.round(WAITER_RESPONSE_SLA_MS / 60000),
    activeTables: open.length,
    overdueTables: open.filter((s) => s.isOverdue).length,
    waitingTables: open.filter((s) => ['cart_ready', 'reorder_pending', 'bill_requested'].includes(s.workflowStatus)).length,
    openCalls: calls[0].n,
    today: {
      ...today,
      paidSum: pay.paid_sum,
      tips: pay.tips,
      avgCheck: today.orders ? Math.round(today.revenue / today.orders) : 0,
    },
    feedback30d: fb,
    waiters,
    sessions,
  };
}
