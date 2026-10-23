/**
 * Правила продажи алкоголя на точке: продаётся ли, в какие часы (по часовому поясу точки), текст для гостя
 * и официанта, нужно ли подтверждение 18+ у гостя и проверка документа официантом.
 * Чистые функции (без БД) — их используют каталог (что видит гость), проверка заказа и админка.
 * Какая позиция алкогольная — решает lib/alco.js (isAlcoholName).
 */
import { httpError } from './http.js';
import { DEFAULT_TZ, localParts } from './lunch-schedule.js';

export const DEFAULT_ALCO_RULES = {
  enabled: true, from: '', to: '', tz: DEFAULT_TZ, text: '', requireAgeConfirm: true, requireDocCheck: false,
};
const TEXT_MAX = 500;

const toMinutes = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm ?? '').trim());
  if (!m) return null;
  const v = Number(m[1]) * 60 + Number(m[2]);
  return Number(m[1]) < 24 && Number(m[2]) < 60 ? v : null;
};
const fmt = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const validTz = (tz) => {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
};

/** Правила из БД/запроса → { enabled, from, to, tz, text, requireAgeConfirm, requireDocCheck }; пустое или битое — по умолчанию. */
export function normalizeAlcoRules(raw, fallbackTz = DEFAULT_TZ) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const from = toMinutes(r.from);
  const to = toMinutes(r.to);
  const hours = from != null && to != null; // одно время без другого — часов нет (круглосуточно)
  return {
    enabled: r.enabled !== false,
    from: hours ? fmt(from) : '',
    to: hours ? fmt(to) : '',
    tz: typeof r.tz === 'string' && r.tz && validTz(r.tz) ? r.tz : (fallbackTz && validTz(fallbackTz) ? fallbackTz : DEFAULT_TZ),
    text: String(r.text ?? '').trim().slice(0, TEXT_MAX),
    requireAgeConfirm: r.requireAgeConfirm !== false,
    requireDocCheck: r.requireDocCheck === true,
  };
}

/** Проверка правил из админки: 400 с понятным текстом вместо молчаливой подмены. */
export function validateAlcoRules(raw, fallbackTz = DEFAULT_TZ) {
  if (!raw || typeof raw !== 'object') throw httpError(400, 'Нет правил продажи алкоголя');
  const hasFrom = String(raw.from ?? '').trim() !== '';
  const hasTo = String(raw.to ?? '').trim() !== '';
  if (hasFrom !== hasTo) throw httpError(400, 'Укажите оба времени — «с» и «до» — или оставьте оба пустыми (продаём круглосуточно)');
  if (hasFrom && (toMinutes(raw.from) == null || toMinutes(raw.to) == null)) throw httpError(400, 'Время — в формате ЧЧ:ММ, например 10:00');
  if (raw.tz && !validTz(raw.tz)) throw httpError(400, 'Неизвестный часовой пояс');
  if (String(raw.text ?? '').length > TEXT_MAX) throw httpError(400, `Текст правил — не длиннее ${TEXT_MAX} символов`);
  return normalizeAlcoRules(raw, fallbackTz);
}

/** Попадает ли момент в часы продажи. Окно через полночь (22:00–02:00) — одно окно; «с 10:00 до 10:00» — весь день. */
export function inSaleHours(rules, now = new Date()) {
  const s = normalizeAlcoRules(rules);
  if (!s.from) return true;
  const from = toMinutes(s.from);
  const to = toMinutes(s.to);
  if (from === to) return true;
  const { minutes } = localParts(now, s.tz);
  return to > from ? minutes >= from && minutes < to : minutes >= from || minutes < to;
}

/** Продаётся ли алкоголь сейчас: включён на точке и в часы продажи. */
export function isAlcoSaleOpen(rules, now = new Date()) {
  const s = normalizeAlcoRules(rules);
  return s.enabled && inSaleHours(s, now);
}

/** «Алкоголь продаём с 10:00 до 23:00» / «На этой точке алкоголь не продаётся». */
export function alcoClosedMessage(rules) {
  const s = normalizeAlcoRules(rules);
  if (!s.enabled) return 'На этой точке алкоголь не продаётся';
  return s.from ? `Алкоголь продаём с ${s.from} до ${s.to}` : 'Алкоголь сейчас не продаётся';
}

/** Текст правил для карточки: свой текст точки или собранный из настроек. */
export function alcoRulesText(rules) {
  const s = normalizeAlcoRules(rules);
  if (!s.enabled) return 'На этой точке алкоголь не продаётся';
  if (s.text) return s.text;
  return `Алкоголь — с 18 лет${s.requireDocCheck ? ' при предъявлении документа' : ''}${s.from ? `, с ${s.from} до ${s.to}` : ''}`;
}

/** Ближайшая смена «продаём / не продаём» после now (ISO в UTC, с точностью до минуты) или null, если часов нет. */
export function alcoNextChange(rules, now = new Date()) {
  const s = normalizeAlcoRules(rules);
  if (!s.enabled || !s.from || s.from === s.to) return null;
  const { minutes } = localParts(now, s.tz);
  const target = toMinutes(inSaleHours(s, now) ? s.to : s.from);
  const delta = ((target - minutes + 1440) % 1440) || 1440;
  const minuteStart = Math.floor(now.getTime() / 60000) * 60000;
  return new Date(minuteStart + delta * 60000).toISOString();
}

/** Что отдаём гостю и официанту: правила, текст и «продаётся ли сейчас». */
export function alcoPublic(rules, now = new Date()) {
  const s = normalizeAlcoRules(rules);
  const open = isAlcoSaleOpen(s, now);
  return {
    // Поля правил (text включительно) остаются в публичном виде: по нему же нормализуется индекс меню на сервере
    enabled: s.enabled, from: s.from, to: s.to, tz: s.tz, text: s.text, requireAgeConfirm: s.requireAgeConfirm, requireDocCheck: s.requireDocCheck,
    rulesText: alcoRulesText(s), open, closedMessage: open ? null : alcoClosedMessage(s), nextChangeAt: alcoNextChange(s, now),
  };
}

/** Заказ алкоголя вне правил точки: 409 «Алкоголь продаём с 10:00 до 23:00». */
export function assertAlcoSale(rules, now = new Date()) {
  if (!isAlcoSaleOpen(rules, now)) throw httpError(409, alcoClosedMessage(rules), { code: 'ALCO_CLOSED' });
}

/** Нужно подтверждение 18+, а гость его не дал: 409. */
export function assertAgeConfirmed(rules, confirmed) {
  if (normalizeAlcoRules(rules).requireAgeConfirm && !confirmed) {
    throw httpError(409, 'Подтвердите, что вам есть 18 лет, чтобы заказать алкоголь', { code: 'ALCO_AGE_REQUIRED' });
  }
}

/**
 * Блок «алкоголь» визита для гостя и официанта. items — позиции заказа с флагами { isAlcohol, isLocked, ageConfirmed, quantity }.
 * null, если алкоголя в заказе нет. warning — неотправленный алкоголь, а продажа сейчас закрыта (официант видит до отправки на кухню).
 */
export function alcoholView(rules, items, now = new Date()) {
  const alco = (items || []).filter((i) => i.isAlcohol);
  if (!alco.length) return null;
  const pub = alcoPublic(rules, now);
  const pending = alco.filter((i) => !i.isLocked);
  const unconfirmed = alco.filter((i) => !i.ageConfirmed);
  return {
    ...pub,
    count: alco.reduce((n, i) => n + i.quantity, 0),
    pendingCount: pending.reduce((n, i) => n + i.quantity, 0),
    // Все позиции заказал гость с подтверждением 18+; иначе (добавил официант, старый заказ) — официант проверяет документ сам
    guestConfirmed: unconfirmed.length === 0,
    unconfirmedCount: unconfirmed.reduce((n, i) => n + i.quantity, 0),
    warning: pending.length && !pub.open ? pub.closedMessage : null,
  };
}
