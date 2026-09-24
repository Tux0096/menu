/**
 * Визит гостя за столом: сессия, корзина, передача официанту, дозаказ, счёт, оплата, отзыв.
 *
 * Позиции корзины (table_order_items):
 *   is_locked = FALSE — черновик гостя / дозаказ, ещё не отправлен на кухню;
 *   is_locked = TRUE  — отправлено в iiko, гость не может убрать.
 */
import pool from '../db/pool.js';
import { QR_RESTAURANT_SLUG } from '../lib/qr-config.js';
import {
  IDLE_REMINDER_MS,
  NOTIFY_TYPES,
  WAITER_RESPONSE_SLA_MS,
  WORKFLOW,
  WORKFLOW_GUEST_LABELS,
} from '../lib/table-workflow-config.js';
import {
  changeOrderPayments,
  closeTableOrder,
  getOrdersByIds,
  getRestaurantSections,
  isIikoDemo,
  matchTableIdFromSections,
} from '../iiko-client.js';
import { createWaiterNotification } from './waiter-notifications.js';

export function httpError(status, message, extra = {}) {
  const err = new Error(message);
  err.status = status;
  Object.assign(err, extra);
  return err;
}

const PAYABLE = [
  WORKFLOW.CART_READY, WORKFLOW.WAITER_REVIEW, WORKFLOW.IN_PRODUCTION,
  WORKFLOW.REORDER_PENDING, WORKFLOW.BILL_REQUESTED,
];
/** Онлайн-оплата и отметка «Оплачено» — выключены, пока не подключён платёжный провайдер. */
export const PAYMENTS_ENABLED = process.env.PAYMENTS_ENABLED === 'true';

const KITCHEN_LABELS = {
  Added: 'Принят',
  PrintedNotCooking: 'Принят кухней',
  CookingStarted: 'Готовится',
  CookingCompleted: 'Готово',
  Served: 'Подано',
};
const KITCHEN_ORDER = ['Added', 'PrintedNotCooking', 'CookingStarted', 'CookingCompleted', 'Served'];

const AFTER_KITCHEN = [WORKFLOW.IN_PRODUCTION, WORKFLOW.REORDER_PENDING, WORKFLOW.BILL_REQUESTED];

// ── Рестораны ───────────────────────────────────────────────────────────────

export async function getRestaurantBySlug(slug) {
  const { rows } = await pool.query(
    'SELECT * FROM restaurants WHERE slug = $1 AND is_disabled = FALSE',
    [slug || QR_RESTAURANT_SLUG],
  );
  return rows[0] || null;
}

export async function resolveRestaurant(slug) {
  const restaurant = await getRestaurantBySlug(slug || QR_RESTAURANT_SLUG);
  if (!restaurant) throw httpError(404, 'Ресторан не найден');
  return restaurant;
}

export async function resolveIikoTableId(restaurant, tableNumber) {
  const { rows: cached } = await pool.query(
    `SELECT iiko_table_id FROM restaurant_table_cache
     WHERE restaurant_id = $1 AND table_number = $2`,
    [restaurant.id, String(tableNumber)],
  );
  if (cached[0]?.iiko_table_id) return cached[0].iiko_table_id;
  if (isIikoDemo()) return null;

  const sections = await getRestaurantSections(restaurant.organization_id, restaurant.terminal_group_id);
  const tableId = matchTableIdFromSections(sections, tableNumber);
  if (tableId) {
    await pool.query(
      `INSERT INTO restaurant_table_cache (restaurant_id, table_number, iiko_table_id, table_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (restaurant_id, table_number) DO UPDATE SET
         iiko_table_id = EXCLUDED.iiko_table_id, updated_at = NOW()`,
      [restaurant.id, String(tableNumber), tableId, `Стол ${tableNumber}`],
    );
  }
  return tableId;
}

// ── Чтение сессии ───────────────────────────────────────────────────────────

export async function getSessionContext(sessionId, client = pool) {
  const { rows } = await client.query(
    `SELECT s.*, g.name AS guest_name, g.phone AS guest_phone, g.visits_count AS guest_visits
     FROM table_sessions s
     LEFT JOIN guests g ON g.id = s.guest_id
     WHERE s.id = $1`,
    [sessionId],
  );
  const session = rows[0];
  if (!session) return null;
  const { rows: rr } = await client.query('SELECT * FROM restaurants WHERE id = $1', [session.restaurant_id]);
  const { rows: items } = await client.query(
    'SELECT * FROM table_order_items WHERE session_id = $1 ORDER BY batch_no, created_at',
    [sessionId],
  );
  return { session, restaurant: rr[0], items };
}

async function requireContext(sessionId) {
  const ctx = await getSessionContext(sessionId);
  if (!ctx) throw httpError(404, 'Визит не найден — отсканируйте QR-код ещё раз');
  return ctx;
}

function maskPhone(phone) {
  if (!phone) return null;
  return `${phone.slice(0, 2)} *** ***-${phone.slice(-4, -2)}-${phone.slice(-2)}`;
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
    course: row.course || null,
    batchNo: row.batch_no,
    isLocked: row.is_locked,
    isNew: !row.is_locked,
    kitchenStatus: row.kitchen_status || null,
    kitchenLabel: KITCHEN_LABELS[row.kitchen_status] || (row.is_locked ? 'Отправлено на кухню' : null),
  };
}

function minutesSince(ts) {
  if (!ts) return null;
  return Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
}

export function mapSession({ session, restaurant, items }, extra = {}) {
  const wf = session.workflow_status || WORKFLOW.BROWSING;
  const isPaid = session.payment_status === 'paid';
  const mapped = items.map(mapItem);
  const pending = mapped.filter((i) => !i.isLocked);
  const lockedTotal = mapped.filter((i) => i.isLocked).reduce((s, i) => s + i.lineTotal, 0);
  let waitingSince = null;
  if (wf === WORKFLOW.CART_READY || wf === WORKFLOW.REORDER_PENDING) waitingSince = session.cart_ready_at;
  if (wf === WORKFLOW.BILL_REQUESTED) waitingSince = session.bill_requested_at;
  const waitingMinutes = minutesSince(waitingSince);

  return {
    sessionId: session.id,
    restaurantSlug: restaurant.slug,
    restaurantName: restaurant.name,
    restaurantAddress: restaurant.address,
    tableNumber: session.table_number,
    iikoOrderId: session.iiko_order_id,
    iikoLastError: session.iiko_last_error || null,
    status: session.status,
    paymentStatus: session.payment_status,
    workflowStatus: wf,
    workflowLabel: (!PAYMENTS_ENABLED && wf === WORKFLOW.BILL_REQUESTED) ? 'Счёт запрошен' : (WORKFLOW_GUEST_LABELS[wf] || wf),
    guest: session.guest_id ? {
      id: session.guest_id,
      name: session.guest_name || 'Гость',
      phoneMasked: maskPhone(session.guest_phone),
      visitsCount: session.guest_visits || 0,
    } : null,
    guestsAtTable: (session.guest_ids || []).length || (session.guest_id ? 1 : 0),
    guestCount: session.guest_count || 1,
    total: parseFloat(session.total || 0),
    sentTotal: lockedTotal,
    pendingCount: pending.reduce((s, i) => s + i.quantity, 0),
    createdAt: session.created_at,
    cartReadyAt: session.cart_ready_at,
    sentToProductionAt: session.sent_to_production_at,
    billRequestedAt: session.bill_requested_at,
    paidAt: session.paid_at,
    lastGuestActivityAt: session.last_guest_activity_at,
    waitingMinutes,
    isOverdue: waitingMinutes != null && waitingMinutes * 60000 >= WAITER_RESPONSE_SLA_MS,
    lockedBy: session.locked_until && new Date(session.locked_until) > new Date() ? session.locked_by : null,
    canGuestRemoveItems: !isPaid,
    canGuestSubmit: !isPaid && pending.length > 0,
    canGuestPay: PAYMENTS_ENABLED && PAYABLE.includes(wf) && !isPaid && parseFloat(session.total || 0) > 0,
    paymentsEnabled: PAYMENTS_ENABLED,
    iikoStatus: session.iiko_status || null,
    kitchenStatus: session.kitchen_status || null,
    kitchenLabel: KITCHEN_LABELS[session.kitchen_status] || null,
    kitchenStatusAt: session.iiko_status_at || null,
    canRequestBill: !isPaid && mapped.length > 0 && wf !== WORKFLOW.BILL_REQUESTED,
    isPaid,
    items: mapped,
    ...extra,
  };
}

export async function getSessionView(sessionId) {
  const ctx = await requireContext(sessionId);
  const { rows } = await pool.query('SELECT rating FROM visit_feedback WHERE session_id = $1', [sessionId]);
  return mapSession(ctx, { feedbackLeft: Boolean(rows[0]), feedbackRating: rows[0]?.rating || null });
}

// ── Вход по QR ──────────────────────────────────────────────────────────────

function normalizeTable(tableNumber, restaurant) {
  const t = String(tableNumber || '').trim();
  if (!/^[0-9A-Za-zА-Яа-я-]{1,10}$/.test(t)) throw httpError(400, 'Некорректный номер стола');
  const n = Number(t);
  if (Number.isInteger(n) && restaurant.tables_count && (n < 1 || n > restaurant.tables_count)) {
    throw httpError(404, `Стол №${t} не найден в ресторане`);
  }
  return t;
}

async function findOpenSession(restaurantId, tableNumber) {
  const { rows } = await pool.query(
    `SELECT * FROM table_sessions
     WHERE restaurant_id = $1 AND table_number = $2 AND status = 'open'
     LIMIT 1`,
    [restaurantId, String(tableNumber)],
  );
  return rows[0] || null;
}

/**
 * Скан QR: найти открытый визит стола или начать новый, привязать гостя.
 * Если прошлый визит оплачен — он закрывается, начинается новый (кейс 15).
 */
export async function enterTable({ restaurantSlug, tableNumber, guest, previousSessionId = null }) {
  const restaurant = await resolveRestaurant(restaurantSlug);
  const table = normalizeTable(tableNumber, restaurant);

  let session = await findOpenSession(restaurant.id, table);
  if (session && session.payment_status === 'paid') {
    await pool.query(
      `UPDATE table_sessions SET status = 'closed', closed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [session.id],
    );
    session = null;
  }

  let isNew = false;
  if (!session) {
    const { rows } = await pool.query(
      `INSERT INTO table_sessions (restaurant_id, table_number, workflow_status, menu_opened_at, last_guest_activity_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (restaurant_id, table_number) WHERE status = 'open' DO NOTHING
       RETURNING *`,
      [restaurant.id, table, WORKFLOW.BROWSING],
    );
    session = rows[0] || await findOpenSession(restaurant.id, table);
    isNew = Boolean(rows[0]);
  }

  if (guest) {
    const known = (session.guest_ids || []).includes(guest.id);
    if (!known) {
      await pool.query(
        `UPDATE table_sessions SET
           guest_id = COALESCE(guest_id, $2),
           guest_ids = array_append(guest_ids, $2),
           last_guest_activity_at = NOW(),
           updated_at = NOW()
         WHERE id = $1`,
        [session.id, guest.id],
      );
      await pool.query(
        'UPDATE guests SET visits_count = visits_count + 1, last_visit_at = NOW() WHERE id = $1',
        [guest.id],
      );
      const isLead = !session.guest_id;
      const who = guest.name || 'Гость';
      const visits = guest.visitsCount ? ` · визитов: ${guest.visitsCount + 1}` : ' · первый визит';
      await createWaiterNotification({
        restaurantId: restaurant.id,
        sessionId: session.id,
        tableNumber: table,
        type: NOTIFY_TYPES.GUEST_SEATED,
        title: `Стол №${table}`,
        body: isLead
          ? `${who} сел за стол и открыл меню${visits}`
          : `К столу присоединился гость: ${who}`,
        payload: { sessionId: session.id, guestId: guest.id, guestName: who, phone: maskPhone(guest.phone) },
      });
    }
  } else if (isNew) {
    await createWaiterNotification({
      restaurantId: restaurant.id,
      sessionId: session.id,
      tableNumber: table,
      type: NOTIFY_TYPES.MENU_OPENED,
      title: `Стол №${table}`,
      body: 'Гость открыл меню',
      payload: { sessionId: session.id },
    });
  }

  const view = await getSessionView(session.id);
  view.isNewVisit = Boolean(previousSessionId && previousSessionId !== session.id);
  return view;
}

// ── Активность гостя ────────────────────────────────────────────────────────

export async function trackActivity(sessionId) {
  await pool.query(
    `UPDATE table_sessions SET last_guest_activity_at = NOW() WHERE id = $1`,
    [sessionId],
  );
  return getSessionView(sessionId);
}

// ── Корзина ─────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function aggregateCart(cartItems) {
  const map = new Map();
  for (const item of cartItems || []) {
    const key = String(item.iikoProductId || item.productId || '');
    if (!key) continue;
    if (!UUID_RE.test(key)) {
      throw httpError(400, `«${String(item.name || 'Позиция').slice(0, 60)}» нельзя заказать через меню — позовите официанта`);
    }
    const qty = Math.max(0, Math.floor(Number(item.quantity) || 0));
    const prev = map.get(key);
    if (prev) prev.quantity += qty;
    else {
      map.set(key, {
        productId: item.productId ? String(item.productId) : null,
        iikoProductId: key,
        name: String(item.name || 'Позиция').slice(0, 300),
        price: Math.max(0, Number(item.price) || 0),
        quantity: qty,
        // Курс подачи 1–3 (гость выбирает в корзине); undefined — не менять
        course: item.course === undefined ? undefined : (Number(item.course) >= 1 && Number(item.course) <= 3 ? Number(item.course) : null),
      });
    }
  }
  return map;
}

async function recalcTotal(client, sessionId) {
  const { rows } = await client.query(
    `UPDATE table_sessions SET
       total = COALESCE((SELECT SUM(line_total) FROM table_order_items WHERE session_id = $1), 0),
       updated_at = NOW()
     WHERE id = $1 RETURNING total`,
    [sessionId],
  );
  return parseFloat(rows[0]?.total || 0);
}

/**
 * Сохранить корзину гостя (полный список позиций, включая уже отправленные).
 * Отправленные на кухню позиции убрать нельзя; сверх них — черновик/дозаказ.
 */
async function writeGuestCart(client, ctx, cartItems) {
  const { session, items } = ctx;
  if (session.payment_status === 'paid') throw httpError(409, 'Счёт уже оплачен — отсканируйте QR, чтобы начать новый заказ');

  const incoming = aggregateCart(cartItems);
  const lockedQty = new Map();
  for (const row of items.filter((i) => i.is_locked)) {
    const key = String(row.iiko_product_id);
    lockedQty.set(key, (lockedQty.get(key) || 0) + row.quantity);
  }
  for (const [key, qty] of lockedQty) {
    const inc = incoming.get(key)?.quantity ?? 0;
    if (inc < qty) {
      throw httpError(403, 'Нельзя убрать блюда, которые уже готовятся. Позовите официанта.');
    }
  }

  const prevPending = new Map(items.filter((i) => !i.is_locked).map((i) => [String(i.iiko_product_id), i]));
  await client.query('DELETE FROM table_order_items WHERE session_id = $1 AND is_locked = FALSE', [session.id]);
  const nextBatch = Math.max(0, ...items.filter((i) => i.is_locked).map((i) => i.batch_no)) + 1;

  for (const [key, line] of incoming) {
    const pendingQty = line.quantity - (lockedQty.get(key) || 0);
    if (pendingQty <= 0) continue;
    const prev = prevPending.get(key);
    await client.query(
      `INSERT INTO table_order_items
         (session_id, product_id, iiko_product_id, name, price, quantity, line_total, seat_number, course, batch_no, is_locked)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,FALSE)`,
      [session.id, line.productId, key, line.name, line.price, pendingQty, line.price * pendingQty,
        prev?.seat_number || null, line.course !== undefined ? line.course : (prev?.course || null), nextBatch],
    );
  }
  return recalcTotal(client, session.id);
}

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function lockSession(client, sessionId) {
  await client.query('SELECT id FROM table_sessions WHERE id = $1 FOR UPDATE', [sessionId]);
  const ctx = await getSessionContext(sessionId, client);
  if (!ctx) throw httpError(404, 'Визит не найден — отсканируйте QR-код ещё раз');
  return ctx;
}

/** Автосохранение корзины (кейс 5). */
export async function saveGuestCart(sessionId, cartItems) {
  await withTransaction(async (client) => {
    const ctx = await lockSession(client, sessionId);
    await writeGuestCart(client, ctx, cartItems);
    const wf = ctx.session.workflow_status;
    const next = wf === WORKFLOW.BROWSING ? WORKFLOW.BUILDING_CART : wf;
    await client.query(
      `UPDATE table_sessions SET workflow_status = $2, last_guest_activity_at = NOW() WHERE id = $1`,
      [sessionId, next],
    );
  });
  return getSessionView(sessionId);
}

/** «Передать официанту» / «Передать дозаказ» (кейсы 6, 9). */
export async function submitToWaiter(sessionId, cartItems) {
  let notify = null;
  await withTransaction(async (client) => {
    const ctx = await lockSession(client, sessionId);
    if (Array.isArray(cartItems)) await writeGuestCart(client, ctx, cartItems);
    const fresh = await getSessionContext(sessionId, client);
    const pending = fresh.items.filter((i) => !i.is_locked);
    if (!pending.length) throw httpError(400, 'Корзина пуста — добавьте блюда из меню');

    const isReorder = fresh.items.some((i) => i.is_locked);
    const status = isReorder ? WORKFLOW.REORDER_PENDING : WORKFLOW.CART_READY;
    await client.query(
      `UPDATE table_sessions SET workflow_status = $2, cart_ready_at = NOW(), wait_notified_at = NULL,
         last_guest_activity_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [sessionId, status],
    );
    const sum = pending.reduce((s, i) => s + Number(i.line_total), 0);
    notify = {
      restaurantId: fresh.restaurant.id,
      sessionId,
      tableNumber: fresh.session.table_number,
      type: isReorder ? NOTIFY_TYPES.REORDER_INTENT : NOTIFY_TYPES.CART_READY,
      title: `Стол №${fresh.session.table_number}`,
      body: `${isReorder ? 'Дозаказ' : 'Новый заказ'} от ${fresh.session.guest_name || 'гостя'}: `
        + `${pending.map((i) => `${i.name} ×${i.quantity}`).join(', ')} — ${Math.round(sum)} ₽`,
      payload: { sessionId, itemsCount: pending.length, sum, isReorder },
    };
  });
  await createWaiterNotification(notify);
  return getSessionView(sessionId);
}

// ── Вызов официанта, счёт ───────────────────────────────────────────────────

const CALL_REASONS = {
  general: 'Нужна помощь',
  question: 'Вопрос по блюдам',
  bill: 'Просит счёт',
  order: 'Хочет сделать заказ',
  cutlery: 'Нужны приборы / салфетки',
};

export async function requestBill(sessionId) {
  const ctx = await requireContext(sessionId);
  if (ctx.session.payment_status === 'paid') throw httpError(409, 'Счёт уже оплачен');
  if (!ctx.items.length) throw httpError(400, 'В заказе пока нет блюд');
  await pool.query(
    `UPDATE table_sessions SET workflow_status = $2, bill_requested_at = NOW(), wait_notified_at = NULL,
       last_guest_activity_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [sessionId, WORKFLOW.BILL_REQUESTED],
  );
  await createWaiterNotification({
    restaurantId: ctx.restaurant.id,
    sessionId,
    tableNumber: ctx.session.table_number,
    type: NOTIFY_TYPES.BILL_REQUESTED,
    title: `Стол №${ctx.session.table_number}`,
    body: `Счёт запрошен — ${Math.round(ctx.session.total)} ₽`,
    payload: { sessionId, total: parseFloat(ctx.session.total) },
  });
  return getSessionView(sessionId);
}

export async function callWaiter(sessionId, reason = 'general', comment = '') {
  const ctx = await requireContext(sessionId);
  if (reason === 'bill' && ctx.items.length && ctx.session.payment_status !== 'paid') {
    return { ok: true, message: 'Официант скоро принесёт счёт', session: await requestBill(sessionId) };
  }
  const text = CALL_REASONS[reason] || CALL_REASONS.general;
  await createWaiterNotification({
    restaurantId: ctx.restaurant.id,
    sessionId,
    tableNumber: ctx.session.table_number,
    type: NOTIFY_TYPES.CALL_WAITER,
    title: `Стол №${ctx.session.table_number} — вызов`,
    body: comment ? `${text}: ${String(comment).slice(0, 200)}` : text,
    payload: { sessionId, reason, guestName: ctx.session.guest_name },
  });
  await pool.query('UPDATE table_sessions SET last_guest_activity_at = NOW() WHERE id = $1', [sessionId]);
  return { ok: true, message: 'Официант скоро подойдёт', tableNumber: ctx.session.table_number };
}

// ── Оплата (кейс 10) ────────────────────────────────────────────────────────

const PAYMENT_METHODS = ['card', 'sbp', 'apple_pay', 'google_pay'];

export async function payBill(sessionId, { method = 'card', tipAmount = 0 } = {}) {
  if (!PAYMENTS_ENABLED) throw httpError(403, 'Оплата через меню пока недоступна — попросите счёт у официанта');
  if (!PAYMENT_METHODS.includes(method)) throw httpError(400, 'Неизвестный способ оплаты');
  const tip = Math.max(0, Math.round(Number(tipAmount) || 0));

  const paid = await withTransaction(async (client) => {
    const ctx = await lockSession(client, sessionId);
    const { session } = ctx;
    if (session.payment_status === 'paid') throw httpError(409, 'Счёт уже оплачен');
    if (!PAYABLE.includes(session.workflow_status)) {
      throw httpError(400, 'Оплата доступна после передачи заказа официанту');
    }
    const amount = parseFloat(session.total || 0);
    if (amount <= 0) throw httpError(400, 'Сумма счёта равна нулю');

    // Прототип: платёжный провайдер в демо-режиме (PAYMENT_PROVIDER=demo) — оплата проходит сразу.
    // Реальный провайдер подключается здесь: создать платёж → дождаться webhook → отметить оплату.
    await client.query(
      `INSERT INTO table_payments (session_id, amount, tip_amount, method, status)
       VALUES ($1, $2, $3, $4, 'completed')`,
      [sessionId, amount, tip, method],
    );
    await client.query(
      `UPDATE table_sessions SET payment_status = 'paid', status = 'paid', workflow_status = $2,
         paid_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [sessionId, WORKFLOW.PAID],
    );
    return { ctx, amount };
  });

  const { ctx, amount } = paid;
  let iikoNote = '';
  const paymentTypeId = process.env.IIKO_PAYMENT_TYPE_ID;
  if (ctx.session.iiko_order_id && !isIikoDemo() && paymentTypeId) {
    try {
      await changeOrderPayments(ctx.restaurant.organization_id, ctx.session.iiko_order_id, [{
        paymentTypeKind: 'Card', paymentTypeId, sum: amount, isProcessedExternally: true,
      }]);
      await closeTableOrder(ctx.restaurant.organization_id, ctx.session.iiko_order_id);
    } catch (e) {
      const msg = e.response?.data?.errorDescription || e.message;
      iikoNote = ' · закройте счёт в iiko вручную';
      await pool.query('UPDATE table_sessions SET iiko_last_error = $2 WHERE id = $1', [sessionId, `Закрытие счёта: ${msg}`]);
    }
  } else if (ctx.session.iiko_order_id && !isIikoDemo()) {
    iikoNote = ' · закройте счёт в iiko';
  }

  await createWaiterNotification({
    restaurantId: ctx.restaurant.id,
    sessionId,
    tableNumber: ctx.session.table_number,
    type: NOTIFY_TYPES.PAYMENT_DONE,
    title: `Стол №${ctx.session.table_number} — оплачено`,
    body: `${Math.round(amount)} ₽${tip ? ` + чаевые ${tip} ₽` : ''} (${method})${iikoNote}`,
    payload: { sessionId, amount, tip, method },
  });
  return getSessionView(sessionId);
}

// ── Отзыв (кейс 11) ─────────────────────────────────────────────────────────

export async function submitFeedback(sessionId, { rating, comment = '' }) {
  const ctx = await requireContext(sessionId);
  const r = Math.round(Number(rating));
  if (!(r >= 1 && r <= 5)) throw httpError(400, 'Оценка от 1 до 5');
  const { rowCount } = await pool.query(
    `INSERT INTO visit_feedback (session_id, rating, comment) VALUES ($1, $2, $3)
     ON CONFLICT (session_id) DO NOTHING`,
    [sessionId, r, String(comment || '').slice(0, 2000)],
  );
  if (!rowCount) return { ok: true, alreadySent: true };
  if (r <= 3) {
    await createWaiterNotification({
      restaurantId: ctx.restaurant.id,
      sessionId,
      tableNumber: ctx.session.table_number,
      type: NOTIFY_TYPES.NEGATIVE_FEEDBACK,
      title: `Стол №${ctx.session.table_number} — низкая оценка ${r}/5`,
      body: comment || `Гость ${ctx.session.guest_name || ''} поставил ${r}/5`.trim(),
      payload: { sessionId, rating: r, comment },
    });
  }
  return { ok: true };
}

// ── Фоновые проверки: бездействие гостя и долгое ожидание ───────────────────

export async function runServiceChecks() {
  // Забытые визиты (12+ часов без активности) закрываем, чтобы новый гость начинал с чистого стола
  await pool.query(
    `UPDATE table_sessions SET status = 'closed', workflow_status = CASE WHEN payment_status = 'paid' THEN 'paid' ELSE 'closed' END,
       closed_at = NOW(), updated_at = NOW()
     WHERE status = 'open'
       AND COALESCE(last_guest_activity_at, updated_at::timestamptz, created_at::timestamptz) < NOW() - INTERVAL '12 hours'`,
  );

  const { rows: idle } = await pool.query(
    `UPDATE table_sessions SET idle_notified_at = NOW()
     WHERE status = 'open' AND idle_notified_at IS NULL
       AND workflow_status IN ('browsing', 'building_cart')
       AND COALESCE(last_guest_activity_at, menu_opened_at, created_at) < NOW() - ($1 || ' milliseconds')::interval
       AND created_at > NOW() - INTERVAL '6 hours'
     RETURNING id, restaurant_id, table_number, last_guest_activity_at`,
    [String(IDLE_REMINDER_MS)],
  );
  for (const s of idle) {
    await createWaiterNotification({
      restaurantId: s.restaurant_id,
      sessionId: s.id,
      tableNumber: s.table_number,
      type: NOTIFY_TYPES.IDLE_REMINDER,
      title: `Стол №${s.table_number}`,
      body: `Пора подойти к столу — гость ${Math.round(IDLE_REMINDER_MS / 60000)}+ мин изучает меню без заказа`,
      payload: { sessionId: s.id },
    });
  }

  const { rows: waiting } = await pool.query(
    `UPDATE table_sessions SET wait_notified_at = NOW()
     WHERE status = 'open' AND wait_notified_at IS NULL
       AND workflow_status IN ('cart_ready', 'reorder_pending', 'bill_requested')
       AND COALESCE(CASE WHEN workflow_status = 'bill_requested' THEN bill_requested_at END, cart_ready_at)
           < NOW() - ($1 || ' milliseconds')::interval
     RETURNING id, restaurant_id, table_number, workflow_status`,
    [String(WAITER_RESPONSE_SLA_MS)],
  );
  for (const s of waiting) {
    await createWaiterNotification({
      restaurantId: s.restaurant_id,
      sessionId: s.id,
      tableNumber: s.table_number,
      type: NOTIFY_TYPES.WAIT_TOO_LONG,
      title: `Стол №${s.table_number} — долгое ожидание`,
      body: `Гость ждёт ${Math.round(WAITER_RESPONSE_SLA_MS / 60000)}+ мин: ${WORKFLOW_GUEST_LABELS[s.workflow_status]}`,
      payload: { sessionId: s.id, escalate: true },
    });
  }
}

/**
 * Статус заказа из iiko: статус заказа и статусы блюд на кухне.
 * Оплату/закрытие по данным iiko не отмечаем (закрытие заказов из меню выключено).
 */
export async function refreshFromIiko(sessionId) {
  if (isIikoDemo()) return;
  const ctx = await getSessionContext(sessionId);
  if (!ctx?.session.iiko_order_id || !ctx.session.sent_to_production_at) return;
  try {
    const data = await getOrdersByIds(ctx.restaurant.organization_id, [ctx.session.iiko_order_id]);
    const info = (data?.orders || [])[0];
    const order = info?.order || info;
    if (!order) return;
    const items = (order.items || []).filter((i) => (i.type || 'Product') === 'Product');
    // Для каждой позиции — наименее продвинутый статус среди строк iiko с этим блюдом
    const byProduct = new Map();
    for (const it of items) {
      const pid = String(it.product?.id || it.productId || '');
      if (!pid || !it.status) continue;
      const prev = byProduct.get(pid);
      if (!prev || KITCHEN_ORDER.indexOf(it.status) < KITCHEN_ORDER.indexOf(prev)) byProduct.set(pid, it.status);
    }
    for (const [pid, st] of byProduct) {
      await pool.query(
        `UPDATE table_order_items SET kitchen_status = $3
         WHERE session_id = $1 AND iiko_product_id::text = $2 AND is_locked = TRUE`,
        [sessionId, pid, st],
      );
    }
    const statuses = [...byProduct.values()];
    let kitchen = null;
    if (statuses.length) {
      kitchen = statuses.reduce((min, st) => (KITCHEN_ORDER.indexOf(st) < KITCHEN_ORDER.indexOf(min) ? st : min));
    }
    await pool.query(
      `UPDATE table_sessions SET iiko_status = $2, kitchen_status = COALESCE($3, kitchen_status), iiko_status_at = NOW()
       WHERE id = $1`,
      [sessionId, order.status || info?.creationStatus || null, kitchen],
    );
  } catch (e) {
    console.warn('refreshFromIiko:', e.response?.data?.errorDescription || e.message);
  }
}

/** Фоновое обновление статусов кухни по всем открытым заказам из меню. */
export async function refreshKitchenStatuses() {
  if (isIikoDemo()) return;
  const { rows } = await pool.query(
    `SELECT id FROM table_sessions
     WHERE status = 'open' AND iiko_order_id IS NOT NULL AND sent_to_production_at IS NOT NULL`,
  );
  for (const r of rows) await refreshFromIiko(r.id);
}

export { withTransaction, lockSession, recalcTotal, AFTER_KITCHEN };
