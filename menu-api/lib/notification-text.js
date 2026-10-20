/**
 * Тексты уведомлений официанту — короткое событие, а не весь заказ. Детали — в открытом столе.
 *   «Стол 5 · Новый заказ» / «3 позиции · 1 487 ₽»
 *   «Стол 5 · Дозаказ» / «Мисо суп ×2»
 *   «Стол 5 · Готово» / «Филадельфия ×2»
 * Заголовок — стол и событие, тело — суть события.
 */

const NBSP = ' ';

export function rubText(n) {
  return `${String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)}${NBSP}₽`;
}

export function plural(n, one, few, many) {
  const m = Math.abs(n) % 100;
  const d = m % 10;
  if (m > 10 && m < 20) return many;
  if (d > 1 && d < 5) return few;
  if (d === 1) return one;
  return many;
}

/** «Мисо суп ×2, Ролл ×1» — не больше max строк, остальное «и ещё N» */
export function linesText(lines, max = 4) {
  const list = (lines || []).filter((l) => l && l.name);
  const shown = list.slice(0, max).map((l) => `${l.name} ×${l.qty ?? l.quantity ?? 1}`);
  const more = list.length - shown.length;
  return shown.join(', ') + (more > 0 ? ` и ещё ${more}` : '');
}

/** Склеить одинаковые блюда: [{A,1},{A,2},{B,1}] → [{A,3},{B,1}] */
export function mergeLines(...groups) {
  const out = new Map();
  for (const g of groups) {
    for (const l of g || []) {
      const qty = Number(l.qty ?? l.quantity ?? 0);
      if (!l?.name || !qty) continue;
      out.set(l.name, (out.get(l.name) || 0) + qty);
    }
  }
  return [...out].map(([name, qty]) => ({ name, qty }));
}

const head = (table, event) => `Стол ${table} · ${event}`;

export function newOrderText({ table, count, sum }) {
  return { title: head(table, 'Новый заказ'), body: `${count} ${plural(count, 'позиция', 'позиции', 'позиций')} · ${rubText(sum)}` };
}

/** Дозаказ — только новые позиции, не весь стол */
export function reorderText({ table, lines }) {
  return { title: head(table, 'Дозаказ'), body: linesText(lines) };
}

/** Готово — только блюда, которые стали готовы сейчас */
export function readyText({ table, lines }) {
  return { title: head(table, 'Готово'), body: linesText(lines) };
}

export function billText({ table, method = null, amount, by = null, scope = 'table', names = [] }) {
  const m = { card: 'картой', cash: 'наличными' }[method];
  const who = scope === 'table' ? '' : names.join(' и ');
  return {
    title: head(table, `Просит счёт${m ? ` ${m}` : ''}`),
    body: [rubText(amount), who || (by && scope !== 'table' ? by : '')].filter(Boolean).join(' · '),
  };
}

/** reasonText — «нужны приборы», комментарий гостя добавляется после двоеточия */
export function callText({ table, reasonText, comment = '' }) {
  return { title: head(table, 'Вызов'), body: [reasonText, comment ? String(comment).slice(0, 200) : ''].filter(Boolean).join(': ') };
}

/** Гость ждёт официанта дольше норматива */
export function waitText({ table, minutes, label }) {
  return { title: head(table, `Ждёт ${minutes} мин`), body: label };
}

/** Блюда готовы, но не вынесены */
export function readyWaitText({ table, minutes, lines }) {
  return { title: head(table, `Готово, не вынесено ${minutes} мин`), body: linesText(lines) };
}

/** Готовка заметно дольше норматива */
export function cookSlowText({ table, name, minutes }) {
  return { title: head(table, 'Долго готовится'), body: `${name} ${Math.round(minutes)} мин` };
}

export function removedText({ table, lines, orderDeleted = false, where = '', refund = false }) {
  return {
    title: head(table, `${orderDeleted ? 'На кассе удалён заказ' : 'На кассе удалено'}${where}`),
    body: linesText(lines, 6) + (refund ? ' · было оплачено онлайн — оформите возврат гостю' : ''),
  };
}

export function assignedText({ table, name }) {
  return { title: `Стол ${table} взял(а) ${name}`, body: 'Стол ушёл из «Общих»' };
}

export function unassignedText({ table, name }) {
  return { title: head(table, 'Отдан в общие'), body: name ? `${name} отдал(а) стол — нужен официант` : 'Нужен официант' };
}
