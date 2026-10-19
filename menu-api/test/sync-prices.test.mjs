// Цены позиций внешнего меню iiko: пицца с 0 у размера «по умолчанию», вок с платной основой, цена из прейскуранта кассы
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sellableSizes, itemOptions, minRequired } from '../db/sync-iiko.js';

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
