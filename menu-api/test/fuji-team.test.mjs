import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchRestaurant, normalizeCode } from '../lib/fuji-team.js';

const R = [
  { id: '1', slug: 'novo-sadovaya', name: 'Фуджи Ново-Садовая' },
  { id: '2', slug: 'leningradskaya', name: 'Фуджи Ленинградская' },
  { id: '3', slug: 'staro-zagora', name: 'Фуджи Ново-Садовая Загора' },
];

test('табельный: пробелы и ведущие нули не мешают', () => {
  assert.equal(normalizeCode(' 01270 '), '1270');
  assert.equal(normalizeCode(1270), '1270');
  assert.equal(normalizeCode('0'), '0');
  assert.equal(normalizeCode('A12'), 'A12');
  assert.equal(normalizeCode(null), '');
});

test('точка из «Фуджи Тим» → наш ресторан', () => {
  assert.equal(matchRestaurant(R, 'novo-sadovaya')?.id, '1');
  assert.equal(matchRestaurant(R, 'Фуджи Ленинградская')?.id, '2');
  assert.equal(matchRestaurant(R, 'ленинградская')?.id, '2');
  assert.equal(matchRestaurant(R, 'Ново-Садовая')?.id, '1', 'точное совпадение важнее вхождения');
  assert.equal(matchRestaurant(R, 'Ленинградская, 34')?.id, '2');
  assert.equal(matchRestaurant(R, ''), null);
  assert.equal(matchRestaurant(R, 'Дыбенко'), null, 'нет такой точки — выбор при входе');
});
