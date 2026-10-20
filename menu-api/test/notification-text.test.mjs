// Тексты уведомлений: короткое событие вместо всего заказа
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assignedText, billText, callText, linesText, mergeLines, newOrderText, plural, readyText, readyWaitText, removedText,
  reorderText, rubText, unassignedText, waitText,
} from '../lib/notification-text.js';

const line = (e) => `${e.title} · ${e.body}`.replace(/ /g, ' ');

test('сумма с пробелами тысяч и знаком рубля', () => {
  assert.equal(rubText(1487).replace(/ /g, ' '), '1 487 ₽');
  assert.equal(rubText(2055.4).replace(/ /g, ' '), '2 055 ₽');
  assert.equal(rubText(0).replace(/ /g, ' '), '0 ₽');
});

test('склонение «позиция»', () => {
  assert.equal(plural(1, 'позиция', 'позиции', 'позиций'), 'позиция');
  assert.equal(plural(3, 'позиция', 'позиции', 'позиций'), 'позиции');
  assert.equal(plural(5, 'позиция', 'позиции', 'позиций'), 'позиций');
  assert.equal(plural(11, 'позиция', 'позиции', 'позиций'), 'позиций');
  assert.equal(plural(21, 'позиция', 'позиции', 'позиций'), 'позиция');
});

test('новый заказ: «Стол 5 · Новый заказ · 3 позиции · 1 487 ₽»', () => {
  assert.equal(line(newOrderText({ table: 5, count: 3, sum: 1487 })), 'Стол 5 · Новый заказ · 3 позиции · 1 487 ₽');
});

test('дозаказ — только новые позиции', () => {
  assert.equal(line(reorderText({ table: 5, lines: [{ name: 'Мисо суп', qty: 2 }] })), 'Стол 5 · Дозаказ · Мисо суп ×2');
});

test('готово — только то, что стало готово сейчас', () => {
  assert.equal(line(readyText({ table: 5, lines: [{ name: 'Филадельфия', qty: 2 }] })), 'Стол 5 · Готово · Филадельфия ×2');
});

test('счёт: способ оплаты и сумма; «за часть стола» — имена', () => {
  assert.equal(line(billText({ table: 5, method: 'card', amount: 2055 })), 'Стол 5 · Просит счёт картой · 2 055 ₽');
  assert.equal(line(billText({ table: 5, method: 'cash', amount: 900, scope: 'guests', names: ['Мария', 'Олег'] })),
    'Стол 5 · Просит счёт наличными · 900 ₽ · Мария и Олег');
  assert.equal(line(billText({ table: 5, amount: 100 })), 'Стол 5 · Просит счёт · 100 ₽');
});

test('вызов: причина и комментарий', () => {
  assert.equal(line(callText({ table: 5, reasonText: 'нужны приборы / салфетки' })), 'Стол 5 · Вызов · нужны приборы / салфетки');
  assert.equal(line(callText({ table: 5, reasonText: 'вопрос по блюдам', comment: 'без лука?' })), 'Стол 5 · Вызов · вопрос по блюдам: без лука?');
});

test('долго ждут: «Ждёт 15 мин»', () => {
  assert.equal(line(waitText({ table: 5, minutes: 15, label: 'Просит счёт' })), 'Стол 5 · Ждёт 15 мин · Просит счёт');
  assert.equal(line(readyWaitText({ table: 5, minutes: 6, lines: [{ name: 'Рамен', qty: 1 }] })), 'Стол 5 · Готово, не вынесено 6 мин · Рамен ×1');
});

test('удалено на кассе', () => {
  assert.equal(line(removedText({ table: 5, lines: [{ name: 'Рамен', qty: 1 }, { name: 'Чай', qty: 2 }] })),
    'Стол 5 · На кассе удалено · Рамен ×1, Чай ×2');
  assert.match(removedText({ table: 5, lines: [{ name: 'Рамен', qty: 1 }], refund: true }).body, /возврат/);
  assert.equal(removedText({ table: 5, lines: [], orderDeleted: true }).title, 'Стол 5 · На кассе удалён заказ');
});

test('длинный список обрезается: «и ещё N»', () => {
  const lines = Array.from({ length: 7 }, (_, i) => ({ name: `Блюдо ${i + 1}`, qty: 1 }));
  assert.equal(linesText(lines, 4), 'Блюдо 1 ×1, Блюдо 2 ×1, Блюдо 3 ×1, Блюдо 4 ×1 и ещё 3');
});

test('склейка одинаковых событий: «Готово: А ×1, Б ×2»', () => {
  const merged = mergeLines([{ name: 'А', qty: 1 }, { name: 'Б', qty: 1 }], [{ name: 'Б', qty: 1 }, { name: 'А', qty: 0 }]);
  assert.deepEqual(merged, [{ name: 'А', qty: 1 }, { name: 'Б', qty: 2 }]);
  assert.equal(readyText({ table: 2, lines: merged }).body, 'А ×1, Б ×2');
  assert.deepEqual(mergeLines([{ name: 'А', qty: 1 }], [{ name: 'А', qty: 2 }]), [{ name: 'А', qty: 3 }]);
});

test('назначение стола: «Стол N взял(а) Анна»', () => {
  assert.equal(assignedText({ table: 7, name: 'Анна' }).title, 'Стол 7 взял(а) Анна');
  assert.match(unassignedText({ table: 7, name: 'Анна' }).title, /Отдан в общие/);
});
