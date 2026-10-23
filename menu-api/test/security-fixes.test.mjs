import test from 'node:test';
import assert from 'node:assert/strict';
import { decryptSecret, encryptSecret, isEncrypted } from '../lib/secret-box.js';
import { maskName, teamErrorKind, teamSsl } from '../services/fuji-team.js';
import { pinDelayMs } from '../services/staff-auth.js';

test('secret-box: шифрует и расшифровывает, открытые значения читаются как есть', () => {
  const enc = encryptSecret('abc123secret');
  assert.ok(isEncrypted(enc) && enc.startsWith('enc:v1:'));
  assert.notEqual(enc, encryptSecret('abc123secret')); // свежий iv
  assert.equal(decryptSecret(enc), 'abc123secret');
  assert.equal(decryptSecret('plain-old'), 'plain-old');
  assert.equal(encryptSecret(enc), enc); // повторно не шифруется
  assert.equal(decryptSecret(`${enc.slice(0, -3)}AAA`), ''); // подмена не проходит
});

test('Фуджи Тим: SSL, маска имени, обобщённые ошибки', () => {
  assert.deepEqual(teamSsl('true'), { rejectUnauthorized: true });
  assert.deepEqual(teamSsl('insecure'), { rejectUnauthorized: false });
  assert.equal(teamSsl(''), undefined);
  assert.equal(maskName('Иванов Иван Иванович'), 'Иванов И.');
  assert.equal(maskName('Анна'), 'Анна');
  assert.equal(teamErrorKind({ code: '28P01', message: 'password authentication failed for user "x"' }), 'неверный пароль');
  assert.equal(teamErrorKind({ message: 'self-signed certificate' }), 'ошибка SSL');
  assert.equal(teamErrorKind({ code: 'ECONNREFUSED', message: 'connect ECONNREFUSED 10.0.0.1:5432' }), 'нет связи');
});

test('PIN: ресторанная задержка растёт экспоненциально и ограничена', () => {
  assert.equal(pinDelayMs(5), 0);
  assert.equal(pinDelayMs(10), 0);
  assert.equal(pinDelayMs(11), 250);
  assert.equal(pinDelayMs(13), 1000);
  assert.equal(pinDelayMs(500), 15000);
});
