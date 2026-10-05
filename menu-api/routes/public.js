/** Публичное API: рестораны, меню, конфиг гостевого меню, QR, картинки, проверка здоровья. */
import express from 'express';
import { h } from '../lib/http.js';
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

router.get('/health', h(async () => ({
  ok: true,
  db: (await pool.query('SELECT 1 AS ok')).rows[0].ok === 1,
  iiko: isIikoDemo() ? 'demo' : 'live',
  llm: isLlmEnabled() ? 'openrouter' : 'off',
  ollama: process.env.OLLAMA_ENABLED === 'true' ? await checkOllamaHealth() : 'off',
})));

router.get('/api/v1/restaurants', h(async () => {
  const { rows } = await pool.query(
    `SELECT r.id, r.name, r.address, r.slug, r.phone, r.tables_count, r.organization_id,
            EXISTS (SELECT 1 FROM products p WHERE p.restaurant_id = r.id AND p.is_published) AS has_products
     FROM restaurants r WHERE r.is_disabled = FALSE ORDER BY r.sort_order, r.name`,
  );
  // Доступен для заказа: есть меню и точка подключена к API-логину iiko
  const allowed = await accessibleOrgIds();
  return rows.map(({ organization_id: orgId, has_products: hasProducts, ...r }) => ({
    ...r,
    hasMenu: hasProducts && (!allowed || allowed.has(orgId)),
  }));
}));

router.get('/api/v1/restaurants/:slug', h(async (req) => {
  const r = await resolveRestaurant(req.params.slug);
  return { id: r.id, name: r.name, address: r.address, slug: r.slug, phone: r.phone, tablesCount: r.tables_count };
}));

router.get('/api/v1/restaurants/:slug/catalog', h(async (req) => getRestaurantCatalog(await resolveRestaurant(req.params.slug))));

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
    restaurant: { name: r.name, address: r.address, slug: r.slug, phone: r.phone },
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
  const r = await resolveRestaurant(req.query.restaurant);
  res.type('image/svg+xml').send(await tableQrSvg(r.slug, req.query.table || '1'));
}));

