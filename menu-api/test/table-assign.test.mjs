// Назначение стола: «Взять стол», конфликт 409, отдача в общие, переназначение управляющим (нужна БД; без неё — пропуск)
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../db/pool.js';

let ready = false;
try {
  await pool.query('SELECT waiter_assigned_at FROM table_sessions LIMIT 1');
  ready = true;
} catch { /* БД или миграция недоступна */ }
const skip = ready ? false : 'нет БД / миграции';

const waiterSvc = ready ? await import('../services/waiter.js') : null;
const tableSvc = ready ? await import('../services/table-session.js') : null;
const { listWaiterNotifications } = ready ? await import('../services/waiter-notifications.js') : {};

const tag = `t${Date.now() % 100000}`;
const made = { staff: [], sessions: [] };

async function mkStaff(name, role = 'waiter') {
  const { rows: [r] } = await pool.query(
    `INSERT INTO staff_users (login, name, role, password_hash, is_active) VALUES ($1, $2, $3, 'x', TRUE) RETURNING id`,
    [`${tag}-${name}-${Math.random().toString(36).slice(2, 6)}`, name, role],
  );
  made.staff.push(r.id);
  return { id: r.id, name, role };
}

test('взять стол → 409 у второго → отдать → управляющий переназначает', { skip }, async () => {
  const { rows: [rest] } = await pool.query("SELECT id, slug FROM restaurants WHERE slug = 'novo-sadovaya'");
  const anna = await mkStaff('Анна-тест');
  const boris = await mkStaff('Борис-тест');
  const boss = await mkStaff('Босс-тест', 'manager');
  const view = await tableSvc.enterTable({ restaurantSlug: rest.slug, tableNumber: `as-${tag}`, guest: null, byStaff: true });
  made.sessions.push(view.sessionId);
  const sid = view.sessionId;
  assert.equal(view.waiterId, null, 'открытие стола официанта не назначает');

  // просмотр и блокировка редактирования стол не назначают
  const taken = await waiterSvc.takeSession(sid, boris);
  assert.equal(taken.waiterId, null);

  const a = await waiterSvc.assignSession(sid, anna);
  assert.equal(a.changed, true);
  assert.equal(a.view.waiterId, anna.id);
  assert.equal(a.view.waiterName, 'Анна-тест');

  // повтор тем же официантом — без изменений
  assert.equal((await waiterSvc.assignSession(sid, anna)).changed, false);

  // второй официант: 409 с именем первого
  await assert.rejects(() => waiterSvc.assignSession(sid, boris), (e) => {
    assert.equal(e.status, 409);
    assert.equal(e.code, 'ALREADY_ASSIGNED');
    assert.match(e.message, /Анна-тест/);
    assert.equal(e.details.waiterName, 'Анна-тест');
    return true;
  });
  // и не может назначить другого
  await assert.rejects(() => waiterSvc.assignSession(sid, boris, { staffId: anna.id }), (e) => e.status === 403);
  // чужой стол отдать нельзя
  await assert.rejects(() => waiterSvc.unassignSession(sid, boris), (e) => e.status === 403);

  // лента: чужой стол Борис не видит (кроме смены официанта), Анна и управляющий видят
  await tableSvc.callWaiter(sid, 'cutlery');
  const feed = async (staff) => (await listWaiterNotifications(rest.id, { staff, limit: 200 })).filter((n) => n.session_id === sid);
  assert.deepEqual((await feed(boris)).map((n) => n.type).sort(), ['table_assigned']);
  assert.ok((await feed(anna)).some((n) => n.type === 'call_waiter'));
  assert.ok((await feed(boss)).some((n) => n.type === 'call_waiter'));

  // отдала в общие → Борис снова видит уведомления стола
  const u = await waiterSvc.unassignSession(sid, anna);
  assert.equal(u.view.waiterId, null);
  assert.ok((await feed(boris)).some((n) => n.type === 'call_waiter'));

  // управляющий назначает Бориса, потом берёт себе
  const m = await waiterSvc.assignSession(sid, boss, { staffId: boris.id });
  assert.equal(m.view.waiterId, boris.id);
  const m2 = await waiterSvc.assignSession(sid, boss);
  assert.equal(m2.view.waiterId, boss.id);
  // официанта не из этой точки назначить нельзя
  await assert.rejects(() => waiterSvc.assignSession(sid, boss, { staffId: '00000000-0000-4000-8000-000000000000' }), (e) => e.status === 404);
});

test('«+ Открыть стол»: стол сразу назначается на официанта, чужой — нет', { skip }, async () => {
  const { rows: [rest] } = await pool.query("SELECT id, slug FROM restaurants WHERE slug = 'novo-sadovaya'");
  const anna = await mkStaff('Анна-открыла');
  const boris = await mkStaff('Борис-открыл');
  const view = await tableSvc.enterTable({ restaurantSlug: rest.slug, tableNumber: `ao-${tag}`, guest: null, byStaff: true });
  made.sessions.push(view.sessionId);
  const first = await waiterSvc.openAndTake(view.sessionId, anna);
  assert.equal(first.assigned, true);
  assert.equal(first.view.waiterId, anna.id);
  const second = await waiterSvc.openAndTake(view.sessionId, boris);
  assert.equal(second.assigned, false);
  assert.equal(second.view.waiterId, anna.id);
});

test('редактирование заказа стол не назначает', { skip }, async () => {
  const { rows: [rest] } = await pool.query("SELECT id, slug FROM restaurants WHERE slug = 'novo-sadovaya'");
  const boris = await mkStaff('Борис-правит');
  const view = await tableSvc.enterTable({ restaurantSlug: rest.slug, tableNumber: `ae-${tag}`, guest: null, byStaff: true });
  made.sessions.push(view.sessionId);
  const res = await waiterSvc.updateOrder(view.sessionId, boris, { items: [], guestCount: 2 });
  assert.equal(res.guestCount, 2);
  assert.equal(res.waiterId, null);
});

test('несколько блюд готовы за минуту — одно уведомление «Готово: А ×1, Б ×2»', { skip }, async () => {
  const { createWaiterNotification } = await import('../services/waiter-notifications.js');
  const { rows: [rest] } = await pool.query("SELECT id, slug FROM restaurants WHERE slug = 'novo-sadovaya'");
  const view = await tableSvc.enterTable({ restaurantSlug: rest.slug, tableNumber: `am-${tag}`, guest: null, byStaff: true });
  made.sessions.push(view.sessionId);
  const base = { restaurantId: rest.id, sessionId: view.sessionId, tableNumber: view.tableNumber, type: 'dish_ready', title: '', body: '', push: false, mergeLines: true };
  await createWaiterNotification({ ...base, payload: { lines: [{ name: 'А', qty: 1 }] } });
  await createWaiterNotification({ ...base, payload: { lines: [{ name: 'Б', qty: 1 }] } });
  await createWaiterNotification({ ...base, payload: { lines: [{ name: 'Б', qty: 1 }] } });
  const { rows } = await pool.query("SELECT title, body FROM waiter_notifications WHERE session_id = $1 AND type = 'dish_ready'", [view.sessionId]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].body, 'А ×1, Б ×2');
  assert.match(rows[0].title, /Готово$/);
});

after(async () => {
  if (!ready) return pool.end();
  if (made.sessions.length) {
    await pool.query('DELETE FROM waiter_notifications WHERE session_id = ANY($1::uuid[])', [made.sessions]);
    await pool.query('DELETE FROM table_sessions WHERE id = ANY($1::uuid[])', [made.sessions]);
  }
  if (made.staff.length) {
    await pool.query('DELETE FROM waiter_notification_reads WHERE staff_id = ANY($1::uuid[])', [made.staff]);
    await pool.query('DELETE FROM staff_users WHERE id = ANY($1::uuid[])', [made.staff]);
  }
  await pool.end();
});
