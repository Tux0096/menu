/**
 * Время показа раздела меню: «до 12:00» (завтраки), «с 18:00» (вечернее меню) или окно «с 10:00 до 12:00»
 * по времени точки (часовой пояс — как у бизнес-ланча, lib/lunch-schedule.js). Чистые функции без БД:
 * их использует и каталог (скрыть у гостя), и проверка при заказе.
 */
import { httpError } from './http.js';
import { DEFAULT_TZ, localParts, toMinutes } from './lunch-schedule.js';

const fmt = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const hhmm = (v) => {
  const m = v == null || String(v).trim() === '' ? null : toMinutes(v);
  return m == null || m >= 1440 ? null : fmt(m);
};

/** Окно из БД/запроса → { from, until } с «ЧЧ:ММ» или null, если ограничений нет. Битое время считается пустым. */
export function normalizeWindow(raw) {
  const from = hhmm(raw?.from ?? raw?.showFrom);
  const until = hhmm(raw?.until ?? raw?.showUntil);
  return from || until ? { from, until } : null;
}

/** Проверка из админки: понятная ошибка 400 вместо молчаливой подмены. */
export function validateWindow(raw, label = 'раздела') {
  const clean = (v) => (v == null ? '' : String(v).trim());
  const f = clean(raw?.from ?? raw?.showFrom);
  const u = clean(raw?.until ?? raw?.showUntil);
  if ((f && !hhmm(f)) || (u && !hhmm(u))) throw httpError(400, `Время показа ${label} — в формате ЧЧ:ММ, например 12:00`);
  if (f && u && hhmm(f) === hhmm(u)) throw httpError(400, `Время показа ${label}: начало и конец совпадают — оставьте одно или выберите разное`);
  return normalizeWindow({ from: f, until: u });
}

/** Открыт ли раздел в момент now. Окно через полночь (с 22:00 до 02:00) работает. Без окна — всегда открыт. */
export function isWindowOpen(win, tz = DEFAULT_TZ, now = new Date()) {
  const w = normalizeWindow(win);
  if (!w) return true;
  const { minutes } = localParts(now, tz || DEFAULT_TZ);
  const from = w.from ? toMinutes(w.from) : null;
  const until = w.until ? toMinutes(w.until) : null;
  if (from != null && until != null) return from < until ? minutes >= from && minutes < until : minutes >= from || minutes < until;
  if (from != null) return minutes >= from;
  return minutes < until;
}

/** «до 12:00», «с 18:00», «с 10:00 до 12:00» */
export function windowText(win) {
  const w = normalizeWindow(win);
  if (!w) return '';
  return w.from && w.until ? `с ${w.from} до ${w.until}` : w.until ? `до ${w.until}` : `с ${w.from}`;
}

/** Описание для каталога: { from, until, tz, text, closedNow } или null. closedNow — на момент сборки каталога. */
export function describeWindow(win, tz = DEFAULT_TZ, now = new Date()) {
  const w = normalizeWindow(win);
  if (!w) return null;
  return { ...w, tz: tz || DEFAULT_TZ, text: windowText(w), closedNow: !isWindowOpen(w, tz, now) };
}

/**
 * Отказ при заказе позиции из закрытого раздела: 409 «Раздел «Завтраки» доступен до 12:00».
 * windows — [{ from, until, tz, title }] всех мест блюда в меню; если хоть одно открыто, блюдо заказать можно.
 */
export function assertCategoryOpen(windows, now = new Date()) {
  if (!windows?.length) return;
  if (windows.some((w) => isWindowOpen(w, w.tz, now))) return;
  const w = windows[0];
  throw httpError(409, `Раздел «${w.title}» доступен ${windowText(w)} — сейчас позицию заказать нельзя`, { code: 'CATEGORY_CLOSED' });
}
