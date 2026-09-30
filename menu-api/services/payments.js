/**
 * Онлайн-оплата стола через CloudPayments и закрытие заказа в iiko.
 *
 * Колбэк (webhook) от CloudPayments до нас не доходит, поэтому оплату подтверждаем сами:
 *  1) гость платит в виджете CloudPayments по нашему номеру счёта (InvoiceId);
 *  2) после виджета клиент зовёт /pay/confirm — сервер спрашивает CloudPayments (API payments/find) о статусе;
 *  3) фоновая проверка раз в 30 с досматривает платежи, если гость закрыл страницу раньше.
 * Когда оплачен весь стол, в iiko вносится оплата и заказ закрывается — отдельно кухня и бар (свой iiko, своя сумма).
 *
 * Секреты: CLOUDPAYMENTS_PUBLIC_ID, CLOUDPAYMENTS_API_SECRET; тип оплаты iiko — IIKO_PAYMENT_TYPE_ID
 * (бар — IIKO_BAR_PAYMENT_TYPE_ID) или находится сам по названию («онлайн», «QR», «CloudPayments»).
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

export const onlinePayEnabled = () => process.env.PAYMENTS_ENABLED === 'true'
  && Boolean(process.env.CLOUDPAYMENTS_PUBLIC_ID && process.env.CLOUDPAYMENTS_API_SECRET);

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

async function sessionTotals(sessionId) {
  const { rows: s } = await pool.query(
    `SELECT s.*, r.name AS restaurant_name, r.slug AS restaurant_slug, r.id AS rid, r.organization_id AS rorg,
            r.terminal_group_id AS rtg
       FROM table_sessions s JOIN restaurants r ON r.id = s.restaurant_id WHERE s.id::text = $1`,
    [String(sessionId)],
  );
  if (!s[0]) throw httpError(404, 'Визит не найден');
  const { rows: items } = await pool.query(
    'SELECT is_locked, line_total, source FROM table_order_items WHERE session_id = $1', [s[0].id],
  );
  const { rows: paid } = await pool.query(
    "SELECT COALESCE(SUM(amount), 0)::float AS sum FROM table_payments WHERE session_id = $1 AND status = 'completed'",
    [s[0].id],
  );
  const total = items.reduce((n, i) => n + parseFloat(i.line_total || 0), 0);
  const unsent = items.some((i) => !i.is_locked);
  return { session: s[0], items, total, paid: paid[0].sum, remaining: Math.max(0, Math.round((total - paid[0].sum) * 100) / 100), unsent };
}

/** Начать оплату: счёт в нашей базе и параметры для виджета CloudPayments. */
export async function startOnlinePayment(sessionId, { tipAmount = 0, guest = null } = {}) {
  if (!onlinePayEnabled()) throw httpError(403, 'Оплата через меню пока недоступна — попросите счёт у официанта');
  const t = await sessionTotals(sessionId);
  if (t.session.payment_status === 'paid') throw httpError(409, 'Счёт уже оплачен');
  if (t.unsent) throw httpError(400, 'Часть заказа ещё не передана на кухню — дождитесь официанта или позовите его');
  if (t.remaining <= 0) throw httpError(400, 'Нечего оплачивать');
  const tip = Math.max(0, Math.round(Number(tipAmount) || 0));
  const invoiceId = `QR-${String(t.session.table_number).replace(/[^\w-]/g, '')}-${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO table_payments (session_id, amount, tip_amount, method, status, invoice_id, guest_id)
     VALUES ($1, $2, $3, 'cloudpayments', 'pending', $4, $5)`,
    [t.session.id, t.remaining, tip, invoiceId, guest?.id || null],
  );
  return {
    publicId: process.env.CLOUDPAYMENTS_PUBLIC_ID,
    invoiceId,
    amount: t.remaining + tip,
    currency: 'RUB',
    description: `${t.session.restaurant_name}, стол №${t.session.table_number}`,
    accountId: guest?.id || undefined,
  };
}

/** Спросить CloudPayments о платеже по номеру счёта (колбэка нет — проверяем сами). */
async function findCpPayment(invoiceId) {
  const { data } = await axios.post(`${CP_API}/payments/find`, { InvoiceId: invoiceId }, {
    auth: { username: process.env.CLOUDPAYMENTS_PUBLIC_ID, password: process.env.CLOUDPAYMENTS_API_SECRET },
    timeout: 15000,
  });
  return data;
}

/** Подтвердить оплату по счёту; при полной оплате стола — закрыть заказ в iiko. */
export async function confirmOnlinePayment(invoiceId) {
  const { rows } = await pool.query('SELECT * FROM table_payments WHERE invoice_id = $1', [String(invoiceId)]);
  const pay = rows[0];
  if (!pay) throw httpError(404, 'Платёж не найден');
  if (pay.status !== 'pending') return { status: pay.status, sessionId: pay.session_id };
  let data;
  try {
    data = await findCpPayment(pay.invoice_id);
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
    if (rowCount) await settleSession(pay.session_id, pay);
    return { status: 'completed', sessionId: pay.session_id };
  }
  if (FAILED_STATUSES.has(m.Status)) {
    await pool.query("UPDATE table_payments SET status = 'failed' WHERE id = $1 AND status = 'pending'", [pay.id]);
    return { status: 'failed', sessionId: pay.session_id, reason: m.CardHolderMessage || m.Reason || null };
  }
  return { status: 'pending', sessionId: pay.session_id };
}

/** Тип оплаты iiko для организации: из секрета или по названию («онлайн», «QR», «CloudPayments»). */
const payTypeCache = new Map();
async function paymentTypeFor(src) {
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

/** Оплачен весь стол — вносим оплату в iiko и закрываем заказы (кухня и бар отдельно). */
async function settleSession(sessionId, lastPayment) {
  const t = await sessionTotals(sessionId);
  const { session } = t;
  const restaurant = { id: session.rid, organization_id: session.rorg, terminal_group_id: session.rtg };
  const tip = Math.round(parseFloat(lastPayment?.tip_amount || 0));

  if (t.paid + 0.01 < t.total) {
    await createWaiterNotification({
      restaurantId: session.rid, sessionId: session.id, tableNumber: session.table_number,
      type: NOTIFY_TYPES.PAYMENT_DONE,
      title: `Стол №${session.table_number} — частичная оплата`,
      body: `Оплачено онлайн ${Math.round(t.paid)} из ${Math.round(t.total)} ₽${tip ? ` · чаевые ${tip} ₽` : ''}`,
      payload: { sessionId: session.id },
    });
    return;
  }

  await pool.query(
    `UPDATE table_sessions SET payment_status = 'paid', status = 'paid', workflow_status = 'paid',
       paid_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [session.id],
  );

  const orders = { ...(session.iiko_orders || {}) };
  if (session.iiko_order_id && !orders[MAIN]) orders[MAIN] = { orderId: session.iiko_order_id };
  const errors = [];
  if (!isIikoDemo()) {
    for (const [code, o] of Object.entries(orders)) {
      if (!o?.orderId) continue;
      const src = await getSource(restaurant, code);
      const sum = Math.round(t.items.filter((i) => (i.source || MAIN) === code && i.is_locked)
        .reduce((n, i) => n + parseFloat(i.line_total || 0), 0) * 100) / 100;
      if (sum <= 0) continue;
      try {
        await withIikoCreds(src.creds, async () => {
          const paymentTypeId = await paymentTypeFor(src);
          if (!paymentTypeId) throw new Error('в iiko нет типа оплаты «Онлайн» — создайте его или задайте IIKO_PAYMENT_TYPE_ID');
          await changeOrderPayments(src.organization_id, o.orderId, [{
            paymentTypeKind: 'Card',
            paymentTypeId,
            sum,
            isProcessedExternally: true,
            isFiscalizedExternally: process.env.IIKO_PAYMENT_FISCALIZED_EXTERNALLY === 'true',
          }]);
          await closeTableOrder(src.organization_id, o.orderId);
        });
      } catch (e) {
        const reason = e.response?.data?.errorDescription || e.response?.data?.message || e.message;
        errors.push(`${code === MAIN ? 'Кухня' : src.name}: ${reason}`);
      }
    }
  }
  if (errors.length) {
    await pool.query('UPDATE table_sessions SET iiko_last_error = $2 WHERE id = $1', [session.id, `Закрытие счёта: ${errors.join('; ')}`]);
  }
  await createWaiterNotification({
    restaurantId: session.rid, sessionId: session.id, tableNumber: session.table_number,
    type: NOTIFY_TYPES.PAYMENT_DONE,
    title: `Стол №${session.table_number} — оплачено онлайн`,
    body: `${Math.round(t.total)} ₽${tip ? ` + чаевые ${tip} ₽` : ''}${errors.length ? ' · закройте счёт в iiko вручную' : ' · счёт закрыт в iiko'}`,
    payload: { sessionId: session.id, errors },
  });
}

/** Фоновая проверка незавершённых платежей (гость мог закрыть страницу до подтверждения). */
export async function checkPendingPayments() {
  if (!onlinePayEnabled()) return;
  const { rows } = await pool.query(
    `SELECT invoice_id FROM table_payments WHERE status = 'pending' AND invoice_id IS NOT NULL
       AND created_at < NOW() - INTERVAL '15 seconds' AND created_at > NOW() - INTERVAL '3 hours'
     ORDER BY created_at LIMIT 20`,
  );
  for (const r of rows) {
    try { await confirmOnlinePayment(r.invoice_id); } catch (e) { console.warn('оплата', r.invoice_id, e.message); }
  }
  // Незавершённые больше 3 часов назад — отменены (гость не оплатил)
  await pool.query(
    "UPDATE table_payments SET status = 'expired' WHERE status = 'pending' AND created_at < NOW() - INTERVAL '3 hours'",
  );
}
