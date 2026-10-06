/**
 * Стоп-листы iiko: хранятся в БД (stop_lists) и в памяти, в запросе гостя iiko не вызывается.
 * Обновляются по вебхуку iiko StopListUpdate и фоновой сверкой (одним запросом на все организации).
 */
import { createHmac } from 'crypto';
import pool from '../db/pool.js';
import { accessibleOrgIds, iikoRequest, isIikoDemo, withIikoCreds } from '../iiko-client.js';
import { allOrgTargets } from './sources.js';
import { PUBLIC_MENU_URL } from '../lib/qr-config.js';

const memory = new Map(); // restaurantId -> Set(productId) — закончилось
const limited = new Map(); // restaurantId -> Map(productId -> остаток) — ограниченный остаток
let loaded = false;
let loadedAt = null;

async function loadFromDb() {
  const { rows } = await pool.query('SELECT restaurant_id, product_id, balance::float AS balance FROM stop_lists');
  memory.clear();
  limited.clear();
  for (const r of rows) {
    if (r.balance <= 0) {
      if (!memory.has(r.restaurant_id)) memory.set(r.restaurant_id, new Set());
      memory.get(r.restaurant_id).add(r.product_id);
    } else {
      if (!limited.has(r.restaurant_id)) limited.set(r.restaurant_id, new Map());
      limited.get(r.restaurant_id).set(r.product_id, r.balance);
    }
  }
  loaded = true;
  loadedAt = new Date().toISOString();
}

/** Остатки блюд с ограниченным количеством (iiko: стоп-лист с остатком > 0). */
export async function getStopBalances(restaurantId) {
  if (!loaded) await loadFromDb();
  return limited.get(restaurantId) || new Map();
}

/** Когда стоп-лист последний раз сверялся с iiko (для подписи «обновлено» у официанта). */
export const stopListLoadedAt = () => loadedAt;

/** ID блюд в стоп-листе ресторана — из памяти (мгновенно). */
export async function getStopListIds(restaurantId) {
  if (!loaded) await loadFromDb();
  return memory.get(restaurantId) || new Set();
}

/**
 * Обновить стоп-листы из iiko. orgIds — только эти организации (из вебхука), иначе все рестораны.
 * Возвращает число обновлённых ресторанов.
 */
export async function refreshStopLists(orgIds = null) {
  if (isIikoDemo()) return 0;
  // Кухня и доп. источники (бар) — у каждого своя организация и, возможно, свой ключ iiko
  const all = (await allOrgTargets()).filter((t) => !orgIds || orgIds.includes(t.organization_id));
  const byCreds = new Map();
  for (const t of all) {
    if (!byCreds.has(t.creds)) byCreds.set(t.creds, []);
    byCreds.get(t.creds).push(t);
  }
  let updated = 0;
  for (const [creds, list] of byCreds) {
    await withIikoCreds(creds, async () => {
      const allowed = await accessibleOrgIds();
      const targets = list.filter((t) => !allowed || allowed.has(t.organization_id));
      if (!targets.length) return;
      const orgs = [...new Set(targets.map((t) => t.organization_id))];
      const data = await iikoRequest('/api/1/stop_lists', { organizationIds: orgs });
      const byOrg = new Map();
      for (const org of data?.terminalGroupStopLists || []) byOrg.set(org.organizationId, org.items || []);
      for (const t of targets) {
        const items = [];
        for (const g of byOrg.get(t.organization_id) || []) {
          if (t.terminal_group_id && g.terminalGroupId && g.terminalGroupId !== t.terminal_group_id) continue;
          for (const it of g.items || []) {
            items.push({
              productId: String(it.productId),
              balance: Number(it.balance) || 0,
              sku: it.sku ? String(it.sku).slice(0, 100) : null,
              sizeId: it.sizeId ? String(it.sizeId) : null,
              dateAdd: it.dateAdd || null,
            });
          }
        }
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query('DELETE FROM stop_lists WHERE restaurant_id = $1 AND source = $2', [t.restaurant_id, t.source]);
          for (const it of items) {
            await client.query(
              `INSERT INTO stop_lists (restaurant_id, product_id, balance, source, sku, size_id, date_add)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (restaurant_id, product_id) DO UPDATE SET balance = LEAST(stop_lists.balance, EXCLUDED.balance),
                 source = EXCLUDED.source, sku = EXCLUDED.sku, size_id = EXCLUDED.size_id, date_add = EXCLUDED.date_add,
                 updated_at = NOW()`,
              [t.restaurant_id, it.productId, it.balance, t.source, it.sku, it.sizeId, it.dateAdd],
            );
          }
          await client.query('COMMIT');
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
        updated++;
      }
      // Названия позиций стоп-листа, которых нет в меню (ингредиенты, модификаторы) — из номенклатуры iiko
      for (const orgId of orgs) await refreshProductNames(orgId).catch((e) => console.warn('названия номенклатуры:', e.message));
    });
  }
  await loadFromDb();
  return updated;
}

// Номенклатура iiko большая — запрашиваем не чаще раза в сутки на организацию и только если есть безымянные позиции
const namesFetchedAt = new Map();
async function refreshProductNames(organizationId) {
  const last = namesFetchedAt.get(organizationId) || 0;
  if (Date.now() - last < 24 * 60 * 60 * 1000) return;
  const { rows } = await pool.query(
    `SELECT 1 FROM stop_lists s JOIN restaurants r ON r.id = s.restaurant_id
     WHERE r.organization_id = $1
       AND NOT EXISTS (SELECT 1 FROM products p WHERE p.restaurant_id = s.restaurant_id AND p.iiko_id::text = s.product_id)
       AND NOT EXISTS (SELECT 1 FROM iiko_product_names n WHERE n.organization_id = $1 AND n.product_id = s.product_id)
     LIMIT 1`,
    [organizationId],
  );
  namesFetchedAt.set(organizationId, Date.now());
  if (!rows.length) return;
  const nom = await iikoRequest('/api/1/nomenclature', { organizationId });
  const list = (nom?.products || []).filter((p) => p.id && p.name);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const p of list) {
      await client.query(
        `INSERT INTO iiko_product_names (organization_id, product_id, name, sku, type, updated_at) VALUES ($1,$2,$3,$4,$5,NOW())
         ON CONFLICT (organization_id, product_id) DO UPDATE SET name = EXCLUDED.name, sku = EXCLUDED.sku, type = EXCLUDED.type, updated_at = NOW()`,
        [organizationId, String(p.id), String(p.name).slice(0, 300), p.code ? String(p.code).slice(0, 100) : null, p.type ? String(p.type).slice(0, 30) : null],
      );
    }
    await client.query('COMMIT');
    console.log(`номенклатура ${organizationId}: названий ${list.length}`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Стоп-листы iiko по ресторанам — как в iiko, с названиями. Только чтение: в iiko ничего не пишем.
 * Позиция «в меню» — если она есть в QR-меню точки (иначе это ингредиент, модификатор или блюдо не из меню).
 */
export async function listStopLists(restaurantIds) {
  const { rows } = await pool.query(
    `SELECT s.restaurant_id, s.product_id, s.balance::float AS balance, s.source, s.sku, s.size_id, s.date_add, s.updated_at,
            p.name AS menu_name, p.price::float AS price, n.name AS iiko_name, n.type AS iiko_type
     FROM stop_lists s
     JOIN restaurants r ON r.id = s.restaurant_id
     LEFT JOIN products p ON p.restaurant_id = s.restaurant_id AND p.iiko_id::text = s.product_id
     LEFT JOIN iiko_product_names n ON n.organization_id = r.organization_id AND n.product_id = s.product_id
     WHERE s.restaurant_id = ANY($1::uuid[])
     ORDER BY s.date_add DESC NULLS LAST, COALESCE(p.name, n.name)`,
    [restaurantIds],
  );
  return rows.map((r) => ({
    restaurantId: r.restaurant_id,
    productId: r.product_id,
    name: r.menu_name || r.iiko_name || null,
    type: r.iiko_type || null,
    inMenu: Boolean(r.menu_name),
    price: r.price ?? null,
    balance: r.balance,
    stopped: r.balance <= 0,
    source: r.source,
    sku: r.sku,
    dateAdd: r.date_add,
    updatedAt: r.updated_at,
  }));
}

// ── Вебхуки iiko ────────────────────────────────────────────────────────────

export function webhookToken() {
  return process.env.IIKO_WEBHOOK_TOKEN
    || createHmac('sha256', process.env.AUTH_SECRET || 'fuji-menu-dev-secret-change-me').update('iiko-webhook').digest('hex').slice(0, 32);
}

export function webhookUrl() {
  return `${PUBLIC_MENU_URL}/api/v1/iiko/webhook`;
}

/**
 * Регистрирует вебхук в iiko для организаций ресторанов. Чужие настройки не трогает:
 * если у ключа уже указан другой адрес вебхука — только пишет об этом в лог.
 */
export async function registerWebhooks() {
  if (isIikoDemo() || process.env.IIKO_WEBHOOKS_DISABLED === 'true') return;
  const url = webhookUrl();
  const seen = new Set();
  for (const t of await allOrgTargets()) {
    const key = `${t.creds}|${t.organization_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    await withIikoCreds(t.creds, () => registerWebhookFor(t.organization_id, url));
  }
}

async function registerWebhookFor(organizationId, url) {
  const allowed = await accessibleOrgIds();
  if (allowed && !allowed.has(organizationId)) return; // точка не подключена к API-логину
  {
    try {
      const current = await iikoRequest('/api/1/webhooks/settings', { organizationId });
      const existing = current?.webHooksUri || '';
      if (existing && existing !== url) {
        console.log(`iiko webhook ${organizationId}: уже настроен на ${existing} — не меняю (укажите ${url} вручную, если нужно)`);
        return;
      }
      await iikoRequest('/api/1/webhooks/update_settings', {
        organizationId,
        webHooksUri: url,
        authToken: webhookToken(),
        webHooksFilter: {
          stopListUpdateFilter: { updates: true },
          tableOrderFilter: {
            orderStatuses: ['New', 'Bill', 'Closed', 'Deleted'],
            itemStatuses: ['Added', 'PrintedNotCooking', 'CookingStarted', 'CookingCompleted', 'Served'],
            errors: true,
          },
        },
      });
      console.log(`iiko webhook ${organizationId}: настроен на ${url}`);
    } catch (e) {
      console.log(`iiko webhook ${organizationId}: ${e.response?.status || ''} ${e.response?.data?.errorDescription || e.message}`);
    }
  }
}
