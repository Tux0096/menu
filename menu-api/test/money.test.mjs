// Деньги и заказы: дошла ли партия до iiko после потерянного ответа; долг гостя по строкам
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { batchLanded } from '../services/waiter.js';
import { kitchenDue } from '../services/payments.js';

const row = (pid, q, extra = {}) => ({ iiko_product_id: pid, quantity: q, ...extra });

test('партия в заказе iiko есть — повтор не нужен', () => {
  const snap = { exists: true, items: [{ productId: 'a', amount: 3 }, { productId: 'b', amount: 1 }] };
  assert.equal(batchLanded(snap, [row('a', 2)], [row('a', 1), row('b', 1)]), true);
});

test('партии в заказе нет — отправляем снова', () => {
  const snap = { exists: true, items: [{ productId: 'a', amount: 2 }] };
  assert.equal(batchLanded(snap, [row('a', 2)], [row('a', 1)]), false);
  assert.equal(batchLanded({ exists: false }, [], [row('a', 1)]), false);
});

const sum = (list) => list.reduce((n, i) => n + Number(i.line_total), 0);
const st = (items) => ({
  items, sum,
  kitchen: items.filter((i) => (i.source || 'main') === 'main'),
  bar: items.filter((i) => (i.source || 'main') !== 'main'),
});

test('гость оплатил свою часть, потом заказал десерт — десерт к оплате', () => {
  const s = st([
    { id: 1, guest_id: 'A', line_total: 1000, is_locked: true, paid_payment_id: 'p1' },
    { id: 2, guest_id: 'A', line_total: 300, is_locked: true, paid_payment_id: null },
    { id: 3, guest_id: 'B', line_total: 800, is_locked: true, paid_payment_id: null },
  ]);
  assert.equal(kitchenDue(s, ['A']).amount, 300);
  assert.equal(kitchenDue(s, null).amount, 1100);
  assert.deepEqual(kitchenDue(s, null).lines.map((l) => l.id), [2, 3]);
});

test('неотправленное и бар в онлайн-долг кухни не входят', () => {
  const s = st([
    { id: 1, guest_id: 'A', line_total: 500, is_locked: false, paid_payment_id: null },
    { id: 2, guest_id: 'A', line_total: 200, is_locked: true, paid_payment_id: null, source: 'bar' },
  ]);
  assert.equal(kitchenDue(s, null).amount, 0);
  assert.equal(kitchenDue(s, null).bar, 200);
});

test('неизвестный исход — только сеть, таймаут и 5xx; отказ команды iiko — точный', async () => {
  const { isUnknownOutcome } = await import('../iiko-client.js');
  assert.equal(isUnknownOutcome({ code: 'ECONNABORTED' }), true);
  assert.equal(isUnknownOutcome({ response: { status: 502 } }), true);
  assert.equal(isUnknownOutcome({ response: { status: 400 } }), false);
  assert.equal(isUnknownOutcome({ iikoCommand: true }), false);
});
