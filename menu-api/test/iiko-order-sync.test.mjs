import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aliveByProduct, isRemovedItem, matchOrderToSession, normalizeIikoOrder, orderKey, planAdditions, planRemovals,
  rowOrderCode, rowsOfOrder, tableNumberFromName, tableNumbersBySections,
} from '../lib/iiko-order-sync.js';

const P1 = '11111111-1111-4111-8111-111111111111';
const P2 = '22222222-2222-4222-8222-222222222222';
const P3 = '33333333-3333-4333-8333-333333333333';
const line = (id, amount, extra = {}) => ({ type: 'Product', product: { id, name: `Блюдо ${id.slice(0, 2)}` }, amount, price: 100, resultSum: 100 * amount, status: 'Added', ...extra });
const iikoOrder = (items, extra = {}) => ({ id: 'aaaaaaaa-0000-4000-8000-000000000001', status: 'New', tableIds: ['t1'], waiter: { id: 'e1', name: 'Анна' }, items, ...extra });
const row = (pid, quantity, extra = {}) => ({
  id: `row-${pid.slice(0, 2)}-${Math.random()}`, iiko_product_id: pid, name: `Блюдо ${pid.slice(0, 2)}`, quantity, line_total: quantity * 100,
  is_locked: true, source: 'main', sent_at: new Date(Date.now() - 10 * 60_000).toISOString(), kitchen_status: 'CookingStarted', ...extra,
});

test('нормализация: живые блюда отдельно от удалённых на кассе (deleted / removalType / Deleted)', () => {
  const n = normalizeIikoOrder({ id: 'x', order: iikoOrder([
    line(P1, 2),
    line(P2, 1, { deleted: { deletionMethod: { id: 'm' } } }),
    line(P3, 1, { removalType: 'writeoff' }),
    line(P3, 1, { status: 'Deleted' }),
    { type: 'Compound', product: { id: 'c' }, amount: 1 },
  ]) });
  assert.deepEqual(n.items.map((i) => [i.productId, i.amount]), [[P1, 2]]);
  assert.equal(n.removedItems.length, 3);
  assert.equal(n.waiter.id, 'e1');
  assert.equal(isRemovedItem({ deleted: false, status: 'Added' }), false);
});

test('нормализация: модификаторы, размер и сумма строки из iiko', () => {
  const n = normalizeIikoOrder(iikoOrder([line(P1, 2, {
    resultSum: 530, size: { id: 's1', name: 'Большая' },
    modifiers: [{ product: { id: 'm1', name: 'Сыр' }, amount: 2, price: 15, productGroupId: 'g1' }],
  })]));
  const [it] = n.items;
  assert.equal(it.sum, 530);
  assert.equal(it.sizeName, 'Большая');
  assert.deepEqual(it.modifiers, [{ id: 'm1', name: 'Сыр', amount: 2, groupId: 'g1', price: 15 }]);
});

test('сопоставление: заказа нет в системе и на столе нет визита — заводим визит', () => {
  assert.deepEqual(matchOrderToSession({ order: normalizeIikoOrder(iikoOrder([line(P1, 1)])) }), { action: 'create' });
});

test('сопоставление: на столе наш открытый визит, заказ чужой — прицепляем к нему', () => {
  const order = normalizeIikoOrder(iikoOrder([line(P1, 1)]));
  assert.deepEqual(matchOrderToSession({ order, openSession: { id: 's1' } }), { action: 'attach', sessionId: 's1' });
});

test('сопоставление: повторный опрос — заказ уже в визите, ничего не заводим', () => {
  const order = normalizeIikoOrder(iikoOrder([line(P1, 1)]));
  assert.deepEqual(matchOrderToSession({ order, knownIn: { id: 's1', open: true }, openSession: { id: 's1' } }), { action: 'sync', sessionId: 's1' });
  // наш собственный заказ (создан из меню) тоже «известный»
  assert.equal(matchOrderToSession({ order, knownIn: { id: 's2', open: true } }).action, 'sync');
});

test('сопоставление: визит с этим заказом закрыт у нас, на кассе заказ ещё висит — второй визит не заводим', () => {
  const order = normalizeIikoOrder(iikoOrder([line(P1, 1)]));
  assert.equal(matchOrderToSession({ order, knownIn: { id: 's1', open: false } }).action, 'skip');
});

test('сопоставление: закрытые и удалённые заказы не импортируются', () => {
  for (const status of ['Closed', 'Deleted']) {
    assert.equal(matchOrderToSession({ order: normalizeIikoOrder(iikoOrder([line(P1, 1)], { status })) }).action, 'skip');
  }
  assert.equal(matchOrderToSession({ order: { id: '' } }).action, 'skip');
});

test('код заказа: свободный main, затем «main#ID» — второй заказ на том же столе', () => {
  assert.equal(orderKey({}, 'main', 'aaaaaaaa-1'), 'main');
  assert.equal(orderKey({ main: { orderId: 'aaaaaaaa-1' } }, 'main', 'aaaaaaaa-1'), 'main');
  assert.equal(orderKey({ main: { orderId: 'bbbbbbbb-1' } }, 'main', 'aaaaaaaa-1-2'), 'main#aaaaaaaa');
  assert.equal(orderKey({ main: { orderId: 'b' } }, 'bar', 'aaaaaaaa-1'), 'bar');
});

test('строки заказа: у второго заказа визита — только его строки по ID заказа', () => {
  const orders = { main: { orderId: 'O1' }, 'main#bbbbbbbb': { orderId: 'O2' } };
  const items = [row(P1, 1, { iiko_order_id: 'O1' }), row(P2, 1, { iiko_order_id: 'O2' }), row(P3, 1, { iiko_order_id: null })];
  assert.deepEqual(rowsOfOrder(items, 'main', 'O1', orders).map((r) => r.iiko_product_id), [P1, P3]);
  assert.deepEqual(rowsOfOrder(items, 'main#bbbbbbbb', 'O2', orders).map((r) => r.iiko_product_id), [P2]);
  assert.equal(rowOrderCode(items[1], orders), 'main#bbbbbbbb');
});

test('дописанные позиции: новый заказ — все позиции, повторный опрос — ничего (без дублей)', () => {
  const items = normalizeIikoOrder(iikoOrder([line(P1, 2), line(P2, 1)])).items;
  const first = planAdditions(items, []);
  assert.deepEqual(first.map((a) => [a.productId, a.quantity, a.lineTotal]), [[P1, 2, 200], [P2, 1, 100]]);
  // то, что вставили, при следующем опросе уже «наше»
  const ours = first.map((a) => row(a.productId, a.quantity, { from_iiko: true }));
  assert.deepEqual(planAdditions(items, ours), []);
});

test('дописанные позиции: добавили на кассе позже — дописывается только новое', () => {
  const ours = [row(P1, 2), row(P2, 1)];
  const items = normalizeIikoOrder(iikoOrder([line(P1, 3), line(P2, 1), line(P3, 2, { status: 'Added' })])).items;
  const adds = planAdditions(items, ours);
  assert.deepEqual(adds.map((a) => [a.productId, a.quantity]), [[P1, 1], [P3, 2]]);
  assert.equal(adds[0].lineTotal, 100);
});

test('дописанные позиции: расхождение id (ни одно блюдо не совпало) — не дублируем', () => {
  const items = normalizeIikoOrder(iikoOrder([line(P3, 1)])).items;
  assert.deepEqual(planAdditions(items, [row(P1, 1)]), []);
});

test('удаление: позиции нет в заказе iiko — строка убирается', () => {
  const rows = [row(P1, 2), row(P2, 1)];
  const alive = aliveByProduct(normalizeIikoOrder(iikoOrder([line(P1, 2)])).items);
  const plan = planRemovals(rows, alive);
  assert.equal(plan.length, 1);
  assert.deepEqual([plan[0].id, plan[0].quantity, plan[0].remaining], [rows[1].id, 1, 0]);
});

test('уменьшение количества на кассе: строка уменьшается, остаток сохраняется', () => {
  const rows = [row(P1, 3)];
  const alive = aliveByProduct(normalizeIikoOrder(iikoOrder([line(P1, 2), line(P2, 1)])).items);
  const [r] = planRemovals(rows, alive);
  assert.deepEqual([r.quantity, r.remaining], [1, 2]);
});

test('удаление готового блюда: убираем и его (менеджер удалил на кассе); пока не готовое — первым', () => {
  const ready = row(P1, 1, { kitchen_status: 'CookingCompleted' });
  const cooking = row(P1, 1, { kitchen_status: 'CookingStarted' });
  // удалили одно из двух одинаковых — убирается то, что ещё не готово
  let alive = aliveByProduct(normalizeIikoOrder(iikoOrder([line(P1, 1), line(P2, 1)])).items);
  let plan = planRemovals([ready, cooking, row(P2, 1)], alive);
  assert.deepEqual(plan.map((p) => p.id), [cooking.id]);
  // удалили единственное готовое — оно уходит
  alive = aliveByProduct(normalizeIikoOrder(iikoOrder([line(P2, 1)])).items);
  plan = planRemovals([ready, row(P2, 1)], alive);
  assert.deepEqual(plan.map((p) => [p.id, p.wasReady]), [[ready.id, true]]);
  // вынесенное тоже
  const served = row(P1, 1, { served_at: new Date().toISOString(), kitchen_status: 'Served' });
  assert.equal(planRemovals([served, row(P2, 1)], alive).length, 1);
});

test('удаление с причиной: блюдо с deleted / removalType / Deleted в заказе не считается живым', () => {
  const n = normalizeIikoOrder(iikoOrder([line(P1, 1, { removalType: 'cancel' }), line(P2, 1)]));
  const plan = planRemovals([row(P1, 1), row(P2, 1)], aliveByProduct(n.items));
  assert.deepEqual(plan.map((p) => p.quantity), [1]);
  assert.equal(plan[0].name, 'Блюдо 11');
});

test('удаление: оплаченное онлайн помечено — официанту подсказка про возврат', () => {
  const paid = row(P1, 1, { paid_payment_id: 'pay-1' });
  const [r] = planRemovals([paid, row(P2, 1)], aliveByProduct([{ productId: P2, amount: 1 }]));
  assert.equal(r.paidOnline, true);
});

test('удаление: только что отправленное нами не трогаем (add_items мог не дойти), пришедшее из iiko — сразу', () => {
  const fresh = row(P1, 1, { sent_at: new Date().toISOString() });
  const alive = aliveByProduct([{ productId: P2, amount: 1 }]);
  assert.deepEqual(planRemovals([fresh, row(P2, 1)], alive), []);
  const imported = row(P1, 1, { sent_at: new Date().toISOString(), from_iiko: true });
  assert.equal(planRemovals([imported, row(P2, 1)], alive).length, 1);
});

test('удаление: заказ удалён целиком — убираем все строки', () => {
  const plan = planRemovals([row(P1, 2), row(P2, 1, { sent_at: new Date().toISOString() })], new Map(), { orderDeleted: true });
  assert.equal(plan.length, 2);
  assert.ok(plan.every((p) => p.remaining === 0));
});

test('удаление: расхождение id с меню — не удаляем', () => {
  assert.deepEqual(planRemovals([row(P1, 1)], aliveByProduct([{ productId: P3, amount: 1 }])), []);
});

test('столы: название стола iiko → наш номер', () => {
  assert.equal(tableNumberFromName('Стол 5'), '5');
  assert.equal(tableNumberFromName('07'), '7');
  assert.equal(tableNumberFromName('Веранда-3'), 'Веранда-3');
  assert.equal(tableNumberFromName('Банкетный зал номер три'), null);
  const map = tableNumbersBySections({ restaurantSections: [{ tables: [
    { id: 't1', name: 'Стол 1' }, { id: 't2', name: '2', isDeleted: false }, { id: 't3', name: 'Стол 3', isDeleted: true }, { name: 'без id' },
  ] }] });
  assert.deepEqual([...map], [['t1', '1'], ['t2', '2']]);
});
