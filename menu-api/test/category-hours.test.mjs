// Время показа разделов («Завтраки до 12:00»), место карточки бизнес-ланча, правки блюд ланча из админки
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertCategoryOpen, describeWindow, isWindowOpen, normalizeWindow, validateWindow, windowText,
} from '../lib/category-hours.js';
import { applyCategorySettings, closedByHoursIds } from '../services/catalog.js';
import { priceLine, assertHoursRows } from '../services/menu-pricing.js';
import { buildBusinessLunch, normalizePlacement, resolvePlacement } from '../services/business-lunch.js';

const at = (iso) => new Date(iso);
const SAMARA = 'Europe/Samara'; // UTC+4
// 2026-10-20 — вторник; 08:00Z = 12:00 в Самаре

test('окно «до 12:00»: по времени точки, граница — не включительно', () => {
  const w = { until: '12:00' };
  assert.equal(isWindowOpen(w, SAMARA, at('2026-10-20T07:59:00Z')), true); // 11:59
  assert.equal(isWindowOpen(w, SAMARA, at('2026-10-20T08:00:00Z')), false); // 12:00
  assert.equal(isWindowOpen(w, SAMARA, at('2026-10-19T20:00:00Z')), true); // 00:00 — утро, открыто
  // тот же момент в Москве (UTC+3): 11:00 — ещё открыто
  assert.equal(isWindowOpen(w, 'Europe/Moscow', at('2026-10-20T08:00:00Z')), true);
});

test('окно «с 18:00» и «с 10:00 до 12:00»', () => {
  assert.equal(isWindowOpen({ from: '18:00' }, SAMARA, at('2026-10-20T13:59:00Z')), false); // 17:59
  assert.equal(isWindowOpen({ from: '18:00' }, SAMARA, at('2026-10-20T14:00:00Z')), true); // 18:00
  const w = { from: '10:00', until: '12:00' };
  assert.equal(isWindowOpen(w, SAMARA, at('2026-10-20T05:59:00Z')), false); // 09:59
  assert.equal(isWindowOpen(w, SAMARA, at('2026-10-20T06:00:00Z')), true); // 10:00
  assert.equal(isWindowOpen(w, SAMARA, at('2026-10-20T08:00:00Z')), false); // 12:00
});

test('окно через полночь «с 22:00 до 02:00»; без окна всегда открыто', () => {
  const w = { from: '22:00', until: '02:00' };
  assert.equal(isWindowOpen(w, SAMARA, at('2026-10-20T18:30:00Z')), true); // 22:30
  assert.equal(isWindowOpen(w, SAMARA, at('2026-10-20T21:00:00Z')), true); // 01:00
  assert.equal(isWindowOpen(w, SAMARA, at('2026-10-20T22:30:00Z')), false); // 02:30
  assert.equal(isWindowOpen(w, SAMARA, at('2026-10-20T10:00:00Z')), false); // 14:00
  assert.equal(isWindowOpen(null, SAMARA, at('2026-10-20T10:00:00Z')), true);
  assert.equal(isWindowOpen({}, SAMARA), true);
});

test('текст окна и нормализация', () => {
  assert.equal(windowText({ until: '12:00' }), 'до 12:00');
  assert.equal(windowText({ from: '18:00' }), 'с 18:00');
  assert.equal(windowText({ from: '9:30', until: '12:00' }), 'с 09:30 до 12:00');
  assert.equal(windowText(null), '');
  assert.equal(normalizeWindow({ from: '', until: '' }), null);
  assert.equal(normalizeWindow({ from: 'abc', until: '25:00' }), null);
  assert.deepEqual(normalizeWindow({ showFrom: '8:00', showUntil: null }), { from: '08:00', until: null });
});

test('проверка из админки: формат времени и совпадающие границы — 400', () => {
  assert.throws(() => validateWindow({ showUntil: '25:00' }), (e) => e.status === 400 && /ЧЧ:ММ/.test(e.message));
  assert.throws(() => validateWindow({ showFrom: '12:00', showUntil: '12:00' }), (e) => e.status === 400);
  assert.equal(validateWindow({ showFrom: '', showUntil: '' }), null);
  assert.deepEqual(validateWindow({ showUntil: '12:00' }), { from: null, until: '12:00' });
});

test('каталог: раздел с окном получает window с closedNow и tz точки', () => {
  const groups = [{ id: 'br', name: 'Завтраки', order: 1, barSource: false }, { id: 'm', name: 'Роллы', order: 2, barSource: false }];
  const products = [{ id: 'e', parentGroup: 'br' }, { id: 'r', parentGroup: 'm' }];
  const settings = new Map([['завтраки', { window: { from: null, until: '12:00' }, hidden: false }]]);
  const morning = applyCategorySettings(groups, products, settings, { tz: SAMARA, now: at('2026-10-20T05:00:00Z') });
  const br = morning.groups.find((g) => g.id === 'br');
  assert.deepEqual([br.window.until, br.window.text, br.window.tz, br.window.closedNow], ['12:00', 'до 12:00', SAMARA, false]);
  assert.equal(morning.groups.find((g) => g.id === 'm').window, undefined);
  const noon = applyCategorySettings(groups, products, settings, { tz: SAMARA, now: at('2026-10-20T09:00:00Z') });
  assert.equal(noon.groups.find((g) => g.id === 'br').window.closedNow, true);
  // блюда закрытого раздела остаются в каталоге (официант видит их с пометкой), решает closedNow/window
  assert.equal(noon.products.length, 2);
  assert.deepEqual([...closedByHoursIds(noon)], ['e']);
  assert.deepEqual([...closedByHoursIds(morning)], []);
});

test('блюдо в закрытом разделе и в открытом (копия) — не закрыто', () => {
  const catalog = {
    groups: [{ id: 'br', window: { closedNow: true } }, { id: 'm' }],
    products: [{ id: 'e', parentGroup: 'br' }, { id: 'e', parentGroup: 'm', isAlias: true }, { id: 'only', parentGroup: 'br' }],
  };
  assert.deepEqual([...closedByHoursIds(catalog)], ['only']);
});

const win = (over = {}) => ({ from: null, until: '12:00', tz: SAMARA, title: 'Завтраки', ...over });
const entry = (hours) => ({ name: 'Сырники', price: 290, isInStopList: false, balance: null, lunch: null, hours });

test('заказ: добавить блюдо закрытого раздела — 409 с текстом, в открытый раздел и без окна — можно', () => {
  const index = new Map([['c', entry([win()])], ['o', entry([win({ until: null, from: null })])], ['n', entry(null)]]);
  // окно «до 12:00» в Самаре: фактическое «сейчас» берём из часов, поэтому проверяем сам assertCategoryOpen на заданный момент
  assert.throws(() => assertCategoryOpen([win()], at('2026-10-20T09:00:00Z')), (e) => e.status === 409 && e.code === 'CATEGORY_CLOSED' && e.message === 'Раздел «Завтраки» доступен до 12:00 — сейчас позицию заказать нельзя');
  assert.doesNotThrow(() => assertCategoryOpen([win()], at('2026-10-20T05:00:00Z')));
  assert.doesNotThrow(() => assertCategoryOpen([win(), win({ until: '18:00' })], at('2026-10-20T09:00:00Z'))); // второе место открыто
  assert.doesNotThrow(() => assertCategoryOpen(null));
  assert.equal(priceLine(index, 'n', { qty: 1 }).price, 290);
  assert.equal(priceLine(index, 'o', { qty: 1 }).price, 290); // окно без границ — раздел всегда открыт
});

test('заказ: уже лежащее в корзине не блокирует сохранение, а прибавить — блокирует (закрытый раздел)', () => {
  // priceLine берёт настоящее время, поэтому окно — одна минута в сутках (закрыто почти всегда)
  const closedAlmostAlways = win({ from: '03:00', until: '03:01' });
  const now = new Date();
  const open = isWindowOpen(closedAlmostAlways, SAMARA, now);
  if (open) return; // редкая минута, когда окно как раз открыто
  const index = new Map([['c', entry([closedAlmostAlways])]]);
  assert.doesNotThrow(() => priceLine(index, 'c', { qty: 2, prevQty: 2 })); // без увеличения
  assert.doesNotThrow(() => priceLine(index, 'c', { qty: 1, prevQty: 2 })); // уменьшение
  assert.throws(() => priceLine(index, 'c', { qty: 3, prevQty: 2 }), (e) => e.status === 409 && /Завтраки/.test(e.message));
  assert.throws(() => priceLine(index, 'c', { qty: 1 }), (e) => e.status === 409);
  assert.throws(() => assertHoursRows(index, [{ key: 'c' }]), (e) => e.status === 409 && e.code === 'CATEGORY_CLOSED');
  assert.doesNotThrow(() => assertHoursRows(new Map([['n', entry(null)]]), [{ key: 'n' }]));
});

// ── Место карточки бизнес-ланча ──
test('место карточки: нормализация и разбор', () => {
  assert.equal(normalizePlacement(null), null);
  assert.equal(normalizePlacement({ category: '' }), null);
  assert.deepEqual(normalizePlacement({ category: 'роллы', position: 'last' }), { category: 'роллы', position: 'last' });
  assert.deepEqual(normalizePlacement({ category: 'роллы', position: 'index', index: '3' }), { category: 'роллы', position: 'index', index: 3 });
  assert.deepEqual(normalizePlacement({ category: 'роллы', position: 'index', index: 0 }), { category: 'роллы', position: 'index', index: 1 });
  assert.deepEqual(normalizePlacement({ category: 'роллы', position: 'странно' }), { category: 'роллы', position: 'first' });
});

test('место карточки: раздел находится по ключу (кухня и бар раздельно), нет раздела — по умолчанию', () => {
  const groups = [
    { id: 'k', name: 'Роллы', iikoName: 'Роллы', barSource: false },
    { id: 'b', name: 'Кофе у нас', iikoName: 'Кофе', barSource: true },
    { id: 'kl', name: 'Бизнес-ланч', barSource: false },
    { id: 'bl', name: 'Бизнес-ланч', barSource: true },
  ];
  assert.deepEqual(resolvePlacement({ category: 'роллы', position: 'index', index: 2 }, groups), { groupId: 'k', position: 'index', index: 2 });
  assert.deepEqual(resolvePlacement({ category: 'кофе|bar', position: 'last' }, groups), { groupId: 'b', position: 'last' });
  assert.deepEqual(resolvePlacement({ category: 'бизнес ланч|bar', position: 'first' }, groups), { groupId: 'bl', position: 'first' });
  assert.equal(resolvePlacement({ category: 'кофе', position: 'last' }, groups), null); // кофе — раздел бара, ключ без |bar не подходит
  assert.equal(resolvePlacement({ category: 'нет такого' }, groups), null);
  assert.equal(resolvePlacement(null, groups), null);
});

// ── Блюда ланча: правки из админки ──
const mod = (id, name, price, extra = {}) => ({ id, name, iikoName: name, price, weight: 0.1, image: null, def: 0, max: 0, ...extra });
const grp = (id, name, items) => ({ id, name, iikoName: name, min: 1, max: 1, free: 0, items });
const set = (id, name, groups, order) => ({ id, iikoId: id, name, source: 'main', parentGroup: 'bl', price: 0, order, needsChoice: true, sizes: [], modifierGroups: groups, basePrice: 0 });
const S = { days: [1, 2, 3, 4, 5], from: '12:00', to: '16:00', tz: SAMARA };
const lunchGroups = [{ id: 'bl', name: 'Бизнес-ланч', barSource: false }, { id: 'r', name: 'Роллы', barSource: false }];

test('блюда шагов: описание, вес и название из админки доходят до гостя; для админки видно своё и из iiko', () => {
  // как после decorateGroups: свои правки лежат в description / weight / own
  const dish = mod('s1', 'Цезарь', 190, {
    name: 'Цезарь с курицей', autoName: 'Цезарь', description: 'Курица, салат, соус', weight: '250 г', iikoWeight: 0.2,
    own: { title: 'Цезарь с курицей', description: 'Курица, салат, соус', weight: '250 г' },
  });
  const plain = mod('s2', 'Греческий', 190);
  const products = [set('p1', 'Салат + Суп', [grp('g1', 'Салат', [dish, plain])], 1)];
  const r = buildBusinessLunch({ groups: lunchGroups, products, settings: { schedule: S }, now: at('2026-10-20T09:00:00Z') });
  const items = r.businessLunch.combos[0].steps[0].items;
  assert.deepEqual(items.map((i) => [i.name, i.weight, i.description]), [['Цезарь с курицей', '250 г', 'Курица, салат, соус'], ['Греческий', '0.1 г', '']]);
  const meta = r.meta.steps[0].items.find((i) => i.iikoName === 'Цезарь');
  assert.deepEqual([meta.custom, meta.auto, meta.description, meta.weight, meta.iikoWeight], ['Цезарь с курицей', 'Цезарь', 'Курица, салат, соус', '250 г', '0.2 г']);
  assert.equal(r.meta.steps[0].items.find((i) => i.iikoName === 'Греческий').custom, '');
});

test('набор: своё фото, описание и вес главнее iiko; скрытый набор не виден гостю', () => {
  const products = [
    { ...set('p1', 'Салат + Суп', [grp('g1', 'Салат', [mod('a', 'Цезарь', 190)])], 1), image: '/media/iiko.jpg' },
    set('p2', 'Суп + Горячее', [grp('g2', 'Суп', [mod('c', 'Мисо', 200)])], 2),
  ];
  const settings = {
    schedule: S,
    combos: {
      'салат суп': { enabled: true, image: '/media/own.jpg', description: 'Салат и суп на выбор', weight: '450 г' },
      'суп горячее': { enabled: false },
    },
  };
  const r = buildBusinessLunch({ groups: lunchGroups, products, settings, now: at('2026-10-20T09:00:00Z') });
  assert.equal(r.businessLunch.combos.length, 1);
  const c = r.businessLunch.combos[0];
  assert.deepEqual([c.image, c.description, c.weight], ['/media/own.jpg', 'Салат и суп на выбор', '450 г']);
  const meta = r.meta.combos.find((x) => x.key === 'салат суп');
  assert.deepEqual([meta.image, meta.iikoImage, meta.description, meta.weight], ['/media/own.jpg', '/media/iiko.jpg', 'Салат и суп на выбор', '450 г']);
  // без своих настроек — фото из iiko
  const plain = buildBusinessLunch({ groups: lunchGroups, products, settings: { schedule: S }, now: at('2026-10-20T09:00:00Z') });
  assert.equal(plain.businessLunch.combos[0].image, '/media/iiko.jpg');
});

test('блок businessLunch несёт место карточки из настроек', () => {
  const products = [set('p1', 'Салат + Суп', [grp('g1', 'Салат', [mod('a', 'Цезарь', 190)])], 1)];
  const settings = { schedule: S, placement: { category: 'роллы', position: 'index', index: 2 } };
  const r = buildBusinessLunch({ groups: lunchGroups, products, settings, now: at('2026-10-20T09:00:00Z') });
  assert.deepEqual(r.businessLunch.placement, { groupId: 'r', position: 'index', index: 2 });
  const none = buildBusinessLunch({ groups: lunchGroups, products, settings: { schedule: S }, now: at('2026-10-20T09:00:00Z') });
  assert.equal(none.businessLunch.placement, null);
});

test('описание окна для каталога', () => {
  assert.equal(describeWindow(null), null);
  assert.deepEqual(describeWindow({ until: '12:00' }, SAMARA, at('2026-10-20T09:00:00Z')), { from: null, until: '12:00', tz: SAMARA, text: 'до 12:00', closedNow: true });
});
