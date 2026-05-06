import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import pool from './db/pool.js';

const app = express();
const PORT = process.env.PORT || 3101;

app.use(cors());
app.use(express.json());

// ── helpers ──────────────────────────────────────────────────────────────────

async function getRestaurants() {
  const { rows } = await pool.query(`
    SELECT r.id, r.name, r.address, r.slug, r.terminal_id, r.terminal_group_id,
           r.organization_id, r.phone, r.is_disabled, r.sort_order
    FROM restaurants r
    WHERE r.is_disabled = FALSE
    ORDER BY r.sort_order, r.name
  `);
  return rows;
}

async function getRestaurantBySlug(slug) {
  const { rows } = await pool.query(
    `SELECT r.id, r.name, r.address, r.slug, r.terminal_id, r.terminal_group_id,
            r.organization_id, r.phone, r.is_disabled, r.sort_order
     FROM restaurants r
     WHERE r.slug = $1`,
    [slug]
  );
  return rows[0] || null;
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

// Каталог конкретного ресторана: только те категории, в которых есть его продукты.
async function getCatalogForRestaurant(restaurantId) {
  const { rows: products } = await pool.query(
    `SELECT p.id, p.iiko_id, p.name, p.slug, p.description, p.price, p.old_price,
            p.weight, p.image_url, p.category_id as "parentGroup",
            p.sort_order as "order", p.is_published as "isPublished",
            p.energy as "energyAmount", p.proteins as "fiberAmount",
            p.fats as "fatAmount", p.carbs as "carbohydrateAmount"
     FROM products p
     WHERE p.restaurant_id = $1 AND p.is_published = TRUE AND p.price > 0
     ORDER BY p.sort_order`,
    [restaurantId]
  );

  const categoryIds = new Set(products.map((p) => p.parentGroup));

  const { rows: allCategories } = await pool.query(`
    SELECT id, name, slug, parent_id, sort_order, image_url
    FROM categories
    WHERE is_visible = TRUE
    ORDER BY sort_order
  `);

  // Берём те категории, в которых есть продукты, плюс их родителей.
  const usedCategories = new Set(categoryIds);
  for (const cat of allCategories) {
    if (categoryIds.has(cat.id) && cat.parent_id) {
      usedCategories.add(cat.parent_id);
    }
  }

  const groups = allCategories
    .filter((c) => usedCategories.has(c.id))
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      parentGroup: c.parent_id || null,
      order: c.sort_order,
      image: c.image_url || null,
      additionalInfo: {},
      isIncludedInMenu: true,
      isGroupModifier: false,
    }));

  const mappedProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    nameTo: p.name,
    slug: p.slug,
    code: p.slug,
    parentGroup: p.parentGroup,
    parentGroupName: null,
    price: parseFloat(p.price),
    oldPrice: p.old_price ? parseFloat(p.old_price) : null,
    weight: p.weight,
    description: p.description,
    image: p.image_url || null,
    order: p.order,
    isPublished: p.isPublished,
    energyAmount: p.energyAmount ? parseFloat(p.energyAmount) : null,
    fiberAmount: p.fiberAmount ? parseFloat(p.fiberAmount) : null,
    fatAmount: p.fatAmount ? parseFloat(p.fatAmount) : null,
    carbohydrateAmount: p.carbohydrateAmount ? parseFloat(p.carbohydrateAmount) : null,
    groupModifiers: [],
    modifiers: [],
    filters: [],
    allergens: [],
    additionalInfo: {},
    composition: [],
    likesCount: 0,
    isLiked: false,
    minGroupMod: 0,
  }));

  return { products: mappedProducts, groups, stopList: [] };
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

// ── API routes ────────────────────────────────────────────────────────────────

app.get('/api/v1/restaurants', async (req, res) => {
  try {
    res.json(await getRestaurants());
  } catch (err) {
    console.error('restaurants error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/restaurants/:slug', async (req, res) => {
  try {
    const r = await getRestaurantBySlug(req.params.slug);
    if (!r) return res.status(404).json({ error: 'Restaurant not found' });
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/restaurants/:slug/catalog', async (req, res) => {
  try {
    const r = await getRestaurantBySlug(req.params.slug);
    if (!r) return res.status(404).json({ error: 'Restaurant not found' });
    res.json(await getCatalogForRestaurant(r.id));
  } catch (err) {
    console.error('catalog error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Заглушки/совместимость для глобального store фронтенда ─────────────────
app.get('/api/v1/setting', async (req, res) => {
  try {
    res.json(await buildSettings());
  } catch (err) {
    console.error('settings error:', err);
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/v1/setting/version', (req, res) => res.json(1));
app.get('/api/v1/setting/SETTINGS_VERSION', (req, res) => res.json(1));
app.get('/api/v1/setting/STORE_VERSION', (req, res) => res.json('1.0.0'));
app.get('/api/v1/setting/MOBILE_APP_VERSION', (req, res) => res.json(1));
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

// Глобальный каталог нужен только для совместимости — на /menu используется
// /api/v1/restaurants/:slug/catalog
app.get('/api/v1/catalog', (req, res) => res.json({ products: [], groups: [], stopList: [] }));

app.get('/api/v1/slide', (req, res) => res.json([]));
app.get('/api/v1/slide/type/:type', (req, res) => res.json([]));
app.get('/api/v1/promo', (req, res) => res.json([]));
app.get('/api/v1/promo/:id', (req, res) => res.status(404).json({ error: 'Not found' }));
app.get('/api/v1/cladr/*', (req, res) => res.json([]));

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Menu API running on http://localhost:${PORT}`);
});
