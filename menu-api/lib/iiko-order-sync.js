/**
 * Сверка заказов iiko с визитами стола — чистые функции без БД и без запросов в iiko (проверяются unit-тестами).
 *
 * Что здесь решается:
 *  — как привести заказ из order/by_table и order/by_id к одному виду (normalizeIikoOrder);
 *  — к какому столу относится заказ и что с ним делать: завести визит, прицепить к открытому, только досверить (matchOrderToSession);
 *  — что дописать из кассы (planAdditions) и что убрать, потому что на кассе удалили (planRemovals).
 */

/** Блюдо удалено на кассе: флаг deleted, причина удаления (removalType) или статус Deleted / Cancelled. */
export function isRemovedItem(it) {
  if (!it) return false;
  if (it.deleted || it.isDeleted || it.removalType) return true;
  return ['Deleted', 'Cancelled', 'Canceled'].includes(String(it.status || ''));
}

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** ID блюда в позиции заказа iiko (в by_id это product.id, в других ответах productId). */
export const itemProductId = (it) => String(it?.product?.id || it?.productId || '');

/**
 * Заказ iiko — в виде { id, status, number, tableIds, waiter, guestCount, items, removedItems }.
 * Принимает и элемент ответа `{ id, creationStatus, order: {...} }`, и сам заказ.
 * items — живые блюда (type Product, не удалённые): { productId, name, amount, price, sum, status, sizeId, sizeName, modifiers, comment }.
 * removedItems — удалённые на кассе блюда (для истории).
 */
export function normalizeIikoOrder(raw) {
  const o = raw?.order || raw || {};
  const items = [];
  const removedItems = [];
  for (const it of o.items || []) {
    if ((it.type || 'Product') !== 'Product') continue;
    const productId = itemProductId(it);
    if (!productId) continue;
    const amount = num(it.amount);
    const mods = (it.modifiers || []).map((m) => ({
      id: String(m.product?.id || m.productId || ''),
      name: String(m.product?.name || m.name || '').trim(),
      amount: num(m.amount) || 1,
      groupId: m.productGroupId || m.groupId || null,
      price: num(m.price),
    })).filter((m) => m.id);
    const line = {
      productId,
      name: String(it.product?.name || it.name || 'Позиция').trim(),
      amount,
      price: num(it.price),
      // resultSum — сумма строки со скидкой и модификаторами; иначе cost; иначе цена × количество
      sum: it.resultSum != null ? num(it.resultSum) : it.cost != null ? num(it.cost) : num(it.price) * amount,
      status: it.status && it.status !== 'Deleted' ? String(it.status) : null,
      sizeId: it.size?.id || it.productSizeId || null,
      sizeName: it.size?.name || null,
      modifiers: mods,
      comment: it.comment ? String(it.comment) : null,
    };
    if (isRemovedItem(it)) removedItems.push(line);
    else if (amount > 0) items.push(line);
  }
  return {
    id: String(o.id || raw?.id || ''),
    status: o.status || null,
    number: o.number ?? null,
    tableIds: (o.tableIds || raw?.tableIds || []).map(String),
    waiter: o.waiter ? { id: o.waiter.id ? String(o.waiter.id) : null, name: o.waiter.name || null } : null,
    guestCount: num(o.guests?.count ?? o.guestsCount) || 1,
    createdAt: o.whenCreated || o.createdAt || raw?.timestamp || null,
    sum: o.sum != null ? num(o.sum) : null,
    items,
    removedItems,
  };
}

/** Живое количество каждого блюда в заказе: Map productId → amount. */
export function aliveByProduct(items) {
  const m = new Map();
  for (const it of items || []) m.set(it.productId, (m.get(it.productId) || 0) + num(it.amount));
  return m;
}

/** Номер стола у нас по названию стола в iiko: «Стол 5», «5», «Веранда-3» → «5», «5», «Веранда-3». null — не подходит под наши номера. */
export function tableNumberFromName(name) {
  const t = String(name ?? '').trim().replace(/^стол\s*/i, '').trim();
  if (/^\d+$/.test(t)) return String(Number(t));
  if (/^[0-9A-Za-zА-Яа-я-]{1,10}$/.test(t)) return t;
  const digits = t.replace(/\D/g, '');
  return digits && digits.length <= 10 ? String(Number(digits)) : null;
}

/** Карта «ID стола iiko → наш номер» из схемы зала (available_restaurant_sections). */
export function tableNumbersBySections(sectionsResponse) {
  const map = new Map();
  const sections = sectionsResponse?.restaurantSections || sectionsResponse?.sections || [];
  for (const section of sections) {
    for (const table of section?.tables || []) {
      if (!table?.id || table.isDeleted) continue;
      const n = tableNumberFromName(table.name ?? table.number);
      if (n) map.set(String(table.id), n);
    }
  }
  return map;
}

/** Код заказа в iiko_orders: свободный «main» / код источника, иначе «код#первые 8 знаков ID» — ещё один заказ на том же источнике. */
export function orderKey(orders, sourceCode, orderId) {
  const taken = orders?.[sourceCode];
  if (!taken?.orderId || String(taken.orderId) === String(orderId)) return sourceCode;
  return `${sourceCode}#${String(orderId).replace(/-/g, '').slice(0, 8)}`;
}

/** Источник из кода заказа: «main#ab12cd34» → «main». */
export const baseCode = (code) => String(code || 'main').split('#')[0];

/** Заказы визита { код: { orderId, ... } } — вместе с главным заказом из старого поля iiko_order_id. */
export function sessionOrders(session) {
  const orders = { ...(session?.iiko_orders || {}) };
  if (session?.iiko_order_id && !orders.main) orders.main = { orderId: String(session.iiko_order_id) };
  return orders;
}

/** Код заказа, в котором лежит строка: по её iiko_order_id, иначе источник строки. */
export function rowOrderCode(row, orders) {
  if (row.iiko_order_id) {
    const hit = Object.entries(orders || {}).find(([, o]) => o?.orderId && String(o.orderId) === String(row.iiko_order_id));
    if (hit) return hit[0];
  }
  return row.source || 'main';
}

/** Отправленные строки визита, которые относятся к заказу orderId (код code). */
export function rowsOfOrder(items, code, orderId, orders) {
  const base = baseCode(code);
  return (items || []).filter((i) => i.is_locked && (i.source || 'main') === base
    && (code.includes('#')
      ? String(i.iiko_order_id) === String(orderId)
      : (!i.iiko_order_id || String(i.iiko_order_id) === String(orderId) || rowOrderCode(i, orders) === code)));
}

/**
 * Что делать с заказом iiko, найденным на столе.
 *  known — заказ уже записан в каком-то визите (sessionOf: визит, где он есть, и открыт ли он);
 *  openSession — открытый визит этого стола.
 * Результат: { action: 'skip' | 'sync' | 'attach' | 'create', sessionId? }
 *  skip   — заказ уже был в визите, который закрыт (его закрыли у нас, а на кассе он ещё висит): второй визит не заводим;
 *  sync   — заказ уже в открытом визите: только досверить позиции (повторный опрос без дублей);
 *  attach — на столе открыт наш визит, а заказ чужой (с кассы): добавляем как ещё один заказ визита;
 *  create — визита нет: заводим «открыт на кассе».
 */
export function matchOrderToSession({ order, knownIn = null, openSession = null }) {
  if (!order?.id || !['New', 'Bill'].includes(order.status || 'New')) return { action: 'skip' };
  if (knownIn) return knownIn.open ? { action: 'sync', sessionId: knownIn.id } : { action: 'skip' };
  if (openSession) return { action: 'attach', sessionId: openSession.id };
  return { action: 'create' };
}

/**
 * Что дописать в визит: блюда, которых в заказе iiko больше, чем у нас строк этого заказа (добавили на кассе позже).
 * rows — наши отправленные строки заказа. Возвращает строки для вставки (без дублей: следующий опрос ничего не найдёт).
 * Если ни одно из наших блюд не нашлось в заказе iiko (расхождение id) — ничего не дописываем, чтобы не задвоить.
 */
export function planAdditions(items, rows) {
  const ours = new Map();
  for (const r of rows || []) {
    const pid = String(r.iiko_product_id);
    ours.set(pid, (ours.get(pid) || 0) + num(r.quantity));
  }
  const alive = aliveByProduct(items);
  if (ours.size && alive.size && ![...ours.keys()].some((pid) => alive.has(pid))) return [];
  const adds = [];
  for (const pid of alive.keys()) {
    let need = Math.ceil(alive.get(pid) - 1e-9) - (ours.get(pid) || 0);
    if (need <= 0) continue;
    // Недостающее берём с последних строк блюда в заказе (их и дописали позже всех)
    const lines = items.filter((i) => i.productId === pid);
    for (let k = lines.length - 1; k >= 0 && need > 0; k--) {
      const line = lines[k];
      const lineQty = Math.max(1, Math.ceil(line.amount - 1e-9));
      const qty = Math.min(lineQty, need);
      adds.push({ ...line, quantity: qty, lineTotal: Math.round((line.sum * qty / lineQty) * 100) / 100 });
      need -= qty;
    }
  }
  return adds;
}

const SYNC_GRACE_MS = 2 * 60_000;
const isServedOrReady = (row) => Boolean(row.served_at) || ['CookingCompleted', 'Served'].includes(row.kitchen_status);

/**
 * Что убрать из визита, потому что на кассе удалили (или заказ удалён целиком).
 * rows — наши отправленные строки заказа; alive — Map productId → живое количество (aliveByProduct).
 * Удаление на кассе делает менеджер, в том числе готового и уже вынесенного блюда — убираем и их,
 * но сначала то, что ещё не готово, и свежее раньше старого. Строки, пришедшие из iiko, проверяем сразу;
 * свои, отправленные только что, — не раньше чем через 2 минуты (add_items мог ещё не дойти до кассы).
 * Возвращает [{ id, name, quantity (сколько убрано), remaining (сколько осталось; 0 — строку удалить), paidOnline, ... }].
 */
export function planRemovals(rows, alive, { orderDeleted = false, now = Date.now() } = {}) {
  const mine = rows || [];
  if (!mine.length) return [];
  // Живые позиции есть, но ни одна не совпала с нашими по id — это не удаление, а расхождение id: не трогаем
  if (alive.size && !mine.some((r) => alive.has(String(r.iiko_product_id)))) return [];
  const settled = (row) => row.from_iiko || now - new Date(row.sent_at || row.updated_at || 0).getTime() > SYNC_GRACE_MS;
  const byProduct = new Map();
  for (const row of mine) {
    if (!orderDeleted && !settled(row)) continue;
    const pid = String(row.iiko_product_id);
    if (!byProduct.has(pid)) byProduct.set(pid, []);
    byProduct.get(pid).push(row);
  }
  const out = [];
  for (const [pid, list] of byProduct) {
    let excess = list.reduce((n, r) => n + num(r.quantity), 0) - Math.ceil((alive.get(pid) || 0) - 1e-9);
    if (excess <= 0) continue;
    const order = [...list].sort((a, b) => Number(isServedOrReady(a)) - Number(isServedOrReady(b))
      || new Date(b.sent_at || b.created_at || 0) - new Date(a.sent_at || a.created_at || 0));
    for (const row of order) {
      if (excess <= 0) break;
      const q = num(row.quantity);
      const cut = Math.min(q, excess);
      out.push({
        id: row.id, name: row.name, quantity: cut, remaining: q - cut, paidOnline: Boolean(row.paid_payment_id),
        wasReady: isServedOrReady(row), guestId: row.guest_id || null, guestName: row.guest_name || null,
      });
      excess -= cut;
    }
  }
  return out;
}
