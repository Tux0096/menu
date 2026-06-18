import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import pool from './db/pool.js';
import {
  aiSuggest,
  enterTableSession,
  payTableOrder,
  pullOrderFromIiko,
  refreshSessionFromIiko,
  reopenTableForMore,
  saveAiFeedback,
  syncTableOrder,
} from './services/table-order.js';
import {
  callWaiterExtended,
  guestPay,
  listActiveSessions,
  notifyMenuOpened,
  refreshSessionWithWorkflow,
  saveGuestCart,
  sendOrderToProduction,
  submitCartToWaiter,
  submitVisitFeedback,
  trackGuestActivity,
  waiterUpdateCart,
} from './services/table-workflow.js';
import {
  listWaiterNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './services/waiter-notifications.js';
import { checkOllamaHealth } from './services/ai-suggest.js';
import { fetchLegacyCatalog, fetchLegacySettings } from './services/catalog-proxy.js';
import { QR_RESTAURANT_SLUG } from './lib/qr-config.js';

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
    iikoId: p.iiko_id,
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
    try {
      return res.json(await fetchLegacyCatalog(r.terminal_id));
    } catch (e) {
      console.warn('legacy catalog fallback:', e.message);
      return res.json(await getCatalogForRestaurant(r.id));
    }
  } catch (err) {
    console.error('catalog error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Настройки: prod API + локальные рестораны для QR ─────────────────────
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

// Глобальный каталог через prod API (полное меню с картинками)
app.get('/api/v1/catalog', async (req, res) => {
  try {
    const { restaurantSlug, deliveryTerminalId } = req.query;
    let terminalId = deliveryTerminalId || null;
    if (restaurantSlug) {
      const r = await getRestaurantBySlug(restaurantSlug);
      if (!r) return res.status(404).json({ error: 'Restaurant not found' });
      terminalId = r.terminal_id;
    }
    if (terminalId) {
      try {
        return res.json(await fetchLegacyCatalog(terminalId));
      } catch (e) {
        console.warn('legacy catalog fallback:', e.message);
      }
    }
    res.json({ products: [], groups: [], stopList: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/slide', (req, res) => res.json([]));
app.get('/api/v1/slide/type/:type', (req, res) => res.json([]));
app.get('/api/v1/promo', (req, res) => res.json([]));
app.get('/api/v1/promo/:id', (req, res) => res.status(404).json({ error: 'Not found' }));
app.get('/api/v1/cladr/*', (req, res) => res.json([]));

// ── Стол / QR-заказ ─────────────────────────────────────────────────────────
app.post('/api/v1/table/enter', async (req, res) => {
  try {
    const { restaurantSlug, tableNumber } = req.body || {};
    if (!restaurantSlug || !tableNumber) {
      return res.status(400).json({ error: 'restaurantSlug и tableNumber обязательны' });
    }
    let session = await enterTableSession(restaurantSlug, tableNumber);
    const pulled = await pullOrderFromIiko(restaurantSlug, tableNumber);
    if (pulled?.items?.length) {
      session = pulled;
    }
    session = await notifyMenuOpened(session.sessionId);
    res.json(session);
  } catch (err) {
    console.error('table/enter:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get('/api/v1/table/session/:sessionId', async (req, res) => {
  try {
    res.json(await refreshSessionWithWorkflow(req.params.sessionId));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post('/api/v1/table/activity', async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: 'sessionId обязателен' });
    res.json(await trackGuestActivity(sessionId));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post('/api/v1/table/menu-opened', async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: 'sessionId обязателен' });
    res.json(await notifyMenuOpened(sessionId));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post('/api/v1/table/submit-to-waiter', async (req, res) => {
  try {
    const { sessionId, items } = req.body || {};
    if (!sessionId || !Array.isArray(items)) {
      return res.status(400).json({ error: 'sessionId и items обязательны' });
    }
    res.json(await submitCartToWaiter(sessionId, items));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post('/api/v1/table/guest-pay', async (req, res) => {
  try {
    const { sessionId, method, tipAmount } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: 'sessionId обязателен' });
    res.json(await guestPay(sessionId, { method, tipAmount }));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post('/api/v1/table/feedback', async (req, res) => {
  try {
    const { sessionId, rating, comment } = req.body || {};
    if (!sessionId || !rating) {
      return res.status(400).json({ error: 'sessionId и rating обязательны' });
    }
    res.json(await submitVisitFeedback(sessionId, { rating, comment }));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post('/api/v1/ai/suggest', async (req, res) => {
  try {
    const { restaurantSlug, query } = req.body || {};
    if (!restaurantSlug || !query) {
      return res.status(400).json({ error: 'restaurantSlug и query обязательны' });
    }
    res.json(await aiSuggest(restaurantSlug, query));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post('/api/v1/ai/feedback', async (req, res) => {
  try {
    const { query, productId, action } = req.body || {};
    if (!query || !productId) {
      return res.status(400).json({ error: 'query и productId обязательны' });
    }
    res.json(await saveAiFeedback(query, productId, action));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post('/api/v1/table/call-waiter', async (req, res) => {
  try {
    const { sessionId, reason } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: 'sessionId обязателен' });
    res.json(await callWaiterExtended(sessionId, { reason }));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post('/api/v1/table-order/cart', async (req, res) => {
  try {
    const { sessionId, items } = req.body || {};
    if (!sessionId || !Array.isArray(items)) {
      return res.status(400).json({ error: 'sessionId и items обязательны' });
    }
    res.json(await saveGuestCart(sessionId, items));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post('/api/v1/table-order/sync', async (req, res) => {
  try {
    const { sessionId, items } = req.body || {};
    if (!sessionId || !Array.isArray(items)) {
      return res.status(400).json({ error: 'sessionId и items обязательны' });
    }
    res.json(await syncTableOrder(sessionId, items));
  } catch (err) {
    console.error('table-order/sync:', err);
    res.status(err.status || 500).json({ error: err.message, details: err.details });
  }
});

app.post('/api/v1/table-order/pay', async (req, res) => {
  try {
    const { sessionId, paymentType } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: 'sessionId обязателен' });
    res.json(await payTableOrder(sessionId, { paymentType }));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post('/api/v1/table-order/reopen', async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: 'sessionId обязателен' });
    res.json(await reopenTableForMore(sessionId));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Терминал официанта ──────────────────────────────────────────────────────
app.get('/api/v1/waiter/notifications', async (req, res) => {
  try {
    const restaurant = await pool.query(
      `SELECT id FROM restaurants WHERE slug = $1 LIMIT 1`,
      [QR_RESTAURANT_SLUG],
    );
    const restaurantId = restaurant.rows[0]?.id;
    if (!restaurantId) return res.status(404).json({ error: 'Ресторан не найден' });
    const unreadOnly = req.query.unread === '1';
    res.json(await listWaiterNotifications(restaurantId, { unreadOnly }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/waiter/notifications/:id/read', async (req, res) => {
  try {
    await markNotificationRead(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/waiter/notifications/read-all', async (req, res) => {
  try {
    const restaurant = await pool.query(
      `SELECT id FROM restaurants WHERE slug = $1 LIMIT 1`,
      [QR_RESTAURANT_SLUG],
    );
    await markAllNotificationsRead(restaurant.rows[0]?.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/waiter/sessions', async (req, res) => {
  try {
    res.json(await listActiveSessions());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/waiter/session/:sessionId', async (req, res) => {
  try {
    res.json(await refreshSessionWithWorkflow(req.params.sessionId));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post('/api/v1/waiter/session/:sessionId/cart', async (req, res) => {
  try {
    const { items, guestCount } = req.body || {};
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items обязателен' });
    res.json(await waiterUpdateCart(req.params.sessionId, items, { guestCount }));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post('/api/v1/waiter/session/:sessionId/send-to-production', async (req, res) => {
  try {
    res.json(await sendOrderToProduction(req.params.sessionId));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, details: err.details });
  }
});

app.get('/health', async (req, res) => {
  const ollama = await checkOllamaHealth();
  res.json({ ok: true, ollama });
});

app.listen(PORT, () => {
  console.log(`Menu API running on http://localhost:${PORT}`);
});
