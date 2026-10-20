// Цены позиций внешнего меню iiko: пицца с 0 у размера «по умолчанию», вок с платной основой, цена из прейскуранта кассы
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sellableSizes, itemOptions, minRequired, minPaidChoice } from '../db/sync-iiko.js';

const ORG = 'org-1';
const pr = (v) => [{ organizations: [ORG], price: v }];
const priceOf = (nom = new Map()) => (prices, itemId, sizeId) => {
  const v = (prices || []).find((p) => p.organizations.includes(ORG))?.price || 0;
  return v || nom.get(`${itemId}|${sizeId || ''}`) || 0;
};

test('пицца: у размера по умолчанию 0, у 30 и 40 см — цены', () => {
  const item = { itemId: 'p1', itemSizes: [
    { sizeId: 'd', sizeName: '', isDefault: true, prices: pr(0) },
    { sizeId: 's30', sizeName: '30 см', prices: pr(699) },
    { sizeId: 's40', sizeName: '40 см', prices: pr(899) },
  ] };
  const sizes = sellableSizes(item, priceOf());
  assert.deepEqual(sizes.map((x) => x.price), [699, 899]);
  const opt = itemOptions(sizes);
  assert.equal(opt.sizes.length, 2);
  assert.equal(Math.min(...sizes.map((x) => x.total)), 699);
});

test('вок: цена блюда 0, обязательная основа платная — продаётся «от» самой дешёвой основы', () => {
  const item = { itemId: 'w1', itemSizes: [{ sizeId: null, isDefault: true, prices: pr(0), itemModifierGroups: [
    { itemGroupId: 'g1', name: 'Основа', restrictions: { minQuantity: 1, maxQuantity: 1 }, items: [
      { itemId: 'm1', name: 'Удон', prices: pr(459) }, { itemId: 'm2', name: 'Рис', prices: pr(429) }] },
    { itemGroupId: 'g2', name: 'Добавки', restrictions: { minQuantity: 0, maxQuantity: 3 }, items: [{ itemId: 'm3', name: 'Курица', prices: pr(120) }] },
  ] }] };
  const sizes = sellableSizes(item, priceOf());
  assert.equal(sizes.length, 1);
  assert.equal(sizes[0].total, 429);
  const opt = itemOptions(sizes);
  assert.equal(opt.base, 0);
  assert.equal(opt.groups.length, 2);
});

test('цена 0 во внешнем меню — берём прейскурант кассы', () => {
  const item = { itemId: 'p2', itemSizes: [{ sizeId: null, isDefault: true, prices: pr(0) }] };
  assert.equal(sellableSizes(item, priceOf()).length, 0, 'без прейскуранта — не продаётся');
  const sizes = sellableSizes(item, priceOf(new Map([['p2|', 650]])));
  assert.equal(sizes[0].price, 650);
  assert.equal(itemOptions(sizes), null);
});

test('бесплатные единицы группы не входят в «от»', () => {
  assert.equal(minRequired([{ min: 2, free: 1, items: [{ price: 50 }, { price: 80 }] }]), 50);
  assert.equal(minRequired([{ min: 0, items: [{ price: 50 }] }]), 0);
});

test('продаётся один размер из нескольких — его ID сохраняется для заказа iiko', () => {
  const item = { itemId: 'p3', itemSizes: [
    { sizeId: 'd', isDefault: true, prices: pr(0) },
    { sizeId: 's30', sizeName: '30 см', prices: pr(699) },
  ] };
  const sizes = sellableSizes(item, priceOf());
  assert.equal(sizes.length, 1);
  assert.deepEqual(itemOptions(sizes, true), { sizeId: 's30' });
  assert.equal(itemOptions(sizes, false), null);
});

test('размер без своей цены в прейскуранте не берёт цену другого размера', () => {
  const item = { itemId: 'p4', itemSizes: [{ sizeId: 's25', prices: pr(0) }, { sizeId: 's30', prices: pr(0) }] };
  const strict = (nom) => (prices, itemId, sizeId) => nom.get(`${itemId}|${sizeId || ''}`) || 0;
  const sizes = sellableSizes(item, strict(new Map([['p4|s30', 650]])));
  assert.deepEqual(sizes.map((x) => x.z.sizeId), ['s30']);
});

// Бизнес-ланч «Собери свой ланч»: набор за 0 ₽, блюда — необязательные платные модификаторы
const lunchGroups = () => [
  { itemGroupId: 'g-salad', name: 'Салат или ролл', restrictions: { minQuantity: 0, maxQuantity: 1 }, items: [
    { itemId: 'r1', name: 'Ролл Гонконг', prices: pr(190) }, { itemId: 's1', name: 'Цезарь', prices: pr(170) }] },
  { itemGroupId: 'g-soup', name: 'Суп', restrictions: { minQuantity: 0, maxQuantity: 1 }, items: [
    { itemId: 'c1', name: 'Крем-суп грибной', prices: pr(200) }, { itemId: 'c2', name: 'Крем-суп из лосося', prices: pr(220) }] },
  { itemGroupId: 'g-hot', name: 'Горячее', restrictions: { minQuantity: 0, maxQuantity: 1 }, items: [
    { itemId: 'h1', name: 'Лук Лак', prices: pr(250) }, { itemId: 'h2', name: 'Вок с терияки', prices: pr(230) }] },
];

test('набор за 0 с необязательными платными группами — выгружается «от» самого дешёвого блюда, needsChoice', () => {
  const item = { itemId: 'l1', name: 'Собери свой ланч', itemSizes: [{ sizeId: null, isDefault: true, prices: pr(0), itemModifierGroups: lunchGroups() }] };
  const sizes = sellableSizes(item, priceOf());
  assert.equal(sizes.length, 1);
  assert.equal(sizes[0].total, 170);
  assert.equal(sizes[0].needsChoice, true);
  const opt = itemOptions(sizes);
  assert.equal(opt.base, 0);
  assert.equal(opt.needsChoice, true);
  assert.equal(opt.groups.length, 3);
  assert.equal(opt.groups[0].min, 0);
});

test('набор с ценой 390 — цена 390, выбор не обязателен для продажи', () => {
  const item = { itemId: 'l2', name: 'Салат / Ролл + Суп', itemSizes: [{ sizeId: null, isDefault: true, prices: pr(390), itemModifierGroups: lunchGroups().map((g) => ({ ...g, items: g.items.map((m) => ({ ...m, prices: pr(0) })) })) }] };
  const sizes = sellableSizes(item, priceOf());
  assert.equal(sizes[0].total, 390);
  assert.equal(sizes[0].needsChoice, false);
  const opt = itemOptions(sizes);
  assert.equal(opt.base, 390);
  assert.equal(opt.needsChoice, undefined);
});

test('набор за 0, цена набора — в прейскуранте кассы: берём её, выбор не обязателен', () => {
  const item = { itemId: 'l3', itemSizes: [{ sizeId: null, isDefault: true, prices: pr(0), itemModifierGroups: lunchGroups() }] };
  const sizes = sellableSizes(item, priceOf(new Map([['l3|', 460]])));
  assert.equal(sizes[0].total, 460);
  assert.equal(sizes[0].needsChoice, false);
});

test('набор за 0 с бесплатными единицами во всех группах — цены нет нигде, в отчёт как noPrice', () => {
  const groups = lunchGroups().map((g) => ({ ...g, restrictions: { minQuantity: 1, maxQuantity: 1, freeQuantity: 1 } }));
  const item = { itemId: 'l4', itemSizes: [{ sizeId: null, isDefault: true, prices: pr(0), itemModifierGroups: groups }] };
  assert.equal(sellableSizes(item, priceOf()).length, 0);
  assert.equal(minPaidChoice([{ min: 0, max: 0, free: 1, items: [{ price: 100, max: 0 }] }]), 100, 'сверх бесплатной единицы — платно');
  assert.equal(minPaidChoice([{ min: 0, max: 1, free: 1, items: [{ price: 100 }] }]), 0);
});

test('обязательность, заданная у элемента (minQuantity) или флагом required группы, — как минимум группы', () => {
  const groups = [
    { itemGroupId: 'g1', name: 'Основа', required: true, items: [{ itemId: 'a', prices: pr(300) }, { itemId: 'b', prices: pr(350) }] },
    { itemGroupId: 'g2', name: 'Соус', items: [{ itemId: 'c', prices: pr(50), restrictions: { minQuantity: 1 } }] },
  ];
  const item = { itemId: 'l5', itemSizes: [{ sizeId: null, isDefault: true, prices: pr(0), itemModifierGroups: groups }] };
  const [one] = sellableSizes(item, priceOf());
  assert.equal(one.needsChoice, false);
  assert.equal(one.total, 350);
  assert.equal(one.groups[1].min, 1);
  assert.equal(one.groups[1].items[0].def, 1);
});

test('набор с двумя размерами за 0 — needsChoice у каждого размера', () => {
  const item = { itemId: 'l6', itemSizes: [
    { sizeId: 'z1', sizeName: 'Малый', isDefault: true, prices: pr(0), itemModifierGroups: lunchGroups() },
    { sizeId: 'z2', sizeName: 'Большой', prices: pr(0), itemModifierGroups: lunchGroups() },
  ] };
  const opt = itemOptions(sellableSizes(item, priceOf()), true);
  assert.equal(opt.sizes.length, 2);
  assert.ok(opt.sizes.every((z) => z.needsChoice === true));
});
