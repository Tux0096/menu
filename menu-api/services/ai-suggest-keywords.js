/**
 * Keyword fallback when Ollama недоступна.
 */
const KEYWORD_GROUPS = [
  { tags: ['остр', 'спайси', 'чili', 'острое'], boost: ['остр', 'spicy', 'чili'] },
  { tags: ['лосос', 'семг', 'рыб', 'мореп'], boost: ['лосос', 'семг', 'рыб', 'лосось'] },
  { tags: ['куриц', 'чикен'], boost: ['кури', 'chicken'] },
  { tags: ['вег', 'овощ', 'без рыб'], boost: ['овощ', 'вег'] },
  { tags: ['слад', 'десерт', 'шокол'], boost: ['слад', 'десерт', 'шокол'] },
  { tags: ['ролл', 'суши', 'мaki'], boost: ['ролл', 'суши', 'мaki'] },
  { tags: ['пицц'], boost: ['пицц'] },
  { tags: ['суп', 'мисо', 'том ям'], boost: ['суп', 'мисо'] },
  { tags: ['напит', 'чай', 'сок', 'лимон'], boost: ['напит', 'чай', 'сок'] },
  { tags: ['легк', 'лёгк', 'диет'], boost: ['салат', 'овощ'] },
  { tags: ['сыт', 'больш', 'max', 'макс'], boost: ['max', 'больш', 'комбо'] },
  { tags: ['жар', 'тёпл', 'тепл', 'запеч'], boost: ['жар', 'тепл', 'запеч', 'темпур'] },
];

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function scoreProduct(product, queryTokens, queryLower) {
  const name = String(product.name || '').toLowerCase();
  const desc = String(product.description || '').toLowerCase();
  const haystack = `${name} ${desc}`;
  let score = 0;

  for (const token of queryTokens) {
    if (token.length < 2) continue;
    if (name.includes(token)) score += 4;
    else if (desc.includes(token)) score += 2;
    else if (haystack.includes(token)) score += 1;
  }

  for (const group of KEYWORD_GROUPS) {
    if (!group.tags.some((t) => queryLower.includes(t))) continue;
    for (const boost of group.boost) {
      if (haystack.includes(boost)) score += 3;
    }
  }

  return score;
}

function buildReason(product, queryLower) {
  const name = product.name || '';
  if (/остр|spicy/i.test(queryLower)) return `Острое: ${name}`;
  if (/лосос|рыб|семг/i.test(queryLower)) return `С рыбой: ${name}`;
  if (/слад|десерт/i.test(queryLower)) return `Сладкое: ${name}`;
  if (/легк|лёгк|салат/i.test(queryLower)) return `Лёгкое: ${name}`;
  return `Подходит: ${name}`;
}

export function suggestDishesKeyword(products, query, limit = 6) {
  const queryLower = String(query || '').toLowerCase().trim();
  if (!queryLower) return [];

  const queryTokens = tokenize(queryLower);
  const scored = products
    .map((p) => ({ product: p, score: scoreProduct(p, queryTokens, queryLower) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const picked = scored.length
    ? scored
    : products.slice(0, limit).map((p) => ({ product: p, score: 0.1 }));

  return picked.map((x) => ({
    product: x.product,
    score: x.score,
    reason: buildReason(x.product, queryLower),
  }));
}
