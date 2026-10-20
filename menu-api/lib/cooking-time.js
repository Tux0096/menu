/**
 * Время готовки позиции: сколько готовится, норматив блюда, подсветка.
 *   Источник времени: iiko (printTime / cookingStartTime / cookingCompletedTime…), иначе считаем сами:
 *   начало — «Готовится» (cooking_started_at) или отправка на кухню (sent_at), конец — ready_at.
 *   Норматив: cookingTime блюда из номенклатуры iiko, иначе медиана нашей готовки за 14 дней (от 5 замеров), иначе нет.
 */

/** Готовка дольше норматива в столько раз — красная подсветка и уведомление «долго готовится» */
export const COOK_SLOW_FACTOR = 1.5;
export const COOK_HISTORY_DAYS = 14;
export const COOK_HISTORY_MIN_SAMPLES = 5;

/** «15», 15, «00:15:00», «15:00», «15 мин» → минуты (число) или null */
export function parseCookingMinutes(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? v : null;
  const s = String(v).trim().replace(',', '.');
  const hms = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hms) {
    // «ЧЧ:ММ:СС» — как в TimeSpan; «ММ:СС» из двух частей при значении ≥ 1 часа не встречается
    const min = hms[3] !== undefined ? Number(hms[1]) * 60 + Number(hms[2]) + Number(hms[3]) / 60 : Number(hms[1]) + Number(hms[2]) / 60;
    return min > 0 ? Math.round(min * 100) / 100 : null;
  }
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Время из iiko («2026-10-20 12:30:45.123» без пояса или ISO) → миллисекунды. Нужно лишь для разности, пояс не важен */
export function parseIikoTime(v) {
  if (!v) return null;
  const t = Date.parse(String(v).replace(' ', 'T') + (/[zZ]|[+-]\d{2}:?\d{2}$/.test(String(v)) ? '' : 'Z'));
  return Number.isFinite(t) ? t : null;
}

const pick = (o, names) => {
  for (const n of names) {
    const v = o?.[n] ?? o?.item?.[n];
    if (v) return v;
  }
  return null;
};

/**
 * Сколько позиция готовилась по данным iiko: от начала готовки (или печати) до готовности.
 * Полей может не быть — тогда null (считаем сами).
 */
export function iikoCookMinutes(item) {
  const start = parseIikoTime(pick(item, ['cookingStartTime', 'cookingStartedTime', 'printTime', 'printedTime']));
  const end = parseIikoTime(pick(item, ['cookingCompletedTime', 'cookingFinishTime', 'cookedTime', 'readyTime']));
  if (start == null || end == null || end < start) return null;
  return Math.round(((end - start) / 60000) * 100) / 100;
}

export function median(values) {
  const v = (values || []).map(Number).filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/** Норматив блюда: номенклатура iiko → медиана фактической готовки (от 5 замеров) → нет */
export function cookNorm({ nomenclature = null, history = [] } = {}) {
  const nom = parseCookingMinutes(nomenclature);
  if (nom) return { minutes: nom, source: 'iiko' };
  const samples = (history || []).map(Number).filter((x) => Number.isFinite(x) && x > 0);
  if (samples.length >= COOK_HISTORY_MIN_SAMPLES) return { minutes: Math.round(median(samples) * 10) / 10, source: 'history' };
  return null;
}

/** Подсветка: жёлтая — дольше норматива, красная — дольше норматива в 1,5 раза; без норматива — без подсветки */
export function cookLevel(minutes, norm) {
  const n = norm?.minutes ?? norm;
  if (minutes == null || !(n > 0)) return 'ok';
  if (minutes >= n * COOK_SLOW_FACTOR) return 'bad';
  if (minutes > n) return 'warn';
  return 'ok';
}

const ms = (v) => (v ? new Date(v).getTime() : null);
const mins = (a, b) => (a == null || b == null ? null : Math.max(0, (b - a) / 60000));

/**
 * Готовка позиции для показа.
 * row: { sentAt, startedAt, readyAt, servedAt, cookMinutes, kitchenStatus }.
 * Результат: { state: cooking|ready|served, minutes, normMinutes, level, text }.
 *   cooking — «готовится 12 мин из ~15», ready — «готово, ждёт выноса 4 мин», served — «приготовлено за 14 мин».
 */
export function cookInfo(row, norm = null, now = Date.now()) {
  const start = ms(row.startedAt) ?? ms(row.sentAt);
  const ready = ms(row.readyAt);
  const normMin = norm?.minutes ?? null;
  const served = Boolean(row.servedAt) || row.kitchenStatus === 'Served';
  const done = ready != null || row.kitchenStatus === 'CookingCompleted' || served;
  const cooked = row.cookMinutes != null ? Number(row.cookMinutes) : mins(start, ready);
  if (served) {
    const m = cooked != null ? Math.round(cooked) : null;
    return { state: 'served', minutes: cooked, normMinutes: normMin, level: cookLevel(cooked, norm), text: m != null ? `приготовлено за ${m} мин` : 'вынесено' };
  }
  if (done) {
    const wait = ready != null ? Math.floor(mins(ready, now)) : null;
    return {
      state: 'ready', minutes: cooked, waitingMinutes: wait, normMinutes: normMin, level: cookLevel(cooked, norm),
      text: wait != null ? `готово, ждёт выноса ${wait} мин` : 'готово, ждёт выноса',
    };
  }
  const m = start != null ? Math.floor(mins(start, now)) : null;
  const tail = normMin ? ` из ~${Math.round(normMin)}` : '';
  return {
    state: 'cooking', minutes: m, normMinutes: normMin, level: cookLevel(m, norm),
    text: m != null ? `готовится ${m} мин${tail}` : 'готовится',
  };
}
