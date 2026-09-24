/**
 * Стоп-листы iiko: хранятся в БД (stop_lists) и в памяти, в запросе гостя iiko не вызывается.
 * Обновляются по вебхуку iiko StopListUpdate и фоновой сверкой (одним запросом на все организации).
 */
import { createHmac } from 'crypto';
import pool from '../db/pool.js';
import { iikoRequest, isIikoDemo } from '../iiko-client.js';
import { PUBLIC_MENU_URL } from '../lib/qr-config.js';

const memory = new Map(); // restaurantId -> Set(productId)
let loaded = false;

async function loadFromDb() {
  const { rows } = await pool.query('SELECT restaurant_id, product_id FROM stop_lists WHERE balance <= 0');
  memory.clear();
  for (const r of rows) {
    if (!memory.has(r.restaurant_id)) memory.set(r.restaurant_id, new Set());
    memory.get(r.restaurant_id).add(r.product_id);
  }
  loaded = true;
}

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
  const { rows: restaurants } = await pool.query(
    `SELECT id, slug, organization_id, terminal_group_id FROM restaurants
     WHERE is_disabled = FALSE AND organization_id IS NOT NULL`,
  );
  const targets = restaurants.filter((r) => !orgIds || orgIds.includes(r.organization_id));
  if (!targets.length) return 0;
  const orgs = [...new Set(targets.map((r) => r.organization_id))];
  const data = await iikoRequest('/api/1/stop_lists', { organizationIds: orgs });

  const byOrg = new Map();
  for (const org of data?.terminalGroupStopLists || []) byOrg.set(org.organizationId, org.items || []);

  for (const r of targets) {
    const groups = byOrg.get(r.organization_id) || [];
    const items = [];
    for (const g of groups) {
      if (r.terminal_group_id && g.terminalGroupId && g.terminalGroupId !== r.terminal_group_id) continue;
      for (const it of g.items || []) items.push({ productId: String(it.productId), balance: Number(it.balance) || 0 });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM stop_lists WHERE restaurant_id = $1', [r.id]);
      for (const it of items) {
        await client.query(
          `INSERT INTO stop_lists (restaurant_id, product_id, balance) VALUES ($1, $2, $3)
           ON CONFLICT (restaurant_id, product_id) DO UPDATE SET balance = EXCLUDED.balance, updated_at = NOW()`,
          [r.id, it.productId, it.balance],
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    memory.set(r.id, new Set(items.filter((i) => i.balance <= 0).map((i) => i.productId)));
  }
  loaded = true;
  return targets.length;
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
  const { rows } = await pool.query(
    'SELECT DISTINCT organization_id FROM restaurants WHERE is_disabled = FALSE AND organization_id IS NOT NULL',
  );
  const url = webhookUrl();
  for (const { organization_id: organizationId } of rows) {
    try {
      const current = await iikoRequest('/api/1/webhooks/settings', { organizationId });
      const existing = current?.webHooksUri || '';
      if (existing && existing !== url) {
        console.log(`iiko webhook ${organizationId}: уже настроен на ${existing} — не меняю (укажите ${url} вручную, если нужно)`);
        continue;
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
