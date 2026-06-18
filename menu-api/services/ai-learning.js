import pool from '../db/pool.js';

export function normalizeQuery(query) {
  return String(query || '')
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

export function queryTokens(normalized) {
  return normalized.split(/\s+/).filter((t) => t.length > 1);
}

/** Похожие прошлые запросы → буст популярных блюд. */
export async function getLearningBoosts(query, limit = 12) {
  const normalized = normalizeQuery(query);
  if (!normalized) return new Map();

  const tokens = queryTokens(normalized);
  const patterns = tokens.length
    ? tokens.map((_, i) => `%${tokens.slice(i, Math.min(i + 3, tokens.length)).join(' ')}%`)
    : [`%${normalized}%`];

  const boosts = new Map();
  for (const pattern of patterns.slice(0, 4)) {
    const { rows } = await pool.query(
      `SELECT product_id, SUM(count) AS total
       FROM ai_product_feedback
       WHERE query_normalized LIKE $1
       GROUP BY product_id
       ORDER BY total DESC
       LIMIT $2`,
      [pattern, limit],
    );
    for (const row of rows) {
      const prev = boosts.get(row.product_id) || 0;
      boosts.set(row.product_id, prev + Number(row.total) * 2);
    }
  }
  return boosts;
}

export async function logAiQuery(restaurantSlug, query, suggestions) {
  const normalized = normalizeQuery(query);
  if (!normalized) return;
  await pool.query(
    `INSERT INTO ai_query_log (restaurant_slug, query, query_normalized, suggestions)
     VALUES ($1, $2, $3, $4)`,
    [restaurantSlug, query, normalized, JSON.stringify(suggestions || [])],
  );
}

export async function recordAiFeedback(query, productId, action = 'add') {
  const normalized = normalizeQuery(query);
  if (!normalized || !productId) return;
  await pool.query(
    `INSERT INTO ai_product_feedback (query_normalized, product_id, action, count)
     VALUES ($1, $2, $3, 1)
     ON CONFLICT (query_normalized, product_id, action)
     DO UPDATE SET count = ai_product_feedback.count + 1, updated_at = NOW()`,
    [normalized, String(productId), action],
  );
}
