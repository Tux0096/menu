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

test('подсказка запроса по структуре базы', async () => {
  const { suggestStaffQuery } = await import('../lib/fuji-team.js');
  const s = suggestStaffQuery([
    { schema: 'public', name: 'restaurants', columns: [{ name: 'id' }, { name: 'name' }] },
    { schema: 'public', name: 'employees', columns: [{ name: 'id' }, { name: 'tab_number' }, { name: 'full_name' }, { name: 'position' }, { name: 'point' }, { name: 'is_fired', type: 'boolean' }] },
  ]);
  assert.equal(s.table, 'public.employees');
  assert.equal(s.query, 'SELECT "tab_number" AS code, "full_name" AS name, "position" AS position, "point" AS restaurant, NOT COALESCE("is_fired", false) AS active FROM "public"."employees"');
  assert.equal(s.note, '');
  assert.equal(suggestStaffQuery([{ schema: 'public', name: 'x', columns: [{ name: 'id' }] }]), null);
});
