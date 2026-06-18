import axios from 'axios';
import { suggestDishesKeyword } from './ai-suggest-keywords.js';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2:0.5b';
const OLLAMA_TIMEOUT = parseInt(process.env.OLLAMA_TIMEOUT_MS || '45000', 10);

function extractJsonArray(text) {
  const match = String(text).match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function buildMenuContext(products, maxItems = 80) {
  return products.slice(0, maxItems).map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    description: (p.description || '').slice(0, 80),
  }));
}

async function suggestWithOllama(products, query, limit) {
  const menu = buildMenuContext(products);
  const prompt = `Ты помощник в ресторане японской кухни. Пользователь написал: "${query}"

Меню (JSON):
${JSON.stringify(menu)}

Выбери до ${limit} блюд из меню, которые лучше всего подходят запросу.
Ответь ТОЛЬКО JSON-массивом без markdown:
[{"id":"<uuid из меню>","reason":"короткое объяснение на русском"}]`;

  const res = await axios.post(
    `${OLLAMA_URL}/api/generate`,
    {
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: 512,
      },
    },
    { timeout: OLLAMA_TIMEOUT },
  );

  const raw = res.data?.response || '';
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
      reason: String(item.reason || 'Рекомендуем').slice(0, 200),
    });
    if (results.length >= limit) break;
  }

  if (!results.length) {
    throw new Error('Ollama: пустой результат');
  }
  return results;
}

/** Основной entry: Ollama → fallback на keywords. */
export async function suggestDishes(products, query, limit = 6) {
  const useOllama = process.env.OLLAMA_ENABLED !== 'false';
  if (useOllama) {
    try {
      return await suggestWithOllama(products, query, limit);
    } catch (e) {
      console.warn('[ai-suggest] Ollama fallback:', e.message);
    }
  }
  return suggestDishesKeyword(products, query, limit);
}

export async function checkOllamaHealth() {
  try {
    const res = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 5000 });
    const models = res.data?.models || [];
    const hasModel = models.some((m) => m.name?.startsWith(OLLAMA_MODEL.split(':')[0]));
    return { ok: true, models: models.map((m) => m.name), hasModel };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
