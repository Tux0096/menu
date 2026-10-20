/**
 * Меню ресторана для QR-интерфейса — только номенклатура iiko организации ресторана
 * (выгрузка db/sync-iiko.js при старте сервера и каждые 30 минут).
 * Поверх накладываются карточки из админки (menu_overrides, привязка по UUID блюда в iiko)
 * и стоп-лист iiko + ручной стоп из админки.
 */
import pool from '../db/pool.js';
import { cleanMenuName, menuKey } from '../lib/menu-key.js';
import { orderGroups } from './menu-order.js';
import { getStopIndex } from './stoplist.js';
import { bumpCatalogVersion, catalogVersion } from '../lib/catalog-version.js';
import { attachBusinessLunch } from './business-lunch.js';

const TTL_MS = parseInt(process.env.CATALOG_TTL_MS || '300000', 10);
const rawCache = new Map(); // restaurantId -> { at, source, data }

/** Группы, позиции которых AI не предлагает как самостоятельное блюдо. */
const NON_MAIN_GROUP_HINTS = ['соус', 'топпинг', 'прибор', 'добав', 'допы', 'имбир', 'васаби'];

async function getCatalogFromDb(restaurantId) {
  const { rows: products } = await pool.query(
    `SELECT p.id, p.iiko_id, p.name, p.slug, p.description, p.price, p.old_price,
            p.weight, p.image_url, p.category_id, p.sort_order, p.is_published,
            p.energy, p.proteins, p.fats, p.carbs, p.source, p.sku, p.options, p.also_in
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
  // Блюдо и в других разделах (бизнес-ланч из блюд меню): [раздел, порядок] каждого дополнительного места
  const extraPlaces = (p) => Object.values(p.also_in || {}).flat().filter((x) => x?.c && x.c !== p.category_id);
  const used = new Set(products.flatMap((p) => [p.category_id, ...extraPlaces(p).map((x) => x.c)]));
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
  // iiko отдаёт вес в килограммах («0.23») — показываем в граммах
  const fmtWeight = (w) => {
    if (w == null || w === '') return null;
    const n = Number(String(w).replace(',', '.'));
    if (!Number.isFinite(n)) return String(w);
    if (n <= 0) return null;
    // Меньше 10 — килограммы из номенклатуры; больше — число без единицы (её ставит каталог: бар — мл, кухня — г)
    return n < 10 ? `${Math.round(n * 1000)} г` : String(Math.round(n));
  };
  const mapped = products.map((p) => ({
      id: p.iiko_id || p.id,
      iikoId: p.iiko_id || p.id,
      name: p.name,
      nameTo: p.name,
      slug: p.slug,
      code: p.slug,
      sku: p.sku || null,
      parentGroup: p.category_id,
      parentGroupName: null,
      source: p.source || 'main',
      price: parseFloat(p.price),
      oldPrice: num(p.old_price),
      weight: fmtWeight(p.weight),
      description: p.description,
      image: p.image_url || null,
      order: p.sort_order,
      isPublished: p.is_published,
      energyAmount: num(p.energy),
      fiberAmount: num(p.proteins),
      fatAmount: num(p.fats),
      carbohydrateAmount: num(p.carbs),
      // Размеры и модификаторы из внешнего меню iiko (с ценами точки), с понятными гостю названиями
      sizes: p.options?.sizes || [],
      modifierGroups: p.options?.groups || [],
      // Цена без выбора, если отличается от «от» (вок с платной основой: базовая 0, «от 459»)
      basePrice: Number.isFinite(Number(p.options?.base)) && p.options?.base != null ? Number(p.options.base) : null,
      sizeId: p.options?.sizeId || null,
      // Набор за 0 ₽ («Собери свой ланч»): цена в выбранных блюдах, без платного выбора не продаётся
      needsChoice: Boolean(p.options?.needsChoice),
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
  // Копия блюда в дополнительном разделе: тот же ID (цена, стоп-лист и заказ — общие), isAlias — не дублировать в поиске
  const places = new Map(products.map((p) => [String(p.iiko_id || p.id), extraPlaces(p)]));
  const withAliases = mapped.flatMap((p) => [p, ...(places.get(String(p.id)) || [])
    .map((x) => ({ ...p, parentGroup: x.c, order: Number(x.o) || p.order, isAlias: true }))]);
  return { groups, stopList: [], products: withAliases };
}

/**
 * Одноимённые разделы (бизнес-ланч и в меню кухни, и в меню бара) — один раздел у гостя.
 * Блюдо, попавшее в раздел дважды, — один раз.
 */
function mergeSameNamedGroups(groups, products) {
  const canon = new Map();
  const remap = new Map();
  const out = [];
  for (const g of groups || []) {
    const key = menuKey(g.name);
    const first = key && canon.get(key);
    if (first && !g.parentGroup && !first.parentGroup) { remap.set(String(g.id), first.id); continue; }
    if (key && !canon.has(key)) canon.set(key, g);
    out.push(g);
  }
  if (!remap.size) return { groups: out, products };
  const seen = new Set();
  const list = [];
  for (const p of products) {
    const pg = remap.get(String(p.parentGroup)) ?? p.parentGroup;
    const k = `${pg}|${p.id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    list.push(pg === p.parentGroup ? p : { ...p, parentGroup: pg });
  }
  return { groups: out, products: list };
}

/**
 * Названия групп и вариантов модификаторов из iiko — для гостя: без служебных «мод+», «ЗАЛ», «- » в начале.
 * Служебное название группы («мод к поке», «мод+Люб.ролл за 1р») заменяется понятным по составу: «Соус на выбор»…
 */
// \b в JS не работает с кириллицей — границы слова пробелами
export const cleanModText = (t) => {
  const v = String(t || '').replace(/(^|\s)ЗАЛ\.?(?=\s|$)/g, ' ').replace(/^[\s\-–—•*]+/, '').replace(/[\s*]+$/, '').replace(/\s+/g, ' ').trim();
  return v ? v[0].toUpperCase() + v.slice(1) : v;
};
export function groupTitle(name, items) {
  const n = cleanModText(name);
  const all = items.map((m) => m.name.toLowerCase()).join(' ');
  // Размер пиццы модификатором: «На выбор» → «Большая / Средняя» или «30 см / 40 см»
  const sizeLike = items.length > 1 && items.every((m) => /^(больш|средн|маленьк|\d+\s*(см|cm)(\s|$))/i.test(String(m.name).trim()));
  const generic = !n || /^(на выбор|мод([.+\s]|$))/i.test(n);
  if (sizeLike && generic) return 'Размер';
  if (!generic) return n;
  if (/соус|heinz/.test(all) || /соус/i.test(n)) return 'Соус на выбор';
  if (/топпинг/.test(all)) return 'Топпинг';
  if (/ролл/i.test(n) || /ролл/.test(all)) return 'Ролл на выбор';
  if (/лапш|удон|фунчоз|рис\b/.test(all)) return 'Основа на выбор';
  return 'На выбор';
}
/**
 * Группы модификаторов для гостя: понятные названия и картинки. Своё название/картинка из админки (modifier_content)
 * главнее; иначе название без служебных пометок iiko. iikoName — исходное название (ключ настроек).
 */
function decorateGroups(groups, content = new Map()) {
  return (groups || []).map((g) => {
    const gName = g.iikoName || g.name;
    const items = (g.items || []).map((m) => {
      const mName = m.iikoName || m.name;
      const c = content.get(`item:${menuKey(mName)}`);
      return { ...m, iikoName: mName, name: c?.title || cleanModText(mName) || mName, image: c?.image || m.image || null };
    });
    const c = content.get(`group:${menuKey(gName)}`);
    return { ...g, iikoName: gName, name: c?.title || groupTitle(gName, items), items };
  });
}

/** Настройки модификаторов из админки: «item:ключ» / «group:ключ» → { title, image }. */
export async function getModifierContent() {
  const { rows } = await pool.query('SELECT kind, key, title, image_url FROM modifier_content');
  return new Map(rows.map((r) => [`${r.kind}:${r.key}`, { title: r.title || null, image: r.image_url || null }]));
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

const inflight = new Map(); // restaurantId -> Promise

const ALLOW_DEMO = process.env.ALLOW_DEMO_MENU === 'true';

/**
 * Меню ресторана — только номенклатура iiko его организации (сайт и приложение Фуджи
 * используют другое меню и здесь не участвуют). Демо-меню — только локально (ALLOW_DEMO_MENU=true).
 */
async function fetchRawCatalog(restaurant) {
  let result = null;
  const fromIiko = await getCatalogFromDb(restaurant.id);
  if (fromIiko) result = { source: 'iiko', data: fromIiko };
  else if (ALLOW_DEMO) {
    const snap = await loadSnapshot(restaurant.id);
    if (snap) result = { source: `snapshot:${snap.source}`, data: snap.data };
  }
  if (!result) result = { source: 'empty', data: { products: [], groups: [], stopList: [] } };

  // Пустое меню кэшируем ненадолго, чтобы быстро повторить попытку
  const at = result.source === 'empty' ? Date.now() - TTL_MS + 20000 : Date.now();
  const entry = { ...result, at };
  rawCache.set(restaurant.id, entry);
  return entry;
}

function refreshRawCatalog(restaurant) {
  if (!inflight.has(restaurant.id)) {
    const p = fetchRawCatalog(restaurant).finally(() => inflight.delete(restaurant.id));
    inflight.set(restaurant.id, p);
  }
  return inflight.get(restaurant.id);
}

/** Кэш с фоновым обновлением: гость получает меню сразу, свежая версия подтягивается в фоне. */
async function loadRawCatalog(restaurant, { force = false } = {}) {
  const hit = rawCache.get(restaurant.id);
  if (!force && hit && Date.now() - hit.at < TTL_MS) return hit;
  if (!force && hit && hit.source !== 'empty') {
    refreshRawCatalog(restaurant).catch(() => {});
    return hit;
  }
  return refreshRawCatalog(restaurant);
}

/** Прогрев меню всех ресторанов (при старте и по таймеру). */
export async function warmCatalogs() {
  const { rows } = await pool.query('SELECT * FROM restaurants WHERE is_disabled = FALSE ORDER BY sort_order');
  for (const r of rows) {
    try {
      const e = await refreshRawCatalog(r);
      console.log(`catalog ${r.slug}: ${e.source}, блюд: ${e.data.products?.length || 0}`);
    } catch (err) {
      console.warn(`catalog warm ${r.slug}:`, err.message);
    }
  }
}

async function loadIikoStopList(restaurant) {
  // Стоп-лист из БД/памяти: обновляется вебхуками iiko и фоновой сверкой, не в запросе гостя
  try {
    return await getStopIndex(restaurant.id);
  } catch (e) {
    console.warn(`stop-list ${restaurant.slug}:`, e.message);
    return { stopped: () => false, balance: () => null };
  }
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

// Поля карточки из админки — общие для блюда, где бы оно ни было (скрытие и стоп — свои у каждой точки)
const CONTENT_FIELDS = ['name', 'description', 'image_url', 'video_url', 'weight', 'energy', 'proteins', 'fats', 'carbs', 'allergens', 'badge', 'card_size', 'is_recommended', 'priority'];

/**
 * Карточки из админки по названию блюда — запасная привязка, когда ID блюда в iiko не совпал:
 * блюдо пересоздали в iiko, бар переехал в другое внешнее меню, подключили новую точку.
 * Контент админки главный: перевыгрузка из iiko его не теряет. Сначала правки этой точки, потом общие, потом других точек.
 */
export async function getContentByName(restaurantId) {
  const { rows } = await pool.query(
    `SELECT o.*, COALESCE(o.product_name, p.name) AS key_name
       FROM menu_overrides o
       LEFT JOIN LATERAL (SELECT name FROM products WHERE iiko_id::text = o.product_id LIMIT 1) p ON TRUE
      ORDER BY (o.restaurant_id = $1) DESC NULLS LAST, (o.restaurant_id IS NULL) DESC, o.updated_at DESC`,
    [restaurantId],
  );
  const map = new Map();
  for (const o of rows) {
    const key = menuKey(o.key_name);
    if (!key) continue;
    const cur = map.get(key) || {};
    for (const f of CONTENT_FIELDS) {
      const v = o[f];
      if (cur[f] != null || v == null || v === false || (Array.isArray(v) && !v.length)) continue;
      cur[f] = v;
    }
    // Скрыто админом на этой точке — остаётся скрытым и с новым ID из iiko
    if (o.restaurant_id === restaurantId && o.is_hidden) cur.is_hidden = true;
    map.set(key, cur);
  }
  return map;
}

/** Разделы из админки: ключ названия раздела (из iiko) → картинка, своё название, порядок, вкладка, скрытие. */
export async function getCategorySettings() {
  const { rows } = await pool.query('SELECT key, image_url, title, sort_order, tab, is_hidden FROM category_content');
  return new Map(rows.map((r) => [r.key, {
    image: r.image_url || null, title: r.title || null, sortOrder: r.sort_order ?? null, tab: r.tab || null, hidden: Boolean(r.is_hidden),
  }]));
}

/**
 * Применить настройки разделов к меню точки: скрытые разделы убираются вместе с блюдами,
 * заданный порядок идёт первым (остальные — после, в порядке сайта), своё название и вкладка — поверх iiko.
 */
function applyCategorySettings(groups, products, settings) {
  const byId = new Map();
  const out = [];
  for (const g of groups) {
    const s = settings.get(menuKey(g.name));
    if (s?.hidden) { byId.set(String(g.id), null); continue; }
    const next = s ? {
      ...g,
      iikoName: g.name,
      name: s.title || g.name,
      image: s.image || g.image || null,
      order: s.sortOrder != null ? -1e6 + s.sortOrder : g.order,
      isBar: s.tab ? s.tab === 'bar' : g.isBar,
    } : g;
    byId.set(String(g.id), next);
    out.push(next);
  }
  const visible = products.filter((p) => byId.get(String(p.parentGroup)) !== null);
  for (const p of visible) {
    const g = byId.get(String(p.parentGroup));
    if (g?.iikoName) p.parentGroupName = g.name;
  }
  return { groups: out.sort((a, b) => a.order - b.order), products: visible };
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
  if (o.badge != null) p.badge = o.badge || null; // '' — метки сняты в админке
  if (o.priority) p.priority = Number(o.priority);
  if (o.video_url) p.video = o.video_url;
  if (o.card_size != null) p.cardSize = o.card_size === 'big' ? 'big' : null; // 'normal' — большая выключена
  return p;
}

/**
 * Каталог для гостя: { products, groups, stopList: string[], source }.
 * Позиции из стоп-листа остаются видимыми (гость видит их, но не может заказать).
 */
const built = new Map(); // restaurantId -> { at, version, result }
const BUILT_TTL_MS = 15_000;

export async function getRestaurantCatalog(restaurant, { force = false } = {}) {
  const hit = built.get(restaurant.id);
  if (!force && hit && hit.version === catalogVersion() && Date.now() - hit.at < BUILT_TTL_MS) return hit.result;
  const version = catalogVersion();
  const result = await buildRestaurantCatalog(restaurant, { force });
  built.set(restaurant.id, { at: Date.now(), version, result });
  return result;
}

async function buildRestaurantCatalog(restaurant, { force = false } = {}) {
  const raw = await loadRawCatalog(restaurant, { force });
  const [overrides, byName, iikoStop, catSettings, modContent] = await Promise.all([
    getOverrides(restaurant.id),
    getContentByName(restaurant.id).catch(() => new Map()),
    loadIikoStopList(restaurant),
    getCategorySettings().catch(() => new Map()),
    getModifierContent().catch(() => new Map()),
  ]);

  const stop = normalizeLegacyStopList(raw.data.stopList, restaurant.terminal_id);
  // Стоп из админки/старого формата — для любой кассы; стоп iiko — по кассе блюда и размеру
  const stopped = (src, pid, sizeId = null) => stop.has(String(pid)) || iikoStop.stopped(src, pid, sizeId);

  const merged = mergeSameNamedGroups(raw.data.groups, raw.data.products || []);
  const groupName = new Map(merged.groups.map((g) => [g.id, g.name]));
  const products = [];
  for (const product of merged.products) {
    // Своя карточка по ID блюда, недостающие поля — из карточки этого же блюда по названию
    const own = overrides.get(String(product.id)) || overrides.get(String(product.iikoId));
    const named = byName.get(menuKey(product.name));
    // Скрытие по названию — только когда у блюда нет своей карточки (иначе скрытие решает она)
    const o = own && named
      ? { ...named, is_hidden: false, ...Object.fromEntries(Object.entries(own).filter(([, v]) => v != null && v !== false)) }
      : own || named;
    if (o?.is_hidden) continue;
    if (o?.is_stopped) stop.add(String(product.id));
    // Гость видит название без служебных пометок iiko («ЗАЛ», «(ИП)»); своё название — из карточки админки
    const base = { ...product, iikoName: product.name, name: cleanMenuName(product.name) };
    const p = o ? applyOverride(base, o) : base;
    if (!p.parentGroupName) p.parentGroupName = groupName.get(p.parentGroup) || null;
    const src = p.source || 'main';
    p.isInStopList = stopped(src, p.id) || stopped(src, p.iikoId) || Boolean(p.sizeId && stopped(src, p.iikoId, p.sizeId));
    // Модификаторы на стопе в iiko не предлагаем; обязательный выбор без вариантов — блюдо недоступно
    if (p.sizes?.length || p.modifierGroups?.length) {
      const prune = (groups) => decorateGroups(groups, modContent).map((g) => ({ ...g, items: g.items.filter((m) => !stopped(src, m.id)) }));
      // Размер на стопе (пицца 40 см закончилась) — убираем только его
      const hadSizes = (p.sizes || []).length;
      p.sizes = (p.sizes || []).filter((z) => !(z.id && stopped(src, p.iikoId, z.id))).map((z) => ({ ...z, groups: prune(z.groups) }));
      p.modifierGroups = prune(p.modifierGroups);
      // Набор без платных блюд в наличии продать не за что
      const blocked = (groups, needsChoice = false) => groups.some((g) => g.min > 0 && !g.items.length)
        || (needsChoice && !groups.some((g) => g.items.some((m) => Number(m.price) > 0)));
      if (hadSizes && !p.sizes.length) p.isInStopList = true;
      // Из нескольких размеров остался один — его ID нужен iiko в заказе (выбора у гостя уже нет)
      if (hadSizes > 1 && p.sizes.length === 1 && p.sizes[0].id) p.sizeId = String(p.sizes[0].id);
      else if (p.sizes.length ? p.sizes.every((z) => blocked(z.groups, z.needsChoice)) : blocked(p.modifierGroups, p.needsChoice)) p.isInStopList = true;
    }
    // Ограниченный остаток в iiko («осталось N») — официант видит, сколько ещё можно предложить
    const left = p.isInStopList ? null : iikoStop.balance(src, p.id) ?? iikoStop.balance(src, p.iikoId);
    if (left) p.stopBalance = left;
    products.push(p);
  }

  // Приоритет из админки: больше — выше в своём разделе; остальные — как в iiko.
  // Порядок считает сервер — одинаково у гостя, официанта и в приложении.
  const ranked = products.map((p, i) => ({ ...p, order: (Number(p.order) || i) - (p.priority || 0) * 1e7 }))
    .sort((a, b) => a.order - b.order);
  // Разделы из админки главнее iiko: картинка, название, порядок, вкладка, скрытие
  const sections = applyCategorySettings(orderGroups(merged.groups, barGroups(ranked)), ranked, catSettings);
  // Вес без единицы (в iiko «порц»): напитки бара — в мл, остальное — в граммах
  const barIds = new Set(sections.groups.filter((g) => g.isBar).map((g) => String(g.id)));
  for (const p of sections.products) {
    if (/^\d+$/.test(String(p.weight || ''))) p.weight = `${p.weight} ${barIds.has(String(p.parentGroup)) ? 'мл' : 'г'}`;
  }
  // Конструктор бизнес-ланча: блок businessLunch (active по времени точки), скрытые в админке варианты шагов
  const lunch = await attachBusinessLunch(restaurant, sections);
  return {
    ...raw.data,
    groups: sections.groups,
    products: lunch.products,
    businessLunch: lunch.businessLunch,
    stopList: [...stop],
    source: raw.source,
    fetchedAt: raw.fetchedAt || new Date(raw.at).toISOString(),
  };
}

/** Разделы, где все блюда из второго iiko (бар). */
function barGroups(products) {
  const bySource = new Map();
  for (const p of products) {
    const g = p.parentGroup;
    if (!bySource.has(g)) bySource.set(g, new Set());
    bySource.get(g).add(p.source || 'main');
  }
  return new Set([...bySource].filter(([, s]) => !s.has('main')).map(([g]) => g));
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
    (p) => !p.isAlias && Number(p.price) > 0 && p.isPublished !== false && !p.isInStopList && isMainDish(p),
  );
}

/** Всё, что гость может заказать прямо сейчас (включая соусы/напитки) — для LLM. */
export async function getAvailableProducts(restaurant) {
  if (!restaurant) return [];
  const catalog = await getRestaurantCatalog(restaurant);
  return catalog.products.filter((p) => !p.isAlias && Number(p.price) > 0 && p.isPublished !== false && !p.isInStopList);
}

export function invalidateCatalogCache(restaurantId = null) {
  bumpCatalogVersion();
  if (restaurantId) {
    rawCache.delete(restaurantId);
  } else {
    rawCache.clear();
  }
}
