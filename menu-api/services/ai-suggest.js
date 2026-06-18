import axios from 'axios';
import { getLearningBoosts } from './ai-learning.js';
import { suggestDishesKeyword } from './ai-suggest-keywords.js';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b';
const OLLAMA_TIMEOUT = parseInt(process.env.OLLAMA_TIMEOUT_MS || '4500', 10);
const OLLAMA_SKIP_SCORE = parseInt(process.env.OLLAMA_SKIP_SCORE || '5', 10);

const VAGUE_HINTS = ['вкус', 'хочу', 'что-ниб', 'что ниб', 'посовет', 'подбери', 'голод', 'перекус', 'не знаю', 'сюрприз', 'настроен'];

function extractJsonArray(text) {
  const match = String(text).match(/\[[\s\S]*?\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function isVagueQuery(query) {
  const q = String(query || '').toLowerCase().trim();
  const tokens = q.replace(/[^a-zа-яё0-9\s]/gi, ' ').split(/\s+/).filter(Boolean);
  return VAGUE_HINTS.some((h) => q.includes(h)) || tokens.length <= 2;
}

function buildMenuContext(products, maxItems = 45) {
  return products.slice(0, maxItems).map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
  }));
}

function applyBoosts(results, boosts) {
  if (!boosts?.size) return results;
  return results
    .map((r) => ({
      ...r,
      score: (r.score || 0) + (boosts.get(String(r.product.id)) || 0),
    }))
    .sort((a, b) => b.score - a.score);
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), ms);
    }),
  ]);
}

async function suggestWithOllama(products, query, limit, learningBoosts) {
  const menu = buildMenuContext(products);
  const systemPrompt = `AI-сомелье «Фуджи». Ответ — только JSON-массив:
[{"id":"<uuid>","reason":"коротко на русском"}]`;

  const userPrompt = `Запрос: "${query}"
Меню: ${JSON.stringify(menu)}
Выбери ${Math.min(limit, 4)} блюд. Только id из списка.`;

  const res = await axios.post(
    `${OLLAMA_URL}/api/chat`,
    {
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: false,
      options: {
        temperature: 0.25,
        num_predict: 180,
        top_p: 0.85,
      },
    },
    { timeout: OLLAMA_TIMEOUT + 500 },
  );

  const raw = res.data?.message?.content || res.data?.response || '';
  const parsed = extractJsonArray(raw);
  if (!Array.isArray(parsed) || !parsed.length) {
    throw new Error('Ollama: не удалось разобрать ответ');
  }

  const byId = new Map(products.map((p) => [String(p.id), p]));
  const results = [];
  for (const item of parsed) {
    const product = byId.get(String(item.id));
    if (!product) continue;
    results.push({
      product,
      score: 1,
      reason: String(item.reason || 'Советую попробовать').slice(0, 120),
    });
    if (results.length >= limit) break;
  }

  if (!results.length) {
    throw new Error('Ollama: пустой результат');
  }
  return applyBoosts(results, learningBoosts);
}

/** Быстрый подбор: keywords мгновенно, Ollama только для абстрактных запросов ≤4.5 с. */
export async function suggestDishes(products, query, limit = 6, learningBoosts = null) {
  const boosts = learningBoosts || new Map();
  const keywordResults = suggestDishesKeyword(products, query, limit, boosts);
  const topScore = keywordResults[0]?.score || 0;

  if (!isVagueQuery(query) && topScore >= OLLAMA_SKIP_SCORE) {
    return keywordResults;
  }

  const useOllama = process.env.OLLAMA_ENABLED !== 'false';
  if (!useOllama) {
    return keywordResults;
  }

  try {
    return await withTimeout(
      suggestWithOllama(products, query, limit, boosts),
      OLLAMA_TIMEOUT,
    );
  } catch (e) {
    console.warn('[ai-suggest] fast fallback:', e.message);
    return keywordResults.length ? keywordResults : suggestDishesKeyword(products, query, limit, boosts);
  }
}

export async function checkOllamaHealth() {
  try {
    const res = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 5000 });
    const models = res.data?.models || [];
    const modelBase = OLLAMA_MODEL.split(':')[0];
    const hasModel = models.some((m) => m.name?.startsWith(modelBase));
    return { ok: true, models: models.map((m) => m.name), hasModel, model: OLLAMA_MODEL };
  } catch (e) {
    return { ok: false, error: e.message, model: OLLAMA_MODEL };
  }
}
