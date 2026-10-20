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

// Колонки по смыслу: табельный, ФИО, должность, точка, уволен/работает
const PICK = {
  code: [/^tab(el)?(_?n(um(ber)?|o))?$/i, /tabel|табел|personnel|employee_?code|iiko_?code|^code$/i],
  name: [/^(full_?name|fio|фио|name)$/i, /fio|full_?name|фио|surname|last_?name|name/i],
  position: [/^(position|dolj(nost)?|должность|post|role_?name|job_?title)$/i, /position|dolj|должн|post|job/i],
  restaurant: [/^(restaurant|point|branch|филиал|точка|department)$/i, /restaurant|point|branch|filial|точк|филиал|department|store|shop/i],
  active: [/^(is_?active|active|working|is_?working)$/i, /active|working|работ/i],
  fired: [/^(is_?fired|fired|dismissed|is_?dismissed|deleted|is_?deleted)$/i, /fired|dismiss|уволен|deleted|blocked/i],
};
const pickCol = (cols, res) => {
  for (const re of res) {
    const c = cols.find((x) => re.test(x.name));
    if (c) return c;
  }
  return null;
};
const quote = (s) => `"${String(s).replace(/"/g, '""')}"`;

/**
 * Подсказка запроса сотрудников по структуре базы: таблица, где нашлись и табельный, и ФИО (больше совпадений — выше).
 * null — подходящей таблицы нет (запрос пишется вручную).
 */
export function suggestStaffQuery(tables) {
  let best = null;
  for (const t of tables) {
    const code = pickCol(t.columns, PICK.code);
    const name = pickCol(t.columns, PICK.name);
    if (!code || !name || code === name) continue;
    const position = pickCol(t.columns, PICK.position);
    const restaurant = pickCol(t.columns, PICK.restaurant);
    const active = pickCol(t.columns, PICK.active);
    const fired = active ? null : pickCol(t.columns, PICK.fired);
    const score = 2 + [position, restaurant, active || fired].filter(Boolean).length + (/employee|staff|сотрудник|worker|personal/i.test(t.name) ? 2 : 0);
    if (!best || score > best.score) best = { t, code, name, position, restaurant, active, fired, score };
  }
  if (!best) return null;
  const { t } = best;
  const parts = [`${quote(best.code.name)} AS code`, `${quote(best.name.name)} AS name`];
  if (best.position) parts.push(`${quote(best.position.name)} AS position`);
  if (best.restaurant) parts.push(`${quote(best.restaurant.name)} AS restaurant`);
  if (best.active) parts.push(`${quote(best.active.name)} AS active`);
  else if (best.fired) parts.push(best.fired.type === 'boolean' ? `NOT COALESCE(${quote(best.fired.name)}, false) AS active` : `${quote(best.fired.name)} IS NULL AS active`);
  return {
    table: `${t.schema}.${t.name}`,
    query: `SELECT ${parts.join(', ')} FROM ${quote(t.schema)}.${quote(t.name)}`,
    note: [!best.position && 'должность не нашлась', !best.restaurant && 'точка не нашлась', !best.active && !best.fired && 'признак «уволен» не нашёлся']
      .filter(Boolean).join('; '),
  };
}
