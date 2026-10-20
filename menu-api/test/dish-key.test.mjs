// Разделы кухни и бара не сливаются; одноимённые блюда из разных разделов — разные строки и карточки
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assignDishVariants, dishCardKey, dishRowKey } from '../lib/dish-key.js';
import { categoryKey, menuKey } from '../lib/menu-key.js';
import { applyCategorySettings, mergeSameNamedGroups } from '../services/catalog.js';

const row = (point, id, name, section, source = 'main') => ({ point, id, name, section, source });

test('ключ названия не теряет «Детская»: это разные блюда', () => {
  assert.notEqual(menuKey('Карбонара'), menuKey('Детская карбонара'));
  assert.equal(menuKey('ЗАЛ Паста карбонара (ИП)'), menuKey('паста Карбонара'));
});

test('одно название в «Пасте» и «Детском меню» на точке: основное — из «Пасты», детское — отдельный вариант', () => {
  const v = assignDishVariants([
    row('a', 'k1', 'Карбонара', 'Детское меню'),
    row('a', 'p1', 'Карбонара', 'Паста'),
  ]);
  assert.equal(v.get('p1'), '', 'основное блюдо под обычным ключом — старая карточка цела');
  assert.equal(v.get('k1'), 'детское меню');
  assert.notEqual(dishCardKey('Карбонара', v.get('k1')), dishCardKey('Карбонара', v.get('p1')));
  assert.equal(dishRowKey('Карбонара', 'main', v.get('p1')), 'карбонара');
  assert.equal(dishRowKey('Карбонара', 'main', v.get('k1')), 'карбонара|детское меню');
});

test('порядок строк не важен: служебный раздел никогда не основной', () => {
  const v = assignDishVariants([row('a', 'k1', 'Паста карбонара', 'Бизнес-ланч'), row('a', 'p1', 'Паста карбонара', 'Паста')]);
  assert.equal(v.get('p1'), '');
  assert.equal(v.get('k1'), 'бизнес ланч');
});

test('два обычных раздела: основной — первый, второй получает ключ раздела', () => {
  const v = assignDishVariants([
    row('a', 'w1', 'Вок Рис Двойная Курица', 'Вок Лапша'),
    row('a', 'w2', 'Вок Рис Двойная Курица', 'Вок Рис'),
  ]);
  assert.equal(v.get('w1'), '');
  assert.equal(v.get('w2'), 'вок рис');
});

test('между точками склеиваем по названию и разделу', () => {
  const v = assignDishVariants([
    row('a', 'a-pasta', 'Карбонара', 'Паста'),
    row('a', 'a-kids', 'Карбонара', 'Детское меню'),
    row('b', 'b-kids', 'Карбонара', 'Детское меню'), // на точке b — только детская
    row('c', 'c-pasta', 'Карбонара', 'Паста'),
  ]);
  assert.equal(v.get('b-kids'), v.get('a-kids'));
  assert.equal(v.get('c-pasta'), v.get('a-pasta'));
  assert.equal(v.get('a-pasta'), '');
  assert.equal(v.get('b-kids'), 'детское меню');
});

test('без расхождения ключи прежние; тот же ID в двух разделах и разные объёмы в одном разделе — не повод делить', () => {
  const v = assignDishVariants([
    row('a', 'x', 'Борщ', 'Супы'),
    row('a', 'b330', 'Пиво Ловенбрау', 'Разливное пиво', 'bar'),
    row('a', 'b500', 'Пиво Ловенбрау', 'Разливное пиво', 'bar'),
    row('a', 'n', 'Нигири', 'Суши'),
    row('a', 'n', 'Нигири', 'Бизнес-ланч'), // одна строка products — тот же ID
  ]);
  assert.deepEqual([...v.values()], ['', '', '', '']);
  assert.equal(dishRowKey('Пиво Ловенбрау', 'bar'), 'пиво ловенбрау|bar');
});

test('кухня и бар по-прежнему разные строки, а карточку по названию делят', () => {
  const v = assignDishVariants([row('a', 'k', 'Кола', 'Напитки', 'main'), row('a', 'b', 'Кола', 'Напитки', 'bar')]);
  assert.equal(v.get('k'), '');
  assert.equal(v.get('b'), '');
  assert.notEqual(dishRowKey('Кола', 'main'), dishRowKey('Кола', 'bar'));
  assert.equal(dishCardKey('Кола'), 'кола');
});

test('«Американо» бара из «Бизнес-ланча» и из «Кофе» — две строки', () => {
  const v = assignDishVariants([row('a', 'bl', 'Американо', 'Бизнес-ланч', 'bar'), row('a', 'cf', 'Американо', 'Кофе', 'bar')]);
  assert.equal(v.get('cf'), '');
  assert.equal(v.get('bl'), 'бизнес ланч');
  assert.equal(dishRowKey('Американо', 'bar', v.get('bl')), 'американо|bar|бизнес ланч');
});

// --- разделы кухни и бара ---
const grp = (id, name, order = 0) => ({ id, name, parentGroup: null, order });
const prod = (id, parentGroup, source = 'main') => ({ id, parentGroup, source });

test('«Бизнес-ланч» кухни и бара остаются двумя разделами со своими блюдами', () => {
  const groups = [grp('k', 'Бизнес-ланч'), grp('b', 'Бизнес-ланч')];
  const products = [prod('soup', 'k'), prod('salad', 'k'), prod('americano', 'b', 'bar'), prod('latte', 'b', 'bar')];
  const m = mergeSameNamedGroups(groups, products);
  assert.deepEqual(m.groups.map((g) => g.id), ['k', 'b']);
  assert.deepEqual(m.products.map((p) => [p.id, p.parentGroup]), [['soup', 'k'], ['salad', 'k'], ['americano', 'b'], ['latte', 'b']]);
});

test('одноимённые разделы одного источника по-прежнему сливаются, дубли блюд убираются', () => {
  const groups = [grp('k1', 'Супы'), grp('k2', 'супы')];
  const products = [prod('a', 'k1'), prod('a', 'k2'), prod('b', 'k2')];
  const m = mergeSameNamedGroups(groups, products);
  assert.deepEqual(m.groups.map((g) => g.id), ['k1']);
  assert.deepEqual(m.products.map((p) => [p.id, p.parentGroup]), [['a', 'k1'], ['b', 'k1']]);
});

test('ключ раздела: у бара «название|bar», у кухни прежний', () => {
  assert.equal(categoryKey('Бизнес-ланч'), 'бизнес ланч');
  assert.equal(categoryKey('Бизнес-ланч', true), 'бизнес ланч|bar');
  assert.equal(categoryKey('', true), '');
});

test('настройки разделов кухни и бара применяются раздельно', () => {
  const groups = [
    { id: 'k', name: 'Бизнес-ланч', order: 5, isBar: false, barSource: false },
    { id: 'b', name: 'Бизнес-ланч', order: 6, isBar: true, barSource: true },
  ];
  const products = [prod('soup', 'k'), prod('americano', 'b', 'bar')];
  const settings = new Map([
    ['бизнес ланч', { title: 'Ланч кухни', tab: 'kitchen', sortOrder: 1, hidden: false, image: null }],
    ['бизнес ланч|bar', { title: 'Напитки к ланчу', tab: 'bar', sortOrder: 2, hidden: false, image: null }],
  ]);
  const r = applyCategorySettings(groups, products, settings);
  const byId = Object.fromEntries(r.groups.map((g) => [g.id, g]));
  assert.equal(byId.k.name, 'Ланч кухни');
  assert.equal(byId.k.isBar, false);
  assert.equal(byId.b.name, 'Напитки к ланчу');
  assert.equal(byId.b.isBar, true);
});

test('скрытие раздела бара не прячет одноимённый раздел кухни', () => {
  const groups = [
    { id: 'k', name: 'Бизнес-ланч', order: 5, barSource: false },
    { id: 'b', name: 'Бизнес-ланч', order: 6, barSource: true },
  ];
  const products = [prod('soup', 'k'), prod('americano', 'b', 'bar')];
  const settings = new Map([['бизнес ланч|bar', { hidden: true }]]);
  const r = applyCategorySettings(groups, products, settings);
  assert.deepEqual(r.groups.map((g) => g.id), ['k']);
  assert.deepEqual(r.products.map((p) => p.id), ['soup']);
});

test('старые настройки по одному названию остаются за разделом кухни', () => {
  const groups = [{ id: 'k', name: 'Бизнес-ланч', order: 5, barSource: false }, { id: 'b', name: 'Бизнес-ланч', order: 6, barSource: true }];
  const settings = new Map([['бизнес ланч', { title: 'Старое', hidden: false }]]);
  const r = applyCategorySettings(groups, [prod('s', 'k'), prod('d', 'b', 'bar')], settings);
  assert.equal(r.groups.find((g) => g.id === 'k').name, 'Старое');
  assert.equal(r.groups.find((g) => g.id === 'b').name, 'Бизнес-ланч');
});
