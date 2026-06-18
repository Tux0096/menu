/**
 * Keyword fallback when Ollama недоступна.
 * Понимает абстрактные запросы («вкусное», «что-нибудь») через популярность и группы.
 */
const KEYWORD_GROUPS = [
  { tags: ['остр', 'спайси', 'чili', 'острое'], boost: ['остр', 'spicy', 'чili'] },
  { tags: ['лосос', 'семг', 'рыб', 'мореп'], boost: ['лосос', 'семг', 'рыб', 'лосось'] },
  { tags: ['куриц', 'чикен'], boost: ['кури', 'chicken'] },
  { tags: ['вег', 'овощ', 'без рыб'], boost: ['овощ', 'вег', 'салат'] },
  { tags: ['слад', 'десерт', 'шокол'], boost: ['слад', 'десерт', 'шокол'] },
  { tags: ['ролл', 'суши', 'мaki'], boost: ['ролл', 'суши', 'мaki'] },
  { tags: ['пицц'], boost: ['пицц'] },
  { tags: ['суп', 'мисо', 'том ям'], boost: ['суп', 'мисо'] },
  { tags: ['напит', 'чай', 'сок', 'лимон'], boost: ['напит', 'чай', 'сок'] },
  { tags: ['легк', 'лёгк', 'диет', 'легкое'], boost: ['салат', 'овощ', 'сашими'] },
  { tags: ['сыт', 'больш', 'max', 'макс', 'компан'], boost: ['max', 'больш', 'комбо', 'сет'] },
  { tags: ['жар', 'тёпл', 'тепл', 'запеч'], boost: ['жар', 'тепл', 'запеч', 'темпур'] },
  { tags: ['вкус', 'вкусн', 'хочу', 'поесть', 'голод', 'перекус', 'что-ниб', 'что ниб', 'посовет', 'подбери', 'не знаю'], boost: [] },
];

const VAGUE_HINTS = ['вкус', 'хочу', 'что-ниб', 'что ниб', 'посовет', 'подбери', 'голод', 'перекус', 'не знаю', 'сюрприз'];

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function isVagueQuery(queryLower, queryTokens) {
  return VAGUE_HINTS.some((h) => queryLower.includes(h))
    || queryTokens.length <= 2;
}

function scoreProduct(product, queryTokens, queryLower, learningBoosts) {
  const name = String(product.name || '').toLowerCase();
  const desc = String(product.description || '').toLowerCase();
  const haystack = `${name} ${desc}`;
  let score = learningBoosts?.get(String(product.id)) || 0;

  for (const token of queryTokens) {
    if (token.length < 2) continue;
    if (name.includes(token)) score += 4;
    else if (desc.includes(token)) score += 2;
    else if (haystack.includes(token)) score += 1;
  }

  for (const group of KEYWORD_GROUPS) {
    if (!group.tags.some((t) => queryLower.includes(t))) continue;
    if (group.boost.length === 0) {
      score += (product.likesCount || 0) * 0.05;
      score += product.oldPrice ? 1 : 0;
    } else {
      for (const boost of group.boost) {
        if (haystack.includes(boost)) score += 3;
      }
    }
  }

  if (isVagueQuery(queryLower, queryTokens)) {
    score += (product.likesCount || 0) * 0.08;
    if (product.price >= 300 && product.price <= 900) score += 2;
  }

  return score;
}

function buildReason(product, queryLower) {
  const name = product.name || '';
  if (/вкус|хочу|что-ниб|посовет|голод|настроен/i.test(queryLower)) {
    return `Советую попробовать — ${name}`;
  }
  if (/остр|spicy/i.test(queryLower)) return `Острое: ${name}`;
  if (/лосос|рыб|семг/i.test(queryLower)) return `С рыбой: ${name}`;
  if (/слад|десерт/i.test(queryLower)) return `Сладкое: ${name}`;
  if (/легк|лёгк|салат/i.test(queryLower)) return `Лёгкое: ${name}`;
  if (/сыт|компан|больш/i.test(queryLower)) return `Сытное: ${name}`;
  return `Подходит: ${name}`;
}

export function suggestDishesKeyword(products, query, limit = 8, learningBoosts = new Map()) {
  const queryLower = String(query || '').toLowerCase().trim();
  if (!queryLower) return [];

  const queryTokens = tokenize(queryLower);
  const scored = products
    .map((p) => ({
      product: p,
      score: scoreProduct(p, queryTokens, queryLower, learningBoosts),
    }))
    .sort((a, b) => b.score - a.score);

  const withScore = scored.filter((x) => x.score > 0);
  const picked = withScore.length >= limit
    ? withScore.slice(0, limit)
    : scored.slice(0, limit).map((x) => ({ ...x, score: x.score || 0.1 }));

  return picked.map((x) => ({
    product: x.product,
    score: x.score,
    reason: buildReason(x.product, queryLower),
  }));
}
