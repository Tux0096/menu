import axios from 'axios';
import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';
import { demoAddItems, demoCreate, demoOrdersByIds, demoOrdersByTable, demoSections } from './lib/iiko-demo-orders.js';
import { demoReserveTables, demoReservesByIds, demoReservesWorkload } from './lib/iiko-demo-reserves.js';
import { isRemovedItem } from './lib/iiko-order-sync.js';
import { IIKO_URL, requestIikoTokenFor, iikoApiLogin } from './lib/iiko-token.js';

/**
 * Несколько iiko: вызовы внутри withIikoCreds('BAR', fn) идут ключом IIKO_BAR_* (например, бар с алкоголем
 * в отдельной организации/аккаунте iiko). Вне — основным ключом.
 */
const credsStore = new AsyncLocalStorage();
export const withIikoCreds = (creds, fn) => credsStore.run({ creds: creds || '' }, fn);
const currentCreds = () => credsStore.getStore()?.creds || '';


/**
 * Демо-режим: IIKO_DEMO=true или не задан IIKO_API_LOGIN.
 * Заказы «создаются» локально с фиктивным orderId — прототип работает без доступа к iiko.
 */
export function isIikoDemo() {
  return process.env.IIKO_DEMO === 'true' || !iikoApiLogin();
}

const tokens = new Map(); // creds -> { token, exp }

export async function getIikoToken(creds = currentCreds()) {
  const hit = tokens.get(creds);
  if (hit && Date.now() < hit.exp) return hit.token;
  if (creds && !iikoApiLogin(creds)) throw new Error(`Ключ iiko «${creds}» не задан (IIKO_${creds}_API_LOGIN)`);
  const token = await requestIikoTokenFor(creds);
  tokens.set(creds, { token, exp: Date.now() + 50 * 60 * 1000 });
  return token;
}

// iiko ответил 429 (лимит запросов на ключ) — фоновые опросы (кухня, импорт столов, брони) пропускают ход,
// чтобы лимит восстановился для того, что нужно людям: вход официантов, отправка заказов
let coolingUntil = 0;
export const iikoCoolingDown = () => Date.now() < coolingUntil;

// Счётчик запросов к iiko по путям — раз в 5 минут в лог: видно, кто тратит лимит ключа
const callStats = new Map();
setInterval(() => {
  if (!callStats.size) return;
  const total = [...callStats.values()].reduce((a, b) => a + b, 0);
  const top = [...callStats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([p, n]) => `${p} ${n}`).join(', ');
  console.log(`iiko: ${total} запросов за 5 мин — ${top}`);
  callStats.clear();
}, 5 * 60_000).unref?.();

// Фоновые опросы (кухня, импорт столов, брони, стоп-листы) — в одну очередь с паузой между запросами,
// чтобы на 10 точках не упираться в лимит ключа. Запросы людей (вход, заказ, оплата) идут без очереди.
const bgStore = new AsyncLocalStorage();
export const asBackground = (fn) => bgStore.run(true, fn);
const BG_GAP_MS = parseInt(process.env.IIKO_BG_GAP_MS || '250', 10);
let bgQueue = Promise.resolve();
function bgSlot() {
  const slot = bgQueue.then(() => new Promise((r) => setTimeout(r, BG_GAP_MS)));
  bgQueue = slot.catch(() => {});
  return slot;
}
/** Последний 429 от iiko: путь и когда можно снова — для текста ошибки и диагностики */
let lastLimit = null;
export const iikoLimitInfo = () => (lastLimit ? { ...lastLimit, coolingDown: iikoCoolingDown() } : null);
const shortPath = (path) => String(path).replace(/^\/api\/(1\/)?/, '');

async function iikoPost(path, body, { retried = false, limited = false } = {}) {
  if (isIikoDemo()) return demoResponse(path, body);
  const background = bgStore.getStore() === true;
  if (background) {
    if (iikoCoolingDown()) throw Object.assign(new Error('iiko: лимит запросов — фоновый опрос пропущен'), { status: 503, skipped: true });
    await bgSlot();
  }
  callStats.set(path, (callStats.get(path) || 0) + 1);
  const token = await getIikoToken();
  try {
    const res = await axios.post(`${IIKO_URL}${path}`, body, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30000,
    });
    return res.data;
  } catch (e) {
    // Токен отозван раньше срока (перевыпуск ключа) — берём новый и повторяем один раз
    if (e.response?.status === 401 && !retried) {
      tokens.delete(currentCreds());
      return iikoPost(path, body, { retried: true });
    }
    if (e.response?.status === 429) {
      const retryAfter = Number(e.response.headers?.['retry-after']);
      const waitSec = retryAfter > 0 ? Math.min(retryAfter, 300) : 60;
      coolingUntil = Date.now() + waitSec * 1000;
      lastLimit = { path: shortPath(path), at: new Date().toISOString(), retryAfterSec: retryAfter > 0 ? retryAfter : null };
      console.warn(`iiko: лимит запросов (429) на ${path}, Retry-After ${retryAfter || '—'} — фоновые опросы на паузе ${waitSec} с`);
      // Запрос человека (вход, заказ): iiko просит подождать пару секунд — ждём и пробуем ещё раз
      if (!background && !limited && retryAfter > 0 && retryAfter <= 5) {
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        return iikoPost(path, body, { retried, limited: true });
      }
      e.status = 503;
      e.message = `iiko временно ограничила запросы (${shortPath(path)}) — попробуйте через ${waitSec >= 60 ? `${Math.ceil(waitSec / 60)} мин` : `${waitSec} с`}`;
    }
    throw e;
  }
}

/**
 * Команды iiko (order/add_items, change_payments, close…) выполняются асинхронно: ответ 200 означает
 * «принято в очередь», результат — по correlationId в /api/1/commands/status (InProgress → Success | Error).
 * Возвращает 'Success'; при Error бросает ошибку с причиной; если iiko не ответил за timeoutMs — 'Timeout'.
 */
export async function waitForCommand(organizationId, correlationId, { timeoutMs = 30000, intervalMs = 1000 } = {}) {
  if (isIikoDemo() || !correlationId) return 'Success';
  const until = Date.now() + timeoutMs;
  for (;;) {
    let st = null;
    try {
      st = await iikoPost('/api/1/commands/status', { organizationId, correlationId });
    } catch (e) {
      // команда ещё не зарегистрирована — подождём; прочие ошибки статуса не означают провал команды
      if (Date.now() > until) return 'Timeout';
    }
    if (st?.state === 'Success') return 'Success';
    if (st?.state === 'Error') {
      const reason = st.errorReason || st.exception?.message || st.exception?.description || 'iiko не выполнил операцию';
      throw Object.assign(new Error(reason), { iikoCommand: true });
    }
    if (Date.now() > until) return 'Timeout';
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

function demoResponse(path, body) {
  console.log(`[iiko demo] ${path}`);
  if (path === '/api/1/order/create') {
    const id = body?.order?.id || randomUUID();
    demoCreate({ ...body, order: { ...body?.order, id } });
    return { orderInfo: { id, creationStatus: 'Success' } };
  }
  if (path === '/api/1/order/add_items') {
    demoAddItems(body);
    return { correlationId: randomUUID(), demo: true };
  }
  // Демо-касса в памяти (lib/iiko-demo-orders.js): открытые заказы по столам, IIKO_DEMO_TABLE_ORDERS
  if (path === '/api/1/reserve/available_restaurant_sections') {
    return demoSections(demoReserveTables());
  }
  // Демо-брони в памяти (lib/iiko-demo-reserves.js): IIKO_DEMO_RESERVES и /api/v1/iiko/demo/reserves
  if (path === '/api/1/reserve/restaurant_sections_workload') {
    return demoReservesWorkload(body);
  }
  if (path === '/api/1/reserve/status_by_id') {
    return demoReservesByIds(body);
  }
  if (path === '/api/1/order/by_id') {
    return demoOrdersByIds(body);
  }
  if (path === '/api/1/order/by_table') {
    return demoOrdersByTable(body);
  }
  if (path === '/api/1/stop_lists') {
    return { terminalGroupStopLists: [] };
  }
  return { correlationId: randomUUID(), demo: true, body };
}

/** Произвольный запрос к iiko Cloud API (с токеном и демо-режимом). */
export const iikoRequest = (path, body) => iikoPost(path, body);

/** Стоп-лист iiko для организации: Set productId с нулевым остатком. */
export async function getStopListProductIds(organizationId, terminalGroupId) {
  const data = await iikoPost('/api/1/stop_lists', { organizationIds: [organizationId] });
  const ids = new Set();
  for (const org of data?.terminalGroupStopLists || []) {
    for (const group of org.items || []) {
      if (terminalGroupId && group.terminalGroupId && group.terminalGroupId !== terminalGroupId) continue;
      for (const item of group.items || []) {
        if (Number(item.balance) <= 0) ids.add(String(item.productId));
      }
    }
  }
  return ids;
}

/**
 * Терминальные группы организации и живы ли они (кассы iikoFront на связи с облаком).
 * Заказ на стол принимает только живая группа с iikoFront ≥ 7.1.5; «версия 0.0.0» — касса не подключалась.
 */
export async function listTerminalGroups(organizationId) {
  const tg = await iikoPost('/api/1/terminal_groups', { organizationIds: [organizationId], includeDisabled: true });
  const list = (tg?.terminalGroups || []).flatMap((g) => g.items || []).map((t) => ({ id: t.id, name: t.name, isAlive: null }));
  if (!list.length) return list;
  try {
    const alive = await iikoPost('/api/1/terminal_groups/is_alive', { organizationIds: [organizationId], terminalGroupIds: list.map((t) => t.id) });
    for (const st of alive?.isAliveStatus || []) {
      const t = list.find((x) => x.id === st.terminalGroupId);
      if (t) t.isAlive = Boolean(st.isAlive);
    }
  } catch { /* статус неизвестен */ }
  return list;
}

/** Живая терминальная группа: текущая, если жива, иначе первая живая. */
export async function pickAliveTerminalGroup(organizationId, currentId) {
  const list = await listTerminalGroups(organizationId);
  const cur = list.find((t) => t.id === currentId);
  if (cur?.isAlive) return { id: cur.id, list };
  return { id: list.find((t) => t.isAlive)?.id || null, list };
}

/** Ошибка iiko «касса не та / не на связи» — стоит попробовать другую терминальную группу. */
export function isTerminalGroupError(e) {
  const text = `${e?.response?.data?.errorDescription || ''} ${e?.response?.data?.error || ''} ${e?.message || ''}`;
  return /server version|incompatible|not alive|terminal ?group|TerminalGroup/i.test(text);
}

export async function getRestaurantSections(organizationId, terminalGroupId) {
  // По спецификации запрос — только terminalGroupIds (+returnSchema, revision); organizationId в нём лишний
  void organizationId;
  return iikoPost('/api/1/reserve/available_restaurant_sections', {
    terminalGroupIds: [terminalGroupId],
  });
}

/**
 * Занятость залов с бронями за период (только чтение): restaurantSectionIds — залы из схемы,
 * dateFrom/dateTo — «ГГГГ-ММ-ДД ЧЧ:ММ:СС.000» по местному времени точки. Брони — в массивах reserves ответа.
 */
export async function getReservesWorkload(sectionIds, dateFrom, dateTo) {
  return iikoPost('/api/1/reserve/restaurant_sections_workload', { restaurantSectionIds: sectionIds, dateFrom, dateTo });
}

/** Брони по ID: статус (New / Started / Closed) и детали (только чтение). */
export async function getReservesByIds(organizationId, reserveIds) {
  return iikoPost('/api/1/reserve/status_by_id', { organizationId, reserveIds });
}

/**
 * Сервисная печать («В работу» = бегунки на кухню и в бар): iiko печатает заказ на принтерах той кассы,
 * куда он ушёл. Работает, если в iikoWeb (Cloud API → организация → Настройки → «Автоматическая сервисная
 * печать заказов на стол») выбрано «Доверять параметрам из API». IIKO_SERVICE_PRINT=false — не просить печать.
 */
const servicePrint = () => process.env.IIKO_SERVICE_PRINT !== 'false';

/**
 * Позиция заказа iiko: блюдо, размер (productSizeId) и модификаторы гостя.
 * productGroupId — группа модификаторов из внешнего меню (обязательна для групповых модификаторов).
 */
function orderItem(item) {
  const mods = (item.modifiers || []).filter((m) => m.productId && m.amount > 0);
  return {
    productId: item.productId,
    type: 'Product',
    amount: item.amount,
    ...(item.productSizeId ? { productSizeId: item.productSizeId } : {}),
    ...(mods.length ? { modifiers: mods.map((m) => ({ productId: m.productId, amount: m.amount, ...(m.productGroupId ? { productGroupId: m.productGroupId } : {}) })) } : {}),
    ...(item.comment ? { comment: item.comment } : {}),
  };
}

export async function createTableOrder({
  organizationId,
  terminalGroupId,
  tableIds,
  items,
  guestCount = 1,
  id = undefined,
}) {
  return iikoPost('/api/1/order/create', {
    organizationId,
    terminalGroupId,
    order: {
      // Свой ID заказа: если ответ iiko потерялся, по нему проверяем, создан ли заказ, вместо второго заказа на кухню
      ...(id ? { id } : {}),
      tableIds,
      items: items.map(orderItem),
      guests: { count: guestCount },
    },
    createOrderSettings: { servicePrint: servicePrint() },
  });
}

export async function addItemsToOrder({
  organizationId,
  orderId,
  items,
}) {
  const res = await iikoPost('/api/1/order/add_items', {
    organizationId,
    orderId,
    items: items.map(orderItem),
    addOrderItemsSettings: { servicePrint: servicePrint() },
  });
  // Ошибка добавления (заказ закрыт, позиция в стоп-листе) — позиции не помечаем отправленными, официант повторит.
  // Нет ответа за 30 с — считаем принятым: повторная отправка задвоила бы блюда на кухне.
  const state = await waitForCommand(organizationId, res?.correlationId);
  if (state === 'Timeout') console.warn(`iiko add_items ${orderId}: статус команды не получен за 30 с`);
  return res;
}

export async function getOrdersByTable(organizationIds, tableIds) {
  return iikoPost('/api/1/order/by_table', {
    organizationIds,
    tableIds,
    statuses: ['New', 'Bill'],
  });
}

/** Заказы на стол по ID (статус заказа и статусы блюд на кухне). */
export async function getOrdersByIds(organizationId, orderIds) {
  return iikoPost('/api/1/order/by_id', { organizationIds: [organizationId], orderIds });
}

/**
 * Снимок заказа iiko: { exists, creationStatus, status (New/Bill/Closed/Deleted), sum, items:[{productId, amount}] }.
 * exists=false — iiko такого заказа не знает (не создан).
 */
export async function getOrderSnapshot(organizationId, orderId) {
  const data = await getOrdersByIds(organizationId, [orderId]);
  const info = (data?.orders || [])[0];
  if (!info) return { exists: false };
  const order = info.order || null;
  const items = (order?.items || []).filter((i) => (i.type || 'Product') === 'Product' && !isRemovedItem(i))
    .map((i) => ({ productId: String(i.product?.id || i.productId || ''), amount: Number(i.amount || 0) }));
  return {
    exists: info.creationStatus !== 'Error',
    creationStatus: info.creationStatus || null,
    error: info.errorInfo?.message || info.errorInfo?.description || null,
    status: order?.status || null,
    sum: order?.sum != null ? Number(order.sum) : null,
    items,
  };
}

/** Ответ iiko не получен (таймаут, сеть, 5xx): команда могла и выполниться — повтор вслепую задвоит заказ. */
export function isUnknownOutcome(e) {
  if (e?.iikoCommand) return false; // команда iiko вернула Error — это точный отказ
  return !e?.response || e.response.status >= 500 || e.code === 'ECONNABORTED';
}

export async function initOrderByTable(organizationId, terminalGroupId, tableIds) {
  return iikoPost('/api/1/order/init_by_table', {
    organizationId,
    terminalGroupId,
    tableIds,
  });
}

/** Оплаты заказа; ждём результат команды — иначе close может уйти раньше, чем iiko применил оплату */
export async function changeOrderPayments(organizationId, orderId, payments) {
  const res = await iikoPost('/api/1/order/change_payments', {
    organizationId,
    orderId,
    payments,
  });
  if (await waitForCommand(organizationId, res?.correlationId) === 'Timeout') {
    throw new Error('iiko не подтвердил внесение оплаты за 30 секунд — проверьте заказ на кассе');
  }
  return res;
}

/** Закрыть заказ; счёт считается закрытым только после Success команды */
export async function closeTableOrder(organizationId, orderId) {
  const res = await iikoPost('/api/1/order/close', {
    organizationId,
    orderId,
  });
  if (await waitForCommand(organizationId, res?.correlationId) === 'Timeout') {
    throw new Error('iiko не подтвердил закрытие счёта за 30 секунд — проверьте заказ на кассе');
  }
  return res;
}

/** Найти UUID стола iiko по номеру (из секций или кэша). */
export function matchTableIdFromSections(sectionsResponse, tableNumber) {
  const num = String(tableNumber).trim();
  const sections = sectionsResponse?.restaurantSections
    || sectionsResponse?.sections
    || [];

  for (const section of sections) {
    const tables = section?.tables || [];
    for (const table of tables) {
      const name = String(table.name || table.number || '').trim();
      const id = table.id;
      if (!id || table.isDeleted) continue;
      if (name === num || name === `Стол ${num}` || name === `стол ${num}`) {
        return id;
      }
      if (name.replace(/\D/g, '') === num) {
        return id;
      }
    }
  }
  return null;
}

// Организации, подключённые к API-логину (кэш 10 мин). Запросы по неподключённым iiko отклоняет целиком (403).
const orgCache = new Map(); // creds -> { at, ids, list }
export async function accessibleOrgs(creds = currentCreds()) {
  if (isIikoDemo()) return null;
  const hit = orgCache.get(creds);
  if (hit?.list && Date.now() - hit.at < 10 * 60 * 1000) return hit.list;
  try {
    const data = await withIikoCreds(creds, () => iikoRequest('/api/1/organizations', { returnAdditionalInfo: false, includeDisabled: false }));
    const list = (data?.organizations || []).map((o) => ({ id: o.id, name: o.name }));
    orgCache.set(creds, { at: Date.now(), list });
    return list;
  } catch (e) {
    console.warn(`iiko organizations${creds ? ` (${creds})` : ''}:`, e.response?.data?.errorDescription || e.message);
    return hit?.list || null;
  }
}
export async function accessibleOrgIds(creds = currentCreds()) {
  const list = await accessibleOrgs(creds);
  return list ? new Set(list.map((o) => o.id)) : null;
}
