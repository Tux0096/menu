/**
 * Визит гостя за столом: сессия, корзина, передача официанту, дозаказ, счёт, оплата, отзыв.
 *
 * Позиции корзины (table_order_items):
 *   is_locked = FALSE — черновик гостя / дозаказ, ещё не отправлен на кухню;
 *   is_locked = TRUE  — отправлено в iiko, гость не может убрать.
 */
import { notifyOrderReady } from './guest-push.js';
import { uuidOrNull } from '../lib/uuid.js';
import pool from '../db/pool.js';
import { cleanText, cleanTextLoose } from '../lib/sanitize.js';
import { isValidQrKey, QR_RESTAURANT_SLUG, qrSignedRequired } from '../lib/qr-config.js';
import {
  IDLE_REMINDER_MS,
  NOTIFY_TYPES,
  READY_WAIT_MS,
  WAITER_RESPONSE_SLA_MS,
  WORKFLOW,
  WORKFLOW_GUEST_LABELS,
} from '../lib/table-workflow-config.js';
import {
  changeOrderPayments,
  closeTableOrder,
  getOrdersByIds,
  iikoCoolingDown,
  getRestaurantSections,
  isIikoDemo,
  matchTableIdFromSections,
} from '../iiko-client.js';
import {
  aliveByProduct, baseCode, normalizeIikoOrder, planAdditions, planRemovals, rowOrderCode, rowsOfOrder, sessionOrders,
} from '../lib/iiko-order-sync.js';
import { demoHasOrder } from '../lib/iiko-demo-orders.js';
import { createWaiterNotification } from './waiter-notifications.js';
import { attachCookInfo, loadCookNorms } from './cooking.js';
import { COOK_SLOW_FACTOR, cookInfo, iikoCookMinutes } from '../lib/cooking-time.js';
import {
  rubText, billText, callText, cookSlowText, newOrderText, readyText, readyWaitText, reorderText, removedText, waitText,
} from '../lib/notification-text.js';
import { arriveByQr } from './reservations.js';
import { RESERVE_TZ, STATE_LABELS, clockText, reserveState } from '../lib/iiko-reserve-sync.js';
import { getSource, productSourceMap } from './sources.js';
import { alcoholView, assertAgeConfirmed, assertAlcoSale } from '../lib/alco-rules.js';
import { assertHoursRows, menuIndex, priceLine, priceVariant, rowVariantKey, variantKey } from './menu-pricing.js';
import { assertLunchRows } from './business-lunch.js';
import { stopListLoadedAt } from './stoplist.js';
import { isSessionBusy, withSessionMutex } from '../lib/session-mutex.js';
import { withIikoCreds } from '../iiko-client.js';

import { httpError } from '../lib/http.js';
import { fromKop, sumKop } from '../lib/money.js';

export { httpError };

const PAYABLE = [
  WORKFLOW.CART_READY, WORKFLOW.WAITER_REVIEW, WORKFLOW.IN_PRODUCTION,
  WORKFLOW.REORDER_PENDING, WORKFLOW.BILL_REQUESTED,
];
/** Онлайн-оплата и отметка «Оплачено» — выключены, пока не подключён платёжный провайдер. */
export const PAYMENTS_ENABLED = process.env.PAYMENTS_ENABLED === 'true';

const KITCHEN_LABELS = {
  Added: 'Принят кассой',
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

export async function resolveIikoTableId(restaurant, tableNumber, source = 'main') {
  // Кэш столов: для доп. источника (бар — другая организация iiko) ключ «код:номер»
  const cacheKey = source && source !== 'main' ? `${source}:${tableNumber}` : String(tableNumber);
  const { rows: cached } = await pool.query(
    `SELECT iiko_table_id FROM restaurant_table_cache
     WHERE restaurant_id = $1 AND table_number = $2`,
    [restaurant.id, cacheKey],
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
      [restaurant.id, cacheKey, tableId, `Стол ${tableNumber}`],
    );
  }
  return tableId;
}

// ── Чтение сессии ───────────────────────────────────────────────────────────

/** Несколько визитов сразу (зал официанта): 4 запроса на все столы вместо 4 на каждый. */
export async function getSessionContexts(ids) {
  if (!ids.length) return [];
  const { rows: sessions } = await pool.query(
    `SELECT s.*, g.name AS guest_name, g.phone AS guest_phone, g.visits_count AS guest_visits, w.name AS waiter_name,
            rv.starts_at AS rv_starts_at, rv.arrived_at AS rv_arrived_at, rv.no_show_at AS rv_no_show_at,
            rv.guests_count AS rv_guests, rv.comment AS rv_comment, rv.iiko_status AS rv_status
     FROM table_sessions s LEFT JOIN guests g ON g.id = s.guest_id LEFT JOIN staff_users w ON w.id = s.waiter_id
     LEFT JOIN reservations rv ON rv.id = s.reservation_id WHERE s.id = ANY($1::uuid[])`,
    [ids],
  );
  const { rows: rr } = await pool.query('SELECT * FROM restaurants WHERE id = ANY($1::uuid[])',
    [[...new Set(sessions.map((x) => x.restaurant_id))]]);
  const { rows: items } = await pool.query(
    'SELECT * FROM table_order_items WHERE session_id = ANY($1::uuid[]) ORDER BY batch_no, created_at', [ids],
  );
  const guestIds = [...new Set(sessions.flatMap((x) => x.guest_ids || []))];
  const { rows: guests } = guestIds.length
    ? await pool.query('SELECT id, name FROM guests WHERE id = ANY($1::uuid[])', [guestIds]) : { rows: [] };
  const restaurantOf = new Map(rr.map((r) => [r.id, r]));
  const guestOf = new Map(guests.map((g) => [g.id, g]));
  const byId = new Map(sessions.map((session) => [session.id, {
    session,
    restaurant: restaurantOf.get(session.restaurant_id),
    items: items.filter((i) => i.session_id === session.id),
    guests: (session.guest_ids || []).map((id) => guestOf.get(id)).filter(Boolean),
  }]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

export async function getSessionContext(sessionId, client = pool) {
  const { rows } = await client.query(
    `SELECT s.*, g.name AS guest_name, g.phone AS guest_phone, g.visits_count AS guest_visits, w.name AS waiter_name,
            rv.starts_at AS rv_starts_at, rv.arrived_at AS rv_arrived_at, rv.no_show_at AS rv_no_show_at,
            rv.guests_count AS rv_guests, rv.comment AS rv_comment, rv.iiko_status AS rv_status
     FROM table_sessions s
     LEFT JOIN guests g ON g.id = s.guest_id
     LEFT JOIN staff_users w ON w.id = s.waiter_id
     LEFT JOIN reservations rv ON rv.id = s.reservation_id
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
  // Гости за столом в порядке присоединения: место = порядковый номер
  const { rows: guests } = await client.query(
    `SELECT g.id, g.name FROM unnest($1::uuid[]) WITH ORDINALITY AS x(id, ord)
     JOIN guests g ON g.id = x.id ORDER BY x.ord`,
    [session.guest_ids || []],
  );
  return { session, restaurant: rr[0], items, guests };
}

/** Гости стола с местами: [{ id, name, seat }]. */
export function tableGuests(ctx) {
  return (ctx.guests || []).map((g, i) => ({ id: g.id, name: g.name || `Гость ${i + 1}`, seat: i + 1 }));
}

/** Гость может работать только со столом, к которому присоединился. */
export async function assertGuestAtTable(sessionId, guestId) {
  const { rows } = await pool.query('SELECT guest_ids FROM table_sessions WHERE id = $1', [uuidOrNull(sessionId)]);
  if (!rows[0]) throw httpError(404, 'Визит не найден — отсканируйте QR-код ещё раз');
  if (!(rows[0].guest_ids || []).includes(guestId)) {
    throw httpError(403, 'Вы не присоединились к этому столу — отсканируйте QR-код ещё раз', { code: 'NOT_AT_TABLE' });
  }
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
    // Выбор гостя: размер и модификаторы (уходят в iiko), текстом — для показа
    sizeId: row.size_id || null,
    modifiers: row.modifiers || [],
    options: row.options_text || null,
    variantKey: rowVariantKey(row),
    lineTotal: parseFloat(row.line_total),
    seatNumber: row.seat_number || null,
    guestId: row.guest_id || null,
    guestName: row.guest_name || null,
    source: row.source || 'main',
    // Гость подтвердил 18+ при добавлении (у позиций официанта нет); isAlcohol дописывает getSessionView
    ageConfirmed: Boolean(row.age_confirmed_at),
    course: row.course || null,
    batchNo: row.batch_no,
    isLocked: row.is_locked,
    isNew: !row.is_locked,
    kitchenStatus: row.kitchen_status || null,
    kitchenLabel: row.served_at ? 'Вынесено' : KITCHEN_LABELS[row.kitchen_status] || (row.is_locked ? 'Ждём подтверждения кассы' : 'Не отправлено'),
    // Этап для официанта: new → sent (ждём кассу) → accepted → cooking → ready → served
    stage: row.served_at || row.kitchen_status === 'Served' ? 'served'
      : !row.is_locked ? 'new'
        : row.kitchen_status === 'CookingCompleted' ? 'ready'
          : row.kitchen_status === 'CookingStarted' ? 'cooking'
            : row.kitchen_status ? 'accepted' : 'sent',
    isReady: row.kitchen_status === 'CookingCompleted' && !row.served_at,
    paidOnline: Boolean(row.paid_payment_id),
    servedAt: row.served_at || null,
    fromIiko: Boolean(row.from_iiko),
    // Время готовки: отправлено на кухню, начали готовить, готово, сколько готовилось (мин); `cook` дописывает getSessionView
    sentAt: row.sent_at || null,
    cookingStartedAt: row.cooking_started_at || null,
    readyAt: row.ready_at || row.ready_notified_at || null,
    cookMinutes: row.cook_minutes != null ? Number(row.cook_minutes) : null,
  };
}

function minutesSince(ts) {
  if (!ts) return null;
  return Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
}

/** Бронь визита для карточки стола: «Бронь 19:00 · Мария · 4 гостя · пришли / ждём». */
function reservationOf(session) {
  const state = reserveState({
    startsAt: session.rv_starts_at, status: session.rv_status || 'new', arrivedAt: session.rv_arrived_at,
    noShowAt: session.rv_no_show_at, sessionId: session.id,
  });
  return {
    id: session.reservation_id,
    time: clockText(session.rv_starts_at, RESERVE_TZ),
    guestName: session.reserve_guest_name || '',
    guests: session.rv_guests || session.guest_count || 1,
    comment: session.rv_comment || '',
    state,
    stateLabel: STATE_LABELS[state],
    arrived: state === 'arrived',
  };
}

export function mapSession({ session, restaurant, items, guests = [] }, extra = {}) {
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
    // Заказ открыт на кассе iiko (импорт) — у официанта пометка «открыт на кассе»
    openedInIiko: Boolean(session.opened_in_iiko),
    iikoWaiterName: session.iiko_waiter_name || null,
    // Удалено или отменено на кассе после отправки — гость видит это в истории заказа
    removedItems: (session.removed_items || []).map((r) => ({ name: r.name, quantity: r.quantity, at: r.at, guestId: r.guestId || null, guestName: r.guestName || null })),
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
    // Визит создан под бронь из iiko: время, имя и число гостей, пришли ли (телефон — только в списке «Брони»)
    reservation: session.reservation_id ? reservationOf(session) : null,
    guestsAtTable: (session.guest_ids || []).length || (session.guest_id ? 1 : 0),
    guests: tableGuests({ guests }),
    readyCount: mapped.filter((i) => i.isReady).reduce((s, i) => s + i.quantity, 0),
    guestCount: session.guest_count || 1,
    total: parseFloat(session.total || 0),
    sentTotal: lockedTotal,
    pendingCount: pending.reduce((s, i) => s + i.quantity, 0),
    createdAt: session.created_at,
    cartReadyAt: session.cart_ready_at,
    sentToProductionAt: session.sent_to_production_at,
    billRequestedAt: session.bill_requested_at,
    billRequests: session.bill_requests || [],
    seatNames: session.seat_names || {},
    paidAt: session.paid_at,
    lastGuestActivityAt: session.last_guest_activity_at,
    waitingMinutes,
    isOverdue: waitingMinutes != null && waitingMinutes * 60000 >= WAITER_RESPONSE_SLA_MS,
    lockedBy: session.locked_until && new Date(session.locked_until) > new Date() ? session.locked_by : null,
    waiterId: session.waiter_id || null,
    waiterName: session.waiter_id ? (session.waiter_name || 'Официант') : null,
    waiterAssignedAt: session.waiter_id ? session.waiter_assigned_at || null : null,
    canGuestRemoveItems: !isPaid,
    canGuestSubmit: !isPaid && pending.length > 0,
    canGuestPay: PAYMENTS_ENABLED && PAYABLE.includes(wf) && !isPaid && parseFloat(session.total || 0) > 0,
    paymentsEnabled: PAYMENTS_ENABLED,
    iikoStatus: session.iiko_status || null,
    kitchenStatus: session.kitchen_status || null,
    kitchenLabel: KITCHEN_LABELS[session.kitchen_status] || null,
    kitchenStatusAt: session.iiko_status_at || null,
    canRequestBill: !isPaid && mapped.some((i) => i.isLocked) && wf !== WORKFLOW.BILL_REQUESTED,
    isPaid,
    items: mapped,
    ...extra,
  };
}

export async function getSessionView(sessionId) {
  const ctx = await requireContext(sessionId);
  const [{ rows }, { rows: paid }] = await Promise.all([
    pool.query('SELECT rating FROM visit_feedback WHERE session_id = $1', [sessionId]),
    pool.query(
      "SELECT amount, guest_ids FROM table_payments WHERE session_id = $1 AND method = 'cloudpayments' AND status = 'completed'",
      [ctx.session.id],
    ),
  ]);
  // Кухня, оплаченная онлайн: весь стол или отмеченные гости (гостю не показываем её к оплате повторно)
  const onlinePaid = {
    wholeTable: paid.some((p) => !p.guest_ids),
    guestIds: [...new Set(paid.flatMap((p) => (p.guest_ids || []).map(String)))],
    amount: fromKop(sumKop(paid, (p) => p.amount)),
  };
  const view = mapSession(ctx, { feedbackLeft: Boolean(rows[0]), feedbackRating: rows[0]?.rating || null, onlinePaid });
  // Стоп-лист по неотправленным позициям: официант видит до отправки на кухню, что заказать нельзя
  const index = await menuIndex(ctx.restaurant).catch(() => null);
  if (index) {
    for (const i of view.items) {
      if (i.isLocked) continue;
      const p = index.get(String(i.iikoProductId)) || index.get(String(i.productId));
      if (p?.isInStopList) i.isStopped = true;
      else if (p?.balance) i.stopBalance = p.balance;
    }
    // Алкоголь: 18+ на позициях и правила точки над заказом (официант видит до принятия)
    for (const i of view.items) {
      if (index.get(String(i.iikoProductId))?.alcohol || index.get(String(i.productId))?.alcohol) i.isAlcohol = true;
    }
    view.alcohol = alcoholView(index.alcoRules, view.items);
  }
  await attachCookInfo(view, ctx.restaurant).catch(() => {});
  view.stoppedPending = view.items.filter((i) => i.isStopped).map((i) => i.name);
  view.stopListUpdatedAt = stopListLoadedAt();
  return view;
}

// ── Вход по QR ──────────────────────────────────────────────────────────────

function normalizeTable(tableNumber, restaurant) {
  const t = String(tableNumber || '').trim();
  if (!/^[0-9A-Za-zА-Яа-я-]{1,10}$/.test(t)) throw httpError(400, 'Некорректный номер стола');
  const n = Number(t);
  if (/^\d+$/.test(t)) {
    if (restaurant.tables_count && (n < 1 || n > restaurant.tables_count)) throw httpError(404, `Стол №${t} не найден в ресторане`);
    return String(n); // «07» и «7» — один стол (одна сессия, одна подпись QR)
  }
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
export async function enterTable({
  restaurantSlug, tableNumber, guest, previousSessionId = null, join = false, name = '', qrKey = null, byStaff = false,
}) {
  const restaurant = await resolveRestaurant(restaurantSlug);
  const table = normalizeTable(tableNumber, restaurant);

  let session = await findOpenSession(restaurant.id, table);
  // ТЗ: гость не видит чужой стол без QR. С QR_SIGNED_REQUIRED за стол садятся только по подписанному QR;
  // гость, который уже сидит за этим столом (перезагрузил страницу), входит без подписи.
  const seated = Boolean(guest && session && (session.guest_ids || []).includes(guest.id) && session.payment_status !== 'paid');
  // Официант открывает стол сам (гость без QR позвал его) — подпись QR не нужна
  if (!byStaff && !seated && !isValidQrKey(restaurant.slug, table, qrKey) && await qrSignedRequired()) {
    throw httpError(403, 'Отсканируйте QR-код на столе, чтобы открыть заказ', { code: 'QR_REQUIRED' });
  }
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
    // За столом уже есть гости или заказ — сначала спрашиваем, присоединиться ли к ним
    if (!known && !isNew && !join) {
      const ctx = await getSessionContext(session.id);
      if (ctx.guests.length || ctx.items.length) {
        return {
          joinRequired: true,
          tableNumber: table,
          restaurantName: restaurant.name,
          guests: tableGuests(ctx).map((g) => g.name),
          itemsCount: ctx.items.reduce((sum, i) => sum + i.quantity, 0),
          guestName: guest.name || null,
        };
      }
    }
    const cleanName = cleanText(name, 100, { label: 'Имя' });
    if (cleanName && cleanName !== guest.name) {
      await pool.query('UPDATE guests SET name = $2 WHERE id = $1', [guest.id, cleanName]);
      guest.name = cleanName;
      if (known) {
        await pool.query('UPDATE table_order_items SET guest_name = $3 WHERE session_id = $1 AND guest_id = $2', [session.id, guest.id, cleanName]);
      }
    }
    if (!known) {
      // Каждый присоединившийся — ещё один гость в заказе. Атомарно: при двойном нажатии второй запрос
      // не найдёт строку (гость уже в guest_ids) и не продублирует гостя, визит и уведомление
      const { rowCount: joined } = await pool.query(
        `UPDATE table_sessions SET
           guest_id = COALESCE(guest_id, $2),
           guest_ids = array_append(guest_ids, $2),
           guest_count = GREATEST(guest_count, cardinality(guest_ids) + 1),
           last_guest_activity_at = NOW(),
           updated_at = NOW()
         WHERE id = $1 AND NOT ($2 = ANY(guest_ids))`,
        [session.id, guest.id],
      );
      if (joined) await pool.query(
        'UPDATE guests SET visits_count = visits_count + 1, last_visit_at = NOW() WHERE id = $1',
        [guest.id],
      );
      const isLead = !session.guest_id;
      const who = guest.name || 'Гость';
      const visits = guest.visitsCount ? ` · визитов: ${guest.visitsCount + 1}` : ' · первый визит';
      // Визит создан под бронь, гость отсканировал QR: «Пришли гости по брони» вместо обычного «гость за столом»
      const byReservation = joined ? await arriveByQr(session).catch((e) => (console.warn('бронь:', e.message), false)) : false;
      if (joined && !byReservation) await createWaiterNotification({
        restaurantId: restaurant.id,
        sessionId: session.id,
        tableNumber: table,
        type: NOTIFY_TYPES.GUEST_SEATED,
        title: `Стол №${table}`,
        body: isLead
          ? `${who}: за столом, открыто меню${visits}`
          : `К столу присоединился гость: ${who} (место ${(session.guest_ids || []).length + 1})`,
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

/**
 * Позиции корзины по вариантам: одно блюдо с разным размером/модификаторами — разные строки.
 * Ключ — выбор как его прислал гость (у отправленных строк он совпадает с сохранённым);
 * проверка выбора и цена — только для неотправленной части (priceVariant), отправленное не перепроверяется.
 */
function aggregateCart(cartItems) {
  const map = new Map();
  for (const item of cartItems || []) {
    const key = String(item.iikoProductId || item.productId || '');
    if (!key) continue;
    if (!UUID_RE.test(key)) {
      throw httpError(400, `«${String(item.name || 'Позиция').slice(0, 60)}» нельзя заказать через меню — позовите официанта`);
    }
    const qty = Math.max(0, Math.floor(Number(item.quantity) || 0));
    const sizeId = item.sizeId ? String(item.sizeId) : null;
    const modifiers = (Array.isArray(item.modifiers) ? item.modifiers : [])
      .map((m) => ({ id: String(m?.id || ''), groupId: m?.groupId ?? null, amount: Math.floor(Number(m?.amount ?? 1) || 0) }))
      .filter((m) => m.id && m.amount > 0).slice(0, 40);
    const vkey = variantKey(key, sizeId, modifiers);
    const prev = map.get(vkey);
    if (prev) prev.quantity += qty;
    else {
      map.set(vkey, {
        productId: item.productId ? String(item.productId) : null,
        iikoProductId: key,
        sizeId,
        modifiers,
        // название — только для текста ошибки; цену и название в заказ ставит сервер по меню (priceLine)
        name: cleanTextLoose(item.name, 300) || 'Позиция',
        quantity: qty,
        // Курс подачи 1–3 (гость выбирает в корзине); undefined — не менять
        course: item.course === undefined ? undefined : (Number(item.course) >= 1 && Number(item.course) <= 3 ? Number(item.course) : null),
      });
    }
  }
  return map;
}

/** Название строки заказа с выбором гостя: «Вок с курицей (Соус терияки)» — так видят официант и касса. */
export const lineName = (name, variant) => (variant?.text ? `${name} (${variant.text})`.slice(0, 300) : name);

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
async function writeGuestCart(client, ctx, cartItems, guestId, { ageConfirmed = false } = {}) {
  const { session } = ctx;
  // У каждого гостя своя корзина: трогаем только его позиции, чужие и добавленные официантом — нет
  guestId = guestId || null;
  const items = ctx.items.filter((i) => (i.guest_id || null) === guestId);
  const me = tableGuests(ctx).find((g) => g.id === guestId);
  if (session.payment_status === 'paid') throw httpError(409, 'Счёт уже оплачен — отсканируйте QR, чтобы начать новый заказ');
  assertOpen(session);

  const incoming = aggregateCart(cartItems);
  const index = await menuIndex(ctx.restaurant);
  const lockedQty = new Map();
  for (const row of items.filter((i) => i.is_locked)) {
    const key = rowVariantKey(row);
    lockedQty.set(key, (lockedQty.get(key) || 0) + row.quantity);
  }
  for (const [key, qty] of lockedQty) {
    const inc = incoming.get(key)?.quantity ?? 0;
    if (inc < qty) {
      throw httpError(403, 'Нельзя убрать блюда, которые уже готовятся. Позовите официанта.');
    }
  }

  // Строки обновляются на месте (ID не меняются): официант, открывший стол, видит те же строки, и его сохранение
  // не задваивает и не затирает корзину гостя. Несколько строк одного варианта (официант развёл по местам) не трогаем,
  // пока их сумма не изменилась.
  const prevPending = new Map();
  for (const row of items.filter((i) => !i.is_locked)) {
    const k = rowVariantKey(row);
    if (!prevPending.has(k)) prevPending.set(k, []);
    prevPending.get(k).push(row);
  }
  const nextBatch = Math.max(0, ...ctx.items.filter((i) => i.is_locked).map((i) => i.batch_no)) + 1;
  const sources = await productSourceMap(ctx.restaurant.id, [...new Set([...incoming.values()].map((l) => l.iikoProductId))]);
  const keep = new Set();

  for (const [vkey, line] of incoming) {
    const key = line.iikoProductId;
    const pendingQty = line.quantity - (lockedQty.get(vkey) || 0);
    if (pendingQty <= 0) continue;
    const rows = prevPending.get(vkey) || [];
    const prevQtySum = rows.reduce((n, r) => n + r.quantity, 0);
    const priced = priceLine(index, key, { qty: pendingQty, prevQty: prevQtySum, clientName: line.name });
    const entry = index.get(key);
    // Алкоголь: только в часы продажи точки и с подтверждением 18+ (в этом запросе или у уже сохранённой строки)
    if (entry.alcohol) {
      assertAlcoSale(index.alcoRules);
      assertAgeConfirmed(index.alcoRules, ageConfirmed || (rows.length > 0 && rows.every((r) => r.age_confirmed_at)));
    }
    const ageStamp = entry.alcohol && ageConfirmed;
    const v = entry.sizes.length || entry.groups.length || line.sizeId || line.modifiers.length
      ? priceVariant(entry, key, { sizeId: line.sizeId, modifiers: line.modifiers }) : null;
    const price = v ? v.price : priced.price;
    const course = line.course !== undefined ? line.course : (rows[0]?.course || null);
    if (rows.length && prevQtySum === pendingQty && (line.course === undefined || rows.every((r) => (r.course || null) === course))) {
      // Ничего не изменилось — строки (и места, расставленные официантом) остаются как есть; цену обновляем по меню
      for (const r of rows) {
        keep.add(r.id);
        if (parseFloat(r.price) !== price) {
          await client.query('UPDATE table_order_items SET price = $2, line_total = $2 * quantity, updated_at = NOW() WHERE id = $1', [r.id, price]);
        }
        if (ageStamp && !r.age_confirmed_at) await client.query('UPDATE table_order_items SET age_confirmed_at = NOW() WHERE id = $1', [r.id]);
      }
      continue;
    }
    if (rows.length) {
      const [first] = rows;
      keep.add(first.id);
      await client.query(
        `UPDATE table_order_items SET name = $2, price = $3, quantity = $4, line_total = $5, course = $6,
           size_id = $7, size_name = $8, modifiers = $9, options_text = $10,
           age_confirmed_at = CASE WHEN $11 THEN COALESCE(age_confirmed_at, NOW()) ELSE age_confirmed_at END, updated_at = NOW() WHERE id = $1`,
        [first.id, lineName(priced.name, v), price, pendingQty, price * pendingQty, course,
          v?.sizeId || null, v?.sizeName || null, v?.mods.length ? JSON.stringify(v.mods) : null, v?.text || null, ageStamp],
      );
      continue;
    }
    await client.query(
      `INSERT INTO table_order_items
         (session_id, product_id, iiko_product_id, name, price, quantity, line_total, seat_number, course, batch_no, is_locked,
          guest_id, guest_name, source, size_id, size_name, modifiers, options_text, age_confirmed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,FALSE,$11,$12,$13,$14,$15,$16,$17, CASE WHEN $18 THEN NOW() END)`,
      [session.id, line.productId, key, lineName(priced.name, v), price, pendingQty, price * pendingQty,
        me?.seat || null, course, nextBatch,
        guestId, me?.name || null, sources.get(key) || 'main',
        v?.sizeId || null, v?.sizeName || null, v?.mods.length ? JSON.stringify(v.mods) : null, v?.text || null, ageStamp],
    );
  }
  const drop = items.filter((i) => !i.is_locked && !keep.has(i.id)).map((i) => i.id);
  if (drop.length) await client.query('DELETE FROM table_order_items WHERE id = ANY($1::uuid[])', [drop]);
  return recalcTotal(client, session.id);
}

/** Визит открыт: в закрытый (официант закрыл стол, 12 часов без активности) гость ничего не добавляет */
export function assertOpen(session) {
  if (session.status !== 'open') throw httpError(409, 'Визит закрыт — отсканируйте QR-код, чтобы начать новый заказ');
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
export async function saveGuestCart(sessionId, cartItems, guestId, { ageConfirmed = false } = {}) {
  await withSessionMutex(sessionId, () => withTransaction(async (client) => {
    const ctx = await lockSession(client, sessionId);
    await writeGuestCart(client, ctx, cartItems, guestId, { ageConfirmed });
    const wf = ctx.session.workflow_status;
    const next = wf === WORKFLOW.BROWSING ? WORKFLOW.BUILDING_CART : wf;
    await client.query(
      `UPDATE table_sessions SET workflow_status = $2, last_guest_activity_at = NOW() WHERE id = $1`,
      [sessionId, next],
    );
  }));
  return getSessionView(sessionId);
}

/** Окно дедупликации уведомления «Новый заказ» при параллельных отправках корзины, с */
const SUBMIT_DEDUP_SEC = 10;

/** «Передать официанту» / «Передать дозаказ» (кейсы 6, 9). */
export async function submitToWaiter(sessionId, cartItems, guestId, { ageConfirmed = false } = {}) {
  let notify = null;
  await withSessionMutex(sessionId, () => withTransaction(async (client) => {
    const ctx = await lockSession(client, sessionId);
    assertOpen(ctx.session);
    if (Array.isArray(cartItems)) await writeGuestCart(client, ctx, cartItems, guestId, { ageConfirmed });
    const fresh = await getSessionContext(sessionId, client);
    const pending = fresh.items.filter((i) => !i.is_locked);
    if (!pending.length) throw httpError(400, 'Корзина пуста — добавьте блюда из меню');
    // Бизнес-ланч уже в корзине, а время вышло — официанту его не передаём
    const pendingIndex = await menuIndex(fresh.restaurant);
    const pendingKeys = pending.map((i) => ({ key: i.iiko_product_id || i.product_id }));
    assertLunchRows(pendingIndex, pendingKeys);
    assertHoursRows(pendingIndex, pendingKeys); // раздел закрылся по времени («Завтраки до 12:00») — 409
    // Алкоголь уже в корзине, а продажа закрылась — официанту его не передаём
    if (pending.some((i) => pendingIndex.get(String(i.iiko_product_id || i.product_id))?.alcohol)) assertAlcoSale(pendingIndex.alcoRules);

    const isReorder = fresh.items.some((i) => i.is_locked);
    const status = isReorder ? WORKFLOW.REORDER_PENDING : WORKFLOW.CART_READY;
    // Параллельные «Передать официанту» (двойной тап, две вкладки, повтор запроса): то же состояние за последние
    // ~10 с — официант уже уведомлён, второе и третье «Новый заказ» не шлём
    const { rows: dup } = await client.query(
      `SELECT 1 FROM table_sessions WHERE id = $1 AND workflow_status = $2 AND cart_ready_at > NOW() - INTERVAL '${SUBMIT_DEDUP_SEC} seconds'`,
      [sessionId, status],
    );
    await client.query(
      `UPDATE table_sessions SET workflow_status = $2, cart_ready_at = NOW(), wait_notified_at = NULL,
         last_guest_activity_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [sessionId, status],
    );
    if (dup.length) return;
    const sum = fromKop(sumKop(pending, (i) => i.line_total));
    notify = {
      restaurantId: fresh.restaurant.id,
      sessionId,
      tableNumber: fresh.session.table_number,
      type: isReorder ? NOTIFY_TYPES.REORDER_INTENT : NOTIFY_TYPES.CART_READY,
      // Дозаказ — только новые позиции, не весь стол; детали — в открытом столе
      ...(isReorder
        ? reorderText({ table: fresh.session.table_number, lines: pending.map((i) => ({ name: i.name, qty: i.quantity })) })
        : newOrderText({ table: fresh.session.table_number, count: pending.length, sum })),
      payload: { sessionId, itemsCount: pending.length, sum, isReorder, lines: pending.map((i) => ({ name: i.name, qty: i.quantity })) },
      mergeLines: isReorder,
    };
  }));
  if (notify) await createWaiterNotification(notify);
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

/**
 * Запрос счёта. Гость выбирает, за кого платит: весь стол (по умолчанию), только свой заказ
 * или отмеченных гостей (например, за себя и свою спутницу). Официант видит, кто за кого и сколько.
 */
const BILL_METHODS = { card: 'картой', cash: 'наличными' };

/**
 * Гость просит счёт: способ (картой официанту / наличными) и за кого (весь стол или отмеченные гости).
 * part: 'bar' — после онлайн-оплаты кухни официанту остаётся только бар (он оплачивается картой).
 */
export async function requestBill(sessionId, { guest = null, guestIds = null, method = null, part = null } = {}) {
  const ctx = await requireContext(sessionId);
  if (ctx.session.payment_status === 'paid') throw httpError(409, 'Счёт уже оплачен');
  assertOpen(ctx.session);
  // В счёт — только то, что уже передано на кухню: черновики корзин гостей не оплачиваются
  const sent = ctx.items.filter((i) => i.is_locked);
  if (!sent.length) throw httpError(400, 'В заказе пока нет блюд, переданных на кухню');
  const guests = tableGuests(ctx);
  const ids = Array.isArray(guestIds) ? [...new Set(guestIds.map(String))].filter((id) => guests.some((g) => String(g.id) === id)) : [];
  const whole = !ids.length || ids.length >= guests.length;
  const barOnly = part === 'bar';
  const pay = BILL_METHODS[method] ? method : null;
  const lines = sent.filter((i) => (!barOnly || (i.source || 'main') !== 'main') && (whole || ids.includes(String(i.guest_id))));
  const amount = fromKop(sumKop(lines, (i) => i.line_total));
  const names = whole ? [] : ids.map((id) => guests.find((g) => String(g.id) === id)?.name || 'Гость');
  const by = guest ? (guests.find((g) => String(g.id) === String(guest.id))?.name || guest.name || 'Гость') : null;
  const request = {
    at: new Date().toISOString(), by, byGuestId: guest?.id || null, scope: whole ? 'table' : 'guests',
    guestIds: whole ? [] : ids, names, amount, method: pay, part: barOnly ? 'bar' : 'all',
  };
  const who = whole ? 'за весь стол' : names.length === 1 && names[0] === by ? `только ${by}` : names.join(' и ');
  const what = barOnly ? 'бар (кухня оплачена онлайн)' : who;
  const bill = billText({ table: ctx.session.table_number, method: pay, amount, by, scope: whole ? 'table' : 'guests', names });
  const body = bill.body + (barOnly ? ' · бар (кухня оплачена онлайн)' : '');
  // Повторное нажатие «Попросить счёт» с тем же выбором — официант уже знает, второй раз не зовём
  if (await recentlyNotified(sessionId, NOTIFY_TYPES.BILL_REQUESTED, bill.title, body, CALL_COOLDOWN_SEC)) return getSessionView(sessionId);
  await pool.query(
    `UPDATE table_sessions SET workflow_status = $2, bill_requested_at = NOW(), wait_notified_at = NULL,
       bill_requests = COALESCE(bill_requests, '[]'::jsonb) || $3::jsonb,
       last_guest_activity_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [sessionId, WORKFLOW.BILL_REQUESTED, JSON.stringify([request])],
  );
  await createWaiterNotification({
    restaurantId: ctx.restaurant.id,
    sessionId,
    tableNumber: ctx.session.table_number,
    type: NOTIFY_TYPES.BILL_REQUESTED,
    title: bill.title,
    body,
    payload: { sessionId, total: parseFloat(ctx.session.total), amount, guestIds: request.guestIds, method: pay, part: request.part },
  });
  return getSessionView(sessionId);
}

/** Повтор вызова в пределах паузы: то же уведомление этого стола уже ушло официанту */
const CALL_COOLDOWN_SEC = 60;
async function recentlyNotified(sessionId, type, title, body, seconds) {
  const { rows } = await pool.query(
    `SELECT 1 FROM waiter_notifications
     WHERE session_id = $1 AND type = $2 AND title = $3 AND body = $4 AND created_at > NOW() - ($5 || ' seconds')::interval LIMIT 1`,
    [sessionId, type, title, body, String(seconds)],
  );
  return rows.length > 0;
}

export async function callWaiter(sessionId, reason = 'general', comment = '') {
  const ctx = await requireContext(sessionId);
  if (reason === 'bill' && ctx.items.length && ctx.session.payment_status !== 'paid') {
    return { ok: true, message: 'Официант скоро принесёт счёт', session: await requestBill(sessionId) };
  }
  const text = CALL_REASONS[typeof reason === 'string' ? reason : 'general'] || CALL_REASONS.general;
  const cleanComment = cleanText(comment, 200, { multiline: true, label: 'Комментарий' });
  const call = callText({ table: ctx.session.table_number, reasonText: text.charAt(0).toLowerCase() + text.slice(1), comment: cleanComment });
  if (await recentlyNotified(sessionId, NOTIFY_TYPES.CALL_WAITER, call.title, call.body, CALL_COOLDOWN_SEC)) {
    return { ok: true, message: 'Официант уже вызван — скоро подойдёт', tableNumber: ctx.session.table_number, repeated: true };
  }
  await createWaiterNotification({
    restaurantId: ctx.restaurant.id,
    sessionId,
    tableNumber: ctx.session.table_number,
    type: NOTIFY_TYPES.CALL_WAITER,
    ...call,
    payload: { sessionId, reason, guestName: ctx.session.guest_name },
  });
  await pool.query('UPDATE table_sessions SET last_guest_activity_at = NOW() WHERE id = $1', [sessionId]);
  return { ok: true, message: 'Официант скоро подойдёт', tableNumber: ctx.session.table_number };
}

// ── Оплата (кейс 10) ────────────────────────────────────────────────────────

const PAYMENT_METHODS = ['card', 'sbp', 'apple_pay', 'google_pay'];

// Демо-оплата без платёжного провайдера (отмечает счёт оплаченным сразу) — только для локальной разработки.
// На проде оплата идёт через CloudPayments (/pay/start → /pay/confirm) или официанту.
const DEMO_PAYMENTS = process.env.DEMO_PAYMENTS === 'true' && process.env.NODE_ENV !== 'production';

export async function payBill(sessionId, { method = 'card', tipAmount = 0 } = {}) {
  if (!PAYMENTS_ENABLED || !DEMO_PAYMENTS) {
    throw httpError(403, 'Оплата через меню — онлайн-оплатой или официанту: нажмите «Попросить счёт»');
  }
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
    title: `Стол ${ctx.session.table_number} · Оплачено`,
    body: `${rubText(amount)}${tip ? ` + чаевые ${rubText(tip)}` : ''} · ${method}${iikoNote}`,
    payload: { sessionId, amount, tip, method },
  });
  return getSessionView(sessionId);
}

// ── Отзыв (кейс 11) ─────────────────────────────────────────────────────────

export async function submitFeedback(sessionId, { rating, comment = '', guestId = null }) {
  const cleanComment = cleanText(comment, 2000, { multiline: true, label: 'Отзыв' });
  const ctx = await requireContext(sessionId);
  // Отзыв — о визите: оставить его можно только после того, как заказ ушёл на кухню
  if (!ctx.items.some((i) => i.is_locked)) throw httpError(400, 'Отзыв можно оставить после заказа');
  const r = Math.round(Number(rating));
  if (!(r >= 1 && r <= 5)) throw httpError(400, 'Оценка от 1 до 5');
  const { rowCount } = await pool.query(
    `INSERT INTO visit_feedback (session_id, rating, comment, guest_id) VALUES ($1, $2, $3, $4)
     ON CONFLICT (session_id) DO NOTHING`,
    [sessionId, r, cleanComment, guestId],
  );
  if (!rowCount) return { ok: true, alreadySent: true };
  if (r <= 3) {
    await createWaiterNotification({
      restaurantId: ctx.restaurant.id,
      sessionId,
      tableNumber: ctx.session.table_number,
      type: NOTIFY_TYPES.NEGATIVE_FEEDBACK,
      title: `Стол №${ctx.session.table_number} — низкая оценка ${r}/5`,
      body: cleanComment || `Гость ${ctx.session.guest_name || ''} поставил ${r}/5`.trim(),
      payload: { sessionId, rating: r, comment: cleanComment },
    });
  }
  return { ok: true };
}

// ── Фоновые проверки: бездействие гостя и долгое ожидание ───────────────────

/**
 * «Долго готовится»: позиция готовится в COOK_SLOW_FACTOR раз дольше норматива блюда — одно уведомление на позицию.
 * Нет норматива (cookingTime в iiko и мало замеров) — не уведомляем.
 */
async function checkSlowCooking() {
  const { rows } = await pool.query(
    `SELECT i.id, i.session_id, i.iiko_product_id, i.name, i.sent_at, i.cooking_started_at, s.restaurant_id, s.table_number
     FROM table_order_items i JOIN table_sessions s ON s.id = i.session_id
     WHERE s.status = 'open' AND i.is_locked AND i.served_at IS NULL AND i.ready_at IS NULL AND i.cook_slow_notified_at IS NULL
       AND i.kitchen_status IS DISTINCT FROM 'CookingCompleted' AND i.kitchen_status IS DISTINCT FROM 'Served'
       AND i.sent_at IS NOT NULL AND i.sent_at < NOW() - INTERVAL '3 minutes'`,
  );
  const byRestaurant = new Map();
  for (const r of rows) {
    if (!byRestaurant.has(r.restaurant_id)) byRestaurant.set(r.restaurant_id, []);
    byRestaurant.get(r.restaurant_id).push(r);
  }
  for (const [restaurantId, list] of byRestaurant) {
    const { rows: [restaurant] } = await pool.query('SELECT * FROM restaurants WHERE id = $1', [restaurantId]);
    const norms = await loadCookNorms(restaurant, list.map((r) => r.iiko_product_id));
    for (const r of list) {
      const norm = norms.get(String(r.iiko_product_id));
      if (!norm) continue;
      const info = cookInfo({ sentAt: r.sent_at, startedAt: r.cooking_started_at }, norm);
      if (!(info.minutes >= norm.minutes * COOK_SLOW_FACTOR)) continue;
      const { rowCount } = await pool.query(
        'UPDATE table_order_items SET cook_slow_notified_at = NOW() WHERE id = $1 AND cook_slow_notified_at IS NULL', [r.id]);
      if (!rowCount) continue;
      await createWaiterNotification({
        restaurantId, sessionId: r.session_id, tableNumber: r.table_number, type: NOTIFY_TYPES.COOK_SLOW,
        ...cookSlowText({ table: r.table_number, name: r.name, minutes: info.minutes }),
        payload: { sessionId: r.session_id, itemId: r.id, norm: norm.minutes },
      });
    }
  }
}

const WAIT_LABELS = { cart_ready: 'Новый заказ', reorder_pending: 'Дозаказ', bill_requested: 'Просит счёт' };

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
       AND (reservation_id IS NULL OR cardinality(guest_ids) > 0) -- стол под бронь, гостей ещё нет — напоминать нечего
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
     RETURNING id, restaurant_id, table_number, workflow_status,
       COALESCE(CASE WHEN workflow_status = 'bill_requested' THEN bill_requested_at END, cart_ready_at) AS waiting_since`,
    [String(WAITER_RESPONSE_SLA_MS)],
  );
  for (const s of waiting) {
    const minutes = Math.max(Math.round(WAITER_RESPONSE_SLA_MS / 60000),
      Math.floor((Date.now() - new Date(s.waiting_since).getTime()) / 60000));
    const wait = waitText({ table: s.table_number, minutes, label: WAIT_LABELS[s.workflow_status] || WORKFLOW_GUEST_LABELS[s.workflow_status] });
    await createWaiterNotification({
      restaurantId: s.restaurant_id,
      sessionId: s.id,
      tableNumber: s.table_number,
      type: NOTIFY_TYPES.WAIT_TOO_LONG,
      ...wait,
      payload: { sessionId: s.id, escalate: true },
    });
  }

  await checkSlowCooking();

  // Блюда готовы, но не вынесены дольше READY_WAIT_MS: одна тревога на стол (по всем его готовым позициям)
  const { rows: stale } = await pool.query(
    `UPDATE table_order_items i SET ready_wait_notified_at = NOW()
     FROM table_sessions s
     WHERE s.id = i.session_id AND s.status = 'open' AND i.is_locked AND i.served_at IS NULL
       AND i.kitchen_status = 'CookingCompleted' AND i.ready_wait_notified_at IS NULL
       AND i.ready_notified_at < NOW() - ($1 || ' milliseconds')::interval
     RETURNING i.session_id, i.name, i.quantity, i.ready_notified_at, s.restaurant_id, s.table_number`,
    [String(READY_WAIT_MS)],
  );
  const bySession = new Map();
  for (const r of stale) {
    if (!bySession.has(r.session_id)) bySession.set(r.session_id, []);
    bySession.get(r.session_id).push(r);
  }
  for (const [sessionId, rows] of bySession) {
    const oldest = Math.min(...rows.map((r) => new Date(r.ready_notified_at).getTime()));
    const minutes = Math.max(1, Math.floor((Date.now() - oldest) / 60000));
    await createWaiterNotification({
      restaurantId: rows[0].restaurant_id,
      sessionId,
      tableNumber: rows[0].table_number,
      type: NOTIFY_TYPES.WAIT_TOO_LONG,
      ...readyWaitText({ table: rows[0].table_number, minutes, lines: rows.map((r) => ({ name: r.name, qty: r.quantity })) }),
      payload: { sessionId, escalate: true, ready: true },
    });
  }
}

/**
 * Статус заказа из iiko: статус заказа и статусы блюд на кухне.
 * Когда блюдо стало «Готово» — официанту уведомление «пора выносить».
 * Оплату/закрытие по данным iiko не отмечаем (закрытие заказов из меню выключено).
 * В демо-режиме (без ключа iiko) кухня имитируется по времени с отправки.
 */
const DEMO_COOK_MS = parseInt(process.env.IIKO_DEMO_COOK_SEC || '45', 10) * 1000;

function demoKitchenStatus(row) {
  const t = Date.now() - new Date(row.sent_at || row.updated_at).getTime();
  if (t < DEMO_COOK_MS / 3) return 'Added';
  if (t < DEMO_COOK_MS) return 'CookingStarted';
  return 'CookingCompleted';
}

/** Заказ источника в iiko не создался: снимаем отметку «отправлено», чтобы официант отправил повторно. */
async function failIikoOrder(ctx, code, src, reason, orderId) {
  const { session } = ctx;
  const where = code === 'main' ? 'кухни' : `«${src.name || code}»`;
  const text = /timeout/i.test(reason)
    ? `Заказ ${where} не дошёл до кассы iiko (касса не на связи) — блюда снова не отправлены, нажмите «В работу» ещё раз`
    : `iiko не создал заказ ${where}: ${reason} — блюда снова не отправлены`;
  // Только строки и запись этого заказа: пока шёл опрос, официант мог уже отправить заново новым заказом
  const { rowCount } = await pool.query(
    `UPDATE table_sessions SET iiko_orders = iiko_orders - $2::text, iiko_last_error = $3,
       iiko_order_id = CASE WHEN $2 = 'main' THEN NULL ELSE iiko_order_id END, updated_at = NOW()
     WHERE id = $1 AND (iiko_orders -> $2::text ->> 'orderId' = $4 OR ($2 = 'main' AND iiko_order_id::text = $4))`,
    [session.id, code, text, String(orderId)],
  );
  if (!rowCount) return;
  await pool.query(
    `UPDATE table_order_items SET is_locked = FALSE, synced_to_iiko = FALSE, sent_at = NULL, kitchen_status = NULL,
       iiko_order_id = NULL, updated_at = NOW()
     WHERE session_id = $1 AND COALESCE(source, 'main') = $2 AND is_locked AND served_at IS NULL
       AND (iiko_order_id IS NULL OR iiko_order_id = $3)`,
    [session.id, code, String(orderId)],
  );
  await createWaiterNotification({
    restaurantId: ctx.restaurant.id, sessionId: session.id, tableNumber: session.table_number,
    type: NOTIFY_TYPES.IIKO_ERROR || 'iiko_error', title: `Стол №${session.table_number} — заказ не дошёл`, body: text,
    payload: { sessionId: session.id, source: code },
  }).catch(() => {});
}

/**
 * Позиции удалили или отменили на кассе iiko (или удалили весь заказ) — убираем их и из стола в меню.
 * Из нашего приложения отправленное не удаляется — только через iiko, менеджером на кассе (в том числе готовое блюдо).
 * Сверка по блюду: живое количество в заказе iiko против наших отправленных строк этого заказа (lib/iiko-order-sync.js).
 * Возвращает удалённое [{ name, quantity }].
 */
async function syncRemovedItems(ctx, code, order, orderId, orders = sessionOrders(ctx.session)) {
  const { session } = ctx;
  const orderDeleted = order.status === 'Deleted';
  if (orderDeleted) {
    // Заказ удалён на кассе — следующая отправка создаст новый (только если это всё ещё наш заказ)
    await pool.query(
      `UPDATE table_sessions SET iiko_orders = iiko_orders - $2::text,
         iiko_order_id = CASE WHEN $2 = 'main' THEN NULL ELSE iiko_order_id END, updated_at = NOW()
       WHERE id = $1 AND (iiko_orders -> $2::text ->> 'orderId' = $3 OR ($2 = 'main' AND iiko_order_id::text = $3))`,
      [session.id, code, String(orderId)],
    );
  }
  if (session.payment_status === 'paid') return [];
  const mine = rowsOfOrder(ctx.items, code, orderId, orders);
  if (!mine.length) {
    if (orderDeleted) await closeIfEmptyImported(ctx);
    return [];
  }
  const alive = orderDeleted ? new Map() : aliveByProduct(normalizeIikoOrder(order).items);
  if (alive.size && !mine.some((r) => alive.has(String(r.iiko_product_id)))) {
    console.warn(`iiko: стол ${session.table_number} (${code}) — позиции заказа не совпали с меню по id, сверку удалений пропускаем`);
    return [];
  }
  const removed = planRemovals(mine, alive, { orderDeleted });
  for (const r of removed) {
    if (r.remaining <= 0) {
      await pool.query('DELETE FROM table_order_items WHERE id = $1', [r.id]);
    } else {
      await pool.query(
        `UPDATE table_order_items SET quantity = $2::int, line_total = ROUND(line_total * $2::int / quantity, 2), updated_at = NOW() WHERE id = $1`,
        [r.id, r.remaining],
      );
    }
  }
  if (removed.length) {
    const at = new Date().toISOString();
    const history = [...(session.removed_items || []), ...removed.map((r) => ({
      name: r.name, quantity: r.quantity, at, guestId: r.guestId, guestName: r.guestName,
    }))].slice(-30);
    await pool.query('UPDATE table_sessions SET removed_items = $2::jsonb WHERE id = $1', [session.id, JSON.stringify(history)]);
    await withTransaction((client) => recalcTotal(client, session.id));
    const where = baseCode(code) === 'main' ? '' : ' (бар)';
    console.log(`iiko: стол ${session.table_number}${where} — на кассе удалено ${removed.length} поз.${orderDeleted ? ', заказ удалён' : ''}`);
    await createWaiterNotification({
      restaurantId: ctx.restaurant.id, sessionId: session.id, tableNumber: session.table_number,
      type: NOTIFY_TYPES.ITEMS_REMOVED,
      title: `Стол №${session.table_number}: на кассе ${orderDeleted ? 'заказ удалён' : 'удалено'}${where}`,
      // Удалили уже оплаченное онлайн — деньги у нас, гостю нужен возврат
      ...removedText({
        table: session.table_number, lines: removed.map((r) => ({ name: r.name, qty: r.quantity })), orderDeleted, where,
        refund: removed.some((r) => r.paidOnline),
      }),
      payload: { sessionId: session.id, source: code, removed },
    }).catch(() => {});
  }
  if (orderDeleted) await closeIfEmptyImported(ctx);
  return removed;
}

/** Заказ, открытый на кассе, удалён целиком и в визите ничего не осталось — закрываем пустой визит. */
async function closeIfEmptyImported(ctx) {
  const { rows } = await pool.query(
    `UPDATE table_sessions SET status = 'closed', workflow_status = 'closed', closed_at = NOW(), locked_by = NULL, locked_until = NULL, updated_at = NOW()
     WHERE id = $1 AND status = 'open' AND opened_in_iiko AND iiko_orders = '{}'::jsonb AND iiko_order_id IS NULL
       AND NOT EXISTS (SELECT 1 FROM table_order_items WHERE session_id = $1) RETURNING id`,
    [ctx.session.id],
  );
  if (rows.length) console.log(`iiko: стол ${ctx.session.table_number} — заказ удалён на кассе, визит закрыт`);
}

/** Размер и модификаторы строки заказа iiko — текстом для показа: «Соус терияки, Сыр ×2». */
function importedLineText(line) {
  return [line.sizeName || null, ...line.modifiers.map((m) => (m.amount > 1 ? `${m.name} ×${m.amount}` : m.name))]
    .filter(Boolean).join(', ').slice(0, 300);
}

/**
 * Дописать в визит позиции заказа iiko, которых у нас нет: официант добавил блюдо на кассе позже (или заказ открыт на кассе —
 * тогда это все его позиции). Строки приходят как уже отправленные: is_locked, iiko_order_id, цены и статус кухни из iiko.
 * Идемпотентно: сверка по количеству блюда в заказе, повторный опрос ничего не добавит.
 * norm — заказ после normalizeIikoOrder.
 */
export async function syncAddedItems(ctx, code, norm, orderId, orders = sessionOrders(ctx.session)) {
  const { session } = ctx;
  if (session.payment_status === 'paid' || session.status !== 'open') return 0;
  const rows = rowsOfOrder(ctx.items, code, orderId, orders);
  const adds = planAdditions(norm.items, rows);
  if (!adds.length) return 0;
  const { rows: known } = await pool.query(
    'SELECT id::text AS id, iiko_id::text AS iiko_id FROM products WHERE restaurant_id = $1 AND iiko_id::text = ANY($2::text[])',
    [session.restaurant_id, [...new Set(adds.map((a) => a.productId))]],
  );
  const catalogId = new Map(known.map((k) => [k.iiko_id, k.id]));
  const batch = Math.max(0, ...ctx.items.filter((i) => i.is_locked).map((i) => i.batch_no)) + 1;
  for (const a of adds) {
    const text = importedLineText(a);
    const unit = a.quantity ? Math.round((a.lineTotal / a.quantity) * 100) / 100 : a.price;
    await pool.query(
      `INSERT INTO table_order_items
         (session_id, product_id, iiko_product_id, name, price, quantity, line_total, batch_no, is_locked, synced_to_iiko,
          sent_at, kitchen_status, source, size_id, size_name, modifiers, options_text, iiko_order_id, from_iiko, ready_notified_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,TRUE,NOW(),$9::text,$10,$11,$12,$13,$14,$15,TRUE,
         CASE WHEN $9::text = 'CookingCompleted' THEN NOW() END)`,
      [session.id, catalogId.get(a.productId) || null, a.productId, (text ? `${a.name} (${text})` : a.name).slice(0, 300),
        unit, a.quantity, a.lineTotal, batch, a.status || null, baseCode(code), a.sizeId, a.sizeName,
        a.modifiers.length ? JSON.stringify(a.modifiers.map((m) => ({ id: m.id, groupId: m.groupId, name: m.name, amount: m.amount, price: m.price }))) : null,
        text || null, String(orderId)],
    );
  }
  await withTransaction((client) => recalcTotal(client, session.id));
  await pool.query(
    `UPDATE table_sessions SET last_guest_activity_at = NOW(), sent_to_production_at = COALESCE(sent_to_production_at, NOW()) WHERE id = $1`,
    [session.id],
  );
  console.log(`iiko: стол ${session.table_number} (${code}) — с кассы добавлено ${adds.length} поз.`);
  return adds.length;
}

/**
 * Все заказы стола закрыты на кассе iiko — гость расплатился там. Закрываем визит в меню, иначе гость мог бы
 * оплатить ещё раз онлайн, а следующие гости попали бы в чужой визит. Оплату записываем как «на кассе».
 */
async function closeIfPaidAtTill(ctx, orders, closedAtTill) {
  const { session } = ctx;
  if (session.payment_status === 'paid' || session.status !== 'open' || !closedAtTill.length) return;
  const live = Object.entries(orders).filter(([, o]) => o?.orderId);
  if (!live.every(([code, o]) => o.closed || closedAtTill.includes(code))) return;
  if (ctx.items.some((i) => !i.is_locked)) return; // гости уже собирают дозаказ — визит не закрываем
  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(line_total), 0)::float AS s FROM table_order_items
     WHERE session_id = $1 AND is_locked AND paid_payment_id IS NULL`,
    [session.id],
  );
  const due = Math.round(rows[0].s * 100) / 100;
  await pool.query(
    `INSERT INTO table_payments (session_id, amount, tip_amount, method, status, paid_at)
     SELECT $1, $2, 0, 'pos', 'completed', NOW()
     WHERE NOT EXISTS (SELECT 1 FROM table_payments WHERE session_id = $1 AND status = 'completed' AND method <> 'cloudpayments')`,
    [session.id, due],
  );
  await pool.query(
    `UPDATE table_sessions SET payment_status = 'paid', status = 'closed', workflow_status = 'paid', paid_at = NOW(),
       closed_at = NOW(), locked_by = NULL, locked_until = NULL, updated_at = NOW()
     WHERE id = $1 AND payment_status <> 'paid'`,
    [session.id],
  );
  await pool.query('UPDATE waiter_notifications SET is_read = TRUE WHERE session_id = $1 AND is_read = FALSE', [session.id]);
  console.log(`iiko: стол ${session.table_number} — счёт закрыт на кассе, визит закрыт (${due} ₽ на кассе)`);
}

/**
 * Статусы заказа из iiko — в очереди визита, чтобы не перезаписать то, что сейчас меняет отправка или оплата.
 * Визит занят — пропускаем: следующий опрос (20 с) досмотрит.
 */
export function refreshFromIiko(sessionId, prefetched = null) {
  if (isSessionBusy(sessionId)) return Promise.resolve();
  return withSessionMutex(sessionId, () => refreshFromIikoNow(sessionId, prefetched));
}

async function refreshFromIikoNow(sessionId, prefetched = null) {
  const demo = isIikoDemo();
  const ctx = await getSessionContext(sessionId);
  const orders = ctx ? sessionOrders(ctx.session) : {};
  if (!ctx || !Object.keys(orders).length || !ctx.session.sent_to_production_at) return;
  try {
    const locked = ctx.items.filter((i) => i.is_locked && !i.served_at);
    let orderStatus = null;
    // Заказы стола: наш (кухня, бар) и заказы с кассы (код «main#ab12cd34») — каждый в своём iiko, статусы блюд по заказу
    const maps = new Map();
    const cooks = new Map(); // сколько готовилось по данным iiko (мин), если iiko отдаёт время печати и готовности
    const closedAtTill = [];
    // Демо без заказа в демо-кассе (прошёл рестарт процесса) — кухню имитируем по времени с отправки
    const simulated = new Set();
    for (const [code, o] of Object.entries(orders)) {
      if (!o?.orderId) continue;
      if (demo && !demoHasOrder(o.orderId)) { simulated.add(code); orderStatus ||= 'New'; continue; }
      const src = await getSource(ctx.restaurant, baseCode(code));
      // Фоновый опрос уже забрал заказы пачкой (prefetched: orderId → ответ iiko) — отдельный запрос не нужен
      const info = prefetched ? prefetched.get(String(o.orderId))
        : ((await withIikoCreds(src.creds, () => getOrdersByIds(src.organization_id, [o.orderId])))?.orders || [])[0];
      // iiko не создал заказ (касса не взяла его вовремя и т. п.) — блюда источника снова «не отправлены»
      if (info?.creationStatus === 'Error') {
        await failIikoOrder(ctx, code, src, info.errorInfo?.message || info.errorInfo?.description || 'iiko не создал заказ', o.orderId);
        continue;
      }
      const order = info?.order || info;
      if (!order) continue;
      // Счёт закрыт на кассе (гость заплатил там) — помечаем; когда закрыты все заказы стола, закрываем и визит
      if (order.status === 'Closed') {
        closedAtTill.push(code);
        if (!o.closed) {
          await pool.query(
            `UPDATE table_sessions SET iiko_orders = jsonb_set(iiko_orders, $2::text[], (iiko_orders->$3) || '{"closed":true}'::jsonb)
             WHERE id = $1 AND iiko_orders -> $3 ->> 'orderId' = $4`,
            [sessionId, [code], code, String(o.orderId)],
          );
        }
        continue;
      }
      // Удалили позиции или весь заказ на кассе — убираем и у нас; дописали на кассе — добавляем
      await syncRemovedItems(ctx, code, order, o.orderId, orders);
      if (order.status === 'Deleted') continue;
      const norm = normalizeIikoOrder(order);
      await syncAddedItems(ctx, code, norm, o.orderId, orders);
      if (code === 'main' || !orderStatus) orderStatus = order.status || info?.creationStatus || null;
      // Для каждого блюда — наименее продвинутый статус среди строк iiko с этим блюдом
      const byProduct = new Map();
      for (const it of norm.items) {
        if (!it.status) continue;
        const prev = byProduct.get(it.productId);
        if (!prev || KITCHEN_ORDER.indexOf(it.status) < KITCHEN_ORDER.indexOf(prev)) byProduct.set(it.productId, it.status);
      }
      maps.set(code, byProduct);
      const cookOfCode = new Map();
      for (const it of order.items || []) {
        if ((it.type || 'Product') !== 'Product' || it.deleted) continue;
        const pid = String(it.product?.id || it.productId || '');
        const cm = pid ? iikoCookMinutes(it) : null;
        if (cm != null) cookOfCode.set(pid, cm);
      }
      cooks.set(code, cookOfCode);
    }
    await closeIfPaidAtTill(ctx, orders, closedAtTill);
    if (!maps.size && !simulated.size) return;
    // Строки, убранные синхронизацией выше, и строки, добавленные с кассы, — по свежему списку
    const fresh0 = (await pool.query('SELECT * FROM table_order_items WHERE session_id = $1 AND is_locked AND served_at IS NULL', [sessionId])).rows;
    locked.splice(0, locked.length, ...fresh0);
    const statusOf = (row) => {
      const code = rowOrderCode(row, orders);
      const st = maps.get(code)?.get(String(row.iiko_product_id)) || null;
      if (st) return st;
      // Демо: блюдо нашего заказа без статуса в демо-кассе или заказ вне демо-кассы — кухня по времени
      return demo && !row.from_iiko && (simulated.has(code) || maps.has(code)) ? demoKitchenStatus(row) : null;
    };
    const cookOf = (row) => cooks.get(rowOrderCode(row, orders))?.get(String(row.iiko_product_id)) ?? null;

    const ready = [];
    for (const row of locked) {
      const st = statusOf(row);
      if (!st) continue;
      if (st !== row.kitchen_status) {
        // Фиксируем время: начали готовить / стало готово; сколько готовилось — по iiko, иначе от «Готовится» (или отправки) до готовности
        await pool.query(
          `UPDATE table_order_items SET kitchen_status = $2::text,
             cooking_started_at = CASE WHEN $2::text = 'CookingStarted' THEN COALESCE(cooking_started_at, NOW()) ELSE cooking_started_at END,
             ready_at = CASE WHEN $2::text = 'CookingCompleted' THEN COALESCE(ready_at, NOW()) ELSE ready_at END,
             cook_minutes = CASE WHEN $2::text = 'CookingCompleted' AND cook_minutes IS NULL
               THEN COALESCE($3::numeric, ROUND((EXTRACT(EPOCH FROM (NOW() - COALESCE(cooking_started_at, sent_at::timestamptz, updated_at::timestamptz))) / 60)::numeric, 2))
               ELSE cook_minutes END
           WHERE id = $1 AND served_at IS NULL`,
          [row.id, st, cookOf(row)],
        );
      }
      if (st === 'CookingCompleted' && !row.ready_notified_at) ready.push(row);
    }
    if (ready.length) {
      await pool.query('UPDATE table_order_items SET ready_notified_at = NOW() WHERE id = ANY($1::uuid[])', [ready.map((r) => r.id)]);
      const t = ctx.session.table_number;
      await createWaiterNotification({
        restaurantId: ctx.restaurant.id,
        sessionId,
        tableNumber: t,
        type: NOTIFY_TYPES.DISH_READY,
        // Только блюда, ставшие готовыми сейчас; несколько за минуту склеиваются в одно уведомление
        ...readyText({ table: t, lines: ready.map((r) => ({ name: r.name, qty: r.quantity })) }),
        payload: { sessionId, itemIds: ready.map((r) => r.id), lines: ready.map((r) => ({ name: r.name, qty: r.quantity })) },
        mergeLines: true,
      });
      notifyOrderReady(sessionId); // Web Push гостям (не чаще раза в 2 мин)
    }

    const fresh = await pool.query(
      'SELECT kitchen_status FROM table_order_items WHERE session_id = $1 AND is_locked = TRUE AND kitchen_status IS NOT NULL',
      [sessionId],
    );
    const statuses = fresh.rows.map((r) => r.kitchen_status);
    let kitchen = null;
    if (statuses.length) {
      kitchen = statuses.reduce((min, st) => (KITCHEN_ORDER.indexOf(st) < KITCHEN_ORDER.indexOf(min) ? st : min));
    }
    await pool.query(
      `UPDATE table_sessions SET iiko_status = $2, kitchen_status = COALESCE($3, kitchen_status), iiko_status_at = NOW()
       WHERE id = $1`,
      [sessionId, orderStatus, kitchen],
    );
  } catch (e) {
    console.warn('refreshFromIiko:', e.response?.data?.errorDescription || e.message);
  }
}

/** Официант вынес блюда: отмечаем «Подано» (готовые позиции или переданные по id). */
export async function markServed(sessionId, itemIds = null) {
  const ids = Array.isArray(itemIds) && itemIds.length ? itemIds.map(String) : null;
  await pool.query(
    `UPDATE table_order_items SET kitchen_status = 'Served', served_at = NOW(), updated_at = NOW()
     WHERE session_id = $1 AND is_locked = TRUE AND served_at IS NULL
       AND ${ids ? 'id::text = ANY($2::text[])' : "kitchen_status = 'CookingCompleted'"}`,
    ids ? [sessionId, ids] : [sessionId],
  );
  const { rows } = await pool.query(
    `SELECT kitchen_status FROM table_order_items WHERE session_id = $1 AND is_locked = TRUE`,
    [sessionId],
  );
  if (rows.length && rows.every((r) => r.kitchen_status === 'Served')) {
    await pool.query(`UPDATE table_sessions SET kitchen_status = 'Served' WHERE id = $1`, [sessionId]);
  }
  await pool.query(
    `UPDATE waiter_notifications SET is_read = TRUE WHERE session_id = $1 AND type = $2`,
    [sessionId, NOTIFY_TYPES.DISH_READY],
  );
  return getSessionView(sessionId);
}

/**
 * Фоновое обновление статусов кухни по всем открытым заказам (из меню и с кассы).
 * Заказы забираем пачкой — один запрос /order/by_id на организацию, а не на каждый стол:
 * иначе при десятках открытых столов iiko упирается в лимит запросов (429) и отказывает всем, включая вход официантов.
 */
export async function refreshKitchenStatuses() {
  if (iikoCoolingDown()) return;
  const { rows } = await pool.query(
    `SELECT id FROM table_sessions
     WHERE status = 'open' AND (iiko_order_id IS NOT NULL OR iiko_orders <> '{}'::jsonb) AND sent_to_production_at IS NOT NULL`,
  );
  if (!rows.length) return;
  const prefetched = isIikoDemo() ? null : await prefetchOrders(rows.map((r) => r.id)).catch((e) => {
    console.warn('кухня: заказы iiko пачкой —', e.response?.status || e.message);
    return null;
  });
  if (!isIikoDemo() && !prefetched) return; // iiko не ответил — по одному не долбим, ждём следующий опрос
  for (const r of rows) await refreshFromIiko(r.id, prefetched);
}

/** Заказы iiko открытых визитов одним запросом на (ключ, организацию): orderId → ответ iiko. */
async function prefetchOrders(sessionIds) {
  const groups = new Map(); // creds|org → { creds, org, ids:Set }
  for (const ctx of await getSessionContexts(sessionIds)) {
    for (const [code, o] of Object.entries(sessionOrders(ctx.session))) {
      if (!o?.orderId) continue;
      const src = await getSource(ctx.restaurant, baseCode(code));
      if (!src?.organization_id) continue;
      const key = `${src.creds || ''}|${src.organization_id}`;
      if (!groups.has(key)) groups.set(key, { creds: src.creds, org: src.organization_id, ids: new Set() });
      groups.get(key).ids.add(String(o.orderId));
    }
  }
  const out = new Map();
  for (const g of groups.values()) {
    const ids = [...g.ids];
    for (let i = 0; i < ids.length; i += 100) {
      const data = await withIikoCreds(g.creds, () => getOrdersByIds(g.org, ids.slice(i, i + 100)));
      for (const info of data?.orders || []) {
        const id = String(info.id || info.order?.id || '');
        if (id) out.set(id, info);
      }
    }
  }
  return out;
}

export { withTransaction, lockSession, recalcTotal, AFTER_KITCHEN };
