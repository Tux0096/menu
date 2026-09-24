/**
 * AI-официант через OpenRouter (OpenAI-совместимый API).
 *
 * Модели отдаётся ВСЁ доступное меню ресторана с составом/ингредиентами, КБЖУ, весом,
 * категорией и аллергенами + запрос гостя (и его контекст). Модель сама решает,
 * что порекомендовать, и объясняет выбор. Рекомендовать можно только позиции из меню.
 *
 * Меню стоит в system-сообщении в стабильном порядке → префикс запроса одинаковый,
 * OpenRouter/провайдер кэширует его (быстрее и дешевле). Контекст гостя — в user-сообщении.
 * При таймауте/ошибке вызывающий код использует мгновенный keyword-подбор (fallback по ТЗ).
 */
import axios from 'axios';

const OPENROUTER_URL = process.env.OPENROUTER_URL || 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const TIMEOUT_MS = parseInt(process.env.AI_LLM_TIMEOUT_MS || '4500', 10);
const MAX_MENU_ITEMS = parseInt(process.env.AI_MENU_MAX_ITEMS || '400', 10);

export function isLlmEnabled() {
  return Boolean(process.env.OPENROUTER_API_KEY) && process.env.AI_LLM_ENABLED !== 'false';
}

const clean = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/** Состав блюда из всех полей, которые отдают prod API / iiko. */
export function ingredientsOf(p) {
  const parts = [];
  const comp = Array.isArray(p.composition) ? p.composition : [];
  const compText = comp.map((c) => (typeof c === 'string' ? c : c?.name || c?.title || '')).filter(Boolean).join(', ');
  if (compText) parts.push(compText);
  const desc = clean(p.description);
  if (desc && !parts.some((x) => x.includes(desc))) parts.push(desc);
  const extra = clean(p.additionalInfo?.composition || p.additionalInfo?.ingredients || p.seoText);
  if (extra && !parts.some((x) => x.includes(extra))) parts.push(extra);
  return parts.join('. ').slice(0, 400);
}

function allergensOf(p) {
  return [
    ...(p.allergensText || []),
    ...(p.allergens || []).map((a) => (typeof a === 'string' ? a : a?.name)).filter(Boolean),
  ];
}

function menuLine(p, idx) {
  const kbju = [p.energyAmount && `${Math.round(p.energyAmount)} ккал`,
    p.fiberAmount != null && `Б${Math.round(p.fiberAmount)}`,
    p.fatAmount != null && `Ж${Math.round(p.fatAmount)}`,
    p.carbohydrateAmount != null && `У${Math.round(p.carbohydrateAmount)}`].filter(Boolean).join(' ');
  const tags = (p.filters || []).map((f) => (typeof f === 'string' ? f : f?.name)).filter(Boolean);
  const allergens = allergensOf(p);
  return [
    `#${idx}`,
    p.name,
    p.parentGroupName ? `[${p.parentGroupName}]` : '',
    `${Math.round(p.price)}₽`,
    p.weight || '',
    kbju,
    p.isRecommended ? 'ХИТ/рекомендация ресторана' : '',
    tags.length ? `метки: ${tags.join(', ')}` : '',
    allergens.length ? `аллергены: ${allergens.join(', ')}` : '',
    ingredientsOf(p) ? `состав: ${ingredientsOf(p)}` : '',
  ].filter(Boolean).join(' | ');
}

const menuCache = new Map(); // key -> { text, list }
function buildMenu(products) {
  // Стабильный порядок (как в каталоге) → стабильный префикс промпта для кэширования
  const list = [...products].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.id).localeCompare(String(b.id)))
    .slice(0, MAX_MENU_ITEMS);
  const key = list.map((p) => `${p.id}:${p.price}`).join(',');
  const hit = menuCache.get(key);
  if (hit) return hit;
  const entry = { list, text: list.map((p, i) => menuLine(p, i + 1)).join('\n') };
  menuCache.clear();
  menuCache.set(key, entry);
  return entry;
}

const SYSTEM_RULES = `Ты — AI-официант японского ресторана «Фуджи» в электронном меню за столом.
Твоя задача — по запросу гостя подобрать блюда ТОЛЬКО из меню ниже, опираясь на состав, ингредиенты, категорию, КБЖУ, вес и цену.
Правила:
- Рекомендуй только позиции из меню, ссылаясь на их номер #N. Ничего не выдумывай.
- Учитывай смысл запроса: вкус (острое, сладкое), ингредиенты (лосось, креветка, сыр), «лёгкое» (меньше ккал), «сытное», количество людей, бюджет, детей, напитки к блюдам.
- Строго исключай блюда с аллергенами/ингредиентами, которые гость не ест.
- Соусы, допы и приборы не предлагай как самостоятельное блюдо (можно как дополнение).
- Если запрос на компанию — подбери сет/несколько позиций на всех.
- Если подходящего нет — предложи ближайшие альтернативы и честно скажи об этом в answer.
- Пиши по-русски, на «вы», дружелюбно и кратко.
Ответ — строго JSON:
{"answer":"<1–2 предложения гостю, до 160 символов>","items":[{"n":<номер>,"qty":<сколько порций, обычно 1>,"why":"<почему это блюдо, упомяни ключевые ингредиенты, до 90 символов>"}]}
Верни от 2 до LIMIT позиций, самые подходящие первыми.

МЕНЮ (номер | название | [категория] | цена | вес | КБЖУ | метки | аллергены | состав):
`;

/**
 * @param {string} query — запрос гостя (текст или чип)
 * @param {object[]} products — доступные блюда (без стоп-листа)
 * @returns {Promise<{answer: string, picks: {product, reason, score, qty}[]} | null>}
 */
export async function llmSuggest(query, products, { limit = 5, guest = null } = {}) {
  if (!isLlmEnabled() || !products.length) return null;
  const { list, text } = buildMenu(products);

  const guestCtx = [
    guest?.name ? `Гостя зовут ${guest.name}.` : '',
    guest?.allergens?.length ? `Гость НЕ ест / аллергия: ${guest.allergens.join(', ')}.` : '',
    guest?.favorites?.length ? `Раньше гость заказывал: ${guest.favorites.join(', ')}.` : '',
    guest?.cart?.length ? `Уже в заказе: ${guest.cart.join(', ')} — не повторяй их, можно дополнить.` : '',
  ].filter(Boolean).join(' ');

  try {
    const { data } = await axios.post(OPENROUTER_URL, {
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_RULES.replace('LIMIT', String(limit)) + text },
        { role: 'user', content: `${guestCtx ? `${guestCtx}\n` : ''}Запрос гостя: «${String(query).slice(0, 300)}»` },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    }, {
      timeout: TIMEOUT_MS,
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.PUBLIC_MENU_URL || 'https://menu.franchise-fuji.ru',
        'X-Title': 'Fuji QR Menu',
      },
    });
    const raw = data?.choices?.[0]?.message?.content || '';
    const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    const seen = new Set();
    const picks = [];
    for (const it of json.items || []) {
      const p = list[Number(String(it.n).replace('#', '')) - 1];
      if (!p || seen.has(p.id)) continue;
      seen.add(p.id);
      picks.push({
        product: p,
        reason: clean(it.why).slice(0, 140) || 'Рекомендую',
        qty: Math.min(10, Math.max(1, Math.round(Number(it.qty) || 1))),
        score: 100 - picks.length,
      });
      if (picks.length >= limit) break;
    }
    if (!picks.length) return null;
    return { answer: clean(json.answer).slice(0, 220), picks };
  } catch (e) {
    console.warn(`openrouter: ${e.code || ''} ${e.response?.status || ''} ${e.response?.data?.error?.message || e.message}`);
    return null;
  }
}
