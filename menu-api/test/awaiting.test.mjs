// «Выдача»: сортировка (готовые выше, дольше ждут — выше), пороги подсветки, поиск по названию
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { awaitingDishes, buildAwaiting, filterAwaiting, mapAwaiting, sortAwaiting, waitLevel } from '../lib/awaiting.js';
import { AWAIT_BAD_MIN, AWAIT_WARN_MIN } from '../lib/table-workflow-config.js';

const NOW = Date.parse('2026-10-20T12:00:00Z');
const ago = (min) => new Date(NOW - min * 60000).toISOString();
const row = (id, table, name, kitchen, sentMin, readyMin = null, extra = {}) => ({
  id, session_id: `s-${table}`, table_number: table, name, quantity: 1, kitchen_status: kitchen,
  sent_at: ago(sentMin), ready_notified_at: readyMin == null ? null : ago(readyMin), ...extra,
});

test('пороги: обычное до 10 минут, жёлтое от 10, красное от 20', () => {
  assert.equal(AWAIT_WARN_MIN, 10);
  assert.equal(AWAIT_BAD_MIN, 20);
  assert.equal(waitLevel(0), 'ok');
  assert.equal(waitLevel(9), 'ok');
  assert.equal(waitLevel(10), 'warn');
  assert.equal(waitLevel(19), 'warn');
  assert.equal(waitLevel(20), 'bad');
  assert.equal(waitLevel(45), 'bad');
});

test('ожидание: готовое — от готовности, остальное — от отправки на кухню', () => {
  const [ready, cooking] = mapAwaiting([
    row('1', '5', 'Филадельфия', 'CookingCompleted', 30, 12),
    row('2', '6', 'Филадельфия', 'CookingStarted', 14),
  ], NOW);
  assert.equal(ready.state, 'ready');
  assert.equal(ready.waitingMinutes, 12);
  assert.equal(ready.level, 'warn');
  assert.equal(cooking.state, 'cooking');
  assert.equal(cooking.waitingMinutes, 14);
});

test('сортировка: сначала готовые, потом готовящиеся; внутри группы кто дольше ждёт — выше', () => {
  const list = mapAwaiting([
    row('a', '1', 'Ролл', 'CookingStarted', 25),
    row('b', '2', 'Ролл', 'CookingCompleted', 40, 3),
    row('c', '3', 'Ролл', 'CookingCompleted', 40, 9),
    row('d', '4', 'Ролл', 'CookingStarted', 5),
    row('e', '5', 'Ролл', null, 2),
  ], NOW);
  assert.deepEqual(sortAwaiting(list).map((i) => i.itemId), ['c', 'b', 'a', 'd', 'e']);
});

test('поиск по названию: без регистра, по части слова, «е» = «ё»', () => {
  const list = mapAwaiting([
    row('1', '1', 'Филадельфия классик', 'CookingCompleted', 10, 1),
    row('2', '2', 'Мисо суп', 'CookingStarted', 5),
    row('3', '3', 'Тёплый салат', 'CookingStarted', 5),
  ], NOW);
  assert.deepEqual(filterAwaiting(list, 'фила').map((i) => i.itemId), ['1']);
  assert.deepEqual(filterAwaiting(list, 'ТЕПЛЫЙ').map((i) => i.itemId), ['3']);
  assert.equal(filterAwaiting(list, '').length, 3);
  assert.equal(filterAwaiting(list, 'пицца').length, 0);
});

test('подсказки: названия блюд, которые ждут выноса, готовые выше', () => {
  const list = mapAwaiting([
    row('1', '1', 'Ролл', 'CookingStarted', 5),
    row('2', '2', 'Ролл', 'CookingStarted', 5, null, { quantity: 2 }),
    row('3', '3', 'Суп', 'CookingCompleted', 9, 2),
  ], NOW);
  assert.deepEqual(awaitingDishes(list), [
    { name: 'Суп', quantity: 1, ready: 1, tables: 1 },
    { name: 'Ролл', quantity: 3, ready: 0, tables: 2 },
  ]);
});

test('ответ API: подсказки по всем блюдам, список — по запросу', () => {
  const res = buildAwaiting([
    row('1', '5', 'Филадельфия', 'CookingCompleted', 30, 4, { guest_name: 'Мария', quantity: 2, waiter_name: 'Анна' }),
    row('2', '7', 'Мисо суп', 'CookingStarted', 3),
  ], 'филад', NOW);
  assert.equal(res.dishes.length, 2);
  assert.equal(res.items.length, 1);
  assert.deepEqual(
    { t: res.items[0].tableNumber, q: res.items[0].quantity, g: res.items[0].guestName, w: res.items[0].waiterName },
    { t: '5', q: 2, g: 'Мария', w: 'Анна' },
  );
  assert.equal(res.warnMinutes, 10);
  assert.equal(res.badMinutes, 20);
});
