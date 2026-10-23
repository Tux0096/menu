// Санитизация строк гостя, версия политики ПДн, сроки хранения
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cleanList, cleanText, cleanTextLoose, stripNulDeep, truncate } from '../lib/sanitize.js';
import { PRIVACY_VERSION, RETENTION } from '../lib/privacy.js';

// Управляющие символы задаём кодами, чтобы в файле не было невидимых знаков
const c = (n) => String.fromCharCode(n);
const NUL = c(0);
const BEL = c(7);
const ZWSP = c(0x200b);
const RLO = c(0x202e); // принудительный разворот текста
const LRI = c(0x2066);
const BOM = c(0xfeff);

test('cleanText: NUL и управляющие символы удаляются', () => {
  assert.equal(cleanText(`Але${NUL}кс${BEL}ей`, 100), 'Алексей');
  assert.equal(cleanText(`  а${NUL}  `, 10), 'а');
  assert.equal(cleanText(`${c(1)}${c(2)}`, 10), '');
  assert.equal(cleanText(`a${RLO}b${LRI}c${BOM}`, 10), 'abc');
  assert.equal(cleanText('Иван\nПетров\tX', 100), 'Иван Петров X'); // однострочное поле
  assert.equal(cleanText(`x${ZWSP}y`, 10), `x${ZWSP}y`); // невидимый пробел не управляющий: оставляем (эмодзи-склейки)
});

test('cleanText: многострочный комментарий сохраняет \\n', () => {
  assert.equal(cleanText(`строка 1\r\nстрока 2${NUL}\n${c(8)}`, 100, { multiline: true }), 'строка 1\nстрока 2');
});

test('cleanText: не строка → 400; пусто → пустая строка', () => {
  for (const bad of [123, {}, [], ['a'], true]) {
    assert.throws(() => cleanText(bad, 10, { label: 'Имя' }), (e) => e.status === 400 && /Имя/.test(e.message));
  }
  assert.equal(cleanText(undefined, 10), '');
  assert.equal(cleanText(null, 10), '');
});

test('обрезка по кодовым точкам, а не по UTF-16', () => {
  const s = '😀'.repeat(5);
  assert.equal(truncate(s, 3), '😀😀😀');
  assert.equal(cleanText(s, 3), '😀😀😀');
  assert.equal(Array.from(cleanText('👨‍👩‍👧x', 2)).length, 2);
  // нет «половинок» суррогатной пары
  const cut = cleanText('ab😀', 3);
  assert.equal(cut, 'ab😀');
  assert.ok(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(cleanText('abc😀', 4)));
});

test('cleanList: аллергены — строки, без пустых и повторов', () => {
  assert.deepEqual(cleanList(['орехи', ' орехи ', '', `ла${NUL}ктоза`], 30, 60), ['орехи', 'лактоза']);
  assert.throws(() => cleanList('орехи', 30, 60), (e) => e.status === 400);
  assert.throws(() => cleanList([1], 30, 60), (e) => e.status === 400);
});

test('cleanTextLoose: чужие данные не бросают ошибку', () => {
  assert.equal(cleanTextLoose({ a: 1 }, 10), '');
  assert.equal(cleanTextLoose(`И${NUL}ван`, 10), 'Иван');
});

test('stripNulDeep: NUL убирается во вложенных строках и ключах', () => {
  assert.deepEqual(
    stripNulDeep({ a: `x${NUL}`, b: [`${NUL}y`, { c: `z${NUL}z` }], [`k${NUL}`]: 1, n: 5 }),
    { a: 'x', b: ['y', { c: 'zz' }], k: 1, n: 5 },
  );
});

test('версия политики совпадает со страницами /privacy и /terms', () => {
  assert.match(PRIVACY_VERSION, /^\d{4}-\d{2}-\d{2}$/);
  for (const f of ['privacy.html', 'terms.html']) {
    const html = readFileSync(fileURLToPath(new URL(`../../menu-web/guest/${f}`, import.meta.url)), 'utf8');
    assert.ok(html.includes(`<b>${PRIVACY_VERSION}</b>`), `${f}: версия документа не совпадает с lib/privacy.js`);
  }
});

test('сроки хранения: 90 дней, 3 года, 1 год; env переопределяет', () => {
  assert.equal(RETENTION.aiQueryLogDays, 90);
  assert.equal(RETENTION.guestDays, 1095);
  assert.equal(RETENTION.reservationDays, 365);
  process.env.GUEST_RETENTION_DAYS = '30';
  assert.equal(RETENTION.guestDays, 30);
  process.env.GUEST_RETENTION_DAYS = 'abc';
  assert.equal(RETENTION.guestDays, 1095);
  delete process.env.GUEST_RETENTION_DAYS;
});
