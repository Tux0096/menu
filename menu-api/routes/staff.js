/** Персонал: вход (пароль, PIN), экран официанта, контроль зала управляющего. */
import { uuidOrNull } from '../lib/uuid.js';
import pool from '../db/pool.js';
import express from 'express';
import { h, requireBody, sendError } from '../lib/http.js';
import { acceptWaiterPayment } from '../services/payments.js';
import { audit, iikoPinLogin, pinLogin, staffAuth, staffLogin } from '../services/staff-auth.js';
import { iikoStaffLoginEnabled } from '../services/iiko-staff.js';
import { isPushEnabled, registerDevice, unregisterDevice } from '../services/push.js';
import { enterTable, getSessionView, markServed, resolveRestaurant } from '../services/table-session.js';
import {
  assignSession, closeSession, getHallDashboard, listActiveSessions, listAwaiting, listRestaurantWaiters, openAndTake,
  releaseSession, sendToKitchen, takeSession, unassignSession, updateOrder,
} from '../services/waiter.js';
import { listWaiterNotifications, markAllNotificationsRead, markNotificationRead } from '../services/waiter-notifications.js';
import { httpError } from '../lib/http.js';
import { reserveSyncStatus, syncReserves } from '../services/iiko-reserves.js';
import { iikoCoolingDown } from '../iiko-client.js';
import { SEES_ALL_ROLES } from '../lib/notification-rules.js';
import { listFeedback, listRestaurants } from '../services/admin.js';
import { listReserves, markArrived, reservePhone, seatReservation } from '../services/reservations.js';
import { assertStaffSession, staffRestaurant } from '../lib/staff-scope.js';
import { getRestaurantCatalog } from '../services/catalog.js';
import { stopListLoadedAt } from '../services/stoplist.js';

const router = express.Router();
export default router;

// ── Персонал ────────────────────────────────────────────────────────────────

router.post('/api/v1/staff/login', h(async (req) => {
  requireBody(req.body, 'login', 'password');
  return staffLogin(req.body.login, req.body.password, req.ip);
}));
router.get('/api/v1/staff/me', staffAuth('waiter', ['marketing']), h(async (req) => ({
  id: req.staff.id, role: req.staff.role, name: req.staff.name,
  restaurantId: req.staff.restaurantId || req.staff.loginRestaurantId || null,
})));
// Приложение официанта: вход по PIN в выбранном ресторане
// С IIKO_STAFF_LOGIN=on — код сотрудника из iiko, точка определяется по открытой смене (как в iikoWaiter)
router.get('/api/v1/staff/login-mode', (req, res) => res.json({ mode: iikoStaffLoginEnabled() ? 'iiko' : 'pin' }));
router.post('/api/v1/staff/pin-login', h(async (req) => {
  if (iikoStaffLoginEnabled()) {
    requireBody(req.body, 'pin');
    // Только через iiko: вход — при открытой личной смене на кассе (лишние смены не открываются)
    return iikoPinLogin(req.body.pin, req.ip, req.body.restaurant || null);
  }
  requireBody(req.body, 'restaurant', 'pin');
  const r = await resolveRestaurant(req.body.restaurant);
  // Лимит попыток — по адресу и устройству: телефоны зала за одним Wi-Fi не блокируют друг друга
  const device = String(req.get('X-Device-Id') || '').replace(/[^\w-]/g, '').slice(0, 64);
  return pinLogin(r.id, req.body.pin, `${req.ip}|${device}`);
}));
router.get('/api/v1/staff/restaurants', staffAuth('waiter', ['marketing']), h(async (req) => {
  const list = await listRestaurants();
  return req.staff.restaurantId ? list.filter((r) => r.id === req.staff.restaurantId) : list;
}));

const waiter = express.Router();
waiter.use(staffAuth('waiter'));
// Любой маршрут с визитом (/session/:id/…) — только визит ресторана сотрудника
waiter.param('id', async (req, res, next, id) => {
  if (!req.path.startsWith('/session/')) return next();
  try {
    await assertStaffSession(req, id);
    return next();
  } catch (err) {
    return sendError(res, err, req);
  }
});
waiter.get('/notifications', h(async (req) => {
  const r = await staffRestaurant(req);
  return listWaiterNotifications(r.id, { unreadOnly: req.query.unread === '1', staff: req.staff });
}));
waiter.post('/notifications/read-all', h(async (req) => {
  const r = await staffRestaurant(req);
  await markAllNotificationsRead(r.id, req.staff.id);
}));
waiter.post('/notifications/:id/read', h(async (req) => { await markNotificationRead(req.params.id, (await staffRestaurant(req)).id, req.staff.id); }));
// Стоп-лист для приёма заказа: что закончилось и что осталось в ограниченном количестве (только блюда меню)
waiter.get('/stop-list', h(async (req) => {
  const catalog = await getRestaurantCatalog(await staffRestaurant(req));
  const items = (catalog.products || [])
    .filter((p) => !p.isAlias && Number(p.price) > 0 && (p.isInStopList || p.stopBalance))
    .map((p) => ({
      id: String(p.id), iikoId: p.iikoId ? String(p.iikoId) : null, name: p.name, group: p.parentGroupName || null,
      stopped: Boolean(p.isInStopList), balance: p.isInStopList ? 0 : Number(p.stopBalance),
    }))
    .sort((a, b) => Number(b.stopped) - Number(a.stopped) || a.name.localeCompare(b.name, 'ru'));
  return { updatedAt: stopListLoadedAt(), items };
}));
waiter.get('/sessions', h(async (req) => listActiveSessions((await staffRestaurant(req)).id)));
// Схема зала: все столы ресторана — свободные и занятые, со статусом, суммой и таймерами
waiter.get('/hall', h(async (req) => {
  const r = await staffRestaurant(req);
  const sessions = await listActiveSessions(r.id);
  const byTable = new Map(sessions.filter((x) => x.status === 'open').map((x) => [String(x.tableNumber), x]));
  const tone = (x) => {
    if (!x) return 'free';
    if (x.readyCount > 0) return 'ready';
    if (['cart_ready', 'reorder_pending'].includes(x.workflowStatus)) return 'waiting';
    if (x.workflowStatus === 'bill_requested') return 'bill';
    if (['waiter_review', 'in_production'].includes(x.workflowStatus)) return 'work';
    return 'guests';
  };
  const numbers = Array.from({ length: r.tables_count || 0 }, (_, i) => String(i + 1));
  for (const t of byTable.keys()) if (!numbers.includes(t)) numbers.push(t);
  return {
    restaurant: { slug: r.slug, name: r.name },
    pushEnabled: isPushEnabled(),
    tables: numbers.map((n) => {
      const x = byTable.get(n);
      return {
        number: n,
        tone: tone(x),
        sessionId: x?.sessionId || null,
        statusLabel: x?.workflowLabel || 'Свободен',
        guests: x ? (x.guests || []).map((g) => g.name) : [],
        guestCount: x?.guestCount || 0,
        total: x?.total || 0,
        pendingCount: x?.pendingCount || 0,
        readyCount: x?.readyCount || 0,
        waitingMinutes: x?.waitingMinutes ?? null,
        isOverdue: Boolean(x?.isOverdue),
        openedAt: x?.createdAt || null,
        waiterId: x?.waiterId || null,
        waiterName: x?.waiterName || null,
        mine: Boolean(x && x.waiterId && x.waiterId === req.staff.id),
      };
    }),
  };
}));
// Официант сам открывает стол (гость без QR) — стол сразу его, дальше заказ как обычно
waiter.post('/tables/:number/open', h(async (req) => {
  const r = await staffRestaurant(req);
  const view = await enterTable({ restaurantSlug: r.slug, tableNumber: req.params.number, guest: null, byStaff: true });
  const { view: opened, assigned } = await openAndTake(view.sessionId, req.staff);
  if (assigned) audit(req.staff, 'table.assign', 'session', view.sessionId, { table: opened.tableNumber, opened: true });
  return opened;
}));
// «Выдача»: блюда, которые ждут выноса, по всем открытым столам точки — видно всем официантам (вынести может любой)
waiter.get('/awaiting', h(async (req) => listAwaiting((await staffRestaurant(req)).id, String(req.query.q || '').slice(0, 100))));
// Официанты точки — управляющему для назначения на стол
waiter.get('/waiters', h(async (req) => {
  if (!SEES_ALL_ROLES.has(req.staff.role)) throw httpError(403, 'Недостаточно прав');
  return listRestaurantWaiters((await staffRestaurant(req)).id);
}));
// Брони из iiko (только чтение): список на сегодня по времени, поиск по имени гостя (ё = е). Телефон в списке маскирован
waiter.get('/reservations', h(async (req) => listReserves((await staffRestaurant(req)).id, { q: String(req.query.q || '').slice(0, 60) })));
// Полный номер брони — по нажатию «показать» (в журнал пишем только факт, без номера)
waiter.get('/reservations/:rid/phone', h(async (req) => {
  const r = await staffRestaurant(req);
  const res = await reservePhone(r.id, req.params.rid);
  audit(req.staff, 'reservation.phone', 'reservation', req.params.rid);
  return res;
}));
// «Посадить сейчас»: открыть стол брони (создать досрочно, если ещё нет); стол занят другими — 409 TABLE_BUSY
waiter.post('/reservations/:rid/seat', h(async (req) => seatReservation((await staffRestaurant(req)).id, req.params.rid)));
// «Гости пришли» вручную (сели без QR)
waiter.post('/reservations/:rid/arrived', h(async (req) => {
  const res = await markArrived((await staffRestaurant(req)).id, req.params.rid);
  audit(req.staff, 'reservation.arrived', 'reservation', req.params.rid, { table: res.tableNumber });
  return res;
}));
// Телефон официанта для push-уведомлений
waiter.post('/devices', h(async (req) => {
  requireBody(req.body, 'token');
  const r = await staffRestaurant(req);
  await registerDevice(req.staff, r.id, req.body.token, req.body.platform);
  return { ok: true, pushEnabled: isPushEnabled() };
}));
waiter.delete('/devices/:token', h(async (req) => { await unregisterDevice(req.params.token); }));
// Официант смотрит стол — его блокировка продлевается (раньше через 2 минуты просмотра стол «уходил» другому)
waiter.get('/session/:id', h(async (req) => {
  await pool.query(
    `UPDATE table_sessions SET locked_until = NOW() + INTERVAL '2 minutes'
     WHERE id = $1 AND locked_by = $2 AND locked_until > NOW()`,
    [uuidOrNull(req.params.id), req.staff.id],
  );
  return getSessionView(req.params.id);
}));
waiter.post('/session/:id/take', h(async (req) => takeSession(req.params.id, req.staff)));
// «Взять стол»: стол уходит из «Общих» в «Мои». Занят — 409 с именем официанта; управляющий переназначает ({ staffId })
waiter.post('/session/:id/assign', h(async (req) => {
  const res = await assignSession(req.params.id, req.staff, { staffId: req.body?.staffId || null });
  if (res.changed) {
    audit(req.staff, 'table.assign', 'session', req.params.id,
      { table: res.view.tableNumber, waiterId: res.target.id, waiterName: res.target.name, from: res.from });
  }
  return res.view;
}));
// «Отдать в общие»: стол снова без официанта
waiter.post('/session/:id/unassign', h(async (req) => {
  const res = await unassignSession(req.params.id, req.staff);
  if (res.changed) audit(req.staff, 'table.unassign', 'session', req.params.id, { table: res.view.tableNumber, from: res.from });
  return res.view;
}));
waiter.post('/session/:id/served', h(async (req) => markServed(req.params.id, req.body?.itemIds)));
waiter.post('/session/:id/release', h(async (req) => releaseSession(req.params.id, req.staff)));
waiter.post('/session/:id/cart', h(async (req) => {
  const result = await updateOrder(req.params.id, req.staff, req.body || {});
  // Автосохранение идёт каждые полсекунды — в журнал пишем не чаще раза в 5 минут на стол
  const key = `${req.staff.id}:${req.params.id}`;
  if (Date.now() - (editAudited.get(key) || 0) > 5 * 60_000) {
    editAudited.set(key, Date.now());
    if (editAudited.size > 5000) editAudited.clear();
    audit(req.staff, 'order.edit', 'session', req.params.id, { items: (req.body?.items || []).length, guestCount: req.body?.guestCount });
  }
  return result;
}));
waiter.post('/session/:id/send-to-production', h(async (req) => {
  const result = await sendToKitchen(req.params.id, req.staff);
  audit(req.staff, 'order.send_to_kitchen', 'session', req.params.id, { iikoOrderId: result.iikoOrderId });
  return result;
}));
// Официант принял оплату наличными или картой: оплата и закрытие заказов в iiko (кухня и бар)
waiter.post('/session/:id/pay', h(async (req) => {
  const result = await acceptWaiterPayment(req.params.id, { method: req.body?.method, tipAmount: req.body?.tipAmount });
  audit(req.staff, 'table.pay', 'session', req.params.id, { method: result.method, amount: result.amount, iiko: result.closedInIiko });
  return { ...result, session: await getSessionView(req.params.id) };
}));
waiter.post('/session/:id/close', h(async (req) => {
  const force = Boolean(req.body?.force);
  const result = await closeSession(req.params.id, req.staff, { force });
  audit(req.staff, force && result.unpaid ? 'table.close_unpaid' : 'table.close', 'session', req.params.id,
    result.unpaid ? { unpaid: result.unpaid } : undefined);
  return result;
}));
const editAudited = new Map();
router.use('/api/v1/waiter', waiter);

router.get('/api/v1/manager/feedback', staffAuth('manager'), h(async (req) => listFeedback((await staffRestaurant(req)).id)));
router.get('/api/v1/manager/dashboard', staffAuth('manager'), h(async (req) => getHallDashboard((await staffRestaurant(req)).id)));
// Брони на сегодня для админки: только просмотр, телефон маскирован
router.get('/api/v1/manager/reservations', staffAuth('manager'), h(async (req) => {
  const r = await staffRestaurant(req);
  return { restaurant: { slug: r.slug, name: r.name }, ...(await listReserves(r.id)), sync: reserveSyncStatus(r.id) };
}));
// «Обновить из iiko»: внеочередная загрузка броней точки (в iiko только чтение)
router.post('/api/v1/manager/reservations/sync', staffAuth('manager'), h(async (req) => {
  const r = await staffRestaurant(req);
  if (iikoCoolingDown()) throw httpError(503, 'iiko временно ограничила запросы — попробуйте через минуту');
  await syncReserves({ restaurantId: r.id });
  return { restaurant: { slug: r.slug, name: r.name }, ...(await listReserves(r.id)), sync: reserveSyncStatus(r.id) };
}));
