// Цена варианта на сервере: набор «Собери свой ланч» (база 0, needsChoice) не продаётся без платного выбора
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priceVariant } from '../services/menu-pricing.js';

const groups = [
  { id: 'g-salad', name: 'Салат или ролл', min: 0, max: 1, free: 0, items: [{ id: 'r1', name: 'Ролл Гонконг', price: 190, def: 0, max: 0 }, { id: 's1', name: 'Цезарь', price: 170, def: 0, max: 0 }] },
  { id: 'g-soup', name: 'Суп', min: 0, max: 1, free: 0, items: [{ id: 'c1', name: 'Крем-суп грибной', price: 200, def: 0, max: 0 }] },
];
const lunch = { name: 'Собери свой ланч', price: 170, base: 0, sizes: [], groups, needsChoice: true };

test('набор без выбора — 400 «выберите состав»', () => {
  assert.throws(() => priceVariant(lunch, 'l1', { modifiers: [] }), (e) => e.status === 400 && /состав/.test(e.message));
  assert.throws(() => priceVariant(lunch, 'l1', { modifiers: [], defaults: true }), (e) => e.status === 400);
});

test('набор с выбором — сумма выбранных блюд, цена в заказ не из запроса', () => {
  const v = priceVariant(lunch, 'l1', { modifiers: [{ id: 's1', amount: 1 }, { id: 'c1', amount: 1 }] });
  assert.equal(v.price, 370);
  assert.equal(v.text, 'Цезарь, Крем-суп грибной');
});

test('вок (база 0, обязательная платная основа) — как раньше: без выбора — самая дешёвая основа', () => {
  const wok = { name: 'Вок', price: 429, base: 0, sizes: [], groups: [
    { id: 'g1', name: 'Основа', min: 1, max: 1, free: 0, items: [{ id: 'm1', name: 'Удон', price: 459, def: 0, max: 0 }, { id: 'm2', name: 'Рис', price: 429, def: 0, max: 0 }] },
  ], needsChoice: false };
  assert.equal(priceVariant(wok, 'w1', { modifiers: [] }).price, 429);
});

test('набор с ценой 390 и бесплатными блюдами — 390 и без выбора', () => {
  const set = { name: 'Салат / Ролл + Суп', price: 390, base: 390, sizes: [], groups: groups.map((g) => ({ ...g, items: g.items.map((m) => ({ ...m, price: 0 })) })), needsChoice: false };
  assert.equal(priceVariant(set, 'l2', { modifiers: [] }).price, 390);
});
