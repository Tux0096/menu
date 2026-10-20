/**
 * Брони столов из iiko — чистые функции без БД и без запросов в iiko (проверяются unit-тестами).
 *
 * Что здесь решается:
 *  — как привести ответ iiko (restaurant_sections_workload, status_by_id) к одной брони (normalizeReserve, collectReserves).
 *    Структуру ответа на реальных данных не проверить, поэтому разбор терпим к отсутствующим и переименованным полям;
 *  — когда создавать стол под бронь, что делать с занятым столом, отменой и «не пришли» (planReserve);
 *  — поиск брони по имени гостя без разницы ё/е и маска телефона (searchReserves, maskPhone).
 * В iiko мы только читаем: ничего из этого файла в iiko не пишет.
 */
import { DEFAULT_TZ, localParts } from './lunch-schedule.js';

/** Часовой пояс точек: время брони в iiko — местное время терминальной группы. */
export const RESERVE_TZ = process.env.RESERVE_TZ || DEFAULT_TZ;
/** Рабочие сутки точки начинаются в это время: «сегодня и завтра до утра» = с 05:00 до 05:00. */
export const BUSINESS_DAY_START_HOUR = 5;
/** Бронь без длительности в ответе iiko считаем двухчасовой. */
export const DEFAULT_DURATION_MIN = 120;

// ── Время ───────────────────────────────────────────────────────────────────

/** Местное время (год, месяц, день, час, минута, секунда) в часовом поясе → миллисекунды UTC. */
export function zonedToMs(y, mo, d, h, mi, s, tz = RESERVE_TZ) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  let t = guess;
  for (let i = 0; i < 2; i++) {
    const lp = localParts(new Date(t), tz);
    const asUtc = Date.UTC(lp.year, lp.month - 1, lp.day, Math.floor(lp.minutes / 60), lp.minutes % 60, s);
    t -= asUtc - guess;
  }
  return t;
}

/**
 * Время из iiko → ISO (UTC). iiko присылает «2026-10-20 19:00:00.000» без пояса — это местное время точки;
 * строка с «Z» или смещением и готовые даты берутся как есть. Не разобрали — null.
 */
export function parseIikoTime(value, tz = RESERVE_TZ) {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value === 'number') return Number.isFinite(value) ? new Date(value).toISOString() : null;
  const text = String(value).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*(Z|[+-]\d{2}:?\d{2})?$/i.exec(text);
  if (!m) {
    const t = Date.parse(text);
    return Number.isNaN(t) ? null : new Date(t).toISOString();
  }
  if (m[7]) {
    const t = Date.parse(text.replace(' ', 'T'));
    return Number.isNaN(t) ? null : new Date(t).toISOString();
  }
  return new Date(zonedToMs(+m[1], +m[2], +m[3], +m[4], +m[5], +(m[6] || 0), tz)).toISOString();
}

/** Дата для запросов iiko: «2026-10-20 19:00:00.000» в местном времени точки. */
export function formatIikoTime(date, tz = RESERVE_TZ) {
  const p = localParts(new Date(date), tz);
  const pad = (n) => String(n).padStart(2, '0');
  const sec = new Date(date).getUTCSeconds();
  return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(Math.floor(p.minutes / 60))}:${pad(p.minutes % 60)}:${pad(sec)}.000`;
}

/** Окно загрузки броней: рабочие сутки точки (с 05:00 до 05:00) — сегодня и завтра до утра. */
export function reserveWindow(now = new Date(), tz = RESERVE_TZ) {
  const p = localParts(now, tz);
  const back = p.minutes < BUSINESS_DAY_START_HOUR * 60 ? 1 : 0;
  const from = zonedToMs(p.year, p.month, p.day - back, BUSINESS_DAY_START_HOUR, 0, 0, tz);
  const to = zonedToMs(p.year, p.month, p.day - back + 1, BUSINESS_DAY_START_HOUR, 0, 0, tz);
  return { from: new Date(from), to: new Date(to) };
}

/** «19:00» — время брони в часовом поясе точки. */
export function clockText(iso, tz = RESERVE_TZ) {
  if (!iso) return '';
  const p = localParts(new Date(iso), tz);
  return `${String(Math.floor(p.minutes / 60)).padStart(2, '0')}:${String(p.minutes % 60).padStart(2, '0')}`;
}

/** «1 гость», «4 гостя», «5 гостей». */
export function guestsText(n) {
  const v = Math.abs(Math.floor(Number(n) || 0));
  const last = v % 10;
  const word = v % 100 >= 11 && v % 100 <= 14 ? 'гостей' : last === 1 ? 'гость' : last >= 2 && last <= 4 ? 'гостя' : 'гостей';
  return `${v} ${word}`;
}

// ── Телефон и имя ───────────────────────────────────────────────────────────

/** Телефон → только цифры, российский формат 7XXXXXXXXXX; нечитаемый — null. */
export function normalizePhone(phone) {
  let d = String(phone ?? '').replace(/\D/g, '');
  if (d.length === 11 && d[0] === '8') d = `7${d.slice(1)}`;
  if (d.length === 10) d = `7${d}`;
  return d.length >= 7 && d.length <= 15 ? d : null;
}

/** «+7 900 156-08-08» — полный номер (показывается по нажатию «показать»). */
export function formatPhone(phone) {
  const d = normalizePhone(phone);
  if (!d) return phone ? String(phone) : '';
  if (d.length === 11 && d[0] === '7') return `+7 ${d.slice(1, 4)} ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9)}`;
  return `+${d}`;
}

/** «+7 *** ***-08-08» — видны последние 4 цифры. */
export function maskPhone(phone) {
  const d = normalizePhone(phone);
  if (!d) return phone ? '***' : '';
  const tail = `${d.slice(-4, -2)}-${d.slice(-2)}`;
  return d.length === 11 && d[0] === '7' ? `+7 *** ***-${tail}` : `+*** ***-${tail}`;
}

/** Имя для сравнения и поиска: без регистра, ё = е, без лишних знаков и пробелов. */
export function normalizeName(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/g, ' ')
    .trim();
}

// ── Разбор ответа iiko ──────────────────────────────────────────────────────

const str = (v) => (v == null ? '' : String(v).trim());
const firstDefined = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== '');

function guestNameOf(raw) {
  const c = raw.customer;
  if (c && typeof c === 'object') {
    const full = [c.name, c.surname].map(str).filter(Boolean).join(' ');
    if (full) return full;
    if (str(c.fullName)) return str(c.fullName);
  } else if (str(c)) {
    return str(c);
  }
  return str(firstDefined(raw.guestName, raw.customerName, raw.name, raw.contactName));
}

function phoneOf(raw) {
  const c = raw.customer && typeof raw.customer === 'object' ? raw.customer : {};
  return normalizePhone(firstDefined(raw.phone, raw.phoneNumber, raw.customerPhone, c.phone, c.phoneNumber, raw.contactPhone));
}

function tableIdsOf(raw) {
  const list = firstDefined(raw.tableIds, raw.tables, raw.tableId, []);
  return [...new Set((Array.isArray(list) ? list : [list]).map((t) => str(t && typeof t === 'object' ? t.id : t)).filter(Boolean))];
}

function statusOf(raw) {
  const st = str(firstDefined(raw.status, raw.reserveStatus, raw.state)).toLowerCase();
  const cancelled = Boolean(raw.isDeleted || raw.deleted || raw.isCancelled || raw.isCanceled || raw.cancelReason || raw.cancelledAt)
    || /cancel|delet|отмен|удал/.test(st);
  if (cancelled) return { status: 'cancelled', known: true };
  if (st === 'started' || st === 'seated') return { status: 'started', known: true };
  if (st === 'closed' || st === 'finished' || st === 'completed') return { status: 'closed', known: true };
  return { status: 'new', known: st === 'new' };
}

/**
 * Бронь из ответа iiko → { id, status (new/started/closed/cancelled), statusKnown, startsAt, durationMin, endsAt,
 * tableIds, guestName, phone, guestsCount, comment }. Принимает и саму бронь, и обёртку status_by_id
 * `{ id, creationStatus, reserve: {...} }`. Нет ID или времени начала — null (такую бронь нечем сопоставить со столом).
 */
export function normalizeReserve(rawIn, { tz = RESERVE_TZ, tableIds: extraTableIds = [] } = {}) {
  if (!rawIn || typeof rawIn !== 'object') return null;
  if (rawIn.creationStatus === 'Error') return null;
  const raw = rawIn.reserve && typeof rawIn.reserve === 'object' ? { ...rawIn.reserve, id: firstDefined(rawIn.reserve.id, rawIn.id) } : rawIn;
  const id = str(raw.id ?? raw.reserveId);
  const startsAt = parseIikoTime(firstDefined(raw.estimatedStartTime, raw.startTime, raw.startDateTime, raw.dateTime, raw.date, raw.from), tz);
  if (!id || !startsAt) return null;
  const dur = Math.round(Number(firstDefined(raw.durationInMinutes, raw.durationMinutes, raw.duration, raw.durationMin)));
  const durationMin = Number.isFinite(dur) && dur > 0 ? Math.min(dur, 1440) : DEFAULT_DURATION_MIN;
  const guests = Math.floor(Number(firstDefined(raw.guestsCount, raw.guestCount, raw.guests?.count, raw.personsCount, raw.seatsCount, typeof raw.guests === 'number' ? raw.guests : undefined)));
  const { status, known } = statusOf(raw);
  return {
    id,
    status,
    statusKnown: known,
    startsAt,
    durationMin,
    endsAt: new Date(new Date(startsAt).getTime() + durationMin * 60_000).toISOString(),
    tableIds: [...new Set([...tableIdsOf(raw), ...extraTableIds.map(str)])].filter(Boolean),
    guestName: guestNameOf(raw),
    phone: phoneOf(raw),
    guestsCount: Number.isFinite(guests) && guests > 0 ? Math.min(guests, 200) : 1,
    comment: str(firstDefined(raw.comment, raw.notes, raw.note)).slice(0, 500),
  };
}

/**
 * Все брони из ответа iiko (workload по залам, status_by_id): ищет массивы `reserves` на любой глубине
 * и берёт стол из ближайшего объекта-стола, если в самой брони столов нет. Одна бронь в разных залах — одной записью.
 */
export function collectReserves(response, { tz = RESERVE_TZ } = {}) {
  const byId = new Map();
  const add = (raw, tableId) => {
    const n = normalizeReserve(raw, { tz, tableIds: tableId ? [tableId] : [] });
    if (!n) return;
    const prev = byId.get(n.id);
    byId.set(n.id, prev ? { ...prev, tableIds: [...new Set([...prev.tableIds, ...n.tableIds])] } : n);
  };
  const walk = (node, tableId, depth, inTables = false) => {
    if (!node || typeof node !== 'object' || depth > 7) return;
    if (Array.isArray(node)) { for (const x of node) walk(x, tableId, depth + 1, inTables); return; }
    // Элемент списка «tables» — стол: все его брони относятся к нему
    const ctx = inTables && node.id ? str(node.id) : tableId;
    for (const [key, val] of Object.entries(node)) {
      if (/^reserves?$/i.test(key)) {
        for (const raw of Array.isArray(val) ? val : [val]) add(raw, ctx);
      } else if (val && typeof val === 'object') {
        walk(val, ctx, depth + 1, key === 'tables');
      }
    }
  };
  walk(response, null, 0);
  return [...byId.values()];
}

/** Статусы броней из ответа status_by_id: [{ id, status, statusKnown }] — время начала для этого не нужно. */
export function collectStatuses(response) {
  const out = new Map();
  const walk = (node, depth) => {
    if (!node || typeof node !== 'object' || depth > 7) return;
    if (Array.isArray(node)) { for (const x of node) walk(x, depth + 1); return; }
    for (const [key, val] of Object.entries(node)) {
      if (!/^reserves?$/i.test(key)) { if (val && typeof val === 'object') walk(val, depth + 1); continue; }
      for (const item of Array.isArray(val) ? val : [val]) {
        if (!item || typeof item !== 'object' || item.creationStatus === 'Error') continue;
        const raw = item.reserve && typeof item.reserve === 'object' ? { ...item.reserve, id: firstDefined(item.reserve.id, item.id) } : item;
        const id = str(raw.id ?? raw.reserveId);
        if (!id) continue;
        const st = statusOf(raw);
        out.set(id, { id, status: st.status, statusKnown: st.known });
      }
    }
  };
  walk(response, 0);
  return [...out.values()];
}

/** ID залов из схемы зала (available_restaurant_sections) — для запроса занятости. */
export function sectionIdsOf(sectionsResponse) {
  const sections = sectionsResponse?.restaurantSections || sectionsResponse?.sections || [];
  return sections.map((s) => str(s?.id)).filter(Boolean);
}

// ── Решения по броне ────────────────────────────────────────────────────────

/** Сколько минут до начала создавать стол и сколько ждать гостей после начала (env, минуты). */
export function reserveSettings(env = process.env) {
  const num = (v, d) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : d; };
  return {
    leadMin: num(env.RESERVE_LEAD_MIN, 15),
    noShowMin: num(env.RESERVE_NOSHOW_MIN, 30),
  };
}

/**
 * Что делать с бронью сейчас. Входные данные:
 *  reserve — бронь из БД: { id, status, startsAt, endsAt, arrivedAt, noShowAt, tableCreatedAt, tableNumber };
 *  session — открытый визит на столе брони или null: { reservationId, empty, staleNoShow }
 *    (empty — гостей, заказов и отметки «пришли» нет; staleNoShow — это пустой визит другой брони, которая не пришла).
 * Результат: { action, notify? } где action:
 *   'create'   — пора создавать стол;      'conflict' — стол занят прежними гостями, показать официанту;
 *   'replace'  — закрыть брошенный пустой визит прошлой брони и создать новый;
 *   'close'    — бронь отменена/закрыта в iiko, гостей нет — закрыть визит;
 *   'no_show'  — гость не пришёл;           'expire' — бронь не пришла и время вышло, закрыть пустой визит;
 *   'arrive_iiko' — в iiko бронь «Started» (гостей посадили на кассе) — отметить «пришли»;
 *   'none'     — ничего.
 */
export function planReserve({ reserve, session = null, now = Date.now(), leadMs = 15 * 60_000, noShowMs = 30 * 60_000 }) {
  const t = now instanceof Date ? now.getTime() : now;
  const start = new Date(reserve.startsAt).getTime();
  const end = new Date(reserve.endsAt || start + DEFAULT_DURATION_MIN * 60_000).getTime();
  const linked = Boolean(session && session.reservationId && String(session.reservationId) === String(reserve.id));
  const arrived = Boolean(reserve.arrivedAt);

  if (reserve.status === 'cancelled' || reserve.status === 'closed') {
    return { action: linked && session.empty && !arrived ? 'close' : 'none' };
  }
  if (linked) {
    if (reserve.status === 'started' && !arrived) return { action: 'arrive_iiko' };
    if (!arrived && !reserve.noShowAt && t >= start + noShowMs) return { action: 'no_show' };
    if (!arrived && reserve.noShowAt && session.empty && t >= end) return { action: 'expire' };
    return { action: 'none' };
  }
  // Стол под эту бронь уже создавали (визит закрыли вручную или он закончился) — второй раз не создаём
  if (reserve.tableCreatedAt || !reserve.tableNumber) return { action: 'none' };
  const due = t >= start - leadMs && t < start + noShowMs && t < end;
  if (!due) return { action: 'none' };
  if (!session) return { action: 'create' };
  if (session.empty && session.staleNoShow) return { action: 'replace' };
  return { action: 'conflict', notify: !reserve.conflictNotifiedAt };
}

/** Состояние брони для официанта: arrived / waiting / no_show / cancelled / closed / upcoming (стола ещё нет). */
export function reserveState(reserve, now = Date.now()) {
  if (reserve.status === 'cancelled') return 'cancelled';
  if (reserve.arrivedAt) return 'arrived';
  if (reserve.noShowAt) return 'no_show';
  if (reserve.status === 'closed') return 'closed';
  if (reserve.sessionId || reserve.tableCreatedAt) return 'waiting';
  return new Date(reserve.startsAt).getTime() <= (now instanceof Date ? now.getTime() : now) ? 'waiting' : 'upcoming';
}

export const STATE_LABELS = {
  arrived: 'пришли', waiting: 'ждём', no_show: 'не пришли', cancelled: 'отменена', closed: 'закрыта', upcoming: 'ждём',
};

// ── Поиск ───────────────────────────────────────────────────────────────────

/**
 * Брони по имени гостя: запрос из нескольких слов — каждое слово должно совпасть с началом слова в имени или входить в него
 * (ё и е — одно и то же). Запрос из цифр ищет по окончанию телефона. Брони — по времени.
 * У каждой найденной брони sameName=true, если в результате есть другая бронь на то же имя — таких показываем все, с телефоном.
 */
export function searchReserves(list, query = '') {
  const q = normalizeName(query);
  const digits = String(query).replace(/\D/g, '');
  const phoneQuery = digits.length >= 3 && !/[a-zа-яё]/i.test(String(query));
  const tokens = q.split(' ').filter(Boolean);
  const matched = (list || []).filter((r) => {
    if (!tokens.length && !phoneQuery) return true;
    if (phoneQuery) return normalizePhone(r.phone)?.includes(digits) || String(r.phone || '').includes(digits);
    const name = normalizeName(r.guestName);
    const words = name.split(' ');
    return tokens.every((tk) => words.some((w) => w.startsWith(tk)) || name.includes(tk));
  }).sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)) || String(a.guestName).localeCompare(String(b.guestName), 'ru'));
  const counts = new Map();
  for (const r of matched) {
    const k = normalizeName(r.guestName);
    if (k) counts.set(k, (counts.get(k) || 0) + 1);
  }
  return matched.map((r) => ({ ...r, sameName: (counts.get(normalizeName(r.guestName)) || 0) > 1 }));
}

/** Тексты уведомлений официанту: «Стол 5» + «Бронь 19:00 · Мария, 4 гостя». */
export function reserveTexts(r, tz = RESERVE_TZ) {
  const who = `${r.guestName || 'Гость'}, ${guestsText(r.guestsCount)}`;
  const time = clockText(r.startsAt, tz);
  return {
    title: `Стол ${r.tableNumber}`,
    created: `Бронь ${time} · ${who}`,
    arrived: `Пришли гости по брони: ${r.guestName || 'Гость'} (${r.guestsCount})`,
    noShow: `Бронь не пришла · ${time} · ${who}`,
    conflict: `Бронь ${time} · ${who} — стол ещё занят прежними гостями`,
  };
}
