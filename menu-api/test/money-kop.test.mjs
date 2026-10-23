// Деньги в целых копейках: lib/money.js, цена варианта, сплит
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromKop, mulKop, splitKop, sumKop, toKop } from '../lib/money.js';
import { kitchenDue } from '../services/payments.js';
import { priceVariant } from '../services/menu-pricing.js';

test('0.1 + 0.2 = 30 копеек, а не 30.000000000000004', () => {
  assert.equal(sumKop([0.1, 0.2]), 30);
  assert.equal(fromKop(sumKop([0.1, 0.2])), 0.3);
  assert.notEqual(0.1 + 0.2, 0.3);
});

test('toKop: числа, строки NUMERIC, мусор', () => {
  assert.equal(toKop('1027.00'), 102700);
  assert.equal(toKop('12.5'), 1250);
  assert.equal(toKop('0.005'), 1);
  assert.equal(toKop(1.005), 101);
  assert.equal(toKop(19.99), 1999);
  assert.equal(toKop(-0.1), -10);
  assert.equal(toKop(null), 0);
  assert.equal(toKop('abc'), 0);
  assert.equal(toKop(NaN), 0);
});

test('sumKop по полю строк и точное сравнение с суммой платежа', () => {
  const rows = [{ line_total: '342.33' }, { line_total: '342.33' }, { line_total: '342.34' }];
  assert.equal(sumKop(rows, (r) => r.line_total), 102700);
  assert.equal(fromKop(102700), 1027);
  assert.ok(toKop(1026.99) < toKop(1027)); // допуска «+0.01» нет
});

test('splitKop: остаток копеек не теряется', () => {
  assert.deepEqual(splitKop(10000, 3), [3334, 3333, 3333]);
  assert.equal(splitKop(102700, 7).reduce((a, b) => a + b, 0), 102700);
  assert.deepEqual(splitKop(5, 2), [3, 2]);
  assert.deepEqual(splitKop(100, 0), [100]);
  assert.equal(mulKop(3333, 3), 9999);
});

test('сплит стола по гостям сходится копейка в копейку', () => {
  const items = [
    { id: 1, guest_id: 'A', line_total: '0.10', is_locked: true, paid_payment_id: null },
    { id: 2, guest_id: 'B', line_total: '0.20', is_locked: true, paid_payment_id: null },
    { id: 3, guest_id: 'C', line_total: '333.33', is_locked: true, paid_payment_id: null },
  ];
  const st = { items, kitchen: items, bar: [], sum: (l) => fromKop(sumKop(l, (i) => i.line_total)) };
  const a = kitchenDue(st, ['A']).amount;
  const b = kitchenDue(st, ['B']).amount;
  const c = kitchenDue(st, ['C']).amount;
  assert.equal(toKop(a) + toKop(b) + toKop(c), toKop(kitchenDue(st, null).amount));
  assert.equal(kitchenDue(st, ['A', 'B']).amount, 0.3);
});

test('цена варианта: модификаторы по 0.1 и 0.2 дают ровно 0.30 сверху', () => {
  const entry = {
    name: 'Чай', price: 100, base: 100, sizes: [],
    groups: [{ id: 'g', name: 'Добавки', min: 0, max: 5, free: 0, items: [
      { id: 'a', name: 'Мёд', price: 0.1, def: 0, max: 0 }, { id: 'b', name: 'Лимон', price: 0.2, def: 0, max: 0 }] }],
  };
  const v = priceVariant(entry, 't1', { modifiers: [{ id: 'a', amount: 1 }, { id: 'b', amount: 1 }] });
  assert.equal(v.price, 100.3);
  const free = priceVariant({ ...entry, groups: [{ ...entry.groups[0], free: 1 }] }, 't1', { modifiers: [{ id: 'a', amount: 1 }, { id: 'b', amount: 1 }] });
  assert.equal(free.price, 100.2); // бесплатна самая дешёвая единица
});
