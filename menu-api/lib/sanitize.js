/**
 * Санитизация строк, пришедших от гостя: NUL (\u0000) PostgreSQL не принимает (ошибка 22021 → HTTP 500),
 * управляющие символы и «перевороты» направления текста портят терминал официанта.
 * Обрезка — по кодовым точкам, а не по UTF-16: иначе эмодзи режется пополам.
 */
import { httpError } from './http.js';

// C0 (кроме \t \n \r — их обрабатываем отдельно), DEL, C1, управление направлением текста, BOM, разделители строк
const CONTROL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\u202A-\u202E\u2066-\u2069\uFEFF\u2028\u2029]/g;

/** Первые n кодовых точек строки */
export function truncate(s, n) {
  const str = String(s);
  if (str.length <= n) return str; // в UTF-16 не длиннее n — значит, и в кодовых точках
  return Array.from(str).slice(0, n).join('');
}

/** Удалить NUL и управляющие символы; multiline — оставить переводы строк (\r\n → \n), иначе всё в одну строку */
export function stripControl(s, { multiline = false } = {}) {
  const out = String(s).replace(/\r\n?/g, '\n').replace(CONTROL, '');
  return multiline ? out.replace(/\t/g, ' ') : out.replace(/[\t\n]+/g, ' ');
}

/**
 * Строка гостя: не строка → 400 (undefined/null → пустая), без управляющих символов, trim, обрезка по кодовым точкам.
 * label — как назвать поле в тексте ошибки.
 */
export function cleanText(value, max, { multiline = false, label = 'Поле' } = {}) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw httpError(400, `${label}: ожидается текст`);
  return truncate(stripControl(value, { multiline }), max).trim();
}

/** Как cleanText, но без ошибки: для данных из внешних систем (профиль приложения Fuji) */
export function cleanTextLoose(value, max, opts = {}) {
  return typeof value === 'string' ? cleanText(value, max, opts) : '';
}

/** Список строк (аллергены и т. п.): не массив/не строки → 400, пустые и повторы убираем */
export function cleanList(value, maxItems, maxLen, { label = 'Список' } = {}) {
  if (!Array.isArray(value)) throw httpError(400, `${label}: ожидается список`);
  const out = [];
  for (const v of value.slice(0, maxItems)) {
    const s = cleanText(v, maxLen, { label });
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}

/** Рекурсивно убрать NUL из всех строк тела запроса и параметров (общая страховка от 22021) */
export function stripNulDeep(v, depth = 0) {
  if (typeof v === 'string') return v.includes('\u0000') ? v.replace(/\u0000/g, '') : v;
  if (depth > 12 || v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map((x) => stripNulDeep(x, depth + 1));
  const out = {};
  for (const [k, x] of Object.entries(v)) out[k.replace(/\u0000/g, '')] = stripNulDeep(x, depth + 1);
  return out;
}

/** Express: убирает NUL из req.body / req.query (JSON допускает \u0000 в строках) */
export function stripNulMiddleware(req, res, next) {
  if (req.body && typeof req.body === 'object') req.body = stripNulDeep(req.body);
  if (req.query && typeof req.query === 'object') {
    for (const [k, v] of Object.entries(req.query)) req.query[k] = stripNulDeep(v);
  }
  next();
}
