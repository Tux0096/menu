// Должность iiko → роль в приложении; режим входа на of.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveLoginMode, roleForPositions } from '../lib/iiko-roles.js';

test('официант и прочий зал → waiter', () => {
  for (const n of ['Официант', 'Старший официант', 'Бармен', 'Хостес', 'Раннер', 'Кассир']) {
    assert.equal(roleForPositions([n], {}), 'waiter', n);
  }
});

test('администратор, менеджер, управляющий, директор → manager', () => {
  for (const n of ['Администратор', 'Менеджер зала', 'Управляющий', 'Управляющий рестораном', 'Администратор зала']) {
    assert.equal(roleForPositions([n], {}), 'manager', n);
  }
});

test('несколько должностей: старшая побеждает', () => {
  assert.equal(roleForPositions(['Официант', 'Администратор'], {}), 'manager');
  assert.equal(roleForPositions(['Повар', 'Официант'], {}), 'waiter');
});

test('не зал и системный администратор → null', () => {
  assert.equal(roleForPositions(['Повар', 'Курьер'], {}), null);
  assert.equal(roleForPositions(['Системный администратор'], {}), null);
  assert.equal(roleForPositions([], {}), null);
});

test('IIKO_HALL_ROLES переопределяет список зальных должностей', () => {
  assert.equal(roleForPositions(['Бармен'], { IIKO_HALL_ROLES: 'официант' }), null);
  assert.equal(roleForPositions(['Официант'], { IIKO_HALL_ROLES: 'официант' }), 'waiter');
});

test('режим входа: iiko только при IIKO_STAFF_LOGIN=on и не в демо', () => {
  assert.equal(resolveLoginMode({ IIKO_STAFF_LOGIN: 'on' }, false), 'iiko');
  assert.equal(resolveLoginMode({ IIKO_STAFF_LOGIN: 'ON' }, false), 'iiko');
  assert.equal(resolveLoginMode({ IIKO_STAFF_LOGIN: 'on' }, true), 'pin');
  assert.equal(resolveLoginMode({ IIKO_STAFF_LOGIN: 'off' }, false), 'pin');
  assert.equal(resolveLoginMode({}, false), 'pin');
});
