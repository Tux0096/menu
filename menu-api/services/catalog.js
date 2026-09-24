/**
 * Меню ресторана для QR-интерфейса.
 *
 * Источники (по приоритету):
 *   1. prod API Фуджи (apiv2.infra-fuji.ru) — полное меню с фото, КБЖУ, модификаторами;
 *   2. таблица products (выгрузка из iiko скриптом db/sync-iiko.js);
 *   3. последний успешный снимок из catalog_snapshots (если оба источника недоступны).
 *
 * Поверх выгрузки применяются правки из админки (menu_overrides) и стоп-лист iiko.
 */
import pool from '../db/pool.js';
import { fetchLegacyCatalog } from './catalog-proxy.js';
import { getStopListProductIds, isIikoDemo } from '../iiko-client.js';

const TTL_MS = parseInt(process.env.CATALOG_TTL_MS || '300000', 10);
const STOP_TTL_MS = 60 * 1000;
const rawCache = new Map(); // restaurantId -> { at, source, data }
const stopCache = new Map(); // restaurantId -> { at, ids }

/** Группы, позиции которых AI не предлагает как самостоятельное блюдо. */
const NON_MAIN_GROUP_HINTS = ['соус', 'топпинг', 'прибор', 'добав', 'допы', 'имбир', 'васаби'];

async function getCatalogFromDb(restaurantId) {
  const { rows: products } = await pool.query(
    `SELECT p.id, p.iiko_id, p.name, p.slug, p.description, p.price, p.old_price,
            p.weight, p.image_url, p.category_id, p.sort_order, p.is_published,
            p.energy, p.proteins, p.fats, p.carbs
     FROM products p
     WHERE p.restaurant_id = $1 AND p.is_published = TRUE AND p.price > 0
     ORDER BY p.sort_order`,
    [restaurantId],
  );
  if (!products.length) return null;

  const { rows: allCategories } = await pool.query(
    `SELECT id, name, slug, parent_id, sort_order, image_url
     FROM categories WHERE is_visible = TRUE ORDER BY sort_order`,
  );
  const used = new Set(products.map((p) => p.category_id));
  for (const cat of allCategories) {
    if (used.has(cat.id) && cat.parent_id) used.add(cat.parent_id);
  }

  const groups = allCategories
    .filter((c) => used.has(c.id))
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

  const num = (v) => (v == null ? null : parseFloat(v));
  return {
    groups,
    stopList: [],
    products: products.map((p) => ({
      id: p.iiko_id || p.id,
      iikoId: p.iiko_id || p.id,
      name: p.name,
      nameTo: p.name,
      slug: p.slug,
      code: p.slug,
      parentGroup: p.category_id,
      parentGroupName: null,
      price: parseFloat(p.price),
      oldPrice: num(p.old_price),
      weight: p.weight,
      description: p.description,
      image: p.image_url || null,
      order: p.sort_order,
      isPublished: p.is_published,
      energyAmount: num(p.energy),
      fiberAmount: num(p.proteins),
      fatAmount: num(p.fats),
      carbohydrateAmount: num(p.carbs),
      groupModifiers: [],
      modifiers: [],
      filters: [],
      allergens: [],
      additionalInfo: {},
      composition: [],
      likesCount: 0,
      isLiked: false,
      minGroupMod: 0,
    })),
  };
}

async function saveSnapshot(restaurantId, source, data) {
  try {
    await pool.query(
      `INSERT INTO catalog_snapshots (restaurant_id, source, data, fetched_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (restaurant_id) DO UPDATE SET source = EXCLUDED.source, data = EXCLUDED.data, fetched_at = NOW()`,
      [restaurantId, source, JSON.stringify(data)],
    );
  } catch (e) {
    console.warn('catalog snapshot save:', e.message);
  }
}

async function loadSnapshot(restaurantId) {
  const { rows } = await pool.query(
    'SELECT source, data, fetched_at FROM catalog_snapshots WHERE restaurant_id = $1',
    [restaurantId],
  );
  return rows[0] || null;
}

async function loadRawCatalog(restaurant, { force = false } = {}) {
  const hit = rawCache.get(restaurant.id);
  if (!force && hit && Date.now() - hit.at < TTL_MS) return hit;

  let result = null;
  if (restaurant.terminal_id && process.env.LEGACY_API_DISABLED !== 'true') {
    try {
      const data = await fetchLegacyCatalog(restaurant.terminal_id);
      if (data?.products?.length) {
        result = { source: 'fuji-api', data };
        saveSnapshot(restaurant.id, 'fuji-api', data);
      }
    } catch (e) {
      console.warn(`catalog ${restaurant.slug}: prod API недоступен — ${e.message}`);
    }
  }
  if (!result) {
    const fromDb = await getCatalogFromDb(restaurant.id);
    if (fromDb) result = { source: 'iiko', data: fromDb };
  }
  if (!result) {
    const snap = await loadSnapshot(restaurant.id);
    if (snap) result = { source: `snapshot:${snap.source}`, data: snap.data, fetchedAt: snap.fetched_at };
  }
  if (!result) {
    // Если ничего нет — возьмём меню любого ресторана сети (меню у сети единое).
    const { rows } = await pool.query(
      'SELECT restaurant_id, source, data FROM catalog_snapshots ORDER BY fetched_at DESC LIMIT 1',
    );
    if (rows[0]) result = { source: `snapshot-network:${rows[0].source}`, data: rows[0].data };
  }
  if (!result) result = { source: 'empty', data: { products: [], groups: [], stopList: [] } };

  const entry = { ...result, at: Date.now() };
  rawCache.set(restaurant.id, entry);
  return entry;
}

async function loadIikoStopList(restaurant) {
  if (isIikoDemo() || !restaurant.organization_id) return new Set();
  const hit = stopCache.get(restaurant.id);
  if (hit && Date.now() - hit.at < STOP_TTL_MS) return hit.ids;
  let ids = new Set();
  try {
    ids = await getStopListProductIds(restaurant.organization_id, restaurant.terminal_group_id);
  } catch (e) {
    console.warn(`iiko stop-list ${restaurant.slug}:`, e.response?.data?.errorDescription || e.message);
    ids = hit?.ids || new Set();
  }
  stopCache.set(restaurant.id, { at: Date.now(), ids });
  return ids;
}

export async function getOverrides(restaurantId) {
  const { rows } = await pool.query(
    `SELECT * FROM menu_overrides
     WHERE restaurant_id IS NULL OR restaurant_id = $1
     ORDER BY restaurant_id NULLS FIRST`,
    [restaurantId],
  );
  // Правка конкретного ресторана перекрывает общую
  const map = new Map();
  for (const o of rows) {
    const prev = map.get(o.product_id) || {};
    const merged = { ...prev };
    for (const [k, v] of Object.entries(o)) {
      if (v !== null && v !== undefined) merged[k] = v;
    }
    map.set(o.product_id, merged);
  }
  return map;
}

function normalizeLegacyStopList(stopList, terminalId) {
  const ids = new Set();
  for (const s of stopList || []) {
    if (typeof s === 'string') ids.add(s);
    else if (s && s.productId) {
      const sameTerminal = !s.deliveryTerminalId || !terminalId || s.deliveryTerminalId === terminalId;
      if (sameTerminal && Number(s.balance ?? 0) <= 0) ids.add(String(s.productId));
    }
  }
  return ids;
}

function applyOverride(product, o) {
  const p = { ...product };
  if (o.name) p.name = o.name;
  if (o.description) p.description = o.description;
  if (o.image_url) p.image = o.image_url;
  if (o.weight) p.weight = o.weight;
  if (o.energy != null) p.energyAmount = parseFloat(o.energy);
  if (o.proteins != null) p.fiberAmount = parseFloat(o.proteins);
  if (o.fats != null) p.fatAmount = parseFloat(o.fats);
  if (o.carbs != null) p.carbohydrateAmount = parseFloat(o.carbs);
  if (o.allergens?.length) p.allergensText = o.allergens;
  if (o.is_recommended) p.isRecommended = true;
  return p;
}

/**
 * Каталог для гостя: { products, groups, stopList: string[], source }.
 * Позиции из стоп-листа остаются видимыми (гость видит их, но не может заказать).
 */
export async function getRestaurantCatalog(restaurant, { force = false } = {}) {
  const raw = await loadRawCatalog(restaurant, { force });
  const [overrides, iikoStop] = await Promise.all([
    getOverrides(restaurant.id),
    loadIikoStopList(restaurant),
  ]);

  const stop = normalizeLegacyStopList(raw.data.stopList, restaurant.terminal_id);
  for (const id of iikoStop) stop.add(id);

  const groupName = new Map((raw.data.groups || []).map((g) => [g.id, g.name]));
  const products = [];
  for (const product of raw.data.products || []) {
    const o = overrides.get(String(product.id)) || overrides.get(String(product.iikoId));
    if (o?.is_hidden) continue;
    if (o?.is_stopped) stop.add(String(product.id));
    const p = o ? applyOverride(product, o) : { ...product };
    if (!p.parentGroupName) p.parentGroupName = groupName.get(p.parentGroup) || null;
    p.isInStopList = stop.has(String(p.id)) || stop.has(String(p.iikoId));
    products.push(p);
  }

  return {
    ...raw.data,
    products,
    stopList: [...stop],
    source: raw.source,
    fetchedAt: raw.fetchedAt || new Date(raw.at).toISOString(),
  };
}

function isMainDish(product) {
  const g = String(product.parentGroupName || '').toLowerCase();
  return !NON_MAIN_GROUP_HINTS.some((h) => g.includes(h));
}

/** Продукты, которые AI может предлагать: опубликованы, не в стоп-листе, не соусы/допы. */
export async function getCatalogProducts(restaurant) {
  if (!restaurant) return [];
  const catalog = await getRestaurantCatalog(restaurant);
  return catalog.products.filter(
    (p) => Number(p.price) > 0 && p.isPublished !== false && !p.isInStopList && isMainDish(p),
  );
}

/** Всё, что гость может заказать прямо сейчас (включая соусы/напитки) — для LLM. */
export async function getAvailableProducts(restaurant) {
  if (!restaurant) return [];
  const catalog = await getRestaurantCatalog(restaurant);
  return catalog.products.filter((p) => Number(p.price) > 0 && p.isPublished !== false && !p.isInStopList);
}

export function invalidateCatalogCache(restaurantId = null) {
  if (restaurantId) {
    rawCache.delete(restaurantId);
    stopCache.delete(restaurantId);
  } else {
    rawCache.clear();
    stopCache.clear();
  }
}
