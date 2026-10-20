// Время готовки: длительности, норматив (iiko → медиана за 14 дней → нет), подсветка, разбор полей iiko
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cookInfo, cookLevel, cookNorm, iikoCookMinutes, median, parseCookingMinutes, parseIikoTime,
} from '../lib/cooking-time.js';
import { cookSlowText } from '../lib/notification-text.js';
import { mapAwaiting } from '../lib/awaiting.js';

const NOW = Date.parse('2026-10-20T12:00:00Z');
const ago = (min) => new Date(NOW - min * 60000).toISOString();

test('cookingTime из номенклатуры: число, «15», «00:15:00», «15 мин», мусор', () => {
  assert.equal(parseCookingMinutes(15), 15);
  assert.equal(parseCookingMinutes('15'), 15);
  assert.equal(parseCookingMinutes('00:15:00'), 15);
  assert.equal(parseCookingMinutes('15 мин'), 15);
  assert.equal(parseCookingMinutes('7,5'), 7.5);
  for (const bad of [null, undefined, '', 0, -3, 'нет', '00:00:00']) assert.equal(parseCookingMinutes(bad), null, String(bad));
});

test('iiko: длительность по cookingStartTime и cookingCompletedTime, терпимо к отсутствию полей', () => {
  assert.equal(iikoCookMinutes({ cookingStartTime: '2026-10-20 12:00:00.000', cookingCompletedTime: '2026-10-20 12:14:30.000' }), 14.5);
  assert.equal(iikoCookMinutes({ printTime: '2026-10-20 12:00:00.000', cookingCompletedTime: '2026-10-20 12:10:00.000' }), 10);
  assert.equal(iikoCookMinutes({ item: { cookingStartTime: '2026-10-20T12:00:00Z', cookingCompletedTime: '2026-10-20T12:05:00Z' } }), 5);
  assert.equal(iikoCookMinutes({ status: 'CookingCompleted' }), null);
  assert.equal(iikoCookMinutes({ cookingStartTime: '2026-10-20 12:00:00.000' }), null);
  assert.equal(iikoCookMinutes({ cookingStartTime: '2026-10-20 12:30:00', cookingCompletedTime: '2026-10-20 12:00:00' }), null, 'конец раньше начала');
  assert.equal(iikoCookMinutes(null), null);
  assert.equal(parseIikoTime('не время'), null);
});

test('медиана', () => {
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([4, 2, 8, 6]), 5);
  assert.equal(median([]), null);
  assert.equal(median([null, 'x', 0, 7]), 7);
});

test('норматив: iiko приоритетнее, иначе медиана от 5 замеров, иначе нет', () => {
  assert.deepEqual(cookNorm({ nomenclature: '00:12:00', history: [1, 2, 3, 4, 5, 6] }), { minutes: 12, source: 'iiko' });
  assert.deepEqual(cookNorm({ history: [10, 14, 12, 20, 11] }), { minutes: 12, source: 'history' });
  assert.equal(cookNorm({ history: [10, 14, 12, 20] }), null, 'меньше 5 замеров');
  assert.equal(cookNorm({}), null);
  assert.equal(cookNorm(), null);
});

test('подсветка: дольше норматива — жёлтая, дольше в 1,5 раза — красная', () => {
  const norm = { minutes: 10 };
  assert.equal(cookLevel(10, norm), 'ok');
  assert.equal(cookLevel(11, norm), 'warn');
  assert.equal(cookLevel(14.9, norm), 'warn');
  assert.equal(cookLevel(15, norm), 'bad');
  assert.equal(cookLevel(40, null), 'ok', 'без норматива подсветки нет');
});

test('готовится: «готовится 12 мин из ~15», начало — «Готовится», иначе отправка на кухню', () => {
  const norm = { minutes: 15, source: 'iiko' };
  const a = cookInfo({ sentAt: ago(20), startedAt: ago(12), kitchenStatus: 'CookingStarted' }, norm, NOW);
  assert.deepEqual([a.state, a.minutes, a.level, a.text], ['cooking', 12, 'ok', 'готовится 12 мин из ~15']);
  const b = cookInfo({ sentAt: ago(16), kitchenStatus: 'Added' }, norm, NOW);
  assert.deepEqual([b.minutes, b.level], [16, 'warn']);
  assert.equal(cookInfo({ sentAt: ago(23) }, norm, NOW).level, 'bad');
  assert.equal(cookInfo({ sentAt: ago(5) }, null, NOW).text, 'готовится 5 мин', 'без норматива — без «из ~»');
});

test('готово: «готово, ждёт выноса 4 мин»; вынесено: «приготовлено за 14 мин»', () => {
  const ready = cookInfo({ sentAt: ago(30), startedAt: ago(20), readyAt: ago(4), kitchenStatus: 'CookingCompleted' }, { minutes: 15 }, NOW);
  assert.deepEqual([ready.state, ready.waitingMinutes, ready.minutes, ready.text], ['ready', 4, 16, 'готово, ждёт выноса 4 мин']);
  const served = cookInfo({ sentAt: ago(30), startedAt: ago(20), readyAt: ago(6), servedAt: ago(2), cookMinutes: 14 }, null, NOW);
  assert.deepEqual([served.state, served.text], ['served', 'приготовлено за 14 мин']);
  // cook_minutes не записан — считаем по отметкам
  assert.equal(cookInfo({ sentAt: ago(30), readyAt: ago(10), servedAt: ago(1), kitchenStatus: 'Served' }, null, NOW).text, 'приготовлено за 20 мин');
});

test('уведомление «долго готовится»', () => {
  const t = cookSlowText({ table: 5, name: 'Филадельфия', minutes: 25.4 });
  assert.equal(`${t.title}: ${t.body}`, 'Стол 5 · Долго готовится: Филадельфия 25 мин');
});

test('выдача: готовится — подсветка по нормативу, готово — по ожиданию выноса', () => {
  const pid = 'p-1';
  const base = { session_id: 's', table_number: '5', name: 'Ролл', quantity: 1, iiko_product_id: pid };
  const norms = new Map([[pid, { minutes: 10, source: 'iiko' }]]);
  const [cooking, ready] = mapAwaiting([
    { ...base, id: '1', kitchen_status: 'CookingStarted', sent_at: ago(16), cooking_started_at: ago(13) },
    { ...base, id: '2', kitchen_status: 'CookingCompleted', sent_at: ago(40), ready_at: ago(3) },
  ], NOW, norms);
  assert.equal(cooking.level, 'warn');
  assert.equal(cooking.cook.text, 'готовится 13 мин из ~10');
  assert.equal(ready.level, 'ok');
  assert.equal(ready.cook.text, 'готово, ждёт выноса 3 мин');
});
