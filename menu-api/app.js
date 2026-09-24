import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import { dirname, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import pool from './db/pool.js';
import { QR_RESTAURANT_SLUG } from './lib/qr-config.js';
import { isIikoDemo } from './iiko-client.js';
import legacyRoutes from './routes/legacy.js';
import { syncAllRestaurants } from './db/sync-iiko.js';
import { refreshStopLists, registerWebhooks, webhookToken } from './services/stoplist.js';
import { getRestaurantCatalog, invalidateCatalogCache, warmCatalogs } from './services/catalog.js';
import { checkOllamaHealth, getWelcomeSuggestions, suggestForQuery } from './services/ai-suggest.js';
import { isLlmEnabled } from './services/ai-llm.js';
import { logAiQuery, recordAiFeedback } from './services/ai-learning.js';
import {
  getGuestByToken, guestAuth, guestTokenFromRequest, loginByFujiToken, loginByPhone, updateGuestProfile,
} from './services/guest-auth.js';
import { audit, listStaff, saveStaff, staffAuth, staffLogin } from './services/staff-auth.js';
import {
  callWaiter, enterTable, getSessionView, payBill, refreshFromIiko, requestBill, resolveRestaurant,
  refreshKitchenStatuses, runServiceChecks, saveGuestCart, submitFeedback, submitToWaiter, trackActivity,
} from './services/table-session.js';
import {
  closeSession, getHallDashboard, listActiveSessions, releaseSession, sendToKitchen, takeSession, updateOrder,
} from './services/waiter.js';
import {
  listWaiterNotifications, markAllNotificationsRead, markNotificationRead,
} from './services/waiter-notifications.js';
import {
  deleteOverride, deleteRow, getAdminMenu, listAudit, listFeedback, listRestaurants, listRows,
  saveOverride, saveRow, tableQrSvg, tableUrl, updateRestaurant,
} from './services/admin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_DIR = process.env.MENU_WEB_DIR || join(__dirname, '..', 'menu-web');
// Фото блюд, загруженные в админке (вне git, переживают деплой)
const MEDIA_DIR = process.env.MEDIA_DIR || join(__dirname, 'media');
const app = express();
const PORT = process.env.PORT || 3101;

app.set('trust proxy', true);
app.use(cors());
app.use(express.json({ limit: '1mb' }));

/** async-обработчик с единым форматом ошибок */
const h = (fn) => async (req, res) => {
  try {
    const result = await fn(req, res);
    if (!res.headersSent) res.json(result ?? { ok: true });
  } catch (err) {
    if (!err.status || err.status >= 500) console.error(`${req.method} ${req.path}:`, err);
    res.status(err.status || 500).json({ error: err.message, code: err.code, details: err.details });
  }
};

const requireBody = (body, ...keys) => {
  const missing = keys.filter((k) => body?.[k] === undefined || body?.[k] === null || body?.[k] === '');
  if (missing.length) {
    const err = new Error(`Не заполнено: ${missing.join(', ')}`);
    err.status = 400;
    throw err;
  }
};

async function staffRestaurant(req) {
  if (req.query.restaurant) return resolveRestaurant(req.query.restaurant);
  if (req.staff?.restaurantId) {
    const { rows } = await pool.query('SELECT * FROM restaurants WHERE id = $1', [req.staff.restaurantId]);
    if (rows[0]) return rows[0];
  }
  return resolveRestaurant(QR_RESTAURANT_SLUG);
}

// ── Публичное: рестораны, меню, конфиг ──────────────────────────────────────

app.get('/health', h(async () => ({
  ok: true,
  db: (await pool.query('SELECT 1 AS ok')).rows[0].ok === 1,
  iiko: isIikoDemo() ? 'demo' : 'live',
  llm: isLlmEnabled() ? 'openrouter' : 'off',
  ollama: process.env.OLLAMA_ENABLED === 'true' ? await checkOllamaHealth() : 'off',
})));

app.get('/api/v1/restaurants', h(async () => {
  const { rows } = await pool.query(
    `SELECT id, name, address, slug, phone, tables_count FROM restaurants
     WHERE is_disabled = FALSE ORDER BY sort_order, name`,
  );
  return rows;
}));

app.get('/api/v1/restaurants/:slug', h(async (req) => {
  const r = await resolveRestaurant(req.params.slug);
  return { id: r.id, name: r.name, address: r.address, slug: r.slug, phone: r.phone, tablesCount: r.tables_count };
}));

app.get('/api/v1/restaurants/:slug/catalog', h(async (req) => getRestaurantCatalog(await resolveRestaurant(req.params.slug))));

app.get('/api/v1/config', h(async (req) => {
  const r = await resolveRestaurant(req.query.restaurant);
  const [chips, promos] = await Promise.all([
    listRows('ai_chips', { activeOnly: true }),
    listRows('promo_blocks', { activeOnly: true }),
  ]);
  return {
    restaurant: { name: r.name, address: r.address, slug: r.slug, phone: r.phone },
    chips: chips.map((c) => ({ id: c.id, label: c.label, query: c.query, emoji: c.emoji })),
    promos,
    fujiAppLoginUrl: process.env.FUJI_APP_LOGIN_URL || null,
    guestAuthRequired: process.env.GUEST_AUTH_REQUIRED !== 'false',
    paymentMethods: [
      { id: 'sbp', label: 'СБП' },
      { id: 'card', label: 'Банковская карта' },
      { id: 'apple_pay', label: 'Apple Pay' },
      { id: 'google_pay', label: 'Google Pay' },
    ],
    tipPresets: [0, 10, 15, 20],
    iikoMode: isIikoDemo() ? 'demo' : 'live',
    paymentsEnabled: process.env.PAYMENTS_ENABLED === 'true',
  };
}));

app.get('/api/v1/qr.svg', h(async (req, res) => {
  const r = await resolveRestaurant(req.query.restaurant);
  res.type('image/svg+xml').send(await tableQrSvg(r.slug, req.query.table || '1'));
}));

// ── Вебхуки iiko: стоп-листы и статусы заказов на стол ──────────────────────
app.post('/api/v1/iiko/webhook', (req, res) => {
  const auth = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (auth !== webhookToken()) return res.status(401).json({ error: 'bad token' });
  res.json({ ok: true });
  const events = Array.isArray(req.body) ? req.body : [req.body];
  (async () => {
    const stopOrgs = new Set();
    for (const ev of events) {
      if (ev?.eventType === 'StopListUpdate' && ev.organizationId) stopOrgs.add(ev.organizationId);
      if (ev?.eventType === 'TableOrderUpdate' && ev.eventInfo?.id) {
        const { rows } = await pool.query('SELECT id FROM table_sessions WHERE iiko_order_id::text = $1', [String(ev.eventInfo.id)]);
        for (const r of rows) await refreshFromIiko(r.id);
      }
    }
    if (stopOrgs.size) {
      await refreshStopLists([...stopOrgs]);
      invalidateCatalogCache();
      console.log(`iiko webhook: стоп-лист обновлён (${[...stopOrgs].join(', ')})`);
    }
  })().catch((e) => console.warn('iiko webhook:', e.message));
});

// ── Гость: вход ─────────────────────────────────────────────────────────────

app.post('/api/v1/guest/login', h(async (req) => {
  requireBody(req.body, 'phone');
  if (req.body.consent === false) {
    const err = new Error('Нужно согласие на обработку персональных данных');
    err.status = 400;
    throw err;
  }
  return loginByPhone(req.body);
}));
app.post('/api/v1/guest/fuji', h(async (req) => {
  requireBody(req.body, 'token');
  return loginByFujiToken(req.body.token);
}));
app.get('/api/v1/guest/me', h(async (req) => {
  const guest = await getGuestByToken(guestTokenFromRequest(req));
  if (!guest) {
    const err = new Error('Сессия гостя истекла');
    err.status = 401;
    err.code = 'GUEST_AUTH_REQUIRED';
    throw err;
  }
  return guest;
}));
app.patch('/api/v1/guest/me', guestAuth(), h(async (req) => updateGuestProfile(req.guest.id, req.body || {})));

// ── Гость: стол ─────────────────────────────────────────────────────────────

app.post('/api/v1/table/enter', guestAuth(), h(async (req) => {
  requireBody(req.body, 'tableNumber');
  return enterTable({
    restaurantSlug: req.body.restaurantSlug,
    tableNumber: req.body.tableNumber,
    guest: req.guest,
    previousSessionId: req.body.previousSessionId,
  });
}));

const iikoRefreshAt = new Map();
app.get('/api/v1/table/session/:sessionId', guestAuth(), h(async (req) => {
  const last = iikoRefreshAt.get(req.params.sessionId) || 0;
  if (Date.now() - last > 30000) {
    iikoRefreshAt.set(req.params.sessionId, Date.now());
    await refreshFromIiko(req.params.sessionId);
  }
  return getSessionView(req.params.sessionId);
}));
app.post('/api/v1/table/activity', guestAuth(), h(async (req) => {
  requireBody(req.body, 'sessionId');
  return trackActivity(req.body.sessionId);
}));
app.post('/api/v1/table-order/cart', guestAuth(), h(async (req) => {
  requireBody(req.body, 'sessionId', 'items');
  return saveGuestCart(req.body.sessionId, req.body.items);
}));
app.post('/api/v1/table/submit-to-waiter', guestAuth(), h(async (req) => {
  requireBody(req.body, 'sessionId');
  return submitToWaiter(req.body.sessionId, req.body.items);
}));
app.post('/api/v1/table/request-bill', guestAuth(), h(async (req) => {
  requireBody(req.body, 'sessionId');
  return requestBill(req.body.sessionId);
}));
app.post('/api/v1/table/call-waiter', guestAuth(), h(async (req) => {
  requireBody(req.body, 'sessionId');
  return callWaiter(req.body.sessionId, req.body.reason, req.body.comment);
}));
app.post('/api/v1/table/guest-pay', guestAuth(), h(async (req) => {
  requireBody(req.body, 'sessionId');
  return payBill(req.body.sessionId, { method: req.body.method, tipAmount: req.body.tipAmount });
}));
app.post('/api/v1/table/feedback', guestAuth(), h(async (req) => {
  requireBody(req.body, 'sessionId', 'rating');
  return submitFeedback(req.body.sessionId, req.body);
}));

// ── AI ──────────────────────────────────────────────────────────────────────

app.post('/api/v1/ai/suggest', guestAuth({ required: false }), h(async (req) => {
  requireBody(req.body, 'query');
  const restaurant = await resolveRestaurant(req.body.restaurantSlug);
  const query = String(req.body.query).slice(0, 300);
  const cartNames = Array.isArray(req.body.cart) ? req.body.cart.map((c) => String(c).slice(0, 100)) : [];
  const { suggestions, engine, answer } = await suggestForQuery(restaurant, query, 6, req.guest, { cartNames });
  logAiQuery(restaurant.slug, query, suggestions).catch(() => {});
  return { query, suggestions, engine, answer };
}));
app.get('/api/v1/ai/welcome', guestAuth({ required: false }), h(async (req) => {
  const restaurant = await resolveRestaurant(req.query.restaurant);
  return { suggestions: await getWelcomeSuggestions(restaurant, 4, req.guest) };
}));
app.post('/api/v1/ai/feedback', h(async (req) => {
  requireBody(req.body, 'query', 'productId');
  await recordAiFeedback(req.body.query, req.body.productId, req.body.action);
  return { ok: true };
}));

// ── Персонал ────────────────────────────────────────────────────────────────

app.post('/api/v1/staff/login', h(async (req) => {
  requireBody(req.body, 'login', 'password');
  return staffLogin(req.body.login, req.body.password);
}));
app.get('/api/v1/staff/me', staffAuth(), h(async (req) => req.staff));
app.get('/api/v1/staff/restaurants', staffAuth(), h(async () => listRestaurants()));

const waiter = express.Router();
waiter.use(staffAuth('waiter'));
waiter.get('/notifications', h(async (req) => {
  const r = await staffRestaurant(req);
  return listWaiterNotifications(r.id, { unreadOnly: req.query.unread === '1' });
}));
waiter.post('/notifications/read-all', h(async (req) => {
  const r = await staffRestaurant(req);
  await markAllNotificationsRead(r.id);
}));
waiter.post('/notifications/:id/read', h(async (req) => { await markNotificationRead(req.params.id); }));
waiter.get('/sessions', h(async (req) => listActiveSessions((await staffRestaurant(req)).id)));
waiter.get('/session/:id', h(async (req) => getSessionView(req.params.id)));
waiter.post('/session/:id/take', h(async (req) => takeSession(req.params.id, req.staff)));
waiter.post('/session/:id/release', h(async (req) => releaseSession(req.params.id, req.staff)));
waiter.post('/session/:id/cart', h(async (req) => {
  const result = await updateOrder(req.params.id, req.staff, req.body || {});
  audit(req.staff, 'order.edit', 'session', req.params.id, { items: (req.body?.items || []).length, guestCount: req.body?.guestCount });
  return result;
}));
waiter.post('/session/:id/send-to-production', h(async (req) => {
  const result = await sendToKitchen(req.params.id, req.staff);
  audit(req.staff, 'order.send_to_kitchen', 'session', req.params.id, { iikoOrderId: result.iikoOrderId });
  return result;
}));
waiter.post('/session/:id/close', h(async (req) => {
  const result = await closeSession(req.params.id, req.staff);
  audit(req.staff, 'table.close', 'session', req.params.id);
  return result;
}));
app.use('/api/v1/waiter', waiter);

app.get('/api/v1/manager/feedback', staffAuth('manager'), h(async (req) => listFeedback((await staffRestaurant(req)).id)));
app.get('/api/v1/manager/dashboard', staffAuth('manager'), h(async (req) => getHallDashboard((await staffRestaurant(req)).id)));

// ── Админка ─────────────────────────────────────────────────────────────────

const admin = express.Router();
admin.use(staffAuth('admin'));
admin.get('/menu', h(async (req) => getAdminMenu(await staffRestaurant(req), { force: req.query.refresh === '1' })));
// Загрузка фото блюда: тело запроса — сам файл (image/jpeg|png|webp), до 8 МБ
const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
admin.post('/upload', express.raw({ type: Object.keys(IMAGE_TYPES), limit: '8mb' }), h(async (req) => {
  const ext = IMAGE_TYPES[String(req.headers['content-type'] || '').split(';')[0]];
  if (!ext || !req.body?.length) {
    const err = new Error('Нужна картинка JPG, PNG или WebP до 8 МБ');
    err.status = 400;
    throw err;
  }
  mkdirSync(MEDIA_DIR, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  writeFileSync(join(MEDIA_DIR, name), req.body);
  audit(req.staff, 'media.upload', 'file', name, { size: req.body.length });
  return { url: `/media/${name}` };
}));
admin.post('/menu/sync', h(async (req) => {
  const r = await staffRestaurant(req);
  await syncIikoMenu({ slugs: [r.slug] });
  await refreshStopLists([r.organization_id]).catch(() => {});
  invalidateCatalogCache(r.id);
  audit(req.staff, 'menu.sync', 'restaurant', r.slug);
  return getAdminMenu(r, { force: true });
}));
admin.post('/menu/override', h(async (req) => {
  requireBody(req.body, 'productId');
  const r = await staffRestaurant(req);
  const restaurantId = req.body.scope === 'global' ? null : r.id;
  const row = await saveOverride(restaurantId, req.body.productId, req.body);
  audit(req.staff, 'menu.override', 'product', req.body.productId, { ...req.body, restaurant: restaurantId ? r.slug : 'all' });
  return row;
}));
admin.delete('/menu/override/:id', h(async (req) => {
  await deleteOverride(req.params.id);
  audit(req.staff, 'menu.override.delete', 'override', req.params.id);
}));
for (const [path, table] of [['chips', 'ai_chips'], ['promos', 'promo_blocks']]) {
  admin.get(`/${path}`, h(async () => listRows(table)));
  admin.post(`/${path}`, h(async (req) => {
    const row = await saveRow(table, req.body || {});
    audit(req.staff, `${path}.save`, table, row.id, req.body);
    return row;
  }));
  admin.delete(`/${path}/:id`, h(async (req) => {
    await deleteRow(table, req.params.id);
    audit(req.staff, `${path}.delete`, table, req.params.id);
  }));
}
admin.get('/feedback', h(async (req) => listFeedback((await staffRestaurant(req)).id)));
admin.get('/audit', h(async () => listAudit()));
admin.get('/staff', h(async () => listStaff()));
admin.post('/staff', h(async (req) => {
  const row = await saveStaff(req.body || {});
  audit(req.staff, 'staff.save', 'staff', row.id, { login: row.login, role: row.role });
  return row;
}));
admin.get('/restaurants', h(async () => listRestaurants()));
admin.patch('/restaurants/:id', h(async (req) => {
  const row = await updateRestaurant(req.params.id, req.body || {});
  audit(req.staff, 'restaurant.update', 'restaurant', req.params.id, req.body);
  return row;
}));
admin.get('/tables', h(async (req) => {
  const r = await staffRestaurant(req);
  return Array.from({ length: r.tables_count || 20 }, (_, i) => ({
    table: String(i + 1),
    url: tableUrl(r.slug, i + 1),
    qr: `/api/v1/qr.svg?restaurant=${r.slug}&table=${i + 1}`,
  }));
}));
app.use('/api/v1/admin', admin);

// Совместимость со старым фронтом
app.use(legacyRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// ── Фронт: гостевое меню и терминал персонала ───────────────────────────────

app.use('/media', express.static(MEDIA_DIR, { maxAge: '30d', immutable: true }));
app.use('/staff', express.static(join(WEB_DIR, 'staff'), { index: 'index.html' }));
app.get(['/waiter', '/admin'], (req, res) => res.redirect('/staff/'));
app.use(express.static(join(WEB_DIR, 'guest'), { index: 'index.html' }));
app.get('*', (req, res) => res.sendFile(join(WEB_DIR, 'guest', 'index.html')));

// Фоновые проверки: бездействие гостя 5+ мин, долгое ожидание официанта
setInterval(() => runServiceChecks().catch((e) => console.warn('service checks:', e.message)), 30000);

// Статусы блюд на кухне: вебхуки iiko + страховочный опрос
setInterval(() => refreshKitchenStatuses().catch((e) => console.warn('kitchen statuses:', e.message)), 60000);

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

async function syncIikoMenu({ force = false, slugs = null } = {}) {
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

warmCatalogs()
  .then(() => syncIikoMenu())
  .then(() => refreshAllStopLists())
  .then(() => registerWebhooks())
  .catch((e) => console.warn('startup iiko:', e.message));
setInterval(() => syncIikoMenu(), 60 * 60 * 1000); // раз в час проверяем, не пора ли (раз в сутки)
setInterval(refreshAllStopLists, parseInt(process.env.STOP_LIST_REFRESH_MS || '600000', 10));

app.listen(PORT, () => {
  console.log(`Menu API running on http://localhost:${PORT} (iiko: ${isIikoDemo() ? 'demo' : 'live'}, AI: ${isLlmEnabled() ? 'OpenRouter' : 'instant'})`);
});
