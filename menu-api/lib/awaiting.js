/**
 * «Выдача»: блюда, которые отправлены на кухню и ещё не вынесены, по всем открытым столам точки.
 * Чистые функции: сортировка, подсветка времени ожидания, поиск и подсказки по названиям.
 */
import { AWAIT_BAD_MIN, AWAIT_WARN_MIN } from './table-workflow-config.js';
import { cookInfo } from './cooking-time.js';

/** Подсветка ожидания: обычное до warn минут, жёлтое от warn, красное от bad */
export function waitLevel(minutes, warn = AWAIT_WARN_MIN, bad = AWAIT_BAD_MIN) {
  if (minutes == null) return 'ok';
  if (minutes >= bad) return 'bad';
  if (minutes >= warn) return 'warn';
  return 'ok';
}

/** Этап позиции: ready — готово, выносить; cooking — готовится; sent — ждёт кухню/кассу */
export function awaitState(row) {
  if (row.kitchen_status === 'CookingCompleted') return 'ready';
  if (row.kitchen_status === 'CookingStarted') return 'cooking';
  return 'sent';
}

const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();

/** Строки БД (позиция + стол) → позиции выдачи; ждут с момента готовности, иначе с отправки на кухню */
export function mapAwaiting(rows, now = Date.now(), norms = null) {
  return rows.map((r) => {
    const state = awaitState(r);
    const since = state === 'ready' ? (r.ready_at || r.ready_notified_at || r.updated_at || r.sent_at) : (r.sent_at || r.updated_at);
    const minutes = since ? Math.max(0, Math.floor((now - new Date(since).getTime()) / 60000)) : null;
    const cook = cookInfo({
      sentAt: r.sent_at, startedAt: r.cooking_started_at, readyAt: r.ready_at || r.ready_notified_at,
      cookMinutes: r.cook_minutes, kitchenStatus: r.kitchen_status,
    }, norms?.get(String(r.iiko_product_id)) || null, now);
    // Готовится: подсветка по нормативу блюда, а без норматива — по времени ожидания (10 / 20 мин)
    const level = state !== 'ready' && cook.normMinutes ? cook.level : waitLevel(minutes);
    return {
      itemId: r.id,
      sessionId: r.session_id,
      tableNumber: r.table_number,
      name: r.name,
      quantity: Number(r.quantity) || 1,
      guestName: r.guest_name || null,
      seatNumber: r.seat_number || null,
      state,
      since: since ? new Date(since).toISOString() : null,
      waitingMinutes: minutes,
      level,
      cook,
      waiterId: r.waiter_id || null,
      waiterName: r.waiter_name || null,
    };
  });
}

const STATE_ORDER = { ready: 0, cooking: 1, sent: 2 };

/** Сначала готовые, потом готовящиеся, потом ждущие; внутри группы — кто дольше ждёт, тот выше */
export function sortAwaiting(list) {
  return [...list].sort((a, b) => (STATE_ORDER[a.state] - STATE_ORDER[b.state])
    || ((b.waitingMinutes ?? -1) - (a.waitingMinutes ?? -1))
    || String(a.tableNumber).localeCompare(String(b.tableNumber), 'ru', { numeric: true }));
}

/** Поиск по названию блюда: без регистра, по любой части */
export function filterAwaiting(list, q) {
  const needle = norm(q);
  return needle ? list.filter((i) => norm(i.name).includes(needle)) : list;
}

/** Подсказки: названия блюд, которые сейчас ждут выноса, с количеством и числом готовых */
export function awaitingDishes(list) {
  const by = new Map();
  for (const i of list) {
    const d = by.get(i.name) || { name: i.name, quantity: 0, ready: 0, tables: new Set() };
    d.quantity += i.quantity;
    if (i.state === 'ready') d.ready += i.quantity;
    d.tables.add(String(i.tableNumber));
    by.set(i.name, d);
  }
  return [...by.values()]
    .map((d) => ({ name: d.name, quantity: d.quantity, ready: d.ready, tables: d.tables.size }))
    .sort((a, b) => (b.ready - a.ready) || a.name.localeCompare(b.name, 'ru'));
}

/** Ответ API: q — поиск по названию; подсказки считаются по всем ожидающим блюдам */
export function buildAwaiting(rows, q = '', now = Date.now(), norms = null) {
  const all = mapAwaiting(rows, now, norms);
  return {
    warnMinutes: AWAIT_WARN_MIN,
    badMinutes: AWAIT_BAD_MIN,
    dishes: awaitingDishes(all),
    items: sortAwaiting(filterAwaiting(all, q)),
  };
}
