/**
 * Меню сети: все позиции точек, подключённых к iiko, в одной таблице и где каждая из них есть.
 *
 * У точек разные организации iiko, поэтому ID одного и того же блюда на точках разные, артикулов может не быть,
 * а цены свои у каждой точки. Позиции сводятся по названию (без регистра, «ё», пробелов и знаков).
 * «Есть на точке» = блюдо есть во внешнем меню iiko этой точки и не скрыто в админке. Добавить точке блюдо,
 * которого нет в её iiko, нельзя — его заводят в iiko (меню iiko мы не меняем).
 */
import pool from '../db/pool.js';
import { accessibleOrgIds } from '../iiko-client.js';
import { cleanModText, getRestaurantCatalog, groupTitle } from './catalog.js';
import { getStopListIds } from './stoplist.js';
import { cleanMenuName, menuKey } from '../lib/menu-key.js';

export { menuKey };

/** Состояние точки: подключена ли к ключу iiko, сколько позиций, когда обновлялись меню и стоп-лист */
async function pointInfo(r, allowed, catalog) {
  const stop = await getStopListIds(r.id);
  const { rows } = await pool.query(
    'SELECT MAX(updated_at) AS at, COUNT(*)::int AS n FROM stop_lists WHERE restaurant_id = $1', [r.id],
  );
  // Бар: нет / касса в той же iiko / отдельная iiko (своя организация или ключ)
  const { rows: bar } = await pool.query(
    "SELECT organization_id, creds, terminal_group_id, is_enabled FROM restaurant_sources WHERE restaurant_id = $1 AND code = 'bar'", [r.id],
  );
  const b = bar[0];
  const barMode = !b || !b.is_enabled ? 'none' : (b.creds || (b.organization_id && b.organization_id !== r.organization_id)) ? 'separate' : 'same';
  return {
    id: r.id,
    slug: r.slug,
    barMode,
    name: r.name,
    isDisabled: Boolean(r.is_disabled),
    // Не подключена к API-ключу iiko — меню и стоп-лист не обновляются (показывается последняя выгрузка)
    connected: Boolean(r.organization_id) && (!allowed || allowed.has(r.organization_id)),
    menuSource: catalog.source,
    menuUpdatedAt: catalog.fetchedAt || null,
    products: (catalog.products || []).length,
    stopCount: stop.size,
    stopListRows: rows[0].n,
    stopUpdatedAt: rows[0].at,
  };
}

const CARD_EXTRA = ['video', 'weight', 'energy', 'proteins', 'fats', 'carbs', 'allergens', 'recommended', 'choices'];

export async function getNetworkMenu(restaurants) {
  const allowed = await accessibleOrgIds().catch(() => null);
  const points = [];
  const items = new Map();
  // Ключ — по названию из iiko (переименование в админке не разрывает связь точек); бар — отдельной строкой
  const put = (name, slug, cell, extra = {}) => {
    const base = menuKey(extra.iikoName || name);
    if (!base) return;
    const key = cell.source && cell.source !== 'main' ? `${base}|${cell.source}` : base;
    if (!items.has(key)) items.set(key, { key, name, iikoName: cleanMenuName(extra.iikoName || name), group: null, image: null, description: null, badge: null, cardSize: null, points: {} });
    const it = items.get(key);
    it.points[slug] = cell;
    if (!it.group && extra.group) it.group = extra.group;
    if (!it.image && extra.image) it.image = extra.image;
    if (!it.description && extra.description) it.description = extra.description;
    if (!it.badge && extra.badge) it.badge = extra.badge;
    if (!it.cardSize && extra.cardSize) it.cardSize = extra.cardSize;
    // Остальное содержимое карточки (вес, КБЖУ, аллергены…) — чтобы редактор открывался заполненным
    for (const k of CARD_EXTRA) if (it[k] == null && extra[k] != null && extra[k] !== '') it[k] = extra[k];
  };

  const catalogs = new Map();
  const idName = new Map(); // ID блюда → название (для скрытых, которых нет в каталоге точки)
  for (const r of restaurants) {
    const catalog = await getRestaurantCatalog(r);
    catalogs.set(r.id, catalog);
    for (const p of catalog.products || []) idName.set(String(p.id), p.name);
  }
  for (const r of restaurants) {
    const catalog = catalogs.get(r.id);
    const info = await pointInfo(r, allowed, catalog);
    points.push(info);
    // В меню сети — только точки, подключённые к iiko: у остальных устаревшая выгрузка
    if (!info.connected) continue;
    const groupName = new Map((catalog.groups || []).map((g) => [g.id, g.name]));
    for (const p of catalog.products || []) {
      put(p.name, r.slug, {
        productId: String(p.id),
        price: Number(p.price) || 0,
        stop: Boolean(p.isInStopList),
        hidden: false,
        source: p.source || 'main',
      }, {
        group: groupName.get(p.parentGroup) || p.parentGroupName || null,
        iikoName: p.iikoName || p.name,
        image: p.image || null,
        description: p.description || null,
        badge: p.badge || null,
        cardSize: p.cardSize || null,
        video: p.video || null,
        weight: p.weight || null,
        energy: p.energyAmount ?? null,
        proteins: p.fiberAmount ?? null,
        fats: p.fatAmount ?? null,
        carbs: p.carbohydrateAmount ?? null,
        allergens: [...new Set([...(p.allergensText || []), ...(p.allergens || []).map((a) => a?.name || a)].filter(Boolean))].join(', ') || null,
        recommended: p.isRecommended ? true : null,
        // Что гость выбирает в блюде (размер, соус, основа) — из iiko; настраивается во вкладке «Модификаторы»
        choices: [
          ...((p.sizes || []).length > 1 ? ['Размер'] : []),
          ...(p.modifierGroups || []).map((g) => g.name).filter(Boolean),
        ].join(', ') || null,
      });
    }
    // Скрытые в админке (в каталоге их нет): берём цену и раздел из выгрузки iiko
    const { rows: hidden } = await pool.query(
      `SELECT DISTINCT ON (o.product_id) o.product_id, COALESCE(p.name, o.product_name, o.name) AS name,
              p.price::float AS price, c.name AS group_name, o.restaurant_id IS NULL AS global, p.source
       FROM menu_overrides o
       LEFT JOIN products p ON p.restaurant_id = $1 AND p.iiko_id::text = o.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE o.is_hidden AND (o.restaurant_id = $1 OR o.restaurant_id IS NULL)
       ORDER BY o.product_id, o.restaurant_id NULLS LAST`,
      [r.id],
    );
    for (const h of hidden) {
      // Название не сохранено и блюда нет в выгрузке — узнаём позицию по ID блюда на других точках
      const name = h.name || idName.get(String(h.product_id));
      if (!name) continue;
      put(cleanMenuName(name), r.slug, { productId: String(h.product_id), price: h.price || 0, stop: false, hidden: true, hiddenEverywhere: h.global, source: h.source || 'main' },
        { group: h.group_name || null });
    }
  }

  // Карточки админки, чьих блюд больше нет в iiko ни на одной точке: строка остаётся (серая, «нет в iiko»),
  // контент не теряется — блюдо вернут в iiko, и карточка снова заработает
  const connected = new Set(points.filter((p) => p.connected).map((p) => p.id));
  const { rows: cards } = await pool.query(
    `SELECT DISTINCT ON (lower(o.product_name)) o.product_name, o.name, o.image_url, o.description, o.badge, o.card_size
       FROM menu_overrides o
      WHERE o.product_name IS NOT NULL AND (o.restaurant_id IS NULL OR o.restaurant_id = ANY($1::uuid[]))
        AND (o.image_url IS NOT NULL OR o.description IS NOT NULL OR o.name IS NOT NULL OR NULLIF(o.badge, '') IS NOT NULL)
      ORDER BY lower(o.product_name), o.updated_at DESC`,
    [[...connected]],
  );
  const present = new Set([...items.keys()].map((k) => k.split('|')[0]));
  for (const c of cards) {
    const key = menuKey(c.product_name);
    if (!key || present.has(key)) continue;
    present.add(key);
    items.set(key, {
      key, name: c.name || cleanMenuName(c.product_name), iikoName: cleanMenuName(c.product_name), gone: true,
      group: null, image: c.image_url, description: c.description, badge: c.badge, cardSize: c.card_size, points: {},
    });
  }

  const list = [...items.values()].sort((a, b) => String(a.group || 'яяя').localeCompare(String(b.group || 'яяя'), 'ru')
    || a.name.localeCompare(b.name, 'ru'));
  return { points, items: list };
}

/** Только состояние точек (без позиций) — для страницы стоп-листов */
export async function getNetworkMenuPoints(restaurants) {
  const allowed = await accessibleOrgIds().catch(() => null);
  const points = [];
  for (const r of restaurants) points.push(await pointInfo(r, allowed, await getRestaurantCatalog(r)));
  return { points };
}

/**
 * Разделы меню подключённых точек — в том порядке, в каком их видит гость, с настройками из админки.
 * Скрытых разделов в меню гостя нет, поэтому они добавляются из настроек (в конец списка).
 */
export async function getCategoryList(restaurants) {
  const { rows } = await pool.query('SELECT key, name, image_url, title, sort_order, tab, is_hidden FROM category_content');
  const content = new Map(rows.map((r) => [r.key, r]));
  const list = new Map();
  const catalogs = await Promise.all(restaurants.map((r) => getRestaurantCatalog(r)));
  for (const catalog of catalogs) {
    const used = new Map();
    for (const p of catalog.products || []) used.set(String(p.parentGroup), (used.get(String(p.parentGroup)) || 0) + 1);
    for (const g of catalog.groups || []) {
      const iikoName = g.iikoName || g.name;
      const key = menuKey(iikoName);
      if (!key || !used.get(String(g.id))) continue;
      const c = content.get(key);
      const cur = list.get(key) || {
        key, name: iikoName, title: c?.title || '', image: c?.image_url || null, iikoImage: null,
        isBar: Boolean(g.isBar), tab: c?.tab || '', hidden: false, sortOrder: c?.sort_order ?? null, points: 0, items: 0, position: list.size,
      };
      // iikoImage — картинка раздела из iiko: гость видит её, пока своей нет
      if (!cur.iikoImage && g.image && g.image !== cur.image) cur.iikoImage = g.image;
      cur.points += 1;
      cur.items = Math.max(cur.items, used.get(String(g.id)));
      list.set(key, cur);
    }
  }
  for (const c of rows.filter((r) => r.is_hidden && !list.has(r.key))) {
    list.set(c.key, {
      key: c.key, name: c.name, title: c.title || '', image: c.image_url || null, iikoImage: null, isBar: c.tab === 'bar',
      tab: c.tab || '', hidden: true, sortOrder: c.sort_order ?? null, points: 0, items: 0, position: 1e6 + list.size,
    });
  }
  return [...list.values()].sort((a, b) => a.position - b.position).map(({ position, ...x }) => x);
}

/**
 * Настройки разделов из админки одним списком в нужном порядке: своё название, вкладка, скрытие.
 * Порядок — позиция в списке; картинки не трогаются (они сохраняются сразу при загрузке).
 */
export async function saveCategorySettings(items) {
  const list = (Array.isArray(items) ? items : []).slice(0, 300);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [i, it] of list.entries()) {
      const name = String(it.name || '').slice(0, 200);
      const key = menuKey(name).slice(0, 200);
      if (!key) continue;
      const title = String(it.title || '').trim().slice(0, 100) || null;
      const tab = ['kitchen', 'bar'].includes(it.tab) ? it.tab : null;
      await client.query(
        `INSERT INTO category_content (key, name, title, sort_order, tab, is_hidden, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title, sort_order = EXCLUDED.sort_order,
           tab = EXCLUDED.tab, is_hidden = EXCLUDED.is_hidden, updated_at = NOW()`,
        [key, name, title, i + 1, tab, Boolean(it.hidden)],
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  return { saved: list.length };
}

/** Картинка раздела (пусто — стандартная по названию). Ключ — название раздела без регистра и пометок iiko. */
export async function setCategoryImage(name, imageUrl) {
  const key = menuKey(String(name).slice(0, 200)).slice(0, 200);
  if (!key) return null;
  await pool.query(
    `INSERT INTO category_content (key, name, image_url, updated_at) VALUES ($1, $2, $3, NOW())
     ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url, updated_at = NOW()`,
    [key, String(name).slice(0, 200), imageUrl || null],
  );
  return { key, image: imageUrl || null };
}

/**
 * Модификаторы меню сети: группы (по названию в iiko) с вариантами — для настройки в админке.
 * title — своё название из админки, auto — как увидит гость без своего; dishes — в каких блюдах встречается.
 */
export async function getModifierList(restaurants) {
  const { rows } = await pool.query('SELECT kind, key, title, image_url FROM modifier_content');
  const content = new Map(rows.map((r) => [`${r.kind}:${r.key}`, r]));
  const groups = new Map();
  const catalogs = await Promise.all(restaurants.map((r) => getRestaurantCatalog(r)));
  for (const catalog of catalogs) {
    for (const p of catalog.products || []) {
      const all = [...(p.modifierGroups || []), ...(p.sizes || []).flatMap((z) => z.groups || [])];
      for (const g of all) {
        const gName = g.iikoName || g.name;
        const gKey = menuKey(gName);
        if (!gKey) continue;
        if (!groups.has(gKey)) {
          const cleanItems = (g.items || []).map((m) => ({ name: cleanModText(m.iikoName || m.name) }));
          groups.set(gKey, {
            key: gKey, iikoName: gName, title: content.get(`group:${gKey}`)?.title || '', auto: groupTitle(gName, cleanItems),
            min: g.min, max: g.max, dishes: new Set(), items: new Map(),
          });
        }
        const G = groups.get(gKey);
        G.dishes.add(p.name);
        for (const m of g.items || []) {
          const mName = m.iikoName || m.name;
          const mKey = menuKey(mName);
          if (!mKey || G.items.has(mKey)) continue;
          const c = content.get(`item:${mKey}`);
          G.items.set(mKey, {
            key: mKey, iikoName: mName, title: c?.title || '', auto: cleanModText(mName) || mName,
            image: c?.image_url || null, iikoImage: c?.image_url ? null : m.image || null, price: m.price || 0,
          });
        }
      }
    }
  }
  return [...groups.values()]
    .map((g) => ({ ...g, dishes: [...g.dishes].slice(0, 6), dishCount: g.dishes.size, items: [...g.items.values()] }))
    .sort((a, b) => b.dishCount - a.dishCount || a.auto.localeCompare(b.auto, 'ru'));
}

/** Свои названия групп и вариантов модификаторов (пусто — как в iiko без служебных пометок). Картинки не трогаются. */
export async function saveModifierTitles({ groups = [], items = [] } = {}) {
  const list = [
    ...(Array.isArray(groups) ? groups : []).map((x) => ['group', x]),
    ...(Array.isArray(items) ? items : []).map((x) => ['item', x]),
  ].slice(0, 2000);
  let saved = 0;
  for (const [kind, x] of list) {
    const name = String(x?.iikoName || '').slice(0, 200);
    const key = menuKey(name).slice(0, 200);
    if (!key) continue;
    const title = String(x?.title || '').trim().slice(0, 120) || null;
    await pool.query(
      `INSERT INTO modifier_content (kind, key, name, title, updated_at) VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (kind, key) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title, updated_at = NOW()`,
      [kind, key, name, title],
    );
    saved += 1;
  }
  return { saved };
}

/** Картинка варианта модификатора (пусто — из iiko или первая буква). */
export async function setModifierImage(name, imageUrl) {
  const key = menuKey(String(name || '').slice(0, 200)).slice(0, 200);
  if (!key) return null;
  await pool.query(
    `INSERT INTO modifier_content (kind, key, name, image_url, updated_at) VALUES ('item', $1, $2, $3, NOW())
     ON CONFLICT (kind, key) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url, updated_at = NOW()`,
    [key, String(name).slice(0, 200), imageUrl || null],
  );
  return { key, image: imageUrl || null };
}
