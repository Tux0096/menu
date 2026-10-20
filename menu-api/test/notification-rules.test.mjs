// Кому уходят уведомления и push: общий стол → всем, назначенный → только свой, тревоги → всем
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BROADCAST_TYPES, feedVisible, pushAudience } from '../lib/notification-rules.js';
import { filterDevices } from '../services/push.js';

const ANNA = { id: 'a-1', role: 'waiter' };
const BORIS = { id: 'b-2', role: 'waiter' };
const MGR = { id: 'm-3', role: 'manager' };

test('push: стол без официанта → всем телефонам точки', () => {
  for (const type of ['cart_ready', 'call_waiter', 'bill_requested', 'dish_ready', 'reorder_intent']) {
    assert.equal(pushAudience({ type, waiterId: null }), null, type);
  }
});

test('push: у стола есть официант → только ему', () => {
  for (const type of ['cart_ready', 'call_waiter', 'bill_requested', 'dish_ready']) {
    assert.deepEqual(pushAudience({ type, waiterId: 'a-1' }), ['a-1'], type);
  }
});

test('push: тревоги («долго ждут», ошибка iiko) → всем, даже если у стола есть официант', () => {
  assert.deepEqual([...BROADCAST_TYPES].sort(), ['iiko_error', 'wait_too_long']);
  for (const type of BROADCAST_TYPES) assert.equal(pushAudience({ type, waiterId: 'a-1' }), null, type);
});

test('push: устройства фильтруются — null все, массив только перечисленные', () => {
  const devices = [{ token: 't1', staff_id: 'a-1' }, { token: 't2', staff_id: 'b-2' }];
  assert.equal(filterDevices(devices, null).length, 2);
  assert.deepEqual(filterDevices(devices, ['a-1']).map((d) => d.token), ['t1']);
  // телефон официанта стола не зарегистрирован — другим не отправляем
  assert.deepEqual(filterDevices(devices, ['c-9']), []);
});

test('лента: общий стол видят все официанты', () => {
  assert.ok(feedVisible({ type: 'cart_ready', tableWaiterId: null, staff: ANNA }));
  assert.ok(feedVisible({ type: 'cart_ready', tableWaiterId: null, staff: BORIS }));
});

test('лента: назначенный стол — только его официант, чужие столы скрыты', () => {
  assert.ok(feedVisible({ type: 'cart_ready', tableWaiterId: 'a-1', staff: ANNA }));
  assert.ok(!feedVisible({ type: 'cart_ready', tableWaiterId: 'a-1', staff: BORIS }));
  assert.ok(!feedVisible({ type: 'dish_ready', tableWaiterId: 'a-1', staff: BORIS }));
});

test('лента: тревоги и смена официанта видны всем', () => {
  for (const type of ['wait_too_long', 'iiko_error', 'table_assigned', 'table_unassigned']) {
    assert.ok(feedVisible({ type, tableWaiterId: 'a-1', staff: BORIS }), type);
  }
});

test('лента: управляющий видит всё', () => {
  assert.ok(feedVisible({ type: 'cart_ready', tableWaiterId: 'a-1', staff: MGR }));
  assert.ok(feedVisible({ type: 'call_waiter', tableWaiterId: 'b-2', staff: { id: 'x', role: 'admin' } }));
});
