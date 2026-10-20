// Web Push гостю: тексты, проверка подписки, фильтр получателей, отправка и чистка по 404/410
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createECDH, randomBytes } from 'node:crypto';
import {
  isGoneStatus, normalizeSubscription, orderReadyPush, pickDeliverable, readyPushDue, waiterAssignedPush, waiterFirstName,
} from '../lib/guest-push.js';

const keys = () => {
  const e = createECDH('prime256v1'); e.generateKeys();
  return { p256dh: e.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') };
};

test('текст: первое слово имени официанта', () => {
  assert.equal(waiterFirstName('  Анна  Иванова '), 'Анна');
  const p = waiterAssignedPush({ sessionId: 's1', waiterName: 'Анна Иванова' });
  assert.equal(p.body, 'Ваш стол обслуживает официант Анна');
  assert.equal(p.tag, 'waiter-s1');
  assert.equal(waiterAssignedPush({ sessionId: 's1', waiterName: '' }).body, 'Ваш стол обслуживает официант');
  assert.equal(orderReadyPush({ sessionId: 's1' }).body, 'Ваш заказ готов');
});

test('«заказ готов» — не чаще раза в 2 минуты на визит', () => {
  const now = Date.now();
  assert.equal(readyPushDue(null, now), true);
  assert.equal(readyPushDue(new Date(now - 60_000), now), false);
  assert.equal(readyPushDue(new Date(now - 121_000), now), true);
});

test('подписка: только https и известные push-сервисы, ключи нужной длины', () => {
  const k = keys();
  const ok = normalizeSubscription({ endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: k });
  assert.equal(ok.p256dh, k.p256dh);
  assert.ok(normalizeSubscription({ endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/x', keys: k }));
  assert.ok(normalizeSubscription({ endpoint: 'https://web.push.apple.com/x', keys: k }));
  assert.equal(normalizeSubscription({ endpoint: 'http://fcm.googleapis.com/x', keys: k }), null);
  assert.equal(normalizeSubscription({ endpoint: 'https://127.0.0.1/x', keys: k }), null);
  assert.equal(normalizeSubscription({ endpoint: 'https://fcm.googleapis.com.evil.io/x', keys: k }), null);
  assert.equal(normalizeSubscription({ endpoint: 'https://a:b@fcm.googleapis.com/x', keys: k }), null);
  assert.equal(normalizeSubscription({ endpoint: 'https://fcm.googleapis.com/x', keys: { p256dh: 'abc', auth: k.auth } }), null);
  assert.equal(normalizeSubscription({ endpoint: 'https://fcm.googleapis.com/' + 'a'.repeat(1100), keys: k }), null);
  assert.equal(normalizeSubscription({ endpoint: 'https://fcm.googleapis.com/x', keys: k, expirationTime: 1000 }), null);
  assert.equal(normalizeSubscription(null), null);
  assert.equal(normalizeSubscription('x'), null);
});

test('фильтр получателей: закрытый визит, просрочка и повторы адреса отбрасываются', () => {
  const rows = [
    { endpoint: 'a', session_status: 'open' },
    { endpoint: 'a', session_status: 'open' },
    { endpoint: 'b', session_status: 'closed' },
    { endpoint: 'c', session_status: 'open', expires_at: new Date(Date.now() - 1000) },
    { endpoint: 'd', session_status: 'open', expires_at: new Date(Date.now() + 100000) },
  ];
  assert.deepEqual(pickDeliverable(rows).map((r) => r.endpoint), ['a', 'd']);
  assert.deepEqual(pickDeliverable(null), []);
});

test('404 и 410 от push-сервиса — подписка удаляется', () => {
  assert.ok(isGoneStatus(404) && isGoneStatus(410));
  assert.ok(!isGoneStatus(500) && !isGoneStatus(429));
});

test('отправка: pushToSession шлёт открытым подпискам и удаляет 410', async () => {
  const calls = [];
  const queries = [];
  const pool = (await import('../db/pool.js')).default;
  const orig = pool.query.bind(pool);
  pool.query = async (sql, params) => {
    queries.push(sql);
    if (/FROM guest_push_subscriptions p JOIN/.test(sql)) {
      return { rows: [
        { endpoint: 'https://fcm.googleapis.com/ok', p256dh: 'x', auth: 'y', session_status: 'open' },
        { endpoint: 'https://fcm.googleapis.com/gone', p256dh: 'x', auth: 'y', session_status: 'open' },
        { endpoint: 'https://fcm.googleapis.com/closed', p256dh: 'x', auth: 'y', session_status: 'closed' },
      ] };
    }
    if (/DELETE FROM guest_push_subscriptions WHERE endpoint/.test(sql)) { calls.push(['delete', params[0]]); return { rowCount: 1 }; }
    return { rows: [] };
  };
  try {
    const { pushToSession } = await import('../services/guest-push.js');
    const send = async (sub, body) => {
      if (sub.endpoint.endsWith('/gone')) throw Object.assign(new Error('gone'), { statusCode: 410 });
      calls.push(['send', sub.endpoint, JSON.parse(body).body]);
    };
    const n = await pushToSession('s1', waiterAssignedPush({ sessionId: 's1', waiterName: 'Анна' }), { send });
    assert.equal(n, 1);
    assert.deepEqual(calls.find((c) => c[0] === 'send'), ['send', 'https://fcm.googleapis.com/ok', 'Ваш стол обслуживает официант Анна']);
    assert.deepEqual(calls.find((c) => c[0] === 'delete'), ['delete', 'https://fcm.googleapis.com/gone']);
    assert.ok(!calls.some((c) => String(c[1]).endsWith('/closed')));
  } finally {
    pool.query = orig;
    await pool.end().catch(() => {});
  }
});
