/**
 * Импорт открытых заказов iiko: официант открыл заказ на кассе (iikoFront) — стол попадает и к нам:
 * в меню гостя, на экран официанта и в админку.
 *
 * Раз в IIKO_IMPORT_MS (30 с) и по вебхуку iiko для каждой подключённой точки (и каждого доп. источника — бара):
 *   1. столы точки — схема зала /api/1/reserve/available_restaurant_sections;
 *   2. открытые заказы по ним — /api/1/order/by_table (organizationIds, tableIds, statuses New/Bill);
 *   3. каждый заказ сверяем с визитами (lib/iiko-order-sync.js: matchOrderToSession):
 *      — заказ уже в нашем визите — ничего не делаем, позиции/статусы/удаления досверяет refreshFromIiko;
 *      — на столе открыт наш визит, а заказ чужой — прицепляем к нему как ещё один заказ (iiko_orders, код «main#ab12cd34»);
 *      — визита нет — заводим «открыт на кассе» с официантом iiko и позициями как уже отправленными.
 * В iiko ничего не пишем: только чтение. Закрытие и оплата на кассе — closeIfPaidAtTill (table-session.js).
 */
import pool from '../db/pool.js';
import { getOrdersByTable, getRestaurantSections, asBackground, iikoCoolingDown, isIikoDemo, withIikoCreds } from '../iiko-client.js';
import {
  matchOrderToSession, normalizeIikoOrder, orderKey, sessionOrders, tableNumbersBySections,
} from '../lib/iiko-order-sync.js';
import { withSessionMutex } from '../lib/session-mutex.js';
import { sessionHasIikoOrderSql, uuidOrNull } from '../lib/uuid.js';
import { getSource, listSources } from './sources.js';
import { getSessionContext, syncAddedItems } from './table-session.js';
import { WORKFLOW } from '../lib/table-workflow-config.js';

/** Столы точки меняются редко — схему зала держим 10 минут (в демо — не держим, там столы появляются на лету). */
const SECTIONS_TTL_MS = 10 * 60 * 1000;
const sectionsCache = new Map(); // creds:org:tg -> { at, map }

/** Демо-касса одна на все точки — импортируем её заказы только в одну точку. */
const demoSlug = () => process.env.IIKO_DEMO_RESTAURANT || 'novo-sadovaya';

async function tableNumbers(src) {
  const key = `${src.creds || ''}:${src.organization_id}:${src.terminal_group_id}`;
  const hit = sectionsCache.get(key);
  if (hit && !isIikoDemo() && Date.now() - hit.at < SECTIONS_TTL_MS) return hit.map;
  const sections = await getRestaurantSections(src.organization_id, src.terminal_group_id);
  const map = tableNumbersBySections(sections);
  if (map.size) sectionsCache.set(key, { at: Date.now(), map });
  return map;
}

/** Визит, где этот заказ iiko уже записан (за последние дни): открытый — в приоритете. */
async function findKnownSession(restaurantId, orderIdRaw) {
  const orderId = uuidOrNull(String(orderIdRaw).toLowerCase());
  if (!orderId) return null;
  const { rows } = await pool.query(
    `SELECT id, status FROM table_sessions
     WHERE restaurant_id = $1 AND created_at > NOW() - INTERVAL '3 days'
       AND ${sessionHasIikoOrderSql('$2')}
     ORDER BY (status = 'open') DESC, created_at DESC LIMIT 1`,
    [restaurantId, orderId],
  );
  return rows[0] ? { id: rows[0].id, open: rows[0].status === 'open' } : null;
}

async function findOpenSession(restaurantId, table) {
  const { rows } = await pool.query(
    "SELECT * FROM table_sessions WHERE restaurant_id = $1 AND table_number = $2 AND status = 'open' LIMIT 1",
    [restaurantId, table],
  );
  return rows[0] || null;
}

/** Официант с кассы → наш сотрудник по ID сотрудника iiko (если он входил к нам через iiko). */
async function findStaff(restaurantId, iikoEmployeeId) {
  if (!iikoEmployeeId) return null;
  const { rows } = await pool.query(
    `SELECT id FROM staff_users WHERE iiko_employee_id = $1 AND is_active
     ORDER BY (restaurant_id = $2) DESC NULLS LAST LIMIT 1`,
    [String(iikoEmployeeId), restaurantId],
  );
  return rows[0]?.id || null;
}

/** Привязать заказ iiko к визиту (iiko_orders) и пометить визит «открыт на кассе». Возвращает код заказа. */
async function linkOrder(session, src, norm, tableId, staffId) {
  const orders = sessionOrders(session);
  const code = orderKey(orders, src.code, norm.id);
  const entry = { orderId: norm.id, tableId: tableId || null, imported: true };
  await pool.query(
    `UPDATE table_sessions SET
       iiko_orders = COALESCE(iiko_orders, '{}'::jsonb) || jsonb_build_object($2::text, $3::jsonb),
       iiko_order_id = CASE WHEN $2 = 'main' THEN COALESCE(iiko_order_id, $4::uuid) ELSE iiko_order_id END,
       iiko_table_id = COALESCE(iiko_table_id, $5::uuid),
       opened_in_iiko = TRUE,
       iiko_waiter_name = COALESCE(iiko_waiter_name, $6),
       waiter_id = COALESCE(waiter_id, $7),
       guest_count = GREATEST(guest_count, $8::int),
       sent_to_production_at = COALESCE(sent_to_production_at, NOW()),
       workflow_status = CASE WHEN workflow_status IN ('browsing', 'building_cart') THEN $9 ELSE workflow_status END,
       updated_at = NOW()
     WHERE id = $1`,
    [session.id, code, JSON.stringify(entry), norm.id, tableId || null, norm.waiter?.name || null, staffId,
      norm.guestCount || 1, WORKFLOW.IN_PRODUCTION],
  );
  return code;
}

/** Один заказ iiko на столе: завести визит, прицепить к открытому или оставить как есть. */
async function importOrder(restaurant, src, table, tableId, norm) {
  return withSessionMutex(`import:${restaurant.id}:${table}`, async () => {
    const knownIn = await findKnownSession(restaurant.id, norm.id);
    let open = knownIn ? null : await findOpenSession(restaurant.id, table);
    const plan = matchOrderToSession({ order: norm, knownIn, openSession: open });
    if (plan.action === 'skip' || plan.action === 'sync') return plan.action;

    const staffId = await findStaff(restaurant.id, norm.waiter?.id);
    let session = open;
    let action = plan.action;
    if (action === 'create') {
      const { rows } = await pool.query(
        `INSERT INTO table_sessions (restaurant_id, table_number, workflow_status, sent_to_production_at, last_guest_activity_at, opened_in_iiko)
         VALUES ($1, $2, $3, NOW(), NOW(), TRUE)
         ON CONFLICT (restaurant_id, table_number) WHERE status = 'open' DO NOTHING
         RETURNING *`,
        [restaurant.id, table, WORKFLOW.IN_PRODUCTION],
      );
      session = rows[0] || await findOpenSession(restaurant.id, table);
      if (!rows[0]) action = 'attach'; // гость успел отсканировать QR раньше — цепляем к его визиту
    }
    if (!session) return 'skip';
    const code = await linkOrder(session, src, norm, tableId, staffId);
    const ctx = await getSessionContext(session.id);
    await syncAddedItems(ctx, code, norm, norm.id, sessionOrders(ctx.session));
    console.log(`iiko: стол ${table} — ${action === 'create' ? 'заказ с кассы, заведён визит' : 'заказ с кассы прицеплен к визиту'} (${code})`);
    return action;
  });
}

/** Открытые заказы одного источника точки (кухня или бар). */
async function importSource(restaurant, source) {
  const src = await getSource(restaurant, source.code);
  const demo = isIikoDemo();
  if (!src?.organization_id || (!demo && !src.terminal_group_id)) return { created: 0, attached: 0, seen: 0 };
  const stats = { created: 0, attached: 0, seen: 0 };
  await withIikoCreds(src.creds, async () => {
    const byId = await tableNumbers(src);
    const tableIds = [...byId.keys()];
    for (let i = 0; i < tableIds.length; i += 100) {
      const data = await getOrdersByTable([src.organization_id], tableIds.slice(i, i + 100));
      for (const raw of data?.orders || []) {
        if (raw.creationStatus === 'Error') continue;
        const norm = normalizeIikoOrder(raw);
        if (!norm.id || !['New', 'Bill'].includes(norm.status || 'New')) continue;
        const tableId = norm.tableIds.find((t) => byId.has(t));
        const table = tableId && byId.get(tableId);
        if (!table) continue;
        if (/^\d+$/.test(table) && restaurant.tables_count && Number(table) > restaurant.tables_count) continue; // стола нет в нашей схеме QR
        stats.seen++;
        const action = await importOrder(restaurant, src, table, tableId, norm);
        if (action === 'create') stats.created++;
        if (action === 'attach') stats.attached++;
      }
    }
  });
  return stats;
}

let running = null;
let again = false;

/**
 * Опрос открытых заказов iiko по всем подключённым точкам (или одной точке / одной организации — после вебхука).
 * Параллельные вызовы склеиваются: пока идёт опрос, следующий запускается один раз сразу после него.
 */
export function importOpenOrders(filter = {}) {
  if (iikoCoolingDown()) return Promise.resolve({ ...{ created: 0, attached: 0, seen: 0 }, skipped: 'iiko 429' }); // лимит iiko — пропускаем ход
  if (running) { again = true; return running; }
  running = (async () => {
    const total = { created: 0, attached: 0, seen: 0 };
    try {
      do {
        again = false;
        const demo = isIikoDemo();
        const { rows: restaurants } = await pool.query(
          `SELECT * FROM restaurants WHERE is_disabled = FALSE AND organization_id IS NOT NULL
             AND ($1::uuid IS NULL OR id = $1) AND (NOT $2 OR slug = $3)`,
          [filter.restaurantId || null, demo, demoSlug()],
        );
        for (const restaurant of restaurants) {
          for (const source of await listSources(restaurant)) {
            if (filter.organizationId && !demo) {
              const src = await getSource(restaurant, source.code);
              if (src.organization_id !== filter.organizationId) continue;
            }
            try {
              const st = await importSource(restaurant, source);
              total.created += st.created; total.attached += st.attached; total.seen += st.seen;
            } catch (e) {
              // Организация не подключена к ключу (403), касса не на связи и т. п. — остальные точки продолжаем
              console.warn(`iiko import ${restaurant.slug}/${source.code}:`, e.response?.data?.errorDescription || e.message);
            }
          }
        }
      } while (again);
    } finally {
      running = null;
    }
    return total;
  })();
  return running;
}

// Вебхуки iiko присылают пачку событий на заказ — склеиваем в один опрос организации
const scheduled = new Map();
export function scheduleImport(organizationId, delayMs = 1500) {
  const key = organizationId || '*';
  if (scheduled.has(key)) return;
  const t = setTimeout(() => {
    scheduled.delete(key);
    asBackground(() => importOpenOrders(organizationId ? { organizationId } : {})).catch((e) => console.warn('iiko import:', e.message));
  }, delayMs);
  t.unref?.();
  scheduled.set(key, t);
}
