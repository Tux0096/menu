/** Фоновые задачи API: выгрузка меню iiko, стоп-листы, статусы кухни, проверки сервиса и онлайн-оплат. */
import pool from '../db/pool.js';
import { asBackground, iikoLimitStreakMs, isIikoDemo } from '../iiko-client.js';
import { startWatchdog } from '../lib/monitor.js';
import { syncAllRestaurants } from '../db/sync-iiko.js';
import { cleanImageCache, warmImages } from './images.js';
import { checkPendingPayments } from './payments.js';
import { refreshStopLists, registerWebhooks } from './stoplist.js';
import { invalidateCatalogCache, warmCatalogs } from './catalog.js';
import { importOpenOrders } from './iiko-import.js';
import { syncReserves, tickReserves } from './iiko-reserves.js';
import { cleanupGuestPush, initGuestPush } from './guest-push.js';
import { loadTeamSettings } from './fuji-team.js';
import { runPrivacyCleanup } from './guest-privacy.js';
import { refreshKitchenStatuses, runServiceChecks } from './table-session.js';

// ── Меню и стоп-листы iiko ──────────────────────────────────────────────────
// Меню хранится на сервере (БД + память) и отдаётся мгновенно. Полная перевыгрузка — по расписанию
// (IIKO_SYNC_MS), при старте — только если выгрузка устарела или у ресторана меню пустое.
// Меню из iiko — каждые 30 минут: правки в iiko (новые, удалённые блюда, цены) быстро доходят до админки и гостя
const IIKO_SYNC_MS = parseInt(process.env.IIKO_SYNC_MS || '1800000', 10);
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

/** Вебхуки iiko: при ошибке (например 429 — лимит запросов) повторяем через 2, 4, 8… мин */
async function registerWebhooksWithRetry(attempt = 0) {
  const failed = await registerWebhooks().catch((e) => (console.warn('iiko webhooks:', e.message), 1));
  if (failed && attempt < 6) setTimeout(() => registerWebhooksWithRetry(attempt + 1), 2 ** attempt * 120_000).unref?.();
}

/** Запуск при старте сервера: прогрев меню, выгрузка из iiko, вебхуки и периодические проверки */
export function startBackgroundJobs() {
  // Бездействие гостя 5+ мин, долгое ожидание официанта
  setInterval(() => runServiceChecks().catch((e) => console.warn('service checks:', e.message)), 30000);
  // Статусы блюд на кухне: вебхуки iiko + страховочный опрос
  setInterval(() => asBackground(refreshKitchenStatuses).catch((e) => console.warn('kitchen statuses:', e.message)), parseInt(process.env.KITCHEN_POLL_MS || '30000', 10));

  // Заказы, открытые на кассе iiko, — в систему (меню гостя, терминал официанта, админка). IIKO_IMPORT=false — выключить
  if (process.env.IIKO_IMPORT !== 'false') {
    const importTick = () => asBackground(importOpenOrders).catch((e) => console.warn('импорт заказов iiko:', e.message));
    setInterval(importTick, parseInt(process.env.IIKO_IMPORT_MS || '45000', 10));
    setTimeout(importTick, 60_000).unref?.();
  }

  // Брони столов из iiko (только чтение): загрузка раз в 90 с, разбор (стол ко времени брони, «не пришли») — раз в 30 с.
  // IIKO_RESERVES=false — выключить
  if (process.env.IIKO_RESERVES !== 'false') {
    const reserveSync = () => asBackground(syncReserves).catch((e) => console.warn('брони iiko:', e.message));
    setInterval(reserveSync, parseInt(process.env.IIKO_RESERVE_MS || '120000', 10));
    setInterval(() => asBackground(tickReserves).catch((e) => console.warn('брони:', e.message)), 30000);
    setTimeout(reserveSync, 90_000).unref?.();
  }

  // Старт после выката: выгрузка, стоп-листы и вебхуки — через общую очередь фоновых запросов к iiko
  warmCatalogs()
    .then(() => asBackground(() => syncIikoMenu()))
    .then(() => asBackground(refreshAllStopLists))
    .then(() => asBackground(() => registerWebhooksWithRetry()))
    .catch((e) => console.warn('startup iiko:', e.message))
    .then(() => warmImages())
    .catch((e) => console.warn('картинки меню:', e.message));
  // Новые точки, подключённые к ключу, получают вебхук без перезапуска
  setInterval(() => asBackground(() => registerWebhooksWithRetry()), 6 * 60 * 60 * 1000);
  setInterval(() => asBackground(() => syncIikoMenu()), 5 * 60 * 1000); // раз в 5 минут проверяем, не пора ли (IIKO_SYNC_MS)
  setInterval(() => checkPendingPayments().catch((e) => console.warn('онлайн-оплата:', e.message)), 30000);
  setInterval(() => asBackground(refreshAllStopLists), parseInt(process.env.STOP_LIST_REFRESH_MS || '600000', 10));
  initGuestPush();
  startWatchdog(pool, iikoLimitStreakMs); // БД, диск, лимит iiko → Telegram (ALERT_TELEGRAM_*)
  // Кэш картинок: раз в сутки убираем старое (30 дней без обращения) и лишнее сверх 2 ГБ
  setInterval(() => cleanImageCache().catch((e) => console.warn('кэш картинок:', e.message)), 24 * 60 * 60 * 1000);
  setTimeout(() => cleanImageCache().catch((e) => console.warn('кэш картинок:', e.message)), 5 * 60_000).unref?.();
  loadTeamSettings(); // запрос сотрудников «Фуджи Тим» из админки
  setInterval(cleanupExpired, 6 * 60 * 60 * 1000);
  setTimeout(cleanupExpired, 60_000).unref?.();
  // Сроки хранения персональных данных (политика, п. «Сроки хранения»): раз в сутки
  const privacyTick = () => runPrivacyCleanup().then((r) => {
    if (r.aiQueries || r.guests || r.reservations) console.log(`уборка ПДн: запросов ИИ — ${r.aiQueries}, гостей — ${r.guests}, броней — ${r.reservations}`);
  }).catch((e) => console.warn('уборка ПДн:', e.message));
  setInterval(privacyTick, 24 * 60 * 60 * 1000);
  setTimeout(privacyTick, 5 * 60_000).unref?.();
}

/** Просроченные входы гостей не нужны: токен с истёкшим сроком всё равно не принимается */
async function cleanupExpired() {
  try {
    const gone = await cleanupGuestPush();
    if (gone) console.log(`уборка: удалено подписок на уведомления закрытых визитов — ${gone}`);
    const { rowCount } = await pool.query("DELETE FROM guest_tokens WHERE expires_at < NOW() - INTERVAL '1 day'");
    if (rowCount) console.log(`уборка: удалено просроченных входов гостей — ${rowCount}`);
  } catch (e) {
    console.warn('уборка входов:', e.message);
  }
}
