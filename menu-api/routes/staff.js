/** Персонал: вход (пароль, PIN), экран официанта, контроль зала управляющего. */
import express from 'express';
import { h, requireBody, sendError } from '../lib/http.js';
import { acceptWaiterPayment } from '../services/payments.js';
import { audit, pinLogin, staffAuth, staffLogin } from '../services/staff-auth.js';
import { isPushEnabled, registerDevice, unregisterDevice } from '../services/push.js';
import { enterTable, getSessionView, markServed, resolveRestaurant } from '../services/table-session.js';
import {
  closeSession, getHallDashboard, listActiveSessions, releaseSession, sendToKitchen, takeSession, updateOrder,
} from '../services/waiter.js';
import { listWaiterNotifications, markAllNotificationsRead, markNotificationRead } from '../services/waiter-notifications.js';
import { listFeedback, listRestaurants } from '../services/admin.js';
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
router.post('/api/v1/staff/pin-login', h(async (req) => {
  requireBody(req.body, 'restaurant', 'pin');
  const r = await resolveRestaurant(req.body.restaurant);
  return pinLogin(r.id, req.body.pin, req.ip);
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
  return listWaiterNotifications(r.id, { unreadOnly: req.query.unread === '1' });
}));
waiter.post('/notifications/read-all', h(async (req) => {
  const r = await staffRestaurant(req);
  await markAllNotificationsRead(r.id);
}));
waiter.post('/notifications/:id/read', h(async (req) => { await markNotificationRead(req.params.id, (await staffRestaurant(req)).id); }));
// Стоп-лист для приёма заказа: что закончилось и что осталось в ограниченном количестве (только блюда меню)
waiter.get('/stop-list', h(async (req) => {
  const catalog = await getRestaurantCatalog(await staffRestaurant(req));
  const items = (catalog.products || [])
    .filter((p) => Number(p.price) > 0 && (p.isInStopList || p.stopBalance))
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
        mine: Boolean(x && x.waiterId && x.waiterId === req.staff.id),
      };
    }),
  };
}));
// Официант сам открывает стол (гость без QR) — дальше заказ как обычно
waiter.post('/tables/:number/open', h(async (req) => {
  const r = await staffRestaurant(req);
  const view = await enterTable({ restaurantSlug: r.slug, tableNumber: req.params.number, guest: null });
  return takeSession(view.sessionId, req.staff);
}));
// Телефон официанта для push-уведомлений
waiter.post('/devices', h(async (req) => {
  requireBody(req.body, 'token');
  const r = await staffRestaurant(req);
  await registerDevice(req.staff, r.id, req.body.token, req.body.platform);
  return { ok: true, pushEnabled: isPushEnabled() };
}));
waiter.delete('/devices/:token', h(async (req) => { await unregisterDevice(req.params.token); }));
waiter.get('/session/:id', h(async (req) => getSessionView(req.params.id)));
waiter.post('/session/:id/take', h(async (req) => takeSession(req.params.id, req.staff)));
waiter.post('/session/:id/served', h(async (req) => markServed(req.params.id, req.body?.itemIds)));
waiter.post('/session/:id/release', h(async (req) => releaseSession(req.params.id, req.staff)));
waiter.post('/session/:id/cart', h(async (req) => {
  const result = await updateOrder(req.params.id, req.staff, req.body || {});
  audit(req.staff, 'order.edit', 'session', req.params.id, { items: (req.body?.items || []).length, guestCount: req.body?.guestCount });
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
  const result = await closeSession(req.params.id, req.staff);
  audit(req.staff, 'table.close', 'session', req.params.id);
  return result;
}));
router.use('/api/v1/waiter', waiter);

router.get('/api/v1/manager/feedback', staffAuth('manager'), h(async (req) => listFeedback((await staffRestaurant(req)).id)));
router.get('/api/v1/manager/dashboard', staffAuth('manager'), h(async (req) => getHallDashboard((await staffRestaurant(req)).id)));
