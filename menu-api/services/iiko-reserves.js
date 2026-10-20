/**
 * Брони столов из iikoCloud — только чтение, в iiko ничего не создаём и не меняем.
 *
 * Раз в IIKO_RESERVE_MS (90 с) для каждой подключённой точки:
 *   1. залы точки — /api/1/reserve/available_restaurant_sections (restaurantSections[].id и столы → наши номера);
 *   2. занятость залов с бронями на рабочие сутки (сегодня и завтра до 05:00) —
 *      /api/1/reserve/restaurant_sections_workload { restaurantSectionIds, dateFrom, dateTo };
 *      из брони берём id, estimatedStartTime, durationInMinutes, tableIds, customer (имя), phone, guestsCount, comment, status;
 *   3. если iiko не прислал статус брони, спрашиваем /api/1/reserve/status_by_id { organizationId, reserveIds } (New / Started / Closed);
 *   4. services/reservations.js: брони сохраняются, ко времени брони создаётся стол, отменённые закрываются, «не пришли» отмечаются.
 * Разбор ответа терпим к отсутствующим полям (lib/iiko-reserve-sync.js). Вебхуки iiko ReserveUpdate / Reserve* — если их
 * включили в iikoWeb, склеиваются в один внеочередной опрос (scheduleReserveSync); подписку сами не меняем.
 */
import pool from '../db/pool.js';
import { getReservesByIds, getReservesWorkload, getRestaurantSections, iikoCoolingDown, isIikoDemo, withIikoCreds } from '../iiko-client.js';
import { tableNumbersBySections } from '../lib/iiko-order-sync.js';
import {
  collectReserves, collectStatuses, formatIikoTime, reserveWindow, sectionIdsOf,
} from '../lib/iiko-reserve-sync.js';
import { getSource } from './sources.js';
import { applyStatuses, cancelMissing, processReserves, upsertReserves } from './reservations.js';

/** Залы и столы точки меняются редко — держим схему 10 минут (в демо не держим). */
const SECTIONS_TTL_MS = 10 * 60 * 1000;
const sectionsCache = new Map(); // creds:org:tg -> { at, map, sectionIds }

/** Демо-брони одни на все точки — загружаем их только в одну точку. */
const demoSlug = () => process.env.IIKO_DEMO_RESTAURANT || 'novo-sadovaya';

async function hall(src) {
  const key = `${src.creds || ''}:${src.organization_id}:${src.terminal_group_id}`;
  const hit = sectionsCache.get(key);
  if (hit && !isIikoDemo() && Date.now() - hit.at < SECTIONS_TTL_MS) return hit;
  const sections = await getRestaurantSections(src.organization_id, src.terminal_group_id);
  const value = { at: Date.now(), map: tableNumbersBySections(sections), sectionIds: sectionIdsOf(sections) };
  if (value.map.size) sectionsCache.set(key, value);
  return value;
}

// Последняя загрузка броней по точке — для админки: когда обновлялись, сколько пришло, что пошло не так
const lastLoad = new Map(); // restaurantId → { at, ok, seen, sections, error }
export const reserveSyncStatus = (restaurantId) => lastLoad.get(restaurantId) || null;
const note = (restaurant, v) => lastLoad.set(restaurant.id, { at: new Date().toISOString(), ...v });

/** Загрузить брони одной точки из iiko в нашу таблицу. Возвращает сколько броней получено. */
async function loadRestaurant(restaurant) {
  const src = await getSource(restaurant, 'main');
  const demo = isIikoDemo();
  if (!src?.organization_id || (!demo && !src.terminal_group_id)) {
    note(restaurant, { ok: false, seen: 0, error: 'у точки не выбрана касса iiko (терминальная группа)' });
    return 0;
  }
  let seen = 0;
  await withIikoCreds(src.creds, async () => {
    const { map, sectionIds } = await hall(src);
    if (!sectionIds.length) {
      note(restaurant, { ok: false, seen: 0, sections: 0, error: 'iiko не отдал залы точки (reserve/available_restaurant_sections)' });
      return;
    }
    const w = reserveWindow();
    const response = await getReservesWorkload(sectionIds, formatIikoTime(w.from), formatIikoTime(w.to));
    const list = collectReserves(response);
    seen = list.length;
    await upsertReserves(restaurant, list, map);
    await cancelMissing(restaurant.id, w);
    note(restaurant, { ok: true, seen, sections: sectionIds.length });

    // iiko не прислал статус — уточняем у ближайших броней (за 3 часа до и за час после начала)
    const now = Date.now();
    const unknown = list.filter((r) => !r.statusKnown && r.status !== 'cancelled'
      && new Date(r.startsAt).getTime() > now - 3 * 3600_000 && new Date(r.startsAt).getTime() < now + 3600_000);
    for (let i = 0; i < unknown.length; i += 100) {
      try {
        const st = await getReservesByIds(src.organization_id, unknown.slice(i, i + 100).map((r) => r.id));
        await applyStatuses(restaurant.id, collectStatuses(st));
      } catch (e) {
        console.warn(`iiko reserves status ${restaurant.slug}:`, e.response?.data?.errorDescription || e.message);
        break;
      }
    }
  });
  return seen;
}

let running = null;
let again = false;

async function restaurantsFor(filter) {
  const demo = isIikoDemo();
  const { rows } = await pool.query(
    `SELECT * FROM restaurants WHERE is_disabled = FALSE AND organization_id IS NOT NULL
       AND ($1::uuid IS NULL OR id = $1) AND (NOT $2 OR slug = $3)`,
    [filter.restaurantId || null, demo, demoSlug()],
  );
  return rows;
}

/**
 * Опрос броней iiko по всем подключённым точкам (или одной / одной организации — после вебхука) и разбор: столы, отмены, «не пришли».
 * Параллельные вызовы склеиваются: пока идёт опрос, следующий запускается один раз сразу после него.
 */
export function syncReserves(filter = {}) {
  if (iikoCoolingDown()) return Promise.resolve({ ...{ seen: 0, actions: {} }, skipped: 'iiko 429' }); // лимит iiko — пропускаем ход
  if (running) { again = true; return running; }
  running = (async () => {
    const total = { seen: 0, actions: {} };
    try {
      do {
        again = false;
        for (const restaurant of await restaurantsFor(filter)) {
          if (filter.organizationId && !isIikoDemo() && restaurant.organization_id !== filter.organizationId) continue;
          try {
            total.seen += await loadRestaurant(restaurant);
          } catch (e) {
            // Организация не подключена к ключу (403), нет прав на брони и т. п. — остальные точки продолжаем
            console.warn(`iiko reserves ${restaurant.slug}:`, e.response?.data?.errorDescription || e.message);
            note(restaurant, { ok: false, seen: 0, error: String(e.response?.data?.errorDescription || e.message).slice(0, 300) });
          }
          const stats = await processReserves(restaurant.id);
          for (const [k, v] of Object.entries(stats)) total.actions[k] = (total.actions[k] || 0) + v;
        }
      } while (again);
    } finally {
      running = null;
    }
    return total;
  })();
  return running;
}

/** Только разбор уже загруженных броней (без запросов в iiko): пора ли создать стол, не пришла ли бронь. Дёшево — раз в 30 с. */
export async function tickReserves() {
  const stats = {};
  for (const restaurant of await restaurantsFor({})) {
    for (const [k, v] of Object.entries(await processReserves(restaurant.id))) stats[k] = (stats[k] || 0) + v;
  }
  return stats;
}

// Вебхуки iiko присылают пачку событий — склеиваем в один опрос организации
const scheduled = new Map();
export function scheduleReserveSync(organizationId, delayMs = 1500) {
  const key = organizationId || '*';
  if (scheduled.has(key)) return;
  const t = setTimeout(() => {
    scheduled.delete(key);
    syncReserves(organizationId ? { organizationId } : {}).catch((e) => console.warn('iiko reserves:', e.message));
  }, delayMs);
  t.unref?.();
  scheduled.set(key, t);
}
