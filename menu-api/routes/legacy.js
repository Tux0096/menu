/**
 * Совместимость со старым Nuxt-фронтом (fuji-qr-app): настройки и справочники.
 * Новое QR-меню (menu-web) эти маршруты не использует.
 */
import express from 'express';
import pool from '../db/pool.js';
import { fetchLegacySettings } from '../services/catalog-proxy.js';

const app = express.Router();

async function getRestaurants() {
  const { rows } = await pool.query(
    `SELECT id, name, address, slug, terminal_id, phone FROM restaurants
     WHERE is_disabled = FALSE ORDER BY sort_order, name`,
  );
  return rows;
}

async function buildCatalogMenu() {
  const { rows } = await pool.query(`
    SELECT id, name, slug, parent_id, sort_order, image_url
    FROM categories
    WHERE is_visible = TRUE
    ORDER BY sort_order
  `);
  const parents = rows.filter((r) => !r.parent_id);
  return parents.map((p) => {
    const item = { id: p.id, name: p.name, slug: p.slug, order: p.sort_order, image: p.image_url || null };
    const children = rows.filter((r) => r.parent_id === p.id);
    if (children.length > 0) {
      item.isParent = true;
      item.children = children.map((c) => ({ id: c.id, name: c.name, slug: c.slug }));
    }
    return item;
  });
}

// ── Полные настройки. Геттеры frontend полагаются на эту форму, поэтому
// держим полный объект, даже если часть полей не используется в /menu.
async function buildSettings() {
  const restaurants = await getRestaurants();
  const catalogMenu = await buildCatalogMenu();

  const SAMARA_ID = 'a85360f2-55a8-47cc-8a79-1eb88a40c4f0';
  const TOLYATTI_ID = '3f02eb06-e771-434c-ab73-2ec5bbde1265';
  const NOVOKUJBYSHEVSK_ID = 'e27dec5a-4447-4bcb-a124-0c1795618998';

  const RESTAURANT_LIST = restaurants.map((r) => ({
    text: r.address,
    value: r.terminal_id,
    name: r.name,
    slug: r.slug,
    deliveryTerminalId: r.terminal_id,
    address: r.address,
  }));

  const DELIVERY_TERMINALS = { [SAMARA_ID]: [], [TOLYATTI_ID]: [], [NOVOKUJBYSHEVSK_ID]: [] };
  for (const r of restaurants) {
    DELIVERY_TERMINALS[SAMARA_ID].push({
      id: r.id,
      name: r.name,
      address: r.address,
      slug: r.slug,
      deliveryTerminalId: r.terminal_id,
      phone: r.phone,
      isDisabled: false,
    });
  }

  const defaultWeek = [
    { open: '10:00', close: '23:59' },
    { open: '10:00', close: '23:59' },
    { open: '10:00', close: '23:59' },
    { open: '10:00', close: '23:59' },
    { open: '10:00', close: '23:59' },
    { open: '10:00', close: '23:59' },
    { open: '10:00', close: '23:59' },
  ];

  return {
    CATALOG_MENU: catalogMenu,
    RESTAURANT_LIST,
    DELIVERY_TERMINALS,
    STORIES: [],
    CITY_ZONES: { [SAMARA_ID]: [], [TOLYATTI_ID]: [], [NOVOKUJBYSHEVSK_ID]: [] },
    PHONES: { deliveryService: '8 800 2222-000' },
    GLOBAL_SEO_META_TAG: {
      title: 'Электронное меню — Фуджи Суши Friends',
      description: 'Выберите ресторан и блюда',
    },
    ALLERGENS: [],
    CHECKOUT_DELIVERY_TEXT: {
      delivery: { title: '60 минут приготовление', text: 'доставка 30 минут' },
      self: { title: '30 минут приготовление' },
    },
    CUSTOM_ADD_TO_CART_GROUPS_ID: [],
    SECTION_ID_ADD_TO_ORDER: null,
    SECTION_ID_ADDITIONALLY: null,
    SECTION_PROMO_IMAGES: {},
    IS_SHOW_8MARCH_MODAL: false,
    IS_SITE_NOT_WORKING: false,
    TEXT_SITE_NOT_WORKING: '',
    IS_SITE_INFORMATION: false,
    TEXT_SITE_INFORMATION: '',
    IS_ONLINE_PAYMENT_DISABLE: { delivery: true, self: true },
    STORE_VERSION: '1.0.0',
    SAMARA_ID,
    TOLYATTI_ID,
    NOVOKUJBYSHEVSK_ID,
    CITIES_DATA: {
      [SAMARA_ID]: { name: 'Самара', slug: 'samara', iikoId: SAMARA_ID },
      [TOLYATTI_ID]: { name: 'Тольятти', slug: 'tolyatti', iikoId: TOLYATTI_ID },
      [NOVOKUJBYSHEVSK_ID]: { name: 'Новокуйбышевск', slug: 'novokujbyshevsk', iikoId: NOVOKUJBYSHEVSK_ID },
    },
    WORK_TIME: {
      [SAMARA_ID]: defaultWeek,
      [TOLYATTI_ID]: defaultWeek,
      [NOVOKUJBYSHEVSK_ID]: defaultWeek,
    },
    GIFT_IDS: { PIZZA: null, SNACK: null },
    PIZZAS_GROUP_ID: [],
    SNACKS_GROUP_ID: [],
    YANDEX_MAPS_API_KEY: '',
    SMARTCAPTCHA_SITE_KEY: '',
    IS_WITHOUT_RECAPTCHA: true,
    IMAGE_PRESET_CATALOG_LIST: { height: 248, width: 248, quality: 60 },
    IMAGE_PRESET_CATALOG_DETAIL: { height: 500, width: 500, quality: 60 },
  };
}

app.get('/api/v1/setting', async (req, res) => {
  try {
    const local = await buildSettings();
    try {
      const legacy = await fetchLegacySettings();
      res.json({
        ...legacy,
        RESTAURANT_LIST: local.RESTAURANT_LIST,
        DELIVERY_TERMINALS: local.DELIVERY_TERMINALS,
        GLOBAL_SEO_META_TAG: local.GLOBAL_SEO_META_TAG,
        IS_WITHOUT_RECAPTCHA: true,
      });
    } catch (e) {
      console.warn('legacy settings fallback:', e.message);
      res.json(local);
    }
  } catch (err) {
    console.error('settings error:', err);
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/v1/setting/version', (req, res) => res.json(1));
app.get('/api/v1/setting/SETTINGS_VERSION', (req, res) => res.json(1));
app.get('/api/v1/setting/STORE_VERSION', (req, res) => res.json('1.0.0'));
app.get('/api/v1/setting/MOBILE_APP_VERSION', (req, res) => res.json(9));
app.get('/api/v1/setting/YANDEX_COUNTER_ID', (req, res) => res.json(''));
app.get('/api/v1/setting/GOOGLE_COUNTER_ID', (req, res) => res.json(''));
app.get('/api/v1/setting/CHECKOUT_DELIVERY_TEXT', (req, res) =>
  res.json({
    delivery: { title: '60 минут приготовление', text: 'доставка 30 минут' },
    self: { title: '30 минут приготовление' },
  })
);
app.get('/api/v1/setting/:name', (req, res) => res.json(null));

app.get('/api/v1/storage/version', (req, res) => res.json({ revision: 1 }));

app.get('/api/v1/city', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, slug, id as "iikoId" FROM cities ORDER BY name`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/v1/city/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, slug, id as "iikoId" FROM cities ORDER BY name`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/slide', (req, res) => res.json([]));
app.get('/api/v1/slide/type/:type', (req, res) => res.json([]));
app.get('/api/v1/promo', (req, res) => res.json([]));
app.get('/api/v1/cladr/*', (req, res) => res.json([]));

export default app;
