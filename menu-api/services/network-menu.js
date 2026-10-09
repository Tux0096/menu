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
import { getRestaurantCatalog } from './catalog.js';
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

export async function getNetworkMenu(restaurants) {
  const allowed = await accessibleOrgIds().catch(() => null);
  const points = [];
  const items = new Map();
  // Ключ — по названию из iiko (переименование в админке не разрывает связь точек); бар — отдельной строкой
  const put = (name, slug, cell, extra = {}) => {
    const base = menuKey(extra.iikoName || name);
    if (!base) return;
    const key = cell.source && cell.source !== 'main' ? `${base}|${cell.source}` : base;
    if (!items.has(key)) items.set(key, { key, name, iikoName: cleanMenuName(extra.iikoName || name), group: null, image: null, description: null, badge: null, points: {} });
    const it = items.get(key);
    it.points[slug] = cell;
    if (!it.group && extra.group) it.group = extra.group;
    if (!it.image && extra.image) it.image = extra.image;
    if (!it.description && extra.description) it.description = extra.description;
    if (!it.badge && extra.badge) it.badge = extra.badge;
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
    `SELECT DISTINCT ON (lower(o.product_name)) o.product_name, o.name, o.image_url, o.description, o.badge
       FROM menu_overrides o
      WHERE o.product_name IS NOT NULL AND (o.restaurant_id IS NULL OR o.restaurant_id = ANY($1::uuid[]))
        AND (o.image_url IS NOT NULL OR o.description IS NOT NULL OR o.name IS NOT NULL OR o.badge IS NOT NULL)
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
      group: null, image: c.image_url, description: c.description, badge: c.badge, points: {},
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
