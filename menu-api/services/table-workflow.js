import pool from '../db/pool.js';
import { QR_RESTAURANT_SLUG } from '../lib/qr-config.js';
import { IDLE_REMINDER_MS, NOTIFY_TYPES, WORKFLOW } from '../lib/table-workflow-config.js';
import {
  addItemsToOrder,
  createTableOrder,
  changeOrderPayments,
} from '../iiko-client.js';
import { createWaiterNotification } from './waiter-notifications.js';
import {
  enterTableSession,
  getSessionById,
  refreshSessionFromIiko,
  resolveIikoTableIdForRestaurant,
} from './table-order.js';

async function getRestaurant() {
  const { rows } = await pool.query(
    `SELECT * FROM restaurants WHERE slug = $1 AND is_disabled = FALSE`,
    [QR_RESTAURANT_SLUG],
  );
  return rows[0] || null;
}

function mapItem(row) {
  return {
    id: row.id,
    productId: row.product_id,
    iikoProductId: row.iiko_product_id,
    name: row.name,
    price: parseFloat(row.price),
    quantity: row.quantity,
    lineTotal: parseFloat(row.line_total),
    seatNumber: row.seat_number || null,
    isLocked: row.is_locked,
  };
}

export async function mapSessionFull(sessionId) {
  const ctx = await getSessionById(sessionId);
  if (!ctx) return null;
  const { session, restaurant } = ctx;
  const { rows: items } = await pool.query(
    `SELECT * FROM table_order_items WHERE session_id = $1 ORDER BY created_at`,
    [sessionId],
  );
  const workflowStatus = session.workflow_status || WORKFLOW.BROWSING;
  return {
    sessionId: session.id,
    restaurantSlug: restaurant.slug,
    restaurantName: restaurant.name,
    restaurantAddress: restaurant.address,
    tableNumber: session.table_number,
    iikoOrderId: session.iiko_order_id,
    status: session.status,
    paymentStatus: session.payment_status,
    workflowStatus,
    guestCount: session.guest_count || 1,
    total: parseFloat(session.total || 0),
    cartReadyAt: session.cart_ready_at,
    sentToProductionAt: session.sent_to_production_at,
    canGuestRemoveItems: !['in_production', 'reorder_pending', 'paid'].includes(workflowStatus),
    canGuestPay: ['in_production', 'reorder_pending', 'cart_ready', 'waiter_review'].includes(workflowStatus)
      && session.payment_status !== 'paid',
    items: items.map(mapItem),
  };
}

async function touchGuestActivity(sessionId, workflowHint = null) {
  const sets = ['last_guest_activity_at = NOW()', 'updated_at = NOW()'];
  const params = [sessionId];
  if (workflowHint) {
    sets.push(`workflow_status = $2`);
    params.push(workflowHint);
  }
  await pool.query(
    `UPDATE table_sessions SET ${sets.join(', ')} WHERE id = $1`,
    params,
  );
}

export async function notifyMenuOpened(sessionId) {
  const ctx = await getSessionById(sessionId);
  if (!ctx) return null;
  const { session, restaurant } = ctx;
  if (session.menu_opened_notified) {
    await touchGuestActivity(sessionId);
    return mapSessionFull(sessionId);
  }
  await pool.query(
    `UPDATE table_sessions SET
       menu_opened_at = NOW(),
       menu_opened_notified = TRUE,
       last_guest_activity_at = NOW(),
       workflow_status = $2,
       updated_at = NOW()
     WHERE id = $1`,
    [sessionId, WORKFLOW.BROWSING],
  );
  await createWaiterNotification({
    restaurantId: restaurant.id,
    sessionId,
    tableNumber: session.table_number,
    type: NOTIFY_TYPES.MENU_OPENED,
    title: `Стол №${session.table_number}`,
    body: 'начал изучение меню',
    payload: { sessionId },
  });
  return mapSessionFull(sessionId);
}

export async function trackGuestActivity(sessionId) {
  const ctx = await getSessionById(sessionId);
  if (!ctx) return null;
  const wf = ctx.session.workflow_status;
  const next = wf === WORKFLOW.BROWSING ? WORKFLOW.BUILDING_CART : wf;
  await touchGuestActivity(sessionId, next === wf ? null : next);
  await checkIdleReminder(sessionId);
  return mapSessionFull(sessionId);
}

export async function checkIdleReminder(sessionId) {
  const ctx = await getSessionById(sessionId);
  if (!ctx) return;
  const { session, restaurant } = ctx;
  if (!['browsing', 'building_cart'].includes(session.workflow_status)) return;
  if (session.idle_notified_at) return;
  if (session.cart_ready_at) return;

  const last = session.last_guest_activity_at || session.menu_opened_at || session.created_at;
  const elapsed = Date.now() - new Date(last).getTime();
  if (elapsed < IDLE_REMINDER_MS) return;

  await pool.query(
    `UPDATE table_sessions SET idle_notified_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [sessionId],
  );
  await createWaiterNotification({
    restaurantId: restaurant.id,
    sessionId,
    tableNumber: session.table_number,
    type: NOTIFY_TYPES.IDLE_REMINDER,
    title: `Стол №${session.table_number}`,
    body: 'Пора подойти к столу',
    payload: { sessionId, elapsedMinutes: Math.round(elapsed / 60000) },
  });
}

async function upsertCartItems(sessionId, cartItems, { preserveLocked = true } = {}) {
  const { rows: existing } = await pool.query(
    `SELECT * FROM table_order_items WHERE session_id = $1`,
    [sessionId],
  );
  const lockedByIiko = new Map(
    existing.filter((r) => r.is_locked).map((r) => [String(r.iiko_product_id), r]),
  );

  if (preserveLocked) {
    for (const item of cartItems) {
      const locked = lockedByIiko.get(String(item.iikoProductId));
      if (locked && Number(item.quantity) < Number(locked.quantity)) {
        const err = new Error('Нельзя удалить позиции уже принятого заказа. Позовите официанта.');
        err.status = 403;
        throw err;
      }
    }
  }

  const prevMap = new Map(existing.map((r) => [String(r.iiko_product_id), Number(r.quantity)]));
  await pool.query(`DELETE FROM table_order_items WHERE session_id = $1 AND is_locked = FALSE`, [sessionId]);

  let total = 0;

  for (const locked of existing.filter((r) => r.is_locked)) {
    const incoming = cartItems.find((i) => String(i.iikoProductId) === String(locked.iiko_product_id));
    const qty = Math.max(Number(locked.quantity), Number(incoming?.quantity || locked.quantity));
    const price = Number(locked.price);
    const lineTotal = price * qty;
    total += lineTotal;
    if (qty !== locked.quantity) {
      await pool.query(
        `UPDATE table_order_items SET quantity = $2, line_total = $3, updated_at = NOW()
         WHERE id = $1`,
        [locked.id, qty, lineTotal],
      );
    }
  }

  const lockedIds = new Set(existing.filter((r) => r.is_locked).map((r) => String(r.iiko_product_id)));

  for (const item of cartItems) {
    if (lockedIds.has(String(item.iikoProductId))) continue;
    const qty = Number(item.quantity) || 1;
    const price = Number(item.price) || 0;
    const lineTotal = price * qty;
    total += lineTotal;
    await pool.query(
      `INSERT INTO table_order_items
         (session_id, product_id, iiko_product_id, name, price, quantity, line_total, seat_number, is_locked)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,FALSE)`,
      [
        sessionId,
        item.productId || null,
        item.iikoProductId,
        item.name,
        price,
        qty,
        lineTotal,
        item.seatNumber || null,
      ],
    );
  }

  await pool.query(
    `UPDATE table_sessions SET total = $2, updated_at = NOW() WHERE id = $1`,
    [sessionId, total],
  );

  const delta = [];
  for (const item of cartItems) {
    const iikoId = String(item.iikoProductId);
    const qty = Number(item.quantity) || 1;
    const prevQty = prevMap.get(iikoId) || 0;
    const addQty = qty - prevQty;
    if (addQty > 0) delta.push({ productId: item.iikoProductId, amount: addQty });
  }
  return { total, delta };
}

export async function saveGuestCart(sessionId, cartItems) {
  const ctx = await getSessionById(sessionId);
  if (!ctx) {
    const err = new Error('Сессия не найдена');
    err.status = 404;
    throw err;
  }
  const wf = ctx.session.workflow_status;
  const wasProduction = ['in_production', 'reorder_pending'].includes(wf);

  await upsertCartItems(sessionId, cartItems, { preserveLocked: true });
  await touchGuestActivity(sessionId, WORKFLOW.BUILDING_CART);

  if (wasProduction) {
    await pool.query(
      `UPDATE table_sessions SET workflow_status = $2, updated_at = NOW() WHERE id = $1`,
      [sessionId, WORKFLOW.REORDER_PENDING],
    );
    await createWaiterNotification({
      restaurantId: ctx.restaurant.id,
      sessionId,
      tableNumber: ctx.session.table_number,
      type: NOTIFY_TYPES.REORDER_INTENT,
      title: `Стол №${ctx.session.table_number}`,
      body: 'Гость хочет сделать дозаказ',
      payload: { sessionId, itemCount: cartItems.length },
    });
  }

  await checkIdleReminder(sessionId);
  return mapSessionFull(sessionId);
}

export async function submitCartToWaiter(sessionId, cartItems) {
  const ctx = await getSessionById(sessionId);
  if (!ctx) {
    const err = new Error('Сессия не найдена');
    err.status = 404;
    throw err;
  }
  if (!cartItems?.length) {
    const err = new Error('Корзина пуста');
    err.status = 400;
    throw err;
  }

  await upsertCartItems(sessionId, cartItems, { preserveLocked: true });
  await pool.query(
    `UPDATE table_sessions SET
       workflow_status = $2,
       cart_ready_at = NOW(),
       last_guest_activity_at = NOW(),
       updated_at = NOW()
     WHERE id = $1`,
    [sessionId, WORKFLOW.CART_READY],
  );

  await createWaiterNotification({
    restaurantId: ctx.restaurant.id,
    sessionId,
    tableNumber: ctx.session.table_number,
    type: NOTIFY_TYPES.CART_READY,
    title: `Стол №${ctx.session.table_number}`,
    body: 'Гость готов передать заказ — корзина сформирована',
    payload: { sessionId, total: ctx.session.total, items: cartItems.length },
  });

  return mapSessionFull(sessionId);
}

export async function callWaiterExtended(sessionId, { reason = 'general' } = {}) {
  const ctx = await getSessionById(sessionId);
  if (!ctx) {
    const err = new Error('Сессия не найдена');
    err.status = 404;
    throw err;
  }

  const reasonLabels = {
    general: 'Нужна помощь',
    bill: 'Попросил счёт',
    reorder: 'Дозаказ',
    question: 'Вопрос по блюдам',
  };

  await createWaiterNotification({
    restaurantId: ctx.restaurant.id,
    sessionId,
    tableNumber: ctx.session.table_number,
    type: NOTIFY_TYPES.CALL_WAITER,
    title: `Стол №${ctx.session.table_number}`,
    body: reasonLabels[reason] || reasonLabels.general,
    payload: { sessionId, reason },
  });

  return {
    ok: true,
    message: 'Официант скоро подойдёт',
    tableNumber: ctx.session.table_number,
  };
}

export async function waiterUpdateCart(sessionId, cartItems, { guestCount } = {}) {
  const ctx = await getSessionById(sessionId);
  if (!ctx) {
    const err = new Error('Сессия не найдена');
    err.status = 404;
    throw err;
  }

  await pool.query(`DELETE FROM table_order_items WHERE session_id = $1`, [sessionId]);
  let total = 0;
  for (const item of cartItems) {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.price) || 0;
    const lineTotal = price * qty;
    total += lineTotal;
    await pool.query(
      `INSERT INTO table_order_items
         (session_id, product_id, iiko_product_id, name, price, quantity, line_total, seat_number, is_locked)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        sessionId,
        item.productId || null,
        item.iikoProductId,
        item.name,
        price,
        qty,
        lineTotal,
        item.seatNumber || null,
        Boolean(item.isLocked),
      ],
    );
  }

  const updates = ['total = $2', 'workflow_status = $3', 'updated_at = NOW()'];
  const params = [sessionId, total, WORKFLOW.WAITER_REVIEW];
  if (guestCount) {
    updates.push(`guest_count = $${params.length + 1}`);
    params.push(guestCount);
  }
  await pool.query(`UPDATE table_sessions SET ${updates.join(', ')} WHERE id = $1`, params);

  return mapSessionFull(sessionId);
}

export async function sendOrderToProduction(sessionId) {
  const ctx = await getSessionById(sessionId);
  if (!ctx) {
    const err = new Error('Сессия не найдена');
    err.status = 404;
    throw err;
  }

  const { session, restaurant } = ctx;
  const { rows: items } = await pool.query(
    `SELECT * FROM table_order_items WHERE session_id = $1`,
    [sessionId],
  );
  if (!items.length) {
    const err = new Error('Корзина пуста');
    err.status = 400;
    throw err;
  }

  let iikoTableId = session.iiko_table_id;
  if (!iikoTableId) {
    iikoTableId = await resolveIikoTableIdForRestaurant(restaurant, session.table_number);
    if (iikoTableId) {
      await pool.query(
        `UPDATE table_sessions SET iiko_table_id = $2 WHERE id = $1`,
        [sessionId, iikoTableId],
      );
    }
  }

  const prevSynced = items.filter((i) => i.synced_to_iiko);
  const prevQty = new Map(prevSynced.map((i) => [String(i.iiko_product_id), Number(i.quantity)]));

  const delta = [];
  for (const item of items) {
    const iikoId = String(item.iiko_product_id);
    const qty = Number(item.quantity);
    const prev = prevQty.get(iikoId) || 0;
    if (qty > prev) delta.push({ productId: item.iiko_product_id, amount: qty - prev });
  }

  let iikoOrderId = session.iiko_order_id;
  try {
    if (!iikoOrderId && iikoTableId && delta.length) {
      const created = await createTableOrder({
        organizationId: restaurant.organization_id,
        terminalGroupId: restaurant.terminal_group_id,
        tableIds: [iikoTableId],
        items: delta,
      });
      iikoOrderId = created?.orderInfo?.id || created?.order?.id || created?.id || null;
      if (iikoOrderId) {
        await pool.query(
          `UPDATE table_sessions SET iiko_order_id = $2 WHERE id = $1`,
          [sessionId, iikoOrderId],
        );
      }
    } else if (iikoOrderId && delta.length) {
      await addItemsToOrder({
        organizationId: restaurant.organization_id,
        orderId: iikoOrderId,
        items: delta,
      });
    }

    await pool.query(
      `UPDATE table_order_items SET synced_to_iiko = TRUE, is_locked = TRUE, updated_at = NOW()
       WHERE session_id = $1`,
      [sessionId],
    );
    await pool.query(
      `UPDATE table_sessions SET
         workflow_status = $2,
         sent_to_production_at = NOW(),
         updated_at = NOW()
       WHERE id = $1`,
      [sessionId, WORKFLOW.IN_PRODUCTION],
    );
  } catch (e) {
    console.error('sendToProduction:', e.response?.data || e.message);
    const err = new Error(e.response?.data?.errorDescription || e.message || 'Ошибка отправки в iiko');
    err.status = 502;
    throw err;
  }

  return mapSessionFull(sessionId);
}

export async function guestPay(sessionId, { method = 'card', tipAmount = 0 } = {}) {
  const ctx = await getSessionById(sessionId);
  if (!ctx) {
    const err = new Error('Сессия не найдена');
    err.status = 404;
    throw err;
  }

  const { session, restaurant } = ctx;
  const amount = parseFloat(session.total || 0);
  const tip = parseFloat(tipAmount || 0);

  if (session.iiko_order_id) {
    try {
      await changeOrderPayments(restaurant.organization_id, session.iiko_order_id, [{
        paymentTypeKind: method === 'sbp' ? 'Card' : 'Card',
        sum: amount + tip,
        isProcessedExternally: true,
      }]);
    } catch (e) {
      console.warn('guestPay iiko:', e.message);
    }
  }

  await pool.query(
    `INSERT INTO table_payments (session_id, amount, tip_amount, method)
     VALUES ($1, $2, $3, $4)`,
    [sessionId, amount, tip, method],
  );

  await pool.query(
    `UPDATE table_sessions SET
       payment_status = 'paid',
       status = 'paid',
       workflow_status = $2,
       updated_at = NOW()
     WHERE id = $1`,
    [sessionId, WORKFLOW.PAID],
  );

  await createWaiterNotification({
    restaurantId: restaurant.id,
    sessionId,
    tableNumber: session.table_number,
    type: NOTIFY_TYPES.PAYMENT_DONE,
    title: `Стол №${session.table_number}`,
    body: 'Оплачено — можно подойти для финального прощания',
    payload: { sessionId, amount, tip, method },
  });

  return mapSessionFull(sessionId);
}

export async function submitVisitFeedback(sessionId, { rating, comment = '' }) {
  const ctx = await getSessionById(sessionId);
  if (!ctx) {
    const err = new Error('Сессия не найдена');
    err.status = 404;
    throw err;
  }

  await pool.query(
    `INSERT INTO visit_feedback (session_id, rating, comment) VALUES ($1, $2, $3)`,
    [sessionId, rating, comment],
  );

  if (rating <= 3) {
    await createWaiterNotification({
      restaurantId: ctx.restaurant.id,
      sessionId,
      tableNumber: ctx.session.table_number,
      type: NOTIFY_TYPES.NEGATIVE_FEEDBACK,
      title: `Стол №${ctx.session.table_number} — низкая оценка`,
      body: comment || `Оценка ${rating}/5`,
      payload: { sessionId, rating, comment },
    });
  }

  return { ok: true };
}

export async function listActiveSessions() {
  const restaurant = await getRestaurant();
  if (!restaurant) return [];
  const { rows } = await pool.query(
    `SELECT s.* FROM table_sessions s
     WHERE s.restaurant_id = $1 AND s.status = 'open'
     ORDER BY s.updated_at DESC`,
    [restaurant.id],
  );
  const result = [];
  for (const row of rows) {
    const full = await mapSessionFull(row.id);
    if (full) result.push(full);
  }
  return result;
}

export async function refreshSessionWithWorkflow(sessionId) {
  await checkIdleReminder(sessionId);
  try {
    await refreshSessionFromIiko(sessionId);
  } catch {
    /* ignore */
  }
  return mapSessionFull(sessionId);
}

export { enterTableSession, mapSessionFull as getSessionDetails };
