/** Публичное API: рестораны, меню, конфиг гостевого меню, QR, картинки, проверка здоровья. */
import { createHash } from 'crypto';
import express from 'express';
import { h, httpError, rateLimit, safeEqual } from '../lib/http.js';
import { qrSignedRequired } from '../lib/qr-config.js';
import { captureError } from '../lib/monitor.js';
import pool from '../db/pool.js';
import { isIikoDemo, accessibleOrgIds } from '../iiko-client.js';
import { imageHandler } from '../services/images.js';
import { onlinePayConfig } from '../services/payments.js';
import { getRestaurantCatalog } from '../services/catalog.js';
import { checkOllamaHealth } from '../services/ai-suggest.js';
import { isLlmEnabled } from '../services/ai-llm.js';
import { resolveRestaurant } from '../services/table-session.js';
import { listRows, tableQrSvg } from '../services/admin.js';

const router = express.Router();
export default router;

// ── Публичное: рестораны, меню, конфиг ──────────────────────────────────────

// Картинки меню: уменьшенные WebP из кэша (оригиналы iiko — мегабайты)
router.get('/img', (req, res, next) => imageHandler(req, res).catch(next));

// Публично — только «жив» и «база отвечает»; режимы iiko/LLM и модели Ollama — для localhost (проверка при деплое)
// и по токену HEALTH_TOKEN в заголовке X-Health-Token. «Свой» запрос — напрямую на сокет, без X-Forwarded-For от nginx.
const isLocalRequest = (req) => /^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(req.socket.remoteAddress || '') && !req.get('x-forwarded-for');
router.get('/health', h(async (req) => {
  const out = { ok: true, db: (await pool.query('SELECT 1 AS ok')).rows[0].ok === 1 };
  const token = process.env.HEALTH_TOKEN;
  if (isLocalRequest(req) || (token && safeEqual(req.get('x-health-token'), token))) {
    out.iiko = isIikoDemo() ? 'demo' : 'live';
    out.llm = isLlmEnabled() ? 'openrouter' : 'off';
    out.ollama = process.env.OLLAMA_ENABLED === 'true' ? await checkOllamaHealth() : 'off';
  }
  return out;
}));

// Ошибки из браузеров (гость, терминал персонала, админка): только в журнал и Sentry, без персональных данных.
// Не больше 10 в минуту с адреса и 4 КБ на запись.
const clientErrorLimit = rateLimit({ windowMs: 60_000, max: 10, message: 'Слишком много сообщений об ошибках' });
const scrubText = (v, n) => String(v ?? '')
  .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '<email>')
  .replace(/\+?\d[\d\s().-]{8,}\d/g, '<num>')
  .replace(/[?#][^\s:"')]*/g, '') // query и hash в ссылках (токены, номера столов)
  .slice(0, n);
router.post('/api/v1/client-errors', clientErrorLimit, (req, res) => {
  res.status(204).end();
  try {
    if (Number(req.get('content-length') || 0) > 4096 || JSON.stringify(req.body || {}).length > 4096) return;
    const b = req.body || {};
    const app = ['guest', 'staff', 'admin'].includes(b.app) ? b.app : 'unknown';
    const rec = { app, message: scrubText(b.message, 300), source: scrubText(b.source, 200), line: Number(b.line) || 0, col: Number(b.col) || 0, stack: scrubText(b.stack, 1500) };
    console.warn('client-error', JSON.stringify(rec));
    captureError(new Error(`[${app}] ${rec.message}`), rec);
  } catch { /* мониторинг не должен падать сам */ }
});

router.get('/api/v1/restaurants', h(async () => {
  const { rows } = await pool.query(
    `SELECT r.id, r.name, r.address, r.slug, r.phone, r.tables_count, r.organization_id, r.hours_text,
            EXISTS (SELECT 1 FROM products p WHERE p.restaurant_id = r.id AND p.is_published) AS has_products
     FROM restaurants r WHERE r.is_disabled = FALSE ORDER BY r.sort_order, r.name`,
  );
  // Доступен для заказа: есть меню и точка подключена к API-логину iiko
  const allowed = await accessibleOrgIds();
  return rows.map(({ organization_id: orgId, has_products: hasProducts, hours_text: workHours, ...r }) => ({
    ...r,
    workHours: workHours || null,
    hasMenu: hasProducts && (!allowed || allowed.has(orgId)),
  }));
}));

router.get('/api/v1/restaurants/:slug', h(async (req) => {
  const r = await resolveRestaurant(req.params.slug);
  return { id: r.id, name: r.name, address: r.address, slug: r.slug, phone: r.phone, tablesCount: r.tables_count };
}));

// Каталог гостя: готовый JSON и ETag по содержимому (без времени выгрузки) — повторный запрос без изменений
// получает 304 без пересборки и без 80 КБ трафика
const catalogJson = new WeakMap();
router.get('/api/v1/restaurants/:slug/catalog', h(async (req, res) => {
  const catalog = await getRestaurantCatalog(await resolveRestaurant(req.params.slug));
  let ready = catalogJson.get(catalog);
  if (!ready) {
    const body = JSON.stringify(catalog);
    const { fetchedAt, ...content } = catalog;
    ready = { body, etag: `"c-${createHash('sha1').update(JSON.stringify(content)).digest('base64url').slice(0, 20)}"` };
    catalogJson.set(catalog, ready);
  }
  res.set('ETag', ready.etag);
  res.set('Cache-Control', 'no-cache');
  if (req.get('If-None-Match') === ready.etag) return res.status(304).end();
  res.type('json').send(ready.body);
}));

router.get('/api/v1/config', h(async (req) => {
  const r = await resolveRestaurant(req.query.restaurant);
  const [chips, promos] = await Promise.all([
    listRows('ai_chips', { activeOnly: true }),
    listRows('promo_blocks', { activeOnly: true }),
  ]);
  // Баннеры: общие и этого ресторана, в пределах дат показа
  const now = Date.now();
  const live = promos.filter((p) => (!p.restaurant_id || p.restaurant_id === r.id)
    && (!p.starts_at || new Date(p.starts_at).getTime() <= now) && (!p.ends_at || new Date(p.ends_at).getTime() > now));
  return {
    restaurant: { name: r.name, address: r.address, slug: r.slug, phone: r.phone, workHours: r.hours_text || null },
    chips: chips.map((c) => ({ id: c.id, label: c.label, query: c.query, emoji: c.emoji })),
    promos: live.map((p) => ({
      id: p.id, title: p.title, text: p.text, image: p.image_url, placement: p.placement || 'menu',
      productId: p.product_id || null, categoryId: p.category_id || null, url: p.link_url || null,
    })),
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
    onlinePay: await onlinePayConfig(r.id),
  };
}));

router.get('/api/v1/qr.svg', h(async (req, res) => {
  // Включён вход только по QR с подписью — QR без подписи не выдаём (подписанные берут из админки)
  if (await qrSignedRequired()) throw httpError(403, 'Вход только по подписанному QR — QR столов берите в админке («QR-коды столов»)');
  const r = await resolveRestaurant(req.query.restaurant);
  res.type('image/svg+xml').send(await tableQrSvg(r.slug, req.query.table || '1'));
}));

