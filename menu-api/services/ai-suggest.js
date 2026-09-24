import axios from 'axios';
import pool from '../db/pool.js';
import { getLearningBoosts } from './ai-learning.js';
import { suggestDishesKeyword } from './ai-suggest-keywords.js';
import { mergeWithPopular, suggestPopularDishes } from './ai-popular.js';
import { getAvailableProducts, getCatalogProducts } from './catalog.js';
import { isLlmEnabled, llmSuggest } from './ai-llm.js';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b';

export async function checkOllamaHealth() {
  try {
    const res = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 3000 });
    const models = res.data?.models || [];
    const modelBase = OLLAMA_MODEL.split(':')[0];
    const hasModel = models.some((m) => m.name?.startsWith(modelBase));
    return { ok: true, models: models.map((m) => m.name), hasModel, model: OLLAMA_MODEL };
  } catch (e) {
    return { ok: false, error: e.message, model: OLLAMA_MODEL };
  }
}

function mapSuggestion(s) {
  return {
    productId: s.product.id,
    iikoId: s.product.iikoId || s.product.id,
    name: s.product.name,
    slug: s.product.slug,
    price: parseFloat(s.product.price),
    weight: s.product.weight || null,
    description: s.product.description || null,
    image: s.product.image || null,
    reason: s.reason,
    score: s.score,
  };
}

/** Любимые блюда гостя по прошлым визитам: productId -> сколько раз заказывал. */
async function getGuestFavorites(guestId) {
  if (!guestId) return new Map();
  const { rows } = await pool.query(
    `SELECT i.iiko_product_id::text AS pid, SUM(i.quantity)::int AS qty
     FROM table_order_items i
     JOIN table_sessions s ON s.id = i.session_id
     WHERE s.guest_id = $1 AND i.synced_to_iiko = TRUE
     GROUP BY 1 ORDER BY 2 DESC LIMIT 30`,
    [guestId],
  );
  return new Map(rows.map((r) => [r.pid, r.qty]));
}

function excludeAllergens(products, allergens) {
  if (!allergens?.length) return products;
  const bad = allergens.map((a) => String(a).toLowerCase());
  return products.filter((p) => {
    const tags = (p.allergensText || []).map((a) => String(a).toLowerCase());
    const text = `${p.name} ${p.description || ''}`.toLowerCase();
    return !bad.some((a) => tags.includes(a) || text.includes(a));
  });
}

function personalBoosts(products, favorites, learning, query) {
  const boosts = new Map(learning || []);
  const wantsRecommended = /рекоменд|попроб|совет|хит|популяр/i.test(query || '');
  for (const p of products) {
    let b = boosts.get(String(p.id)) || 0;
    const fav = favorites.get(String(p.iikoId || p.id)) || favorites.get(String(p.id));
    if (fav) b += Math.min(4, 1 + fav);
    if (p.isRecommended) b += wantsRecommended ? 10 : 1;
    if (b) boosts.set(String(p.id), b);
  }
  return boosts;
}

/** Мгновенный подбор без LLM — ответ < 1 сек даже на слабом сервере. */
export async function suggestDishes(products, query, limit = 6, boosts = new Map()) {
  const keywordResults = suggestDishesKeyword(products, query, limit, boosts);
  const topScore = keywordResults[0]?.score || 0;
  if (topScore >= 3) return keywordResults;
  return mergeWithPopular(keywordResults, products, limit);
}

export async function getWelcomeSuggestions(restaurant, limit = 4, guest = null) {
  const all = excludeAllergens(await getCatalogProducts(restaurant), guest?.allergens);
  const favorites = await getGuestFavorites(guest?.id);
  const picked = [];
  const used = new Set();
  const push = (product, reason, score) => {
    if (picked.length >= limit || used.has(String(product.id))) return;
    used.add(String(product.id));
    picked.push({ product, reason, score });
  };

  for (const p of all.filter((x) => x.isRecommended)) push(p, 'Рекомендуем попробовать', 10);
  for (const [pid] of favorites) {
    const p = all.find((x) => String(x.iikoId || x.id) === pid || String(x.id) === pid);
    if (p) push(p, 'Вы заказывали это раньше', 8);
  }
  for (const s of suggestPopularDishes(all, limit)) push(s.product, s.reason, s.score);
  return picked.map(mapSuggestion);
}

/**
 * Подбор по запросу гостя (текст или чип).
 * LLM (OpenRouter) получает всё доступное меню с составом + запрос и контекст гостя;
 * при недоступности — мгновенный подбор по ключевым словам (fallback без пустого экрана).
 * Возвращает { suggestions, engine, answer }.
 */
export async function suggestForQuery(restaurant, query, limit = 6, guest = null, { useLlm = true, cartNames = [] } = {}) {
  const products = excludeAllergens(await getCatalogProducts(restaurant), guest?.allergens);
  const [learning, favorites] = await Promise.all([
    getLearningBoosts(query),
    getGuestFavorites(guest?.id),
  ]);

  if (useLlm && isLlmEnabled()) {
    const available = await getAvailableProducts(restaurant);
    const favNames = available.filter((p) => favorites.has(String(p.iikoId || p.id))).map((p) => p.name).slice(0, 8);
    const llm = await llmSuggest(query, available, {
      limit: Math.min(limit, 5),
      guest: { ...guest, favorites: favNames, cart: cartNames.slice(0, 20) },
    });
    if (llm) {
      const allowed = new Set(excludeAllergens(llm.picks.map((x) => x.product), guest?.allergens).map((p) => p.id));
      const picks = llm.picks.filter((x) => allowed.has(x.product.id));
      if (picks.length) {
        return {
          engine: 'llm',
          answer: llm.answer,
          suggestions: picks.map((x) => ({ ...mapSuggestion(x), qty: x.qty })),
        };
      }
    }
  }

  const boosts = personalBoosts(products, favorites, learning, query);
  const raw = await suggestDishes(products, query, limit, boosts);
  const suggestions = raw.map((s) => {
    const fav = favorites.get(String(s.product.iikoId || s.product.id));
    if (fav) return { ...s, reason: 'Вы уже заказывали это блюдо' };
    if (s.product.isRecommended) return { ...s, reason: `${s.reason} · рекомендуем` };
    return s;
  }).map(mapSuggestion);
  return { suggestions, engine: 'instant', answer: null };
}
