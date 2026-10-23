import test from 'node:test';
import assert from 'node:assert/strict';
import { finishPage, makeCursor, parsePage } from '../lib/paging.js';
import { sessionHasIikoOrderSql, uuidOrNull } from '../lib/uuid.js';
import { alertsEnabled, resetAlertThrottle, sendAlert } from '../lib/alerts.js';
import { normalizeSchedule } from '../lib/lunch-schedule.js';
import { normalizeAlcoRules } from '../lib/alco-rules.js';
import { reserveTz } from '../lib/iiko-reserve-sync.js';

test('пагинация: без параметров — старый формат (массив), с limit/before — конверт', () => {
  const p = parsePage({});
  assert.equal(p.paged, false);
  assert.equal(p.limit, 100);
  const rows = Array.from({ length: 4 }, (_, i) => ({ id: i + 1, cursor_at: `2026-10-23 12:00:0${i}.123456+00` }));
  assert.equal(finishPage(rows.slice(0, 3), p).length, 3);
  assert.ok(!('cursor_at' in finishPage(rows.slice(0, 3), p)[0]));

  const paged = parsePage({ limit: '3' });
  assert.equal(paged.paged, true);
  const page = finishPage(rows, paged, 10);
  assert.equal(page.items.length, 3);
  assert.equal(page.hasMore, true);
  assert.equal(page.total, 10);
  // курсор → следующий запрос разбирается в ту же позицию (микросекунды не теряются)
  const next = parsePage({ limit: '3', before: page.nextCursor });
  assert.equal(next.cursor.at, '2026-10-23 12:00:02.123456+00');
  assert.equal(next.cursor.id, 3);
  assert.equal(finishPage(rows.slice(0, 3), paged).hasMore, false);
});

test('пагинация: потолок limit, битый курсор — 400', () => {
  assert.equal(parsePage({ limit: '9999' }, { max: 200 }).limit, 200);
  assert.equal(parsePage({ limit: '-5' }).limit, 100);
  assert.throws(() => parsePage({ before: 'not-a-cursor' }), (e) => e.status === 400);
  const bad = Buffer.from(JSON.stringify(["2026-10-23'; DROP TABLE x;--", 1])).toString('base64url');
  assert.throws(() => parsePage({ before: bad }), (e) => e.status === 400);
  const uuidCursor = makeCursor({ cursor_at: '2026-10-23 12:00:00+05', id: '4cfb9d8b-54da-4ab5-8142-464fe979bee0' });
  assert.equal(parsePage({ before: uuidCursor }).cursor.id, '4cfb9d8b-54da-4ab5-8142-464fe979bee0');
});

test('заказ iiko: формат uuid проверяется, SQL ищет по uuid-колонке и индексу jsonb', () => {
  assert.equal(uuidOrNull('zzz'), null);
  assert.equal(uuidOrNull('0a1b2c3d-0000-4000-8000-123456789abc'), '0a1b2c3d-0000-4000-8000-123456789abc');
  const sql = sessionHasIikoOrderSql('$2');
  assert.match(sql, /iiko_order_id = \$2::uuid/);
  assert.match(sql, /jsonb_path_query_array\(iiko_orders, '\$\.\*\.orderId'\)/);
  assert.doesNotMatch(sql, /iiko_order_id::text/);
});

test('оповещения: без токена Telegram ничего не отправляют', async () => {
  const saved = [process.env.ALERT_TELEGRAM_BOT_TOKEN, process.env.ALERT_TELEGRAM_CHAT_ID];
  delete process.env.ALERT_TELEGRAM_BOT_TOKEN;
  delete process.env.ALERT_TELEGRAM_CHAT_ID;
  resetAlertThrottle();
  assert.equal(alertsEnabled(), false);
  assert.equal(await sendAlert('t', 'text'), false);
  [process.env.ALERT_TELEGRAM_BOT_TOKEN, process.env.ALERT_TELEGRAM_CHAT_ID] = saved.map((v) => v ?? '');
  if (!saved[0]) { delete process.env.ALERT_TELEGRAM_BOT_TOKEN; delete process.env.ALERT_TELEGRAM_CHAT_ID; }
});

test('оповещения: не чаще раза в 10 минут на тип', async () => {
  const realFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return { ok: true, status: 200 }; };
  process.env.ALERT_TELEGRAM_BOT_TOKEN = 'x';
  process.env.ALERT_TELEGRAM_CHAT_ID = '1';
  resetAlertThrottle();
  try {
    assert.equal(await sendAlert('db', 'a'), true);
    assert.equal(await sendAlert('db', 'b'), false);
    assert.equal(await sendAlert('disk', 'c'), true);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.ALERT_TELEGRAM_BOT_TOKEN;
    delete process.env.ALERT_TELEGRAM_CHAT_ID;
  }
});

test('часовой пояс точки: запасной для расписания и правил алкоголя, свой пояс сохраняется', () => {
  assert.equal(normalizeSchedule({ days: [1], from: '12:00', to: '15:00' }).tz, 'Europe/Samara');
  assert.equal(normalizeSchedule({ days: [1], from: '12:00', to: '15:00' }, 'Asia/Yekaterinburg').tz, 'Asia/Yekaterinburg');
  assert.equal(normalizeSchedule({ days: [1], from: '12:00', to: '15:00', tz: 'Europe/Moscow' }, 'Asia/Yekaterinburg').tz, 'Europe/Moscow');
  assert.equal(normalizeSchedule({ days: [1] }, 'Не/Пояс').tz, 'Europe/Samara');
  assert.equal(normalizeAlcoRules(null, 'Asia/Omsk').tz, 'Asia/Omsk');
  assert.equal(normalizeAlcoRules({ from: '10:00', to: '23:00', tz: 'Europe/Moscow' }, 'Asia/Omsk').tz, 'Europe/Moscow');
});

test('брони: пояс точки, иначе RESERVE_TZ/Самара', () => {
  assert.equal(reserveTz({ timezone: 'Asia/Yekaterinburg' }), 'Asia/Yekaterinburg');
  assert.equal(reserveTz({ timezone: 'мусор' }), 'Europe/Samara');
  assert.equal(reserveTz(null), 'Europe/Samara');
});
