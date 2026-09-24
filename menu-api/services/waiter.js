/**
 * Терминал официанта и контроль сервиса для управляющего.
 */
import pool from '../db/pool.js';
import { NOTIFY_TYPES, WAITER_RESPONSE_SLA_MS, WORKFLOW } from '../lib/table-workflow-config.js';
import { addItemsToOrder, createTableOrder, isIikoDemo } from '../iiko-client.js';
import { createWaiterNotification } from './waiter-notifications.js';
import {
  getSessionContext,
  getSessionView,
  httpError,
  lockSession,
  mapSession,
  recalcTotal,
  resolveIikoTableId,
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
export async function updateOrder(sessionId, staff, { items = [], guestCount } = {}) {
  await withTransaction(async (client) => {
    const ctx = await lockSession(client, sessionId);
    assertEditable(ctx, staff);
    const lockedIds = new Set(ctx.items.filter((i) => i.is_locked).map((i) => i.id));

    for (const it of items.filter((i) => i.id && lockedIds.has(i.id))) {
      await client.query(
        'UPDATE table_order_items SET seat_number = $2, course = $3, updated_at = NOW() WHERE id = $1',
        [it.id, it.seatNumber || null, it.course || null],
      );
    }

    await client.query('DELETE FROM table_order_items WHERE session_id = $1 AND is_locked = FALSE', [sessionId]);
    const nextBatch = Math.max(0, ...ctx.items.filter((i) => i.is_locked).map((i) => i.batch_no)) + 1;
    for (const it of items.filter((i) => !(i.id && lockedIds.has(i.id)))) {
      const qty = Math.floor(Number(it.quantity) || 0);
      if (qty <= 0 || !it.iikoProductId) continue;
      if (!/^[0-9a-f-]{36}$/i.test(String(it.iikoProductId))) throw httpError(400, `«${it.name}»: нет ID блюда в iiko`);
      const price = Math.max(0, Number(it.price) || 0);
      await client.query(
        `INSERT INTO table_order_items
           (session_id, product_id, iiko_product_id, name, price, quantity, line_total, seat_number, course, batch_no, is_locked)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,FALSE)`,
        [sessionId, it.productId || null, it.iikoProductId, String(it.name || 'Позиция').slice(0, 300),
          price, qty, price * qty, it.seatNumber || null, it.course || null, nextBatch],
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
         waiter_id = COALESCE(waiter_id, $3), updated_at = NOW()
       WHERE id = $1`,
      [sessionId, gc, staff.id, String(EDIT_LOCK_MS)],
    );
  });
  return getSessionView(sessionId);
}

/**
 * «В работу» (кейс 8): отправить новые позиции в iiko на стол.
 * При ошибке iiko корзина не теряется, официант видит причину и может повторить.
 */
export async function sendToKitchen(sessionId, staff) {
  const ctx = await getSessionContext(sessionId);
  if (!ctx) throw httpError(404, 'Визит не найден');
  assertEditable(ctx, staff);
  const { session, restaurant } = ctx;
  const pending = ctx.items.filter((i) => !i.is_locked);
  if (!pending.length) throw httpError(400, 'Нет новых позиций для отправки');

  const demo = isIikoDemo();
  let iikoOrderId = session.iiko_order_id;
  try {
    // Курс подачи и место гостя уходят в iiko комментарием к позиции (печатается на кухонном чеке);
    // позиции отправляются по порядку курсов
    const delta = [...pending]
      .sort((a, b) => (a.course || 1) - (b.course || 1))
      .map((i) => ({
        productId: i.iiko_product_id,
        amount: i.quantity,
        comment: [i.course ? `Курс ${i.course}` : null, i.seat_number ? `Место ${i.seat_number}` : null].filter(Boolean).join(', ') || undefined,
      }));
    if (!iikoOrderId) {
      let tableId = session.iiko_table_id;
      if (!tableId && !demo) {
        tableId = await resolveIikoTableId(restaurant, session.table_number);
        if (!tableId) throw new Error(`Стол №${session.table_number} не найден в схеме зала iiko`);
        await pool.query('UPDATE table_sessions SET iiko_table_id = $2 WHERE id = $1', [sessionId, tableId]);
      }
      const created = await createTableOrder({
        organizationId: restaurant.organization_id,
        terminalGroupId: restaurant.terminal_group_id,
        tableIds: tableId ? [tableId] : [],
        items: delta,
        guestCount: session.guest_count || 1,
      });
      iikoOrderId = created?.orderInfo?.id || created?.order?.id || created?.id || null;
      if (created?.orderInfo?.creationStatus === 'Error') {
        throw new Error(created.orderInfo.errorInfo?.message || 'iiko отклонил заказ');
      }
      if (!iikoOrderId) throw new Error('iiko не вернул номер заказа');
    } else {
      await addItemsToOrder({ organizationId: restaurant.organization_id, orderId: iikoOrderId, items: delta });
    }
  } catch (e) {
    const reason = e.response?.data?.errorDescription || e.response?.data?.message || e.message || 'Ошибка iiko';
    await pool.query(
      'UPDATE table_sessions SET iiko_last_error = $2, updated_at = NOW() WHERE id = $1',
      [sessionId, reason],
    );
    await createWaiterNotification({
      restaurantId: restaurant.id,
      sessionId,
      tableNumber: session.table_number,
      type: NOTIFY_TYPES.IIKO_ERROR,
      title: `Стол №${session.table_number} — ошибка iiko`,
      body: `${reason}. Корзина сохранена, можно повторить отправку.`,
      payload: { sessionId },
    });
    throw httpError(502, `iiko: ${reason}`, { details: e.response?.data });
  }

  const ids = pending.map((i) => i.id);
  await pool.query(
    `UPDATE table_order_items SET is_locked = TRUE, synced_to_iiko = TRUE, updated_at = NOW()
     WHERE id = ANY($1::uuid[])`,
    [ids],
  );
  await pool.query(
    `UPDATE table_sessions SET iiko_order_id = $2, iiko_last_error = NULL,
       workflow_status = CASE WHEN workflow_status = 'bill_requested' THEN workflow_status ELSE $3 END,
       sent_to_production_at = NOW(), waiter_id = COALESCE(waiter_id, $4),
       locked_by = NULL, locked_until = NULL, wait_notified_at = NULL, updated_at = NOW()
     WHERE id = $1`,
    [sessionId, iikoOrderId, WORKFLOW.IN_PRODUCTION, staff.id],
  );
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
  if (process.env.PAYMENTS_ENABLED !== 'true') {
    throw httpError(403, 'Закрытие заказов из меню отключено — закройте счёт в iiko');
  }
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
