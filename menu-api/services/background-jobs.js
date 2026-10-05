/** Фоновые задачи API: выгрузка меню iiko, стоп-листы, статусы кухни, проверки сервиса и онлайн-оплат. */
import pool from '../db/pool.js';
import { isIikoDemo } from '../iiko-client.js';
import { syncAllRestaurants } from '../db/sync-iiko.js';
import { warmImages } from './images.js';
import { checkPendingPayments } from './payments.js';
import { refreshStopLists, registerWebhooks } from './stoplist.js';
import { invalidateCatalogCache, warmCatalogs } from './catalog.js';
import { refreshKitchenStatuses, runServiceChecks } from './table-session.js';

// ── Меню и стоп-листы iiko ──────────────────────────────────────────────────
// Меню хранится на сервере (БД + память) и отдаётся мгновенно. Полная перевыгрузка — раз в сутки
// (IIKO_SYNC_MS), при старте — только если выгрузка устарела или у ресторана меню пустое.
const IIKO_SYNC_MS = parseInt(process.env.IIKO_SYNC_MS || '86400000', 10);
let syncing = false;

async function getSetting(name) {
  const { rows } = await pool.query('SELECT value FROM settings WHERE name = $1', [name]);
  return rows[0]?.value ?? null;
}
async function setSetting(name, value) {
  await pool.query(
    `INSERT INTO settings (name, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [name, JSON.stringify(value)],
  );
}

export async function syncIikoMenu({ force = false, slugs = null } = {}) {
  if (isIikoDemo() || syncing) return;
  syncing = true;
  try {
    const last = await getSetting('iiko_menu_synced_at');
    const stale = !last || Date.now() - new Date(last).getTime() > IIKO_SYNC_MS;
    if (slugs) {
      await syncAllRestaurants(slugs);
    } else if (force || stale) {
      await syncAllRestaurants();
      await setSetting('iiko_menu_synced_at', new Date().toISOString());
    } else {
      const { rows } = await pool.query(
        `SELECT r.slug FROM restaurants r
         WHERE r.is_disabled = FALSE AND NOT EXISTS (SELECT 1 FROM products p WHERE p.restaurant_id = r.id)`,
      );
      if (rows.length) await syncAllRestaurants(rows.map((r) => r.slug));
      else console.log(`iiko menu: выгрузка свежая (${last}), пропускаю`);
    }
    invalidateCatalogCache();
    await warmCatalogs();
    warmImages().catch(() => {});
  } catch (e) {
    console.warn('iiko sync:', e.message);
  } finally {
    syncing = false;
  }
}

async function refreshAllStopLists() {
  try {
    const n = await refreshStopLists();
    if (n) invalidateCatalogCache();
  } catch (e) {
    console.warn('stop-lists:', e.response?.data?.errorDescription || e.message);
  }
}

/** Запуск при старте сервера: прогрев меню, выгрузка из iiko, вебхуки и периодические проверки */
export function startBackgroundJobs() {
  // Бездействие гостя 5+ мин, долгое ожидание официанта
  setInterval(() => runServiceChecks().catch((e) => console.warn('service checks:', e.message)), 30000);
  // Статусы блюд на кухне: вебхуки iiko + страховочный опрос
  setInterval(() => refreshKitchenStatuses().catch((e) => console.warn('kitchen statuses:', e.message)), parseInt(process.env.KITCHEN_POLL_MS || '20000', 10));

  warmCatalogs()
    .then(() => syncIikoMenu())
    .then(() => refreshAllStopLists())
    .then(() => registerWebhooks())
    .catch((e) => console.warn('startup iiko:', e.message))
    .then(() => warmImages())
    .catch((e) => console.warn('картинки меню:', e.message));
  setInterval(() => syncIikoMenu(), 60 * 60 * 1000); // раз в час проверяем, не пора ли (раз в сутки)
  setInterval(() => checkPendingPayments().catch((e) => console.warn('онлайн-оплата:', e.message)), 30000);
  setInterval(refreshAllStopLists, parseInt(process.env.STOP_LIST_REFRESH_MS || '600000', 10));
}
