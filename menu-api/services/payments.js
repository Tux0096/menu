/**
 * Оплата стола. Гость выбирает: онлайн (CloudPayments), картой официанту или наличными; и за кого платит
 * (весь стол, свой заказ или отмеченные гости).
 *
 * Онлайн оплачивается только кухня; бар (второй iiko) — картой официанту.
 * Ключи CloudPayments — у каждого ресторана свои (админка → «Оплата»).
 *
 * Оплату подтверждаем двумя путями, оба идемпотентны:
 *  1) гость платит в виджете CloudPayments по нашему номеру счёта (InvoiceId); после виджета клиент зовёт /pay/confirm —
 *     сервер спрашивает CloudPayments (API payments/find); фоновая проверка раз в 30 с досматривает платежи;
 *  2) вебхуки CloudPayments Check/Pay/Fail/Refund (routes/cloudpayments-webhook.js, подпись HMAC) — та же логика подтверждения.
 * Повторный «Оплатить» на те же строки возвращает тот же счёт; строки, уже оплаченные другим платежом, второй раз
 * не проводятся (статус duplicate + уведомление о возврате).
 * Когда кухня оплачена целиком — в iiko кухни вносится оплата и заказ закрывается; бар закрывает официант.
 */
import { uuidOrNull } from '../lib/uuid.js';
import axios from 'axios';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import pool from '../db/pool.js';
import { changeOrderPayments, closeTableOrder, getOrderSnapshot, iikoRequest, isIikoDemo, withIikoCreds } from '../iiko-client.js';
import { baseCode, rowsOfOrder } from '../lib/iiko-order-sync.js';
import { getSource, MAIN } from './sources.js';
import { createWaiterNotification } from './waiter-notifications.js';
import { NOTIFY_TYPES } from '../lib/table-workflow-config.js';
import { httpError } from '../lib/http.js';
import { withSessionMutex } from '../lib/session-mutex.js';
import { fromKop, sumKop, toKop } from '../lib/money.js';

// Адрес API можно подменить (тесты на моке); по умолчанию — боевой CloudPayments
const CP_API = process.env.CLOUDPAYMENTS_API_URL || 'https://api.cloudpayments.ru';
// Виджет платит одностадийно (pay('charge')) — оплачено только Completed; Authorized — деньги лишь заблокированы
const PAID_STATUSES = new Set(['Completed']);
const FAILED_STATUSES = new Set(['Declined', 'Cancelled', 'Voided']);
// Счёт CloudPayments «в работе» столько минут: 3-D Secure и банк бывают долгими — второй счёт и оплату официанту не даём
const PENDING_BUSY_MIN = 15;

/** Чаевые: целые рубли, не больше суммы счёта и не больше 50 000 ₽ (защита от опечатки «лишний ноль») */
export function clampTip(tipAmount, base) {
  const tip = Math.max(0, Math.round(Number(tipAmount) || 0));
  return Math.min(tip, Math.max(0, Math.round(Number(base) || 0)), 50000);
}

// ── Настройки ресторана ─────────────────────────────────────────────────────

/** Публичный ключ тестового сайта CloudPayments: test_api_…, pk_test… (боевые — pk_…) */
export const isTestPublicId = (id) => /^(test_|pk_test)/i.test(String(id || '').trim());

/** Чек 54-ФЗ (CloudKassir) — за выключателем: по умолчанию в виджет ничего не добавляется */
export const receiptEnabled = () => /^(on|true|1|yes)$/i.test(String(process.env.CLOUDPAYMENTS_RECEIPT || '').trim());
/** Ставки НДС, которые принимает CloudKassir (NULL — «без НДС») */
export const VAT_RATES = [0, 5, 7, 10, 20, 22, 105, 107, 110, 120, 122];

/**
 * Ключи оплаты ресторана (из админки); запасной вариант — общие секреты сервера.
 * Ключи точки перекрывают общие: источник каждого ключа отдаём админке (publicIdSource / secretSource).
 */
export async function paySettings(restaurantId) {
  const { rows } = await pool.query('SELECT * FROM restaurant_payment_settings WHERE restaurant_id = $1', [restaurantId]);
  const r = rows[0] || {};
  const sharedPublicId = process.env.CLOUDPAYMENTS_PUBLIC_ID || '';
  const sharedSecret = process.env.CLOUDPAYMENTS_API_SECRET || '';
  const publicId = r.cp_public_id || sharedPublicId;
  const apiSecret = r.cp_api_secret || sharedSecret;
  return {
    enabled: Boolean(r.online_enabled && publicId && apiSecret),
    onlineEnabled: Boolean(r.online_enabled),
    publicId,
    apiSecret,
    hasSecret: Boolean(apiSecret),
    ownPublicId: r.cp_public_id || '',
    hasOwnSecret: Boolean(r.cp_api_secret),
    sharedPublicId,
    hasSharedSecret: Boolean(sharedSecret),
    publicIdSource: r.cp_public_id ? 'restaurant' : sharedPublicId ? 'shared' : 'none',
    secretSource: r.cp_api_secret ? 'restaurant' : sharedSecret ? 'shared' : 'none',
    iikoPaymentTypeId: r.iiko_payment_type_id || process.env.IIKO_PAYMENT_TYPE_ID || '',
    iikoCashTypeId: r.iiko_cash_type_id || process.env.IIKO_CASH_PAYMENT_TYPE_ID || '',
    iikoCardTypeId: r.iiko_card_type_id || process.env.IIKO_CARD_PAYMENT_TYPE_ID || '',
    receiptTaxation: r.receipt_taxation ?? null,
    receiptVat: r.receipt_vat ?? null,
  };
}

/** Для админки: секрет не отдаём, только «задан/не задан» и откуда ключи. */
export async function paySettingsForAdmin(restaurantId) {
  const s = await paySettings(restaurantId);
  const testMode = String(process.env.CLOUDPAYMENTS_MODE || '').toLowerCase() === 'test';
  const warnings = [];
  if (isTestPublicId(s.publicId)) {
    warnings.push(s.publicIdSource === 'restaurant'
      ? 'Public ID точки — тестовый: он перекрывает общие рабочие ключи, гости не смогут платить по-настоящему. Нажмите «Сбросить ключи точки», если нужны общие.'
      : 'Общий Public ID на сервере тестовый — настоящие платежи не пройдут.');
  } else if (testMode) {
    warnings.push('Сервер в тестовом режиме (CLOUDPAYMENTS_MODE=test) — платежи не настоящие.');
  }
  if (s.publicIdSource === 'restaurant' && s.sharedPublicId && !isTestPublicId(s.sharedPublicId) && isTestPublicId(s.ownPublicId)) {
    warnings.push('Есть рабочие общие ключи, но их перекрывают тестовые ключи этой точки.');
  }
  return {
    onlineEnabled: s.onlineEnabled, publicId: s.publicId, hasSecret: s.hasSecret, ready: s.enabled,
    iikoPaymentTypeId: s.iikoPaymentTypeId, iikoCashTypeId: s.iikoCashTypeId, iikoCardTypeId: s.iikoCardTypeId,
    ownPublicId: s.ownPublicId, hasOwnSecret: s.hasOwnSecret,
    sharedPublicId: s.sharedPublicId, hasSharedSecret: s.hasSharedSecret,
    publicIdSource: s.publicIdSource, secretSource: s.secretSource,
    testKeys: isTestPublicId(s.publicId) || testMode, warnings,
    receipt: { available: receiptEnabled(), taxation: s.receiptTaxation, vat: s.receiptVat, vatRates: VAT_RATES },
  };
}

export async function savePaySettings(restaurantId, body = {}) {
  // В форме поле «Public ID» — собственный ключ точки; пусто — точка берёт общий с сервера
  const publicId = String(body.publicId ?? '').trim().slice(0, 100) || null;
  const secret = body.apiSecret != null && String(body.apiSecret).trim() ? String(body.apiSecret).trim() : null;
  const typeId = (v) => String(v ?? '').trim().slice(0, 64) || null;
  const iikoType = typeId(body.iikoPaymentTypeId);
  // Чек: система налогообложения 0–5 (пусто — чек не отправляется), ставка НДС из списка CloudKassir (пусто — без НДС)
  const prev = await paySettings(restaurantId);
  const taxRaw = body.receiptTaxation === undefined ? prev.receiptTaxation : body.receiptTaxation; // поле не прислали — не меняем
  const taxation = taxRaw === '' || taxRaw == null ? null : Number(taxRaw);
  if (taxation != null && !(Number.isInteger(taxation) && taxation >= 0 && taxation <= 5)) {
    throw httpError(400, 'Система налогообложения — число от 0 до 5');
  }
  const vatRaw = body.receiptVat === undefined ? prev.receiptVat : body.receiptVat;
  const vat = vatRaw === '' || vatRaw == null ? null : Number(vatRaw);
  if (vat != null && !VAT_RATES.includes(vat)) throw httpError(400, `Ставка НДС: пусто (без НДС) или одна из ${VAT_RATES.join(', ')}`);
  await pool.query(
    `INSERT INTO restaurant_payment_settings (restaurant_id, online_enabled, cp_public_id, cp_api_secret, iiko_payment_type_id,
       iiko_cash_type_id, iiko_card_type_id, receipt_taxation, receipt_vat, updated_at)
     VALUES ($1, $2, $3, $4, $5, $7, $8, $9, $10, NOW())
     ON CONFLICT (restaurant_id) DO UPDATE SET online_enabled = EXCLUDED.online_enabled, cp_public_id = EXCLUDED.cp_public_id,
       cp_api_secret = CASE WHEN $6 THEN NULL ELSE COALESCE($4, restaurant_payment_settings.cp_api_secret) END,
       iiko_payment_type_id = EXCLUDED.iiko_payment_type_id, iiko_cash_type_id = EXCLUDED.iiko_cash_type_id,
       iiko_card_type_id = EXCLUDED.iiko_card_type_id, receipt_taxation = EXCLUDED.receipt_taxation,
       receipt_vat = EXCLUDED.receipt_vat, updated_at = NOW()`,
    [restaurantId, Boolean(body.onlineEnabled), publicId, secret, iikoType, Boolean(body.clearSecret),
      typeId(body.iikoCashTypeId), typeId(body.iikoCardTypeId), taxation, vat],
  );
  return paySettingsForAdmin(restaurantId);
}

/** Сбросить ключи точки (Public ID и пароль API): дальше точка использует общие ключи сервера. */
export async function resetPayKeys(restaurantId) {
  await pool.query(
    'UPDATE restaurant_payment_settings SET cp_public_id = NULL, cp_api_secret = NULL, updated_at = NOW() WHERE restaurant_id = $1',
    [restaurantId],
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
       FROM table_sessions s JOIN restaurants r ON r.id = s.restaurant_id WHERE s.id = $1`,
    [uuidOrNull(sessionId)],
  );
  if (!s[0]) throw httpError(404, 'Визит не найден');
  const { rows: items } = await pool.query(
    `SELECT id, name, quantity, is_locked, line_total, source, guest_id, iiko_order_id, paid_payment_id
       FROM table_order_items WHERE session_id = $1`, [s[0].id],
  );
  const kitchen = items.filter((i) => (i.source || MAIN) === MAIN);
  const bar = items.filter((i) => (i.source || MAIN) !== MAIN);
  // Суммы — в целых копейках (lib/money.js), наружу рубли с двумя знаками
  const sum = (list) => fromKop(sumKop(list, (i) => i.line_total));
  // Строки заказа iiko: свой ID или старые строки без него (до этой версии) — в текущем заказе источника
  const inOrder = (list, orderId) => list.filter((i) => i.is_locked && (!i.iiko_order_id || String(i.iiko_order_id) === String(orderId)));
  return { session: s[0], items, kitchen, bar, sum, inOrder };
}

/**
 * Кухня к оплате онлайн: отправленные строки отмеченных гостей (или всего стола), ещё не оплаченные онлайн.
 * Считаем по строкам: гость, оплативший свою часть и потом дозаказавший десерт, должен за десерт.
 */
export function kitchenDue(st, guestIds) {
  const mine = (i) => (guestIds ? guestIds.includes(String(i.guest_id)) : true);
  const lines = st.kitchen.filter((i) => mine(i) && i.is_locked && !i.paid_payment_id);
  return { amount: st.sum(lines), bar: st.sum(st.bar.filter(mine)), lines };
}

/** Онлайн-платёж прошёл — помечаем оплаченные им строки (старые платежи без списка строк — по гостям). q — pool или клиент транзакции. */
async function markPaidLines(pay, q = pool) {
  const ids = Array.isArray(pay.item_ids) ? pay.item_ids : null;
  if (ids?.length) {
    await q.query(
      'UPDATE table_order_items SET paid_payment_id = $2 WHERE id = ANY($1::uuid[]) AND paid_payment_id IS NULL',
      [ids, pay.id],
    );
    return;
  }
  await q.query(
    `UPDATE table_order_items SET paid_payment_id = $2
     WHERE session_id = $1 AND is_locked AND COALESCE(source, 'main') = 'main' AND paid_payment_id IS NULL
       AND sent_at <= $3 AND ($4::jsonb IS NULL OR guest_id::text IN (SELECT jsonb_array_elements_text($4::jsonb)))`,
    [pay.session_id, pay.id, pay.created_at, pay.guest_ids ? JSON.stringify(pay.guest_ids) : null],
  );
}

/** Сумма заказа в iiko против нашей: скидка или правка на кассе — платить по нашей сумме нельзя. Null — iiko не ответил. */
async function iikoSumMismatch(src, orderId, ourSum) {
  if (isIikoDemo() || !orderId) return null;
  const snap = await withIikoCreds(src.creds, () => getOrderSnapshot(src.organization_id, orderId)).catch(() => null);
  if (!snap?.exists || snap.sum == null) return null;
  if (snap.status === 'Closed') return { closed: true, sum: snap.sum };
  return Math.abs(toKop(snap.sum) - toKop(ourSum)) > 100 ? { sum: snap.sum } : false; // допуск — рубль (округление в iiko)
}

// ── Чек 54-ФЗ (CloudKassir) ─────────────────────────────────────────────────

/**
 * Чек для виджета (data.CloudPayments.CustomerReceipt): позиции счёта + чаевые. Null — чек выключен
 * (нет env CLOUDPAYMENTS_RECEIPT=on или в админке не задана система налогообложения).
 * lines — строки заказа [{ name, quantity, line_total }], tip — чаевые в рублях.
 */
export function buildReceipt(settings, lines, tip = 0, { phone = null } = {}) {
  if (!receiptEnabled() || settings.receiptTaxation == null) return null;
  const vat = settings.receiptVat ?? null;
  const Items = lines.map((l) => {
    const totalKop = toKop(l.line_total);
    const qty = Math.max(1, Math.round(Number(l.quantity) || 1));
    const label = String(l.name || 'Блюдо').slice(0, 128);
    // Цена за штуку не делится нацело — одной позицией на всю сумму (иначе цена × количество ≠ сумма и CloudKassir отклонит чек)
    if (totalKop % qty) {
      return { label: `${label} ×${qty}`.slice(0, 128), price: fromKop(totalKop), quantity: 1, amount: fromKop(totalKop), vat, method: 4, object: 1 };
    }
    return { label, price: fromKop(totalKop / qty), quantity: qty, amount: fromKop(totalKop), vat, method: 4, object: 1 };
  });
  const tipKop = toKop(tip);
  if (tipKop > 0) Items.push({ label: 'Чаевые', price: fromKop(tipKop), quantity: 1, amount: fromKop(tipKop), vat: null, method: 4, object: 4 });
  const receipt = { Items, taxationSystem: settings.receiptTaxation };
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 11) receipt.phone = `+${digits}`;
  return receipt;
}

// ── Онлайн-оплата ───────────────────────────────────────────────────────────

/** Начать оплату кухни онлайн: счёт в нашей базе и параметры для виджета CloudPayments. */
export function startOnlinePayment(sessionId, opts = {}) {
  return withSessionMutex(sessionId, () => startOnlinePaymentNow(sessionId, opts));
}

/** Статусы счёта, которые ещё можно засчитать: ждёт оплаты, отказ банка (гость повторил карту в том же виджете), вытесненный новым счётом */
const CREDITABLE = ['pending', 'failed', 'superseded'];

/** Ключ набора строк счёта: одинаковый набор — одинаковый ключ (для уникального индекса «один pending на набор») */
const linesKeyOf = (ids) => createHash('sha1').update([...ids].map(String).sort().join(',')).digest('hex');

async function startOnlinePaymentNow(sessionId, { tipAmount = 0, guest = null, guestIds = null } = {}) {
  // Незавершённые счета визита сначала досматриваем: вдруг уже оплачены (гость платил в другой вкладке)
  const { rows: pending } = await pool.query(
    "SELECT invoice_id, guest_id, guest_ids, created_at FROM table_payments WHERE session_id = $1 AND status = 'pending' AND invoice_id IS NOT NULL",
    [uuidOrNull(sessionId)],
  );
  for (const p of pending) await confirmNow(p.invoice_id).catch(() => null);
  const st = await sessionState(sessionId);
  const settings = await paySettings(st.session.rid);
  if (!settings.enabled) throw httpError(403, 'Онлайн-оплата в этом ресторане пока не подключена — оплатите официанту');
  if (st.session.payment_status === 'paid') throw httpError(409, 'Счёт уже оплачен');
  if (st.session.status !== 'open') throw httpError(409, 'Визит закрыт — отсканируйте QR-код ещё раз');
  const ids = Array.isArray(guestIds) && guestIds.length ? guestIds.map(String) : null;
  // Другой гость прямо сейчас оплачивает те же блюда — не выставляем второй счёт на них
  const overlaps = (other) => !other || !ids || other.some((g) => ids.includes(String(g)));
  const { rows: busy } = await pool.query(
    `SELECT guest_id, guest_ids FROM table_payments WHERE session_id = $1 AND status = 'pending'
       AND invoice_id IS NOT NULL AND created_at > NOW() - INTERVAL '${PENDING_BUSY_MIN} minutes'`,
    [st.session.id],
  );
  if (busy.some((b) => String(b.guest_id || '') !== String(guest?.id || '-') && overlaps(b.guest_ids))) {
    throw httpError(409, 'Сейчас этот счёт оплачивает другой гость — подождите минуту');
  }
  if (st.kitchen.some((i) => !i.is_locked && (!ids || ids.includes(String(i.guest_id))))) {
    throw httpError(400, 'Часть заказа ещё не передана на кухню — дождитесь официанта или позовите его');
  }
  const due = kitchenDue(st, ids);
  if (due.amount <= 0) throw httpError(400, 'Кухня уже оплачена — напитки бара оплачиваются картой официанту');
  // Счёт кухни в iiko: закрыт на кассе или сумма другая (скидка, правка) — онлайн не берём, иначе двойная оплата
  const kitchenOrderId = st.session.iiko_orders?.[MAIN]?.orderId || st.session.iiko_order_id;
  if (kitchenOrderId && !st.session.iiko_orders?.[MAIN]?.closed) {
    const restaurant = { id: st.session.rid, organization_id: st.session.rorg, terminal_group_id: st.session.rtg };
    const src = await getSource(restaurant, MAIN);
    const ours = st.sum(st.inOrder(st.kitchen, kitchenOrderId));
    const diff = await iikoSumMismatch(src, kitchenOrderId, ours);
    if (diff?.closed) throw httpError(409, 'Счёт кухни уже закрыт на кассе — онлайн платить не нужно');
    if (diff) throw httpError(409, `На кассе сумма по кухне ${Math.round(diff.sum)} ₽, в меню ${Math.round(ours)} ₽ — оплатите официанту`);
  }
  const tip = clampTip(tipAmount, due.amount);
  const lineIds = due.lines.map((l) => String(l.id));
  const linesKey = linesKeyOf(lineIds);

  const reply = (row) => ({
    publicId: settings.publicId,
    invoiceId: row.invoice_id,
    amount: fromKop(toKop(row.amount) + toKop(row.tip_amount)),
    kitchenAmount: fromKop(toKop(row.amount)),
    barAmount: due.bar,
    currency: 'RUB',
    description: `${st.session.restaurant_name}, стол №${st.session.table_number} — кухня`,
    accountId: guest?.id || undefined,
    receipt: buildReceipt(settings, due.lines, fromKop(toKop(row.tip_amount)), { phone: guest?.phone }),
  });

  // Под блокировкой визита: свежий счёт на тот же набор строк и сумму — вернуть его (тот же InvoiceId);
  // старые pending по пересекающимся строкам — superseded; новый счёт. Уникальный индекс (session_id, lines_key) —
  // вторая линия защиты, если мьютекса процесса окажется мало.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT 1 FROM table_sessions WHERE id = $1 FOR UPDATE', [st.session.id]);
    const { rows: open } = await client.query(
      `SELECT *, created_at > NOW() - INTERVAL '${PENDING_BUSY_MIN} minutes' AS fresh
         FROM table_payments WHERE session_id = $1 AND status = 'pending' AND invoice_id IS NOT NULL FOR UPDATE`,
      [st.session.id],
    );
    const same = open.find((p) => p.fresh && p.lines_key === linesKey
      && toKop(p.amount) === toKop(due.amount) && toKop(p.tip_amount) === toKop(tip));
    if (same) {
      await client.query('COMMIT');
      return reply(same);
    }
    const mine = new Set(lineIds);
    const clash = open.filter((p) => !Array.isArray(p.item_ids) || p.item_ids.some((x) => mine.has(String(x))) || p.lines_key === linesKey);
    // Счета без списка строк (старые) вытесняем только свои — по гостю
    const clashIds = clash
      .filter((p) => Array.isArray(p.item_ids) || String(p.guest_id || '') === String(guest?.id || ''))
      .map((p) => p.id);
    if (clashIds.length) await client.query("UPDATE table_payments SET status = 'superseded' WHERE id = ANY($1::uuid[])", [clashIds]);
    const invoiceId = `QR-${String(st.session.table_number).replace(/[^\w-]/g, '')}-${randomUUID().slice(0, 8)}`;
    const { rows: ins } = await client.query(
      `INSERT INTO table_payments (session_id, amount, tip_amount, method, status, invoice_id, guest_id, guest_ids, item_ids, lines_key)
       VALUES ($1, $2, $3, 'cloudpayments', 'pending', $4, $5, $6, $7, $8) RETURNING *`,
      [st.session.id, due.amount, tip, invoiceId, guest?.id || null, ids ? JSON.stringify(ids) : null,
        JSON.stringify(lineIds), linesKey],
    );
    await client.query('COMMIT');
    return reply(ins[0]);
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    if (e.code === '23505') {
      // Параллельный запрос успел раньше — отдаём его счёт
      const { rows } = await pool.query(
        "SELECT * FROM table_payments WHERE session_id = $1 AND status = 'pending' AND lines_key = $2 LIMIT 1", [st.session.id, linesKey],
      );
      if (rows[0]) return reply(rows[0]);
    }
    throw e;
  } finally {
    client.release();
  }
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
  // В очереди визита: два подтверждения сразу (гость + фоновая проверка) не вносят оплату в iiko дважды
  const { rows } = await pool.query('SELECT session_id FROM table_payments WHERE invoice_id = $1', [String(invoiceId)]);
  if (!rows[0]) throw httpError(404, 'Платёж не найден');
  return withSessionMutex(rows[0].session_id, () => confirmNow(invoiceId));
}

async function loadPayment(where, value) {
  const { rows } = await pool.query(
    `SELECT p.*, s.restaurant_id, s.payment_status AS session_payment, s.table_number
       FROM table_payments p JOIN table_sessions s ON s.id = p.session_id WHERE ${where}`,
    [value],
  );
  return rows[0] || null;
}

async function confirmNow(invoiceId) {
  const pay = await loadPayment('p.invoice_id = $1', String(invoiceId));
  if (!pay) throw httpError(404, 'Платёж не найден');
  // Терминальные статусы не трогаем; failed/superseded досматриваем: гость мог повторить карту в том же виджете
  // или оплатить счёт, который мы уже заменили новым
  if (!CREDITABLE.includes(pay.status)) return { status: pay.status, sessionId: pay.session_id };
  const settings = await paySettings(pay.restaurant_id);
  if (!settings.publicId || !settings.apiSecret) return { status: pay.status, sessionId: pay.session_id };
  let data;
  try {
    data = await findCpPayment(settings, pay.invoice_id);
  } catch (e) {
    console.warn('CloudPayments:', e.response?.status || '', e.message);
    return { status: pay.status, sessionId: pay.session_id };
  }
  const m = data?.Model;
  // Success в ответе CloudPayments — не статус платежа: отклонённый платёж приходит с Success:false и Model.Status
  if (!m) return { status: pay.status, sessionId: pay.session_id };
  return applyCpModel(pay, m);
}

/**
 * Результат платежа от CloudPayments (опрос payments/find или вебхук Pay/Fail) → наш счёт.
 * m — { Status, Amount, Currency, InvoiceId, TransactionId, CardHolderMessage/Reason }.
 * Вызывать под мьютексом визита.
 */
async function applyCpModel(pay, m) {
  const expectedKop = toKop(pay.amount) + toKop(pay.tip_amount);
  // Платёж должен быть именно по этому счёту, в рублях и на полную сумму (точно, в копейках)
  const sameInvoice = !m.InvoiceId || String(m.InvoiceId) === String(pay.invoice_id);
  const rub = !m.Currency || m.Currency === 'RUB' || m.CurrencyCode === 0;
  if (PAID_STATUSES.has(m.Status) && sameInvoice && rub && toKop(m.Amount) >= expectedKop) {
    return creditPayment(pay, m, expectedKop);
  }
  if (FAILED_STATUSES.has(m.Status)) {
    // failed — не терминал, но и «вытесненный» счёт отказом не становится
    if (pay.status === 'pending') await pool.query("UPDATE table_payments SET status = 'failed' WHERE id = $1 AND status = 'pending'", [pay.id]);
    const status = pay.status === 'pending' ? 'failed' : pay.status;
    return { status, sessionId: pay.session_id, reason: m.CardHolderMessage || m.Reason || null };
  }
  return { status: pay.status === 'failed' ? 'pending' : pay.status, sessionId: pay.session_id };
}

/**
 * Деньги получены: засчитать счёт. Если эти строки уже оплачены другим платежом (или стол уже закрыт оплатой
 * официанту) — status 'duplicate': в iiko ничего не проводим, официанту — уведомление о возврате.
 */
async function creditPayment(pay, m, expectedKop) {
  const txId = String(m.TransactionId || '').trim() || null;
  const ids = Array.isArray(pay.item_ids) && pay.item_ids.length ? pay.item_ids : null;
  const client = await pool.connect();
  let status;
  try {
    await client.query('BEGIN');
    const { rows: cur } = await client.query('SELECT status FROM table_payments WHERE id = $1 FOR UPDATE', [pay.id]);
    if (!cur[0] || !CREDITABLE.includes(cur[0].status)) {
      await client.query('ROLLBACK');
      return { status: cur[0]?.status || pay.status, sessionId: pay.session_id };
    }
    const { rows: sess } = await client.query('SELECT payment_status FROM table_sessions WHERE id = $1 FOR UPDATE', [pay.session_id]);
    let dup = sess[0]?.payment_status === 'paid';
    if (!dup && ids) {
      const { rows: taken } = await client.query(
        'SELECT 1 FROM table_order_items WHERE id = ANY($1::uuid[]) AND paid_payment_id IS NOT NULL AND paid_payment_id <> $2 LIMIT 1',
        [ids, pay.id],
      );
      dup = taken.length > 0;
    }
    status = dup ? 'duplicate' : 'completed';
    await client.query(
      'UPDATE table_payments SET status = $2, transaction_id = $3, paid_at = NOW() WHERE id = $1',
      [pay.id, status, txId],
    );
    if (!dup) {
      await markPaidLines(pay, client);
      // Остальные открытые счета на те же строки больше не нужны
      if (ids) {
        await client.query(
          "UPDATE table_payments SET status = 'superseded' WHERE session_id = $1 AND id <> $2 AND status = 'pending' AND item_ids ?| $3::text[]",
          [pay.session_id, pay.id, ids.map(String)],
        );
      }
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    // Эта транзакция CloudPayments уже записана (уникальный индекс по transaction_id) — повтор события
    if (e.code === '23505') return { status: 'completed', sessionId: pay.session_id };
    throw e;
  } finally {
    client.release();
  }
  if (status === 'duplicate') {
    // Деньги гостя взяты, а строки уже оплачены / стол закрыт — вернуть
    await createWaiterNotification({
      restaurantId: pay.restaurant_id, sessionId: pay.session_id, tableNumber: pay.table_number,
      type: NOTIFY_TYPES.IIKO_ERROR || 'iiko_error',
      title: `Стол №${pay.table_number} — двойная оплата`,
      body: `Гость оплатил онлайн ${Math.round(fromKop(expectedKop))} ₽ повторно (счёт уже оплачен) — оформите возврат в CloudPayments`,
      payload: { sessionId: pay.session_id, invoiceId: pay.invoice_id },
    }).catch(() => {});
  } else {
    await settleKitchen(pay.session_id, pay);
  }
  return { status, sessionId: pay.session_id };
}

// ── Вебхуки CloudPayments (Check / Pay / Fail / Refund) ─────────────────────

/** Платёж, к которому относится событие: по InvoiceId, а если его нет (возврат) — по номеру транзакции. */
export async function findPaymentForWebhook(body = {}) {
  if (body.InvoiceId) {
    const p = await loadPayment('p.invoice_id = $1', String(body.InvoiceId));
    if (p) return p;
  }
  for (const tx of [body.PaymentTransactionId, body.TransactionId]) {
    if (!tx) continue;
    const p = await loadPayment('p.transaction_id = $1', String(tx));
    if (p) return p;
  }
  return null;
}

/** Ключи (API-секрет сайта), которыми может быть подписано событие: у платежа — его ресторана, иначе общие и всех точек. */
export async function webhookSecrets(pay) {
  if (pay) return [(await paySettings(pay.restaurant_id)).apiSecret].filter(Boolean);
  const { rows } = await pool.query("SELECT DISTINCT cp_api_secret AS s FROM restaurant_payment_settings WHERE cp_api_secret IS NOT NULL AND cp_api_secret <> ''");
  return [process.env.CLOUDPAYMENTS_API_SECRET, ...rows.map((r) => r.s)].filter(Boolean);
}

/** Подпись CloudPayments: base64(HMAC-SHA256(сырое тело, API-секрет)); сравнение за постоянное время. */
export function verifyCpSignature(rawBody, signature, secrets) {
  const got = Buffer.from(String(signature || '').trim());
  if (!got.length) return false;
  let ok = false;
  for (const secret of secrets) {
    const want = Buffer.from(createHmac('sha256', String(secret)).update(rawBody).digest('base64'));
    if (want.length === got.length && timingSafeEqual(want, got)) ok = true; // без раннего выхода — время не зависит от того, какой ключ подошёл
  }
  return ok;
}

/**
 * Обработать проверенное событие CloudPayments. Идемпотентно: повтор Pay/Fail/Refund статус не меняет и в iiko не проводит.
 * pay — найденный платёж (null — счёт не наш: событие игнорируем).
 */
export function handleCloudPaymentsEvent(kind, body, pay) {
  if (!pay || kind === 'check') return Promise.resolve({ ok: true });
  return withSessionMutex(pay.session_id, async () => {
    const fresh = await loadPayment('p.id = $1', pay.id);
    if (!fresh) return { ok: true };
    if (kind === 'pay') {
      // Pay приходит и для двухстадийных (Authorized): засчитываем только Completed — как опрос
      return applyCpModel(fresh, { ...body, Status: body.Status || 'Completed', InvoiceId: body.InvoiceId || fresh.invoice_id });
    }
    if (kind === 'fail') return applyCpModel(fresh, { ...body, Status: 'Declined', Reason: body.Reason || body.ReasonCode });
    if (kind === 'refund') return applyRefund(fresh, body);
    return { ok: true };
  });
}

/**
 * Возврат: статус refunded, сумма возврата накапливается (частичных может быть несколько). Полный возврат снимает
 * отметку оплаты со строк, и визит, закрытый этой оплатой, снова открывается. В iiko ничего не меняем —
 * официанту уведомление «на кассе отмените оплату».
 */
async function applyRefund(pay, body) {
  if (!['completed', 'duplicate', 'refunded'].includes(pay.status)) {
    console.warn('CloudPayments Refund по неоплаченному счёту', pay.invoice_id, pay.status);
    return { ok: true, status: pay.status };
  }
  const amountKop = toKop(body.Amount);
  const refundTx = String(body.TransactionId || '').trim();
  const refundKey = refundTx || `${body.DateTime || ''}|${amountKop}`;
  const wasDuplicate = pay.status === 'duplicate' || (Array.isArray(pay.refunds) && pay.refunds.some((r) => r.dup));
  const client = await pool.connect();
  let full = false;
  let unmarked = 0;
  let reopened = false;
  let refundedKop = 0;
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT status, refund_amount, refunds FROM table_payments WHERE id = $1 FOR UPDATE', [pay.id]);
    const cur = rows[0];
    const done = Array.isArray(cur?.refunds) ? cur.refunds : [];
    if (!cur || done.some((r) => r.key === refundKey)) { // этот возврат уже учтён
      await client.query('ROLLBACK');
      return { ok: true, status: cur?.status || pay.status, repeat: true };
    }
    refundedKop = toKop(cur.refund_amount) + amountKop;
    full = refundedKop >= toKop(pay.amount) + toKop(pay.tip_amount);
    await client.query(
      `UPDATE table_payments SET status = 'refunded', refund_amount = $2, refunded_at = NOW(),
         refunds = COALESCE(refunds, '[]'::jsonb) || $3::jsonb WHERE id = $1`,
      [pay.id, fromKop(refundedKop), JSON.stringify([{ key: refundKey, amount: fromKop(amountKop), at: new Date().toISOString(), dup: wasDuplicate || undefined }])],
    );
    if (full) {
      const r = await client.query('UPDATE table_order_items SET paid_payment_id = NULL WHERE paid_payment_id = $1', [pay.id]);
      unmarked = r.rowCount;
      if (unmarked > 0) {
        // Визит закрыт именно онлайн-оплатой (оплаты официанту нет) — снова открываем, строки к оплате есть
        const r2 = await client.query(
          `UPDATE table_sessions SET payment_status = 'unpaid', status = 'open', workflow_status = 'waiter_review', paid_at = NULL, updated_at = NOW()
           WHERE id = $1 AND payment_status = 'paid' AND status = 'paid'
             AND NOT EXISTS (SELECT 1 FROM table_payments WHERE session_id = $1 AND status = 'completed' AND method <> 'cloudpayments')`,
          [pay.session_id],
        );
        reopened = r2.rowCount > 0;
      }
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
  const sum = `${Math.round(fromKop(amountKop))} ₽`;
  const total = `${Math.round(fromKop(toKop(pay.amount) + toKop(pay.tip_amount)))} ₽`;
  await createWaiterNotification({
    restaurantId: pay.restaurant_id, sessionId: pay.session_id, tableNumber: pay.table_number,
    type: NOTIFY_TYPES.IIKO_ERROR || 'iiko_error',
    title: `Стол №${pay.table_number} — возврат онлайн-оплаты`,
    body: wasDuplicate
      ? `Возврат дубля оплаты ${sum} оформлен в CloudPayments`
      : `${full ? 'Полный' : 'Частичный'} возврат ${sum} из ${total}${reopened ? ' · счёт стола снова открыт' : ''}`
        + ' — на кассе iiko отмените оплату по счёту кухни',
    payload: { sessionId: pay.session_id, invoiceId: pay.invoice_id, refund: fromKop(amountKop), full },
  }).catch(() => {});
  return { ok: true, status: 'refunded', full, unmarked, reopened };
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
  // Не оплачено: отправленные строки без онлайн-оплаты и всё, что ещё собирают в корзине
  const kitchenLeft = fromKop(toKop(kitchenDue(st, null).amount) + toKop(st.sum(st.kitchen.filter((i) => !i.is_locked))));
  const barTotal = st.sum(st.bar.filter((i) => i.is_locked));

  let iikoNote = '';
  if (kitchenLeft <= 0) {
    const orders = { ...(session.iiko_orders || {}) };
    if (session.iiko_order_id && !orders[MAIN]) orders[MAIN] = { orderId: session.iiko_order_id };
    const orderId = orders[MAIN]?.orderId;
    // В iiko вносим ровно то, что гости заплатили онлайн по строкам этого заказа — не «всю кухню стола»
    const kitchenSum = st.sum(st.inOrder(st.kitchen, orderId).filter((i) => i.paid_payment_id));
    if (orderId && kitchenSum > 0 && !isIikoDemo() && !orders[MAIN]?.closed) {
      const restaurant = { id: session.rid, organization_id: session.rorg, terminal_group_id: session.rtg };
      const src = await getSource(restaurant, MAIN);
      try {
        const diff = orders[MAIN]?.paid ? false : await iikoSumMismatch(src, orderId, kitchenSum);
        if (diff?.closed) throw new Error('счёт уже закрыт на кассе — проверьте, не оплачен ли он дважды');
        if (diff) throw new Error(`в iiko по счёту ${Math.round(diff.sum)} ₽, оплачено онлайн ${Math.round(kitchenSum)} ₽`);
        await withIikoCreds(src.creds, async () => {
          const paymentTypeId = await paymentTypeFor(src, settings);
          if (!paymentTypeId) throw new Error('в iiko нет типа оплаты «Онлайн» — создайте его или укажите ID в админке «Оплата»');
          // Оплата уже внесена прошлой попыткой (упало только закрытие) — повторный change_payments iiko отклонит
          if (!orders[MAIN]?.paid) {
            await changeOrderPayments(src.organization_id, orderId, [{
              paymentTypeKind: 'Card',
              paymentTypeId,
              sum: kitchenSum,
              isProcessedExternally: true,
              isFiscalizedExternally: process.env.IIKO_PAYMENT_FISCALIZED_EXTERNALLY === 'true',
            }]);
            await markOrder(session.id, MAIN, { paid: true });
          }
          await closeTableOrder(src.organization_id, orderId);
        });
        await markOrderClosed(session.id, MAIN);
        iikoNote = ' · кухня закрыта в iiko';
      } catch (e) {
        const reason = e.response?.data?.errorDescription || e.response?.data?.message || e.message;
        iikoNote = ' · закройте счёт кухни в iiko вручную';
        await pool.query('UPDATE table_sessions SET iiko_last_error = $2 WHERE id = $1', [session.id, `Закрытие счёта кухни: ${reason}`]);
      }
    }
    // Бара нет — стол оплачен полностью
    if (barTotal <= 0 && !st.bar.some((i) => !i.is_locked)) {
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
    title: `Стол ${session.table_number} · Оплачено онлайн`,
    body: `Кухня ${paidNow} ₽${tip ? ` + чаевые ${tip} ₽` : ''}${kitchenLeft > 0 ? ` · по кухне осталось ${Math.round(kitchenLeft)} ₽` : ''}`
      + `${iikoNote}${barTotal > 0 ? ` · бар ${Math.round(barTotal)} ₽ — принять картой` : ''}`,
    payload: { sessionId: session.id },
  });
}

// ── Оплата официанту: наличными или картой ─────────────────────────────────

const ONLINE_RE = /онлайн|online|qr|cloud|интернет/i;
const KIND = { cash: 'Cash', card: 'Card' };

/** Отметка по заказу источника в iiko_orders: paid — оплата внесена в iiko, closed — счёт закрыт */
async function markOrder(sessionId, code, flags) {
  await pool.query(
    `UPDATE table_sessions SET iiko_orders = jsonb_set(COALESCE(iiko_orders, '{}'::jsonb), $2::text[],
       COALESCE(iiko_orders->$3, '{}'::jsonb) || $4::jsonb) WHERE id = $1`,
    [sessionId, [code], code, JSON.stringify(flags)],
  );
}
const markOrderClosed = (sessionId, code) => markOrder(sessionId, code, { closed: true });

/** Тип оплаты iiko для наличных / карты официанту: из админки, секрета или по названию в iiko. */
async function waiterTypeFor(src, settings, method) {
  if (!src.creds) {
    const own = method === 'cash' ? settings.iikoCashTypeId : settings.iikoCardTypeId;
    if (own) return own;
  }
  const env = process.env[`IIKO_${src.creds ? `${src.creds}_` : ''}${method === 'cash' ? 'CASH' : 'CARD'}_PAYMENT_TYPE_ID`];
  if (env) return env;
  const key = `${src.organization_id}:${method}`;
  if (payTypeCache.has(key)) return payTypeCache.get(key);
  const data = await iikoRequest('/api/1/payment_types', { organizationIds: [src.organization_id] });
  const list = (data?.paymentTypes || []).filter((t) => !t.isDeleted && !ONLINE_RE.test(t.name));
  const found = method === 'cash'
    ? list.find((t) => t.paymentTypeKind === 'Cash') || list.find((t) => /налич|cash/i.test(t.name))
    : list.find((t) => t.paymentTypeKind === 'Card' && /карт|банк|card|visa|эквайр/i.test(t.name))
      || list.find((t) => t.paymentTypeKind === 'Card');
  const id = found?.id || null;
  payTypeCache.set(key, id);
  return id;
}

/**
 * Официант принял оплату наличными или картой (на своём терминале): вносим оплату в заказы iiko
 * (кухня — остаток после онлайн-оплаты, бар — целиком) и закрываем их; стол — оплачен.
 * Если iiko что-то не принял — стол не закрываем, официант видит причину и закрывает счёт на кассе.
 */
export function acceptWaiterPayment(sessionId, opts = {}) {
  // Двойное нажатие «Наличными/Картой» не проводит оплату в iiko дважды: второй запрос ждёт первый и видит «уже оплачен»
  return withSessionMutex(sessionId, () => acceptWaiterPaymentNow(sessionId, opts));
}

async function acceptWaiterPaymentNow(sessionId, { method, tipAmount = 0 } = {}) {
  if (!KIND[method]) throw httpError(400, 'Выберите: наличными или картой');
  // Гость прямо сейчас платит онлайн — сначала досматриваем его счёт, иначе деньги возьмут дважды
  const { rows: pending } = await pool.query(
    "SELECT invoice_id FROM table_payments WHERE session_id = $1 AND status = 'pending' AND invoice_id IS NOT NULL",
    [uuidOrNull(sessionId)],
  );
  for (const p of pending) await confirmNow(p.invoice_id).catch(() => null);
  const { rows: busy } = await pool.query(
    `SELECT 1 FROM table_payments WHERE session_id = $1 AND status = 'pending' AND invoice_id IS NOT NULL
       AND created_at > NOW() - INTERVAL '${PENDING_BUSY_MIN} minutes' LIMIT 1`,
    [uuidOrNull(sessionId)],
  );
  if (busy.length) throw httpError(409, 'Гость сейчас оплачивает онлайн — подождите пару минут или попросите его закрыть оплату');
  const st = await sessionState(sessionId);
  const { session } = st;
  if (session.payment_status === 'paid') throw httpError(409, 'Счёт уже оплачен');
  if (st.items.some((i) => !i.is_locked)) throw httpError(400, 'В заказе есть неотправленные блюда — отправьте их или удалите');
  const settings = await paySettings(session.rid);
  const restaurant = { id: session.rid, organization_id: session.rorg, terminal_group_id: session.rtg };
  const orders = { ...(session.iiko_orders || {}) };
  if (session.iiko_order_id && !orders[MAIN]) orders[MAIN] = { orderId: session.iiko_order_id };

  let total = 0;
  const closed = [];
  for (const [code, o] of Object.entries(orders)) {
    if (!o?.orderId || o.closed) continue;
    // Строки этого заказа iiko: оплаченное онлайн вносим «Онлайн», остальное — наличными/картой
    // (заказ с кассы iiko, прицепленный к визиту, имеет код «main#ab12cd34» — его строки по ID заказа)
    const lines = rowsOfOrder(st.items, code, o.orderId, orders);
    const online = st.sum(lines.filter((i) => i.paid_payment_id));
    const rest = st.sum(lines.filter((i) => !i.paid_payment_id));
    if (online + rest <= 0) continue;
    total = fromKop(toKop(total) + toKop(rest));
    const src = await getSource(restaurant, baseCode(code));
    if (isIikoDemo()) { closed.push(code); continue; }
    const where = baseCode(code) === MAIN ? 'кухни' : `«${src.name || code}»`;
    // Сумма на кассе другая (скидка, правка) — не закрываем нашей суммой, официант закрывает счёт на кассе
    const diff = o.paid ? false : await iikoSumMismatch(src, o.orderId, online + rest);
    if (diff?.closed) { await markOrderClosed(session.id, code); closed.push(code); continue; }
    if (diff) {
      throw httpError(409, `Счёт ${where}: на кассе ${Math.round(diff.sum)} ₽, в меню ${Math.round(online + rest)} ₽ (скидка или правка на кассе). `
        + 'Примите оплату на кассе iiko — стол закроется сам');
    }
    try {
      await withIikoCreds(src.creds, async () => {
        const payments = [];
        if (online > 0) {
          const onlineType = await paymentTypeFor(src, settings);
          if (!onlineType) throw new Error('нет типа оплаты «Онлайн» для уже оплаченной части');
          payments.push({ paymentTypeKind: 'Card', paymentTypeId: onlineType, sum: online, isProcessedExternally: true,
            isFiscalizedExternally: process.env.IIKO_PAYMENT_FISCALIZED_EXTERNALLY === 'true' });
        }
        if (rest > 0) {
          const typeId = await waiterTypeFor(src, settings, method);
          if (!typeId) throw new Error(`в iiko нет типа оплаты «${method === 'cash' ? 'Наличные' : 'Банковские карты'}»`);
          payments.push({ paymentTypeKind: KIND[method], paymentTypeId: typeId, sum: rest, isProcessedExternally: method === 'card' });
        }
        if (!o.paid) {
          await changeOrderPayments(src.organization_id, o.orderId, payments);
          await markOrder(session.id, code, { paid: true });
        }
        await closeTableOrder(src.organization_id, o.orderId);
      });
      await markOrderClosed(session.id, code);
      closed.push(code);
    } catch (e) {
      const reason = e.response?.data?.errorDescription || e.response?.data?.message || e.message;
      await pool.query('UPDATE table_sessions SET iiko_last_error = $2 WHERE id = $1', [session.id, `Оплата ${where}: ${reason}`]);
      throw httpError(502, `iiko не закрыл счёт ${where}: ${reason}. Закройте его на кассе, затем «Закрыть стол»`);
    }
  }
  const tip = clampTip(tipAmount, total);
  await pool.query(
    `INSERT INTO table_payments (session_id, amount, tip_amount, method, status, paid_at)
     VALUES ($1, $2, $3, $4, 'completed', NOW())`,
    [session.id, total, tip, method],
  );
  await pool.query(
    `UPDATE table_sessions SET payment_status = 'paid', status = 'closed', workflow_status = 'paid', paid_at = NOW(),
       closed_at = NOW(), locked_by = NULL, locked_until = NULL, iiko_last_error = NULL, updated_at = NOW() WHERE id = $1`,
    [session.id],
  );
  await pool.query('UPDATE waiter_notifications SET is_read = TRUE WHERE session_id = $1 AND is_read = FALSE', [session.id]);
  return { ok: true, method, amount: total, closedInIiko: closed };
}

/** Фоновая проверка незавершённых платежей (гость мог закрыть страницу до подтверждения). */
export async function checkPendingPayments() {
  const { rows } = await pool.query(
    // pending — 24 часа; failed/superseded — 30 минут: гость мог повторить карту в том же виджете или оплатить уже заменённый счёт
    `SELECT invoice_id FROM table_payments WHERE invoice_id IS NOT NULL AND created_at < NOW() - INTERVAL '15 seconds'
       AND ((status = 'pending' AND created_at > NOW() - INTERVAL '24 hours')
         OR (status IN ('failed', 'superseded') AND created_at > NOW() - INTERVAL '30 minutes'))
     ORDER BY created_at LIMIT 20`,
  );
  for (const r of rows) {
    try { await confirmOnlinePayment(r.invoice_id); } catch (e) { console.warn('оплата', r.invoice_id, e.message); }
  }
  await pool.query(
    // Сутки без ответа CloudPayments — счёт брошен (до этого досматриваем: банк мог подтвердить позже)
    "UPDATE table_payments SET status = 'expired' WHERE status = 'pending' AND created_at < NOW() - INTERVAL '24 hours'",
  );
}
