/**
 * «Фуджи Тим»: чистые функции входа по табельному (проверяются тестами, без обращений к базам).
 */

/** Табельный номер: без пробелов; числовой — без ведущих нулей («00123» = «123»). */
export function normalizeCode(v) {
  const s = String(v ?? '').trim().replace(/\s+/g, '');
  return /^\d+$/.test(s) ? s.replace(/^0+(?=\d)/, '') : s;
}

const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/^фуджи\s+/, '').replace(/[^a-zа-я0-9]+/g, ' ').trim();

/**
 * Точка сотрудника из «Фуджи Тим» → наш ресторан: по slug, по названию («Фуджи Ново-Садовая» = «Ново-Садовая»)
 * или по вхождению («Ново-Садовая 106» → «Ново-Садовая»). Не нашлась или подходит несколько — null (выбор при входе).
 */
export function matchRestaurant(restaurants, value) {
  const v = norm(value);
  if (!v) return null;
  const exact = restaurants.filter((r) => r.slug === String(value).trim() || norm(r.name) === v || norm(r.slug) === v);
  if (exact.length === 1) return exact[0];
  const part = restaurants.filter((r) => {
    const n = norm(r.name);
    return n && (v.includes(n) || n.includes(v));
  });
  return part.length === 1 ? part[0] : null;
}
