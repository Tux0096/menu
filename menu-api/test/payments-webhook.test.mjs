// Вебхуки CloudPayments (подпись) и чек 54-ФЗ — чистые функции services/payments.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { buildReceipt, clampTip, isTestPublicId, verifyCpSignature } from '../services/payments.js';

const sig = (raw, secret) => createHmac('sha256', secret).update(raw).digest('base64');

test('подпись: верная проходит, чужая, пустая и по другому телу — нет', () => {
  const raw = Buffer.from('InvoiceId=QR-1&Amount=100.00');
  assert.equal(verifyCpSignature(raw, sig(raw, 'k1'), ['k1']), true);
  assert.equal(verifyCpSignature(raw, sig(raw, 'k1'), ['k2']), false);
  assert.equal(verifyCpSignature(raw, sig(raw, 'k1'), ['k2', 'k1']), true); // секрет точки или общий
  assert.equal(verifyCpSignature(raw, '', ['k1']), false);
  assert.equal(verifyCpSignature(raw, undefined, ['k1']), false);
  assert.equal(verifyCpSignature(raw, sig(Buffer.from('другое'), 'k1'), ['k1']), false);
  assert.equal(verifyCpSignature(raw, sig(raw, 'k1'), []), false);
});

test('тестовые ключи распознаются', () => {
  assert.equal(isTestPublicId('test_api_00000000000000000000002'), true);
  assert.equal(isTestPublicId('pk_test_abc'), true);
  assert.equal(isTestPublicId('pk_1234567890'), false);
  assert.equal(isTestPublicId(''), false);
});

test('чек: за выключателем; позиции, чаевые, цена не делится нацело', () => {
  const lines = [
    { name: 'Ролл', quantity: 2, line_total: '700.00' },
    { name: 'Суп', quantity: 3, line_total: '100.00' }, // 33,33 × 3 ≠ 100 — одной позицией
  ];
  const s = { receiptTaxation: 1, receiptVat: 20 };
  delete process.env.CLOUDPAYMENTS_RECEIPT;
  assert.equal(buildReceipt(s, lines, 0), null);
  process.env.CLOUDPAYMENTS_RECEIPT = 'on';
  try {
    assert.equal(buildReceipt({ receiptTaxation: null, receiptVat: null }, lines, 0), null); // система не задана
    const r = buildReceipt(s, lines, 50, { phone: '79001560808' });
    assert.equal(r.taxationSystem, 1);
    assert.equal(r.phone, '+79001560808');
    assert.deepEqual(r.Items[0], { label: 'Ролл', price: 350, quantity: 2, amount: 700, vat: 20, method: 4, object: 1 });
    assert.deepEqual(r.Items[1], { label: 'Суп ×3', price: 100, quantity: 1, amount: 100, vat: 20, method: 4, object: 1 });
    assert.equal(r.Items[2].label, 'Чаевые');
    assert.equal(r.Items.reduce((n, i) => n + i.amount, 0), 850); // сумма чека = сумма платежа
  } finally {
    delete process.env.CLOUDPAYMENTS_RECEIPT;
  }
});

test('чаевые: целые рубли, не больше счёта', () => {
  assert.equal(clampTip(10.4, 1000), 10);
  assert.equal(clampTip(5000, 100), 100);
  assert.equal(clampTip(-5, 100), 0);
});
