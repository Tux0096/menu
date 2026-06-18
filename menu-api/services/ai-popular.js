/**
 * Популярные и разнообразные блюда для экрана приветствия (без LLM).
 */
const POPULAR_NAME_HINTS = [
  'филадельф', 'том ям', 'калифорн', 'темпур', 'мисо',
  'сашими', 'угор', 'лосос', 'сырн', 'запеч', 'ролл', 'сет', 'комбо',
];

const WELCOME_CATEGORY_HINTS = [
  { tag: 'суп', match: ['суп', 'том ям', 'мисо'] },
  { tag: 'ролл', match: ['ролл'] },
  { tag: 'суши', match: ['суши', 'сашими', 'нигири'] },
  { tag: 'горяч', match: ['темпур', 'запеч', 'тёпл', 'тепл'] },
  { tag: 'напит', match: ['чай', 'лимон', 'сок', 'напит'] },
];

function norm(text) {
  return String(text || '').toLowerCase();
}

function productHaystack(product) {
  const filters = (product.filters || []).map((f) => f.name || f).join(' ');
  return `${product.name || ''} ${product.description || ''} ${filters} ${product.parentGroupName || ''}`.toLowerCase();
}

function scorePopular(product) {
  const hay = productHaystack(product);
  let score = 0;
  if (product.image) score += 3;
  if (product.description) score += 1;
  for (const hint of POPULAR_NAME_HINTS) {
    if (hay.includes(hint)) score += 4;
  }
  const price = Number(product.price) || 0;
  if (price >= 250 && price <= 1200) score += 2;
  if (price > 0 && price < 150) score -= 2;
  return score;
}

export function suggestPopularDishes(products, limit = 4) {
  const pool = products
    .filter((p) => Number(p.price) > 0 && p.isPublished !== false)
    .map((p) => ({ product: p, score: scorePopular(p) }))
    .sort((a, b) => b.score - a.score);

  const picked = [];
  const usedIds = new Set();

  for (const cat of WELCOME_CATEGORY_HINTS) {
    if (picked.length >= limit) break;
    const found = pool.find(({ product }) => {
      if (usedIds.has(product.id)) return false;
      const hay = productHaystack(product);
      return cat.match.some((m) => hay.includes(m));
    });
    if (found) {
      picked.push(found);
      usedIds.add(found.product.id);
    }
  }

  for (const item of pool) {
    if (picked.length >= limit) break;
    if (usedIds.has(item.product.id)) continue;
    picked.push(item);
    usedIds.add(item.product.id);
  }

  return picked.slice(0, limit).map(({ product, score }) => ({
    product,
    score,
    reason: 'Гости часто выбирают это блюдо',
  }));
}

export function mergeWithPopular(keywordResults, products, limit = 6) {
  const merged = [...keywordResults];
  const ids = new Set(merged.map((r) => String(r.product.id)));
  for (const pop of suggestPopularDishes(products, limit)) {
    if (merged.length >= limit) break;
    if (ids.has(String(pop.product.id))) continue;
    merged.push(pop);
    ids.add(String(pop.product.id));
  }
  return merged.slice(0, limit);
}
