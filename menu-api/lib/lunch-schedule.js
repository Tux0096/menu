/**
 * Время действия бизнес-ланча: дни недели и часы по часовому поясу точки.
 * Чистые функции (без БД) — их использует и каталог (active), и проверка при заказе.
 * Дни недели — ISO: 1 = понедельник … 7 = воскресенье.
 */
import { httpError } from './http.js';

export const DEFAULT_TZ = 'Europe/Samara';
export const DEFAULT_SCHEDULE = { days: [1, 2, 3, 4, 5], from: '12:00', to: '16:00', tz: DEFAULT_TZ };
const DAY_NAMES = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

const toMinutes = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!m) return null;
  const v = Number(m[1]) * 60 + Number(m[2]);
  return Number(m[2]) < 60 && v <= 1440 ? v : null;
};
const fmt = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

function validTz(tz) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}

/** Приводит расписание из БД/запроса к виду { days, from, to, tz }; пустое или битое — расписание по умолчанию. */
export function normalizeSchedule(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const days = [...new Set((Array.isArray(s.days) ? s.days : DEFAULT_SCHEDULE.days).map(Number).filter((d) => d >= 1 && d <= 7))].sort((a, b) => a - b);
  const from = toMinutes(s.from);
  const to = toMinutes(s.to);
  const tz = typeof s.tz === 'string' && s.tz && validTz(s.tz) ? s.tz : DEFAULT_TZ;
  return {
    days: days.length || Array.isArray(s.days) ? days : DEFAULT_SCHEDULE.days,
    from: fmt(from != null && from < 1440 ? from : toMinutes(DEFAULT_SCHEDULE.from)),
    to: fmt(to ?? toMinutes(DEFAULT_SCHEDULE.to)),
    tz,
  };
}

/** Проверка расписания из админки: ошибка 400 с понятным текстом вместо молчаливой подмены. */
export function validateSchedule(raw) {
  if (!raw || typeof raw !== 'object') throw httpError(400, 'Нет расписания бизнес-ланча');
  if (!Array.isArray(raw.days) || !raw.days.length || raw.days.some((d) => !(Number(d) >= 1 && Number(d) <= 7))) {
    throw httpError(400, 'Выберите хотя бы один день недели');
  }
  const f = toMinutes(raw.from);
  if (f == null || f >= 1440 || toMinutes(raw.to) == null) throw httpError(400, 'Время — в формате ЧЧ:ММ, например 12:00');
  if (raw.tz && !validTz(raw.tz)) throw httpError(400, 'Неизвестный часовой пояс');
  return normalizeSchedule(raw);
}

/** Составляющие времени в часовом поясе: день недели (1–7), минуты от полуночи, дата. */
export function localParts(date, tz = DEFAULT_TZ) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'short',
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday')) + 1;
  return {
    weekday: wd, minutes: Number(get('hour')) * 60 + Number(get('minute')),
    year: Number(get('year')), month: Number(get('month')), day: Number(get('day')),
  };
}

/** Действует ли бизнес-ланч в момент now. Окно через полночь (22:00–02:00) относится ко дню начала. */
export function isLunchActive(schedule, now = new Date()) {
  const s = normalizeSchedule(schedule);
  const { weekday, minutes } = localParts(now, s.tz);
  const from = toMinutes(s.from);
  const to = toMinutes(s.to);
  if (from === to) return s.days.includes(weekday); // «с 00:00 до 00:00» — весь день
  if (to > from) return s.days.includes(weekday) && minutes >= from && minutes < to;
  const prev = weekday === 1 ? 7 : weekday - 1;
  return (s.days.includes(weekday) && minutes >= from) || (s.days.includes(prev) && minutes < to);
}

/** Ближайшее начало окна после now (ISO-строка в UTC) или null. */
export function nextLunchStart(schedule, now = new Date()) {
  const s = normalizeSchedule(schedule);
  const p = localParts(now, s.tz);
  const from = toMinutes(s.from);
  for (let off = 0; off <= 7; off++) {
    const wd = ((p.weekday - 1 + off) % 7) + 1;
    if (!s.days.includes(wd) || (off === 0 && p.minutes >= from)) continue;
    const guess = Date.UTC(p.year, p.month - 1, p.day + off, Math.floor(from / 60) % 24, from % 60);
    // Смещение пояса в момент старта: локальное время guess минус сам guess
    let t = guess;
    for (let i = 0; i < 2; i++) {
      const lp = localParts(new Date(t), s.tz);
      const asUtc = Date.UTC(lp.year, lp.month - 1, lp.day, Math.floor(lp.minutes / 60), lp.minutes % 60);
      t -= asUtc - guess;
    }
    return new Date(t).toISOString();
  }
  return null;
}

/** «пн–пт», «пн, ср, пт», «ежедневно». */
export function daysText(days) {
  const d = [...new Set(days)].sort((a, b) => a - b);
  if (d.length === 7) return 'ежедневно';
  const runs = [];
  for (const x of d) {
    const last = runs[runs.length - 1];
    if (last && last[1] === x - 1) last[1] = x; else runs.push([x, x]);
  }
  return runs.map(([a, b]) => (a === b ? DAY_NAMES[a - 1] : b - a === 1 ? `${DAY_NAMES[a - 1]}, ${DAY_NAMES[b - 1]}` : `${DAY_NAMES[a - 1]}–${DAY_NAMES[b - 1]}`)).join(', ');
}

/** «с 12:00 до 16:00, пн–пт» */
export function scheduleText(schedule) {
  const s = normalizeSchedule(schedule);
  // Начало и конец совпадают — весь день («весь день, ежедневно»)
  return `${s.from === s.to ? 'весь день' : `с ${s.from} до ${s.to}`}, ${daysText(s.days)}`;
}

export const lunchClosedMessage = (schedule) => `Бизнес-ланч доступен ${scheduleText(schedule)}`;

/** Отказ вне времени: 400 «Бизнес-ланч доступен с 12:00 до 16:00, пн–пт». */
export function assertLunchOpen(schedule, now = new Date()) {
  if (!isLunchActive(schedule, now)) throw httpError(400, lunchClosedMessage(schedule), { code: 'LUNCH_CLOSED' });
}
