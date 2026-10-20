/**
 * Нормативы готовки блюд для точки: cookingTime из номенклатуры iiko или медиана нашей фактической готовки за 14 дней.
 */
import pool from '../db/pool.js';
import { menuIndex } from './menu-pricing.js';
import { COOK_HISTORY_DAYS, cookInfo, cookNorm } from '../lib/cooking-time.js';

/** Map: ID блюда iiko → { minutes, source } | null */
export async function loadCookNorms(restaurant, productIds) {
  const ids = [...new Set((productIds || []).filter(Boolean).map(String))];
  const out = new Map();
  if (!ids.length) return out;
  const index = await menuIndex(restaurant).catch(() => null);
  const { rows } = await pool.query(
    `SELECT i.iiko_product_id::text AS pid, array_agg(i.cook_minutes) AS samples
     FROM table_order_items i JOIN table_sessions s ON s.id = i.session_id
     WHERE s.restaurant_id = $1 AND i.cook_minutes IS NOT NULL AND i.iiko_product_id::text = ANY($2::text[])
       AND i.ready_at > NOW() - ($3 || ' days')::interval
     GROUP BY 1`,
    [restaurant.id, ids, String(COOK_HISTORY_DAYS)],
  ).catch(() => ({ rows: [] }));
  const history = new Map(rows.map((r) => [r.pid, r.samples]));
  for (const id of ids) {
    out.set(id, cookNorm({ nomenclature: index?.get(id)?.cookingMinutes ?? null, history: history.get(id) || [] }));
  }
  return out;
}

/** Время готовки у отправленных позиций видов столов (view.items): один запрос нормативов на все столы */
export async function attachCookInfo(views, restaurant) {
  const list = Array.isArray(views) ? views : [views];
  const sent = list.flatMap((v) => v.items.filter((i) => i.isLocked));
  if (!sent.length) return views;
  const norms = await loadCookNorms(restaurant, sent.map((i) => i.iikoProductId));
  for (const i of sent) {
    i.cook = cookInfo({
      sentAt: i.sentAt, startedAt: i.cookingStartedAt, readyAt: i.readyAt, servedAt: i.servedAt,
      cookMinutes: i.cookMinutes, kitchenStatus: i.kitchenStatus,
    }, norms.get(String(i.iikoProductId)));
  }
  return views;
}
