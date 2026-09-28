/**
 * Источники iiko ресторана. Основной ('main') — организация ресторана (кухня), основной ключ.
 * Дополнительные (restaurant_sources) — например, бар с алкоголем в другой организации или другом аккаунте iiko:
 * своё внешнее меню, свой заказ на тот же стол, свой стоп-лист; для гостя и официанта — одно меню.
 */
import pool from '../db/pool.js';

export const MAIN = 'main';

export async function listSources(restaurant, { all = false } = {}) {
  const { rows } = await pool.query(
    `SELECT * FROM restaurant_sources WHERE restaurant_id = $1 ${all ? '' : 'AND is_enabled'} ORDER BY sort_order, created_at`,
    [restaurant.id],
  );
  return [
    {
      code: MAIN,
      name: 'Кухня',
      organization_id: restaurant.organization_id,
      terminal_group_id: restaurant.terminal_group_id,
      creds: '',
      isMain: true,
    },
    ...rows,
  ];
}

export async function getSource(restaurant, code = MAIN) {
  const list = await listSources(restaurant, { all: true });
  return list.find((s) => s.code === (code || MAIN)) || list[0];
}

/** Источник каждого блюда по iiko ID (по данным выгрузки; клиенту не доверяем). */
export async function productSourceMap(restaurantId, iikoIds) {
  const ids = [...new Set((iikoIds || []).map(String))];
  if (!ids.length) return new Map();
  const { rows } = await pool.query(
    'SELECT iiko_id::text AS id, source FROM products WHERE restaurant_id = $1 AND iiko_id::text = ANY($2::text[])',
    [restaurantId, ids],
  );
  return new Map(rows.map((r) => [r.id, r.source || MAIN]));
}

/** Все организации (с ключами), которые нужно опрашивать: основные рестораны + доп. источники. */
export async function allOrgTargets() {
  const { rows } = await pool.query(
    `SELECT r.id AS restaurant_id, r.organization_id, r.terminal_group_id, 'main' AS source, '' AS creds
       FROM restaurants r WHERE r.is_disabled = FALSE AND r.organization_id IS NOT NULL
     UNION ALL
     SELECT s.restaurant_id, s.organization_id, s.terminal_group_id, s.code, s.creds
       FROM restaurant_sources s JOIN restaurants r ON r.id = s.restaurant_id
      WHERE s.is_enabled AND r.is_disabled = FALSE`,
  );
  return rows;
}
