/**
 * Курсорная пагинация списков (отзывы, журнал, уведомления): ?limit=N&before=<курсор>.
 * Курсор — позиция последней отданной строки (время и id), поэтому новые записи не сдвигают страницы.
 * Совместимость: запрос без limit и before — старый клиент — получает прежний ответ (массив первого листа);
 * с любым из параметров — { items, hasMore, nextCursor, total }.
 */
import { httpError } from './http.js';
import { uuidOrNull } from './uuid.js';

const TS_RE = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}(:?\d{2})?)?$/;

/** Читает limit/before из query. def/max — размер листа по умолчанию и потолок. */
export function parsePage(query, { def = 100, max = 200 } = {}) {
  const paged = query?.limit !== undefined || query?.before !== undefined;
  const n = Math.floor(Number(query?.limit));
  const limit = Math.min(max, Math.max(1, Number.isFinite(n) && n > 0 ? n : def));
  let cursor = null;
  if (query?.before) {
    try {
      const [at, id] = JSON.parse(Buffer.from(String(query.before), 'base64url').toString('utf8'));
      // at — время из БД в текстовом виде (микросекунды сохраняются); id — uuid или число
      if (typeof at !== 'string' || !TS_RE.test(at)) throw new Error('bad at');
      const okId = typeof id === 'number' ? Number.isInteger(id) : Boolean(uuidOrNull(id));
      if (!okId) throw new Error('bad id');
      cursor = { at, id };
    } catch {
      throw httpError(400, 'Неверный курсор — обновите список');
    }
  }
  return { paged, limit, cursor };
}

/** Курсор для строки; cursorAt — created_at::text из SQL (полная точность). */
export const makeCursor = (row) => Buffer.from(JSON.stringify([row.cursor_at, row.id])).toString('base64url');

/**
 * rows — до limit + 1 строк (лишняя нужна, чтобы узнать, есть ли продолжение).
 * Не пагинированный запрос (paged = false) — просто массив, как раньше.
 */
export function finishPage(rows, { paged, limit }, total = null) {
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map(({ cursor_at: _c, ...r }) => r);
  if (!paged) return items;
  return { items, hasMore, nextCursor: hasMore ? makeCursor(rows[limit - 1]) : null, total };
}
