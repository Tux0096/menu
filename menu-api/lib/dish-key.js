import { menuKey } from './menu-key.js';

/**
 * Одноимённые блюда iiko с разными ID («Карбонара» в «Пасте» и в «Детском меню», «Американо» в баре и в бизнес-ланче)
 * — разные позиции: у каждой своя строка «Меню сети» и своя карточка по названию. Блюда сводятся по названию
 * между точками, поэтому правило сетевое: если хотя бы на одной точке под одним названием (и источником) есть блюда
 * из разных разделов, то на всех точках «основное» блюдо остаётся под обычным ключом (старые карточки целы),
 * а остальные получают ключ «название|раздел».
 * Один ID блюда в нескольких разделах (бизнес-ланч из блюд меню) и один раздел с разными объёмами
 * (пиво 330 и 500 мл) — не повод делить: это то же блюдо.
 */

// Служебные разделы: основным вариантом считается блюдо не из них («Детское меню», «Бизнес-ланч», комбо, акции)
const SERVICE_SECTION = /детск|ланч|акци|комбо/;
export const isServiceSection = (name) => SERVICE_SECTION.test(String(name || '').toLowerCase());

const baseOf = (r) => `${menuKey(r.name)}|${r.source && r.source !== 'main' ? r.source : ''}`;

/**
 * rows: [{ point, id, name, source, section }] — все блюда сети в порядке меню (раздел за разделом).
 * Возвращает Map: ID блюда → вариант ('' — основное блюдо, иначе ключ раздела).
 */
export function assignDishVariants(rows) {
  const perPoint = new Map(); // название + точка → разделы, в которых оно есть
  const order = new Map(); // название → разделы в порядке появления
  const first = new Set(); // блюдо в нескольких разделах (тот же ID) считается по первому
  rows = rows.filter((r) => !first.has(String(r.id)) && first.add(String(r.id)));
  for (const r of rows) {
    if (!menuKey(r.name)) continue;
    const base = baseOf(r);
    const sec = menuKey(r.section);
    const pk = `${r.point}@${base}`;
    if (!perPoint.has(pk)) perPoint.set(pk, new Set());
    perPoint.get(pk).add(sec);
    if (!order.has(base)) order.set(base, []);
    const list = order.get(base);
    if (!list.some((x) => x.sec === sec)) list.push({ sec, name: r.section });
  }
  // Название делится, если на какой-то точке оно есть в нескольких разделах
  const split = new Set();
  for (const [pk, set] of perPoint) if (set.size > 1) split.add(pk.slice(pk.indexOf('@') + 1));
  const primary = new Map();
  for (const base of split) {
    const list = order.get(base);
    primary.set(base, (list.find((x) => !isServiceSection(x.name)) || list[0]).sec);
  }
  const out = new Map();
  for (const r of rows) {
    const base = baseOf(r);
    const sec = menuKey(r.section);
    out.set(String(r.id), split.has(base) && sec !== primary.get(base) ? sec : '');
  }
  return out;
}

/** Ключ строки «Меню сети»: название, источник (бар — отдельной строкой), вариант (раздел одноимённого блюда) */
export const dishRowKey = (name, source, variant = '') => `${menuKey(name)}${source && source !== 'main' ? `|${source}` : ''}${variant ? `|${variant}` : ''}`;

/** Ключ карточки по названию (menu_overrides.product_name): название и вариант; кухня и бар делят карточку */
export const dishCardKey = (name, variant = '') => `${menuKey(name)}${variant ? `|${variant}` : ''}`;
