/**
 * Оплата стола. Гость выбирает: онлайн (CloudPayments), картой официанту или наличными; и за кого платит
 * (весь стол, свой заказ или отмеченные гости).
 *
 * Онлайн оплачивается только кухня; бар (второй iiko) — картой официанту.
 * Ключи CloudPayments — у каждого ресторана свои (админка → «Оплата»).
 *
 * Колбэк (webhook) от CloudPayments до нас не доходит, поэтому оплату подтверждаем сами:
 *  1) гость платит в виджете CloudPayments по нашему номеру счёта (InvoiceId);
 *  2) после виджета клиент зовёт /pay/confirm — сервер спрашивает CloudPayments (API payments/find) о статусе;
 *  3) фоновая проверка раз в 30 с досматривает платежи, если гость закрыл страницу раньше.
 * Когда кухня оплачена целиком — в iiko кухни вносится оплата и заказ закрывается; бар закрывает официант.
 */
import axios from 'axios';
import { randomUUID } from 'crypto';
import pool from '../db/pool.js';
import { changeOrderPayments, closeTableOrder, iikoRequest, isIikoDemo, withIikoCreds } from '../iiko-client.js';
import { getSource, MAIN } from './sources.js';
import { createWaiterNotification } from './waiter-notifications.js';
import { NOTIFY_TYPES } from '../lib/table-workflow-config.js';

const CP_API = 'https://api.cloudpayments.ru';
const PAID_STATUSES = new Set(['Completed', 'Authorized']);
const FAILED_STATUSES = new Set(['Declined', 'Cancelled', 'Voided']);

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

// ── Настройки ресторана ─────────────────────────────────────────────────────

/** Ключи оплаты ресторана (из админки); запасной вариант — общие секреты сервера. */
export async function paySettings(restaurantId) {
  const { rows } = await pool.query('SELECT * FROM restaurant_payment_settings WHERE restaurant_id = $1', [restaurantId]);
  const r = rows[0] || {};
  const publicId = r.cp_public_id || process.env.CLOUDPAYMENTS_PUBLIC_ID || '';
  const apiSecret = r.cp_api_secret || process.env.CLOUDPAYMENTS_API_SECRET || '';
  return {
    enabled: Boolean(r.online_enabled && publicId && apiSecret),
    onlineEnabled: Boolean(r.online_enabled),
    publicId,
    apiSecret,
    hasSecret: Boolean(apiSecret),
    iikoPaymentTypeId: r.iiko_payment_type_id || process.env.IIKO_PAYMENT_TYPE_ID || '',
  };
}

/** Для админки: секрет не отдаём, только «задан/не задан». */
export async function paySettingsForAdmin(restaurantId) {
  const s = await paySettings(restaurantId);
  return { onlineEnabled: s.onlineEnabled, publicId: s.publicId, hasSecret: s.hasSecret, iikoPaymentTypeId: s.iikoPaymentTypeId, ready: s.enabled };
}

export async function savePaySettings(restaurantId, body = {}) {
  const publicId = String(body.publicId ?? '').trim().slice(0, 100) || null;
  const secret = body.apiSecret != null && String(body.apiSecret).trim() ? String(body.apiSecret).trim() : null;
  const iikoType = String(body.iikoPaymentTypeId ?? '').trim().slice(0, 64) || null;
  await pool.query(
    `INSERT INTO restaurant_payment_settings (restaurant_id, online_enabled, cp_public_id, cp_api_secret, iiko_payment_type_id, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (restaurant_id) DO UPDATE SET online_enabled = EXCLUDED.online_enabled, cp_public_id = EXCLUDED.cp_public_id,
       cp_api_secret = CASE WHEN $6 THEN NULL ELSE COALESCE($4, restaurant_payment_settings.cp_api_secret) END,
       iiko_payment_type_id = EXCLUDED.iiko_payment_type_id, updated_at = NOW()`,
    [restaurantId, Boolean(body.onlineEnabled), publicId, secret, iikoType, Boolean(body.clearSecret)],
  );
  return paySettingsForAdmin(restaurantId);
}

/** Для гостя: можно ли платить онлайн и публичный ID виджета (секрет никогда не уходит клиенту). */
export async function onlinePayConfig(restaurantId) {
  const s = await paySettings(restaurantId);
  return s.enabled ? { provider: 'cloudpayments', publicId: s.publicId, scope: 'kitchen' } : null;
}

// ── Суммы стола ─────────────────────────────────────────────────────────────

async function sessionState(sessionId) {
  const { rows: s } = await pool.query(
    `SELECT s.*, r.name AS restaurant_name, r.id AS rid, r.organization_id AS rorg, r.terminal_group_id AS rtg
       FROM table_sessions s JOIN restaurants r ON r.id = s.restaurant_id WHERE s.id::text = $1`,
    [String(sessionId)],
  );
  if (!s[0]) throw httpError(404, 'Визит не найден');
  const { rows: items } = await pool.query(
    'SELECT is_locked, line_total, source, guest_id FROM table_order_items WHERE session_id = $1', [s[0].id],
  );
  const { rows: pays } = await pool.query(
    "SELECT amount, guest_ids FROM table_payments WHERE session_id = $1 AND status = 'completed' AND method = 'cloudpayments'",
    [s[0].id],
  );
  // Гости, за которых кухня уже оплачена онлайн; null в списке — «весь стол»
  const covered = new Set();
  let wholeTablePaid = false;
  for (const p of pays) {
    if (!p.guest_ids) wholeTablePaid = true;
    else for (const g of p.guest_ids) covered.add(String(g));
  }
  const kitchen = items.filter((i) => (i.source || MAIN) === MAIN);
  const bar = items.filter((i) => (i.source || MAIN) !== MAIN);
  const sum = (list) => Math.round(list.reduce((n, i) => n + parseFloat(i.line_total || 0), 0) * 100) / 100;
  return { session: s[0], items, kitchen, bar, covered, wholeTablePaid, sum };
}

/** Кухня к оплате онлайн: за отмеченных гостей (или весь стол), без уже оплаченного. */
function kitchenDue(st, guestIds) {
  if (st.wholeTablePaid) return { amount: 0, bar: 0 };
  const pick = (i) => (guestIds ? guestIds.includes(String(i.guest_id)) : true) && !st.covered.has(String(i.guest_id));
  return { amount: st.sum(st.kitchen.filter(pick)), bar: st.sum(st.bar.filter((i) => (guestIds ? guestIds.includes(String(i.guest_id)) : true))) };
}

// ── Онлайн-оплата ───────────────────────────────────────────────────────────

/** Начать оплату кухни онлайн: счёт в нашей базе и параметры для виджета CloudPayments. */
export async function startOnlinePayment(sessionId, { tipAmount = 0, guest = null, guestIds = null } = {}) {
  const st = await sessionState(sessionId);
  const settings = await paySettings(st.session.rid);
  if (!settings.enabled) throw httpError(403, 'Онлайн-оплата в этом ресторане пока не подключена — оплатите официанту');
  if (st.session.payment_status === 'paid') throw httpError(409, 'Счёт уже оплачен');
  const ids = Array.isArray(guestIds) && guestIds.length ? guestIds.map(String) : null;
  if (st.kitchen.some((i) => !i.is_locked && (!ids || ids.includes(String(i.guest_id))))) {
    throw httpError(400, 'Часть заказа ещё не передана на кухню — дождитесь официанта или позовите его');
  }
  const due = kitchenDue(st, ids);
  if (due.amount <= 0) throw httpError(400, 'Кухня уже оплачена — напитки бара оплачиваются картой официанту');
  const tip = Math.max(0, Math.round(Number(tipAmount) || 0));
  const invoiceId = `QR-${String(st.session.table_number).replace(/[^\w-]/g, '')}-${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO table_payments (session_id, amount, tip_amount, method, status, invoice_id, guest_id, guest_ids)
     VALUES ($1, $2, $3, 'cloudpayments', 'pending', $4, $5, $6)`,
    [st.session.id, due.amount, tip, invoiceId, guest?.id || null, ids ? JSON.stringify(ids) : null],
  );
  return {
    publicId: settings.publicId,
    invoiceId,
    amount: due.amount + tip,
    kitchenAmount: due.amount,
    barAmount: due.bar,
    currency: 'RUB',
    description: `${st.session.restaurant_name}, стол №${st.session.table_number} — кухня`,
    accountId: guest?.id || undefined,
  };
}

async function findCpPayment(settings, invoiceId) {
  const { data } = await axios.post(`${CP_API}/payments/find`, { InvoiceId: invoiceId }, {
    auth: { username: settings.publicId, password: settings.apiSecret },
    timeout: 15000,
  });
  return data;
}

/** Подтвердить оплату по счёту (спрашиваем CloudPayments); кухня оплачена целиком — закрыть заказ кухни в iiko. */
export async function confirmOnlinePayment(invoiceId) {
  const { rows } = await pool.query(
    `SELECT p.*, s.restaurant_id FROM table_payments p JOIN table_sessions s ON s.id = p.session_id WHERE p.invoice_id = $1`,
    [String(invoiceId)],
  );
  const pay = rows[0];
  if (!pay) throw httpError(404, 'Платёж не найден');
  if (pay.status !== 'pending') return { status: pay.status, sessionId: pay.session_id };
  const settings = await paySettings(pay.restaurant_id);
  if (!settings.publicId || !settings.apiSecret) return { status: 'pending', sessionId: pay.session_id };
  let data;
  try {
    data = await findCpPayment(settings, pay.invoice_id);
  } catch (e) {
    console.warn('CloudPayments:', e.response?.status || '', e.message);
    return { status: 'pending', sessionId: pay.session_id };
  }
  const m = data?.Model;
  if (!data?.Success || !m) return { status: 'pending', sessionId: pay.session_id };
  const expected = parseFloat(pay.amount) + parseFloat(pay.tip_amount || 0);
  if (PAID_STATUSES.has(m.Status) && Number(m.Amount) + 0.01 >= expected) {
    const { rowCount } = await pool.query(
      `UPDATE table_payments SET status = 'completed', transaction_id = $2, paid_at = NOW()
       WHERE id = $1 AND status = 'pending'`,
      [pay.id, String(m.TransactionId || '')],
    );
    if (rowCount) await settleKitchen(pay.session_id, pay);
    return { status: 'completed', sessionId: pay.session_id };
  }
  if (FAILED_STATUSES.has(m.Status)) {
    await pool.query("UPDATE table_payments SET status = 'failed' WHERE id = $1 AND status = 'pending'", [pay.id]);
    return { status: 'failed', sessionId: pay.session_id, reason: m.CardHolderMessage || m.Reason || null };
  }
  return { status: 'pending', sessionId: pay.session_id };
}

const payTypeCache = new Map();
async function paymentTypeFor(src, settings) {
  if (!src.creds && settings.iikoPaymentTypeId) return settings.iikoPaymentTypeId;
  const env = process.env[src.creds ? `IIKO_${src.creds}_PAYMENT_TYPE_ID` : 'IIKO_PAYMENT_TYPE_ID'];
  if (env) return env;
  if (payTypeCache.has(src.organization_id)) return payTypeCache.get(src.organization_id);
  const data = await iikoRequest('/api/1/payment_types', { organizationIds: [src.organization_id] });
  const list = (data?.paymentTypes || []).filter((t) => !t.isDeleted);
  const found = list.find((t) => /онлайн|online|qr|cloud|интернет/i.test(t.name) && t.paymentTypeKind === 'Card')
    || list.find((t) => /онлайн|online|qr|cloud|интернет/i.test(t.name));
  const id = found?.id || null;
  payTypeCache.set(src.organization_id, id);
  return id;
}

/** Кухня оплачена онлайн — сообщаем официанту; если целиком — вносим оплату в iiko кухни и закрываем заказ. */
async function settleKitchen(sessionId, lastPayment) {
  const st = await sessionState(sessionId);
  const { session } = st;
  const settings = await paySettings(session.rid);
  const tip = Math.round(parseFloat(lastPayment?.tip_amount || 0));
  const paidNow = Math.round(parseFloat(lastPayment?.amount || 0));
  const kitchenLeft = kitchenDue(st, null).amount;
  const barTotal = st.sum(st.bar);

  let iikoNote = '';
  if (kitchenLeft <= 0) {
    const orders = { ...(session.iiko_orders || {}) };
    if (session.iiko_order_id && !orders[MAIN]) orders[MAIN] = { orderId: session.iiko_order_id };
    const orderId = orders[MAIN]?.orderId;
    const kitchenSum = st.sum(st.kitchen.filter((i) => i.is_locked));
    if (orderId && kitchenSum > 0 && !isIikoDemo()) {
      const restaurant = { id: session.rid, organization_id: session.rorg, terminal_group_id: session.rtg };
      const src = await getSource(restaurant, MAIN);
      try {
        await withIikoCreds(src.creds, async () => {
          const paymentTypeId = await paymentTypeFor(src, settings);
          if (!paymentTypeId) throw new Error('в iiko нет типа оплаты «Онлайн» — создайте его или укажите ID в админке «Оплата»');
          await changeOrderPayments(src.organization_id, orderId, [{
            paymentTypeKind: 'Card',
            paymentTypeId,
            sum: kitchenSum,
            isProcessedExternally: true,
            isFiscalizedExternally: process.env.IIKO_PAYMENT_FISCALIZED_EXTERNALLY === 'true',
          }]);
          await closeTableOrder(src.organization_id, orderId);
        });
        iikoNote = ' · кухня закрыта в iiko';
      } catch (e) {
        const reason = e.response?.data?.errorDescription || e.response?.data?.message || e.message;
        iikoNote = ' · закройте счёт кухни в iiko вручную';
        await pool.query('UPDATE table_sessions SET iiko_last_error = $2 WHERE id = $1', [session.id, `Закрытие счёта кухни: ${reason}`]);
      }
    }
    // Бара нет — стол оплачен полностью
    if (barTotal <= 0) {
      await pool.query(
        `UPDATE table_sessions SET payment_status = 'paid', status = 'paid', workflow_status = 'paid',
           paid_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [session.id],
      );
    }
  }
  await createWaiterNotification({
    restaurantId: session.rid, sessionId: session.id, tableNumber: session.table_number,
    type: NOTIFY_TYPES.PAYMENT_DONE,
    title: `Стол №${session.table_number} — оплачено онлайн`,
    body: `Кухня ${paidNow} ₽${tip ? ` + чаевые ${tip} ₽` : ''}${kitchenLeft > 0 ? ` · по кухне осталось ${Math.round(kitchenLeft)} ₽` : ''}`
      + `${iikoNote}${barTotal > 0 ? ` · бар ${Math.round(barTotal)} ₽ — принять картой` : ''}`,
    payload: { sessionId: session.id },
  });
}

/** Фоновая проверка незавершённых платежей (гость мог закрыть страницу до подтверждения). */
export async function checkPendingPayments() {
  const { rows } = await pool.query(
    `SELECT invoice_id FROM table_payments WHERE status = 'pending' AND invoice_id IS NOT NULL
       AND created_at < NOW() - INTERVAL '15 seconds' AND created_at > NOW() - INTERVAL '3 hours'
     ORDER BY created_at LIMIT 20`,
  );
  for (const r of rows) {
    try { await confirmOnlinePayment(r.invoice_id); } catch (e) { console.warn('оплата', r.invoice_id, e.message); }
  }
  await pool.query(
    "UPDATE table_payments SET status = 'expired' WHERE status = 'pending' AND created_at < NOW() - INTERVAL '3 hours'",
  );
}
