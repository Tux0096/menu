/**
 * Админ-панель (раздел 5.9 ТЗ): контент меню, стоп-лист, фото/КБЖУ/аллергены,
 * AI-подсказки, маркетинговые блоки, отзывы, журнал изменений, рестораны.
 */
import QRCode from 'qrcode';
import pool from '../db/pool.js';
import { PUBLIC_MENU_URL } from '../lib/qr-config.js';
import { getRestaurantCatalog, invalidateCatalogCache } from './catalog.js';
import { httpError } from './table-session.js';

// ── Меню ────────────────────────────────────────────────────────────────────

export async function getAdminMenu(restaurant, { force = false } = {}) {
  const catalog = await getRestaurantCatalog(restaurant, { force });
  const { rows: overrides } = await pool.query(
    'SELECT * FROM menu_overrides WHERE restaurant_id IS NULL OR restaurant_id = $1',
    [restaurant.id],
  );
  const hidden = overrides.filter((o) => o.is_hidden);
  const groupName = new Map((catalog.groups || []).map((g) => [g.id, g.name]));
  return {
    source: catalog.source,
    fetchedAt: catalog.fetchedAt,
    groups: (catalog.groups || []).map((g) => ({ id: g.id, name: g.name, parentGroup: g.parentGroup || null })),
    products: catalog.products.map((p) => ({
      id: p.id,
      iikoId: p.iikoId || p.id,
      name: p.name,
      group: groupName.get(p.parentGroup) || p.parentGroupName || '',
      price: p.price,
      weight: p.weight,
      image: p.image,
      description: p.description,
      energy: p.energyAmount,
      proteins: p.fiberAmount,
      fats: p.fatAmount,
      carbs: p.carbohydrateAmount,
      allergens: p.allergensText || [],
      isInStopList: p.isInStopList,
      isRecommended: Boolean(p.isRecommended),
      isHidden: false,
    })).concat(hidden.map((o) => ({
      id: o.product_id, name: o.product_name || o.name || o.product_id, group: '', isHidden: true,
    }))),
    overrides: overrides.map((o) => ({ ...o, scope: o.restaurant_id ? 'restaurant' : 'global' })),
  };
}

const OVERRIDE_FIELDS = [
  'is_stopped', 'is_hidden', 'is_recommended', 'name', 'description', 'image_url', 'weight',
  'energy', 'proteins', 'fats', 'carbs', 'allergens', 'product_name',
];

export async function saveOverride(restaurantId, productId, patch) {
  if (!productId) throw httpError(400, 'productId обязателен');
  const values = {};
  for (const f of OVERRIDE_FIELDS) {
    if (patch[f] === undefined) continue;
    let v = patch[f];
    if (['energy', 'proteins', 'fats', 'carbs'].includes(f)) v = v === '' || v == null ? null : Number(v);
    if (['name', 'description', 'image_url', 'weight', 'product_name'].includes(f)) v = v ? String(v) : null;
    if (f === 'allergens') v = Array.isArray(v) ? v.map((a) => String(a).trim()).filter(Boolean) : null;
    if (f.startsWith('is_')) v = Boolean(v);
    values[f] = v;
  }
  const { rows: existing } = await pool.query(
    `SELECT id FROM menu_overrides
     WHERE product_id = $1 AND restaurant_id IS NOT DISTINCT FROM $2`,
    [String(productId), restaurantId || null],
  );
  let row;
  if (existing[0]) {
    const keys = Object.keys(values);
    if (keys.length) {
      const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
      const { rows } = await pool.query(
        `UPDATE menu_overrides SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [existing[0].id, ...keys.map((k) => values[k])],
      );
      row = rows[0];
    }
  } else {
    const keys = Object.keys(values);
    const { rows } = await pool.query(
      `INSERT INTO menu_overrides (restaurant_id, product_id${keys.map((k) => `, ${k}`).join('')})
       VALUES ($1, $2${keys.map((_, i) => `, $${i + 3}`).join('')}) RETURNING *`,
      [restaurantId || null, String(productId), ...keys.map((k) => values[k])],
    );
    row = rows[0];
  }
  invalidateCatalogCache();
  return row;
}

export async function deleteOverride(id) {
  await pool.query('DELETE FROM menu_overrides WHERE id = $1', [id]);
  invalidateCatalogCache();
}

// ── Универсальный CRUD для простых справочников ─────────────────────────────

const TABLES = {
  ai_chips: ['label', 'query', 'emoji', 'sort_order', 'is_active'],
  promo_blocks: ['title', 'text', 'image_url', 'product_id', 'sort_order', 'is_active'],
};

export async function listRows(table, { activeOnly = false } = {}) {
  if (!TABLES[table]) throw httpError(400, 'Неизвестный справочник');
  const { rows } = await pool.query(
    `SELECT * FROM ${table} ${activeOnly ? 'WHERE is_active = TRUE' : ''} ORDER BY sort_order, id`,
  );
  return rows;
}

export async function saveRow(table, data) {
  const fields = TABLES[table];
  if (!fields) throw httpError(400, 'Неизвестный справочник');
  const keys = fields.filter((f) => data[f] !== undefined);
  const vals = keys.map((k) => (k === 'sort_order' ? Number(data[k]) || 0 : data[k]));
  if (data.id) {
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await pool.query(
      `UPDATE ${table} SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [data.id, ...vals],
    );
    if (!rows[0]) throw httpError(404, 'Запись не найдена');
    return rows[0];
  }
  const { rows } = await pool.query(
    `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
    vals,
  );
  return rows[0];
}

export async function deleteRow(table, id) {
  if (!TABLES[table]) throw httpError(400, 'Неизвестный справочник');
  await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
}

// ── Отзывы, журнал ──────────────────────────────────────────────────────────

export async function listFeedback(restaurantId, limit = 100) {
  const { rows } = await pool.query(
    `SELECT f.id, f.rating, f.comment, f.created_at, s.table_number, s.total,
            g.name AS guest_name, g.phone AS guest_phone, u.name AS waiter_name
     FROM visit_feedback f
     JOIN table_sessions s ON s.id = f.session_id
     LEFT JOIN guests g ON g.id = s.guest_id
     LEFT JOIN staff_users u ON u.id = s.waiter_id
     WHERE s.restaurant_id = $1
     ORDER BY f.created_at DESC LIMIT $2`,
    [restaurantId, limit],
  );
  return rows;
}

export async function listAudit(limit = 200) {
  const { rows } = await pool.query('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT $1', [limit]);
  return rows;
}

export async function listRestaurants() {
  const { rows } = await pool.query(
    `SELECT id, name, address, slug, tables_count, is_disabled, organization_id, terminal_group_id, terminal_id
     FROM restaurants ORDER BY sort_order, name`,
  );
  return rows;
}

export async function updateRestaurant(id, { tablesCount, isDisabled }) {
  const { rows } = await pool.query(
    `UPDATE restaurants SET
       tables_count = COALESCE($2, tables_count),
       is_disabled = COALESCE($3, is_disabled)
     WHERE id = $1 RETURNING *`,
    [id, tablesCount ? Number(tablesCount) : null, typeof isDisabled === 'boolean' ? isDisabled : null],
  );
  return rows[0];
}

// ── QR-коды столов ──────────────────────────────────────────────────────────

export function tableUrl(restaurantSlug, table) {
  return `${PUBLIC_MENU_URL}/?restaurant=${encodeURIComponent(restaurantSlug)}&table=${encodeURIComponent(table)}`;
}

export async function tableQrSvg(restaurantSlug, table) {
  return QRCode.toString(tableUrl(restaurantSlug, table), {
    type: 'svg', margin: 1, width: 320, color: { dark: '#091027', light: '#ffffff' },
  });
}
