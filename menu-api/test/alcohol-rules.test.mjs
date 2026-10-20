// Правила продажи алкоголя точки: часы (в т.ч. через полночь), выключено, 18+, валидация, определение алкоголя
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  alcoNextChange, alcoPublic, alcoholView, alcoClosedMessage, alcoRulesText, assertAgeConfirmed, assertAlcoSale, inSaleHours,
  isAlcoSaleOpen, normalizeAlcoRules, validateAlcoRules,
} from '../lib/alco-rules.js';
import { isAlcoholName } from '../lib/alco.js';

const R = { enabled: true, from: '10:00', to: '23:00', tz: 'Europe/Samara' }; // Самара UTC+4
const at = (iso) => new Date(iso);

test('по умолчанию (пустые правила): продаём круглосуточно, 18+ нужно, документ не просим', () => {
  const r = normalizeAlcoRules(null);
  assert.equal(r.enabled, true);
  assert.equal(r.from, '');
  assert.equal(r.requireAgeConfirm, true);
  assert.equal(r.requireDocCheck, false);
  assert.equal(isAlcoSaleOpen(null, at('2026-10-20T01:00:00Z')), true);
  assert.equal(alcoNextChange(null), null);
});

test('часы продажи: границы по времени точки, «до» не включается', () => {
  assert.equal(isAlcoSaleOpen(R, at('2026-10-20T05:59:00Z')), false); // 09:59 в Самаре
  assert.equal(isAlcoSaleOpen(R, at('2026-10-20T06:00:00Z')), true); // 10:00
  assert.equal(isAlcoSaleOpen(R, at('2026-10-20T18:59:00Z')), true); // 22:59
  assert.equal(isAlcoSaleOpen(R, at('2026-10-20T19:00:00Z')), false); // 23:00
});

test('часовой пояс точки решает: то же UTC-время в Москве и в Самаре', () => {
  const msk = { ...R, tz: 'Europe/Moscow' };
  assert.equal(isAlcoSaleOpen(R, at('2026-10-20T06:30:00Z')), true); // 10:30 Самара
  assert.equal(isAlcoSaleOpen(msk, at('2026-10-20T06:30:00Z')), false); // 09:30 Москва
});

test('окно через полночь: 18:00–02:00', () => {
  const night = { enabled: true, from: '18:00', to: '02:00', tz: 'Europe/Samara' };
  assert.equal(isAlcoSaleOpen(night, at('2026-10-20T14:00:00Z')), true); // 18:00
  assert.equal(isAlcoSaleOpen(night, at('2026-10-20T13:59:00Z')), false); // 17:59
  assert.equal(isAlcoSaleOpen(night, at('2026-10-20T20:30:00Z')), true); // 00:30 следующего дня
  assert.equal(isAlcoSaleOpen(night, at('2026-10-20T21:59:00Z')), true); // 01:59
  assert.equal(isAlcoSaleOpen(night, at('2026-10-20T22:00:00Z')), false); // 02:00
  assert.equal(isAlcoSaleOpen(night, at('2026-10-21T03:00:00Z')), false); // 07:00
});

test('«с 10:00 до 10:00» — весь день; одно время без другого — часов нет', () => {
  assert.equal(inSaleHours({ from: '10:00', to: '10:00' }, at('2026-10-20T00:00:00Z')), true);
  assert.equal(normalizeAlcoRules({ from: '10:00' }).from, '');
});

test('выключено: алкоголь не продаётся в любые часы', () => {
  const off = { ...R, enabled: false };
  assert.equal(isAlcoSaleOpen(off, at('2026-10-20T08:00:00Z')), false);
  assert.equal(alcoClosedMessage(off), 'На этой точке алкоголь не продаётся');
  assert.equal(alcoNextChange(off), null);
  assert.throws(() => assertAlcoSale(off), (e) => e.status === 409 && e.code === 'ALCO_CLOSED' && /не продаётся/.test(e.message));
});

test('заказ вне часов: 409 с понятным текстом и кодом', () => {
  assert.throws(() => assertAlcoSale(R, at('2026-10-20T01:00:00Z')),
    (e) => e.status === 409 && e.code === 'ALCO_CLOSED' && e.message === 'Алкоголь продаём с 10:00 до 23:00');
  assert.doesNotThrow(() => assertAlcoSale(R, at('2026-10-20T08:00:00Z')));
});

test('подтверждение 18+: обязательно по умолчанию, отключается настройкой', () => {
  assert.throws(() => assertAgeConfirmed(R, false), (e) => e.status === 409 && e.code === 'ALCO_AGE_REQUIRED');
  assert.doesNotThrow(() => assertAgeConfirmed(R, true));
  assert.doesNotThrow(() => assertAgeConfirmed({ ...R, requireAgeConfirm: false }, false));
});

test('ближайшая смена: до закрытия и до открытия, с точностью до минуты', () => {
  assert.equal(alcoNextChange(R, at('2026-10-20T08:00:30Z')), '2026-10-20T19:00:00.000Z'); // открыто → закроется в 23:00 Самары
  assert.equal(alcoNextChange(R, at('2026-10-20T01:00:00Z')), '2026-10-20T06:00:00.000Z'); // закрыто → откроется в 10:00
  assert.equal(alcoNextChange(R, at('2026-10-20T19:30:00Z')), '2026-10-21T06:00:00.000Z'); // после закрытия — завтра
  const night = { ...R, from: '18:00', to: '02:00' };
  assert.equal(alcoNextChange(night, at('2026-10-20T20:00:00Z')), '2026-10-20T22:00:00.000Z'); // 00:00 → закроется в 02:00
});

test('валидация админки: понятные ошибки', () => {
  assert.throws(() => validateAlcoRules({ from: '10:00' }), (e) => e.status === 400 && /оба времени/.test(e.message));
  assert.throws(() => validateAlcoRules({ from: '25:00', to: '10:00' }), (e) => e.status === 400 && /ЧЧ:ММ/.test(e.message));
  assert.throws(() => validateAlcoRules({ tz: 'Mars/Olympus' }), (e) => e.status === 400);
  assert.throws(() => validateAlcoRules({ text: 'я'.repeat(501) }), (e) => e.status === 400);
  assert.throws(() => validateAlcoRules(null), (e) => e.status === 400);
  const ok = validateAlcoRules({ enabled: true, from: '9:05', to: '23:00', text: '  с 18 лет  ', requireDocCheck: true });
  assert.equal(ok.from, '09:05');
  assert.equal(ok.text, 'с 18 лет');
  assert.equal(ok.requireDocCheck, true);
  assert.equal(validateAlcoRules({ from: '', to: '' }).from, '');
});

test('текст правил: свой или собранный из настроек', () => {
  assert.equal(alcoRulesText({ ...R, text: 'Только по паспорту' }), 'Только по паспорту');
  assert.equal(alcoRulesText({ ...R, requireDocCheck: true }), 'Алкоголь — с 18 лет при предъявлении документа, с 10:00 до 23:00');
  assert.equal(alcoRulesText({ enabled: true }), 'Алкоголь — с 18 лет');
});

test('публичный вид для гостя: open, closedMessage, nextChangeAt', () => {
  const pub = alcoPublic(R, at('2026-10-20T01:00:00Z'));
  assert.equal(pub.open, false);
  assert.equal(pub.closedMessage, 'Алкоголь продаём с 10:00 до 23:00');
  assert.equal(pub.nextChangeAt, '2026-10-20T06:00:00.000Z');
  assert.equal(alcoPublic(R, at('2026-10-20T08:00:00Z')).closedMessage, null);
});

test('блок визита для официанта: нет алкоголя — null; предупреждение вне часов; подтверждение гостя', () => {
  assert.equal(alcoholView(R, [{ isAlcohol: false, quantity: 1 }]), null);
  const items = [
    { isAlcohol: true, isLocked: false, ageConfirmed: true, quantity: 2 },
    { isAlcohol: false, isLocked: false, quantity: 1 },
  ];
  const day = alcoholView(R, items, at('2026-10-20T08:00:00Z'));
  assert.equal(day.count, 2);
  assert.equal(day.guestConfirmed, true);
  assert.equal(day.warning, null);
  const night = alcoholView(R, items, at('2026-10-20T01:00:00Z'));
  assert.equal(night.warning, 'Алкоголь продаём с 10:00 до 23:00');
  const byWaiter = alcoholView(R, [...items, { isAlcohol: true, isLocked: false, ageConfirmed: false, quantity: 1 }], at('2026-10-20T08:00:00Z'));
  assert.equal(byWaiter.guestConfirmed, false);
  assert.equal(byWaiter.unconfirmedCount, 1);
  // уже отправленный алкоголь предупреждения не даёт — продажа состоялась раньше
  const sent = alcoholView(R, [{ isAlcohol: true, isLocked: true, ageConfirmed: true, quantity: 1 }], at('2026-10-20T01:00:00Z'));
  assert.equal(sent.warning, null);
});

test('что считается алкоголем: разделы и названия, безалкогольное — нет', () => {
  for (const n of ['Вино', 'Винная карта', 'Крепкие напитки', 'Коктейли', 'Пиво', 'Пиво светлое', 'Сидр яблочный', 'Виски односолодовый', 'Водка', 'Шоты']) {
    assert.equal(isAlcoholName(n), true, n);
  }
  for (const n of ['Безалкогольное пиво', 'Молочный коктейль', 'Лимонады', 'Роллы', 'Ромашковый чай', 'Винегрет', 'Кофе', 'Детское меню']) {
    assert.equal(isAlcoholName(n), false, n);
  }
  assert.equal(isAlcoholName('Напитки', 'Ром Бакарди'), true); // по названию позиции при нейтральном разделе
  assert.equal(isAlcoholName(null, undefined), false);
});
