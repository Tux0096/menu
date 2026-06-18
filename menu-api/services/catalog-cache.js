import { fetchLegacyCatalog } from './catalog-proxy.js';
import { QR_RESTAURANT_SLUG } from '../lib/qr-config.js';
import pool from '../db/pool.js';

const TTL_MS = 5 * 60 * 1000;
const cache = new Map();

async function getRestaurant() {
  const { rows } = await pool.query(
    `SELECT * FROM restaurants WHERE slug = $1 AND is_disabled = FALSE`,
    [QR_RESTAURANT_SLUG],
  );
  return rows[0] || null;
}

export async function getCatalogProducts() {
  const restaurant = await getRestaurant();
  if (!restaurant?.terminal_id) return [];

  const key = restaurant.terminal_id;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return hit.products;
  }

  const catalog = await fetchLegacyCatalog(restaurant.terminal_id);
  const products = (catalog.products || []).filter(
    (p) => Number(p.price) > 0 && p.isPublished !== false,
  );
  cache.set(key, { at: Date.now(), products });
  return products;
}

export function invalidateCatalogCache() {
  cache.clear();
}
