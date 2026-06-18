import axios from 'axios';
import { getLearningBoosts } from './ai-learning.js';
import { suggestDishesKeyword } from './ai-suggest-keywords.js';
import { mergeWithPopular, suggestPopularDishes } from './ai-popular.js';
import { getCatalogProducts } from './catalog-cache.js';

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
    iikoId: s.product.id,
    name: s.product.name,
    slug: s.product.slug,
    price: parseFloat(s.product.price),
    image: s.product.image || null,
    reason: s.reason,
    score: s.score,
  };
}

/** Мгновенный подбор без Ollama — надёжно на мобильном. */
export async function suggestDishes(products, query, limit = 6, learningBoosts = null) {
  const boosts = learningBoosts || new Map();
  const keywordResults = suggestDishesKeyword(products, query, limit, boosts);
  const topScore = keywordResults[0]?.score || 0;

  if (topScore >= 3) {
    return keywordResults;
  }

  return mergeWithPopular(keywordResults, products, limit);
}

export async function getWelcomeSuggestions(limit = 4) {
  const products = await getCatalogProducts();
  return suggestPopularDishes(products, limit).map(mapSuggestion);
}

export async function suggestForQuery(query, limit = 6) {
  const products = await getCatalogProducts();
  const learningBoosts = await getLearningBoosts(query);
  const raw = await suggestDishes(products, query, limit, learningBoosts);
  return raw.map(mapSuggestion);
}
