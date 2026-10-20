// Конструктор бизнес-ланча: расписание (дни, часы, часовой пояс), блок каталога, отказ вне времени
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isLunchActive, nextLunchStart, normalizeSchedule, scheduleText, validateSchedule, assertLunchOpen, daysText, lunchClosedMessage,
} from '../lib/lunch-schedule.js';
import { buildBusinessLunch, assertLunchRows, lunchFromPrice } from '../services/business-lunch.js';
import { priceLine } from '../services/menu-pricing.js';

const S = { days: [1, 2, 3, 4, 5], from: '12:00', to: '16:00', tz: 'Europe/Samara' }; // Самара UTC+4
// 2026-10-20 — вторник, 2026-10-24 — суббота, 2026-10-25 — воскресенье
const at = (iso) => new Date(iso);

test('расписание: внутри окна по времени точки (Самара UTC+4)', () => {
  assert.equal(isLunchActive(S, at('2026-10-20T08:00:00Z')), true); // 12:00 в Самаре — ровно открытие
  assert.equal(isLunchActive(S, at('2026-10-20T07:59:00Z')), false); // 11:59
  assert.equal(isLunchActive(S, at('2026-10-20T11:59:00Z')), true); // 15:59
  assert.equal(isLunchActive(S, at('2026-10-20T12:00:00Z')), false); // 16:00 — уже закрыто
});

test('расписание: часовой пояс решает — то же UTC-время в Москве и в Самаре', () => {
  const msk = { ...S, tz: 'Europe/Moscow' }; // UTC+3
  assert.equal(isLunchActive(S, at('2026-10-20T08:30:00Z')), true); // 12:30 Самара
  assert.equal(isLunchActive(msk, at('2026-10-20T08:30:00Z')), false); // 11:30 Москва
  assert.equal(isLunchActive(msk, at('2026-10-20T09:00:00Z')), true);
});

test('расписание: день недели считается в часовом поясе точки, не в UTC', () => {
  // Суббота 00:30 в Самаре — ещё пятница по UTC, но ланч в субботу не действует
  assert.equal(isLunchActive(S, at('2026-10-23T20:30:00Z')), false);
  // Пятница 15:30 в Самаре (11:30 UTC) — действует
  assert.equal(isLunchActive(S, at('2026-10-23T11:30:00Z')), true);
  assert.equal(isLunchActive(S, at('2026-10-24T09:00:00Z')), false); // суббота
  assert.equal(isLunchActive(S, at('2026-10-25T09:00:00Z')), false); // воскресенье
});

test('расписание: окно через полночь относится ко дню начала', () => {
  const night = { days: [5], from: '22:00', to: '02:00', tz: 'Europe/Samara' }; // пятница
  assert.equal(isLunchActive(night, at('2026-10-23T18:30:00Z')), true); // пт 22:30
  assert.equal(isLunchActive(night, at('2026-10-23T21:00:00Z')), true); // сб 01:00
  assert.equal(isLunchActive(night, at('2026-10-23T22:30:00Z')), false); // сб 02:30
  assert.equal(isLunchActive(night, at('2026-10-24T21:00:00Z')), false); // вс 01:00
});

test('ближайшее начало: сегодня позже, завтра, через выходные', () => {
  assert.equal(nextLunchStart(S, at('2026-10-20T04:00:00Z')), '2026-10-20T08:00:00.000Z'); // вт 08:00 Самара → в 12:00 того же дня
  assert.equal(nextLunchStart(S, at('2026-10-20T10:00:00Z')), '2026-10-21T08:00:00.000Z'); // уже идёт — следующее начало завтра
  assert.equal(nextLunchStart(S, at('2026-10-23T13:00:00Z')), '2026-10-26T08:00:00.000Z'); // пт вечером → понедельник
  assert.equal(nextLunchStart({ ...S, days: [] }, at('2026-10-20T04:00:00Z')), null);
});

test('текст расписания: «с 12:00 до 16:00, пн–пт» и сообщение отказа', () => {
  assert.equal(scheduleText(S), 'с 12:00 до 16:00, пн–пт');
  assert.equal(daysText([1, 2, 3, 4, 5, 6, 7]), 'ежедневно');
  assert.equal(daysText([1, 3, 5]), 'пн, ср, пт');
  assert.equal(daysText([6, 7]), 'сб, вс');
  assert.equal(daysText([1, 2, 3, 6]), 'пн–ср, сб');
  assert.equal(lunchClosedMessage(S), 'Бизнес-ланч доступен с 12:00 до 16:00, пн–пт');
});

test('расписание: нормализация и проверка из админки', () => {
  assert.deepEqual(normalizeSchedule(null), { days: [1, 2, 3, 4, 5], from: '12:00', to: '16:00', tz: 'Europe/Samara' });
  assert.equal(normalizeSchedule({ ...S, tz: 'Mars/Base' }).tz, 'Europe/Samara');
  assert.equal(normalizeSchedule({ ...S, from: '9:5' }).from, '12:00');
  assert.throws(() => validateSchedule({ ...S, days: [] }), (e) => e.status === 400);
  assert.throws(() => validateSchedule({ ...S, from: '25:00' }), (e) => e.status === 400);
  assert.throws(() => validateSchedule({ ...S, tz: 'Mars/Base' }), (e) => e.status === 400);
  assert.deepEqual(validateSchedule({ days: ['1', 3], from: '11:30', to: '15:00' }).days, [1, 3]);
});

test('отказ вне времени — 400 с текстом и кодом', () => {
  assert.throws(() => assertLunchOpen(S, at('2026-10-24T09:00:00Z')), (e) => e.status === 400 && e.code === 'LUNCH_CLOSED' && /12:00 до 16:00, пн–пт/.test(e.message));
  assert.doesNotThrow(() => assertLunchOpen(S, at('2026-10-20T09:00:00Z')));
});

// ── Блок каталога ──
const mod = (id, name, price, extra = {}) => ({ id, name, iikoName: name, price, weight: 100, image: null, def: 0, max: 0, ...extra });
const grp = (id, name, items, min = 1) => ({ id, name, iikoName: name, min, max: 1, free: 0, items });
const salad = () => grp('g1', 'Салат или ролл', [mod('r1', 'Ролл Гонконг', 190), mod('r2', 'Ролл Испания', 190), mod('s1', 'Цезарь', 190)]);
const soup = () => grp('g2', 'Суп', [mod('c1', 'Крем-суп грибной', 200), mod('c2', 'Крем-суп из лосося', 200)]);
const hot = () => grp('g3', 'Горячее', [mod('h1', 'Лук Лак', 260)]);
const set = (id, name, groups, price, order) => ({ id, iikoId: id, name, source: 'main', parentGroup: 'bl', price, order, needsChoice: true, sizes: [], modifierGroups: groups, basePrice: 0 });
const drink = (id, name, price) => ({ id, iikoId: id, name, source: 'bar', parentGroup: 'bl', price, order: 500, weight: '200 г', sizes: [], modifierGroups: [] });
const groups = [{ id: 'bl', name: 'Бизнес-ланч' }, { id: 'x', name: 'Супы' }];
const products = () => [
  set('p1', 'Салат / Ролл + Суп', [salad(), soup()], 390, 1),
  set('p2', 'Суп + Горячее', [soup(), hot()], 460, 3),
  set('p3', 'Салат / Ролл + Горячее', [salad(), hot()], 420, 2),
  drink('d1', 'Капучино', 109), drink('d2', 'Морс', 99),
  { id: 'dish', iikoId: 'dish', name: 'Мисо суп', source: 'main', parentGroup: 'bl', price: 230, order: 9, sizes: [], modifierGroups: [] },
  { id: 'other', iikoId: 'other', name: 'Вок', source: 'main', parentGroup: 'x', price: 400, order: 10, sizes: [], modifierGroups: [grp('gw', 'Основа', [mod('w1', 'Удон', 400)])] },
];
const noon = at('2026-10-20T09:00:00Z');

test('блок businessLunch: наборы по порядку, шаги, цены, active', () => {
  const r = buildBusinessLunch({ groups, products: products(), settings: { schedule: S }, now: noon });
  const b = r.businessLunch;
  assert.equal(b.active, true);
  assert.equal(b.text, 'с 12:00 до 16:00, пн–пт');
  assert.deepEqual(b.combos.map((c) => c.title), ['Салат / Ролл + Суп', 'Салат / Ролл + Горячее', 'Суп + Горячее']);
  assert.deepEqual(b.combos[0].steps.map((s) => [s.title, s.items.length]), [['Салат или ролл', 3], ['Суп', 2]]);
  assert.equal(b.combos[0].price, 390);
  assert.equal(b.combos[0].fixed, true);
  assert.equal(b.combos[0].steps[0].items[0].weight, '100 г');
  assert.deepEqual(b.drinks.map((d) => [d.name, d.weight]), [['Капучино', '200 мл'], ['Морс', '200 мл']]);
  // наборы помечены, обычные блюда раздела и других разделов — нет
  const flagged = r.products.filter((p) => p.lunchCombo).map((p) => p.id).sort();
  assert.deepEqual(flagged, ['p1', 'p2', 'p3']);
  assert.equal(b.nextStart, '2026-10-21T08:00:00.000Z');
});

test('блок businessLunch: вне времени active=false, nextStart — следующее открытие', () => {
  const r = buildBusinessLunch({ groups, products: products(), settings: { schedule: S }, now: at('2026-10-24T09:00:00Z') });
  assert.equal(r.businessLunch.active, false);
  assert.equal(r.businessLunch.nextStart, '2026-10-26T08:00:00.000Z');
});

test('настройки: выключенный набор убран, скрытый вариант и порядок учтены, свои названия', () => {
  const settings = {
    schedule: S,
    combos: { 'салат ролл суп': { enabled: false }, 'суп горячее': { title: 'Суп и горячее', order: 0 } },
    items: { 'салат или ролл|ролл гонконг': { enabled: false }, 'суп|крем суп из лосося': { enabled: true, order: -1 } },
    drinks: { морс: { enabled: false } },
  };
  const r = buildBusinessLunch({ groups, products: products(), settings, now: noon });
  const b = r.businessLunch;
  assert.deepEqual(b.combos.map((c) => c.title), ['Суп и горячее', 'Салат / Ролл + Горячее']);
  assert.deepEqual(b.combos[0].steps[0].items.map((i) => i.name), ['Крем-суп из лосося', 'Крем-суп грибной']);
  assert.deepEqual(b.combos[1].steps[0].items.map((i) => i.name), ['Ролл Испания', 'Цезарь']);
  assert.deepEqual(b.drinks.map((d) => d.name), ['Капучино']);
  assert.ok(!r.products.some((p) => p.id === 'p1'), 'выключенный набор не виден ни в каталоге, ни в меню');
  // для админки видно всё, включая выключенное
  assert.equal(r.meta.combos.find((c) => c.key === 'салат ролл суп').enabled, false);
  assert.equal(r.meta.steps.find((s) => s.key === 'салат или ролл').items.find((i) => i.key.endsWith('ролл гонконг')).enabled, false);
});

test('набор, у которого скрыли все варианты обязательного шага, недоступен', () => {
  const settings = { schedule: S, items: { 'горячее|лук лак': { enabled: false } } };
  const r = buildBusinessLunch({ groups, products: products(), settings, now: noon });
  assert.equal(r.products.find((p) => p.id === 'p2').isInStopList, true);
  assert.equal(r.businessLunch.combos.find((c) => c.productId === 'p2').stopped, true);
});

test('набор как размеры одной позиции: каждый размер — набор со своим ID', () => {
  const sizes = [
    { id: 'z1', name: 'Салат + Суп', price: 0, needsChoice: true, groups: [salad(), soup()] },
    { id: 'z2', name: 'Суп + Горячее', price: 0, needsChoice: true, groups: [soup(), hot()] },
  ];
  const one = { id: 'one', iikoId: 'one', name: 'Собери свой ланч', source: 'main', parentGroup: 'bl', price: 390, order: 1, sizes, modifierGroups: [] };
  const r = buildBusinessLunch({ groups, products: [one], settings: { schedule: S }, now: noon });
  assert.deepEqual(r.businessLunch.combos.map((c) => [c.id, c.sizeId, c.title, c.price]), [['one:z1', 'z1', 'Салат + Суп', 390], ['one:z2', 'z2', 'Суп + Горячее', 460]]);
});

test('одна позиция с необязательными группами (набор за 0 ₽, цена в блюдах): «от» — самое дешёвое платное блюдо', () => {
  const opt = (g) => ({ ...g, min: 0, items: g.items.map((m, i) => ({ ...m, price: 170 + i * 10 })) });
  const one = set('one', 'Собери свой ланч', [opt(salad()), opt(soup())], 170, 1);
  const r = buildBusinessLunch({ groups, products: [one], settings: { schedule: S }, now: noon });
  assert.equal(r.businessLunch.combos[0].price, 170);
  assert.equal(r.businessLunch.combos[0].fixed, false);
  assert.equal(lunchFromPrice(0, [opt(salad())], true), 170);
  assert.equal(lunchFromPrice(100, [grp('a', 'A', [mod('1', 'x', 50), mod('2', 'y', 70)])], false), 150);
});

test('нет раздела «Бизнес-ланч» — нет блока', () => {
  const r = buildBusinessLunch({ groups: [{ id: 'x', name: 'Супы' }], products: [products()[5]], settings: { schedule: S }, now: noon });
  assert.equal(r.businessLunch, null);
});

// ── Отказ при заказе вне времени ──
const entry = (lunch) => ({ name: 'Салат / Ролл + Суп', price: 390, isInStopList: false, balance: null, lunch });
const never = { days: [], from: '12:00', to: '16:00', tz: 'Europe/Samara' };
const always = { days: [1, 2, 3, 4, 5, 6, 7], from: '00:00', to: '00:00', tz: 'Europe/Samara' };

test('корзина: набор вне времени — 400, в своё время и обычное блюдо — проходят', () => {
  const index = new Map([['l', entry(never)], ['ok', entry(always)], ['dish', entry(null)]]);
  assert.throws(() => priceLine(index, 'l', { qty: 1 }), (e) => e.status === 400 && e.code === 'LUNCH_CLOSED' && /^Бизнес-ланч доступен с 12:00 до 16:00/.test(e.message));
  assert.equal(priceLine(index, 'ok', { qty: 1 }).price, 390);
  assert.equal(priceLine(index, 'dish', { qty: 1 }).price, 390);
});

test('передача официанту и отправка на кухню: assertLunchRows отклоняет набор вне времени', () => {
  const index = new Map([['l', entry(never)], ['dish', entry(null)]]);
  assert.throws(() => assertLunchRows(index, [{ key: 'dish' }, { key: 'l' }]), (e) => e.status === 400 && e.code === 'LUNCH_CLOSED');
  assert.doesNotThrow(() => assertLunchRows(index, [{ key: 'dish' }]));
  assert.doesNotThrow(() => assertLunchRows(new Map([['l', entry(always)]]), [{ key: 'l' }]));
});
