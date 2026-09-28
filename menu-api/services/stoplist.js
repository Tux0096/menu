/**
 * Стоп-листы iiko: хранятся в БД (stop_lists) и в памяти, в запросе гостя iiko не вызывается.
 * Обновляются по вебхуку iiko StopListUpdate и фоновой сверкой (одним запросом на все организации).
 */
import { createHmac } from 'crypto';
import pool from '../db/pool.js';
import { accessibleOrgIds, iikoRequest, isIikoDemo, withIikoCreds } from '../iiko-client.js';
import { allOrgTargets } from './sources.js';
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
          for (const it of g.items || []) items.push({ productId: String(it.productId), balance: Number(it.balance) || 0 });
        }
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query('DELETE FROM stop_lists WHERE restaurant_id = $1 AND source = $2', [t.restaurant_id, t.source]);
          for (const it of items) {
            await client.query(
              `INSERT INTO stop_lists (restaurant_id, product_id, balance, source) VALUES ($1, $2, $3, $4)
               ON CONFLICT (restaurant_id, product_id) DO UPDATE SET balance = EXCLUDED.balance, source = EXCLUDED.source, updated_at = NOW()`,
              [t.restaurant_id, it.productId, it.balance, t.source],
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
    });
  }
  await loadFromDb();
  return updated;
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
