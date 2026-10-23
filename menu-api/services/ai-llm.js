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
import pool from '../db/pool.js';
import { sendAlert } from '../lib/alerts.js';

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
// Дневной бюджет платных вызовов модели хранится в БД (ai_llm_usage: день × «total» / «guest:…»): переживает перезапуск
// сервера и деплой. Сверх лимита сети (AI_LLM_DAILY_LIMIT) или лимита гостя (AI_LLM_GUEST_DAILY_LIMIT, по умолчанию 40) —
// мгновенный подбор без LLM (гость ответ всё равно получит). На 80% и 100% лимита сети — запись в журнал и оповещение в Telegram.
const DAILY_LIMIT = parseInt(process.env.AI_LLM_DAILY_LIMIT || '3000', 10);
const GUEST_LIMIT = parseInt(process.env.AI_LLM_GUEST_DAILY_LIMIT || '40', 10);
const memory = { day: '', total: 0, guests: new Map() }; // запасной счёт, если БД недоступна

const bump = async (day, scope) => (await pool.query(
  `INSERT INTO ai_llm_usage (day, scope, count) VALUES ($1, $2, 1)
   ON CONFLICT (day, scope) DO UPDATE SET count = ai_llm_usage.count + 1 RETURNING count`,
  [day, scope],
)).rows[0].count;

function notifyThreshold(count) {
  const at80 = Math.ceil(DAILY_LIMIT * 0.8);
  if (count === at80 && at80 < DAILY_LIMIT) {
    console.warn(`AI: израсходовано 80% дневного лимита запросов к модели (${count} из ${DAILY_LIMIT})`);
    sendAlert('ai-limit-80', `AI: израсходовано 80% дневного лимита запросов к LLM (${count} из ${DAILY_LIMIT}).`, { gapMs: 0 });
  } else if (count === DAILY_LIMIT) {
    console.warn(`AI: дневной лимит ${DAILY_LIMIT} запросов к модели исчерпан — до полуночи UTC подбор без LLM`);
    sendAlert('ai-limit-100', `AI: дневной лимит запросов к LLM (${DAILY_LIMIT}) исчерпан — до полуночи UTC подбор без модели.`, { gapMs: 0 });
  }
}

/** Взять один вызов модели из бюджета. key — гость/адрес (лимит на гостя); false — лимит исчерпан. */
export async function takeBudget(key = null) {
  const day = new Date().toISOString().slice(0, 10);
  try {
    if (key) {
      const mine = await bump(day, `guest:${String(key).slice(0, 80)}`);
      if (mine > GUEST_LIMIT) {
        if (mine === GUEST_LIMIT + 1) console.warn(`AI: гость ${String(key).slice(0, 12)}… исчерпал дневной лимит ${GUEST_LIMIT} запросов к модели`);
        return false;
      }
    }
    const total = await bump(day, 'total');
    if (total === 1) pool.query("DELETE FROM ai_llm_usage WHERE day < CURRENT_DATE - 7").catch(() => {});
    notifyThreshold(total);
    return total <= DAILY_LIMIT;
  } catch (e) {
    console.warn('AI: счётчик в БД недоступен, считаю в памяти:', e.message);
    if (memory.day !== day) { memory.day = day; memory.total = 0; memory.guests.clear(); }
    if (key) {
      const mine = (memory.guests.get(key) || 0) + 1;
      memory.guests.set(key, mine);
      if (mine > GUEST_LIMIT) return false;
    }
    memory.total += 1;
    notifyThreshold(memory.total);
    return memory.total <= DAILY_LIMIT;
  }
}

export async function llmSuggest(query, products, { limit = 5, guest = null, limitKey = null } = {}) {
  if (!isLlmEnabled() || !products.length) return null;
  if (!(await takeBudget(limitKey))) return null;
  const { list, text } = buildMenu(products);

  // Имя, аллергены и история заказов уходят в OpenRouter (за рубеж) только с отдельного согласия гостя (guests.ai_consent);
  // без него — анонимно: запрос и блюда в корзине (аллергены при этом учитываются у нас до и после ответа модели)
  const personal = guest?.aiConsent === true ? guest : null;
  const guestCtx = [
    personal?.name ? `Гостя зовут ${personal.name}.` : '',
    personal?.allergens?.length ? `Гость НЕ ест / аллергия: ${personal.allergens.join(', ')}.` : '',
    personal?.favorites?.length ? `Раньше гость заказывал: ${personal.favorites.join(', ')}.` : '',
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
