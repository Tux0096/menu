/** Гость QR-меню: вход, стол, корзина, счёт и оплата, AI-помощник. */
import express from 'express';
import { h, rateLimit, requireBody, sendError } from '../lib/http.js';
import { confirmOnlinePayment, startOnlinePayment } from '../services/payments.js';
import { getWelcomeSuggestions, suggestForQuery } from '../services/ai-suggest.js';
import { logAiQuery, recordAiFeedback } from '../services/ai-learning.js';
import {
  getGuestByToken, guestAuth, guestTokenFromRequest, loginByFujiToken, loginByPhone, publicGuest, updateGuestProfile,
} from '../services/guest-auth.js';
import {
  assertGuestAtTable, callWaiter, enterTable, getSessionView, payBill, refreshFromIiko, requestBill, resolveRestaurant,
  saveGuestCart, submitFeedback, submitToWaiter, trackActivity,
} from '../services/table-session.js';

const router = express.Router();
export default router;

// Лимиты частоты по IP: вход гостя, AI (каждый запрос — платный вызов модели).
// Гости ресторана часто выходят в интернет с одного IP (Wi-Fi зала) — лимиты с запасом на весь зал.
const guestLoginLimit = rateLimit({ windowMs: 10 * 60_000, max: 100, message: 'Слишком много попыток входа — подождите 10 минут' });
const aiLimit = rateLimit({ windowMs: 60_000, max: 60, message: 'Слишком много запросов к помощнику — подождите минуту' });
const aiFeedbackLimit = rateLimit({ windowMs: 60_000, max: 120 });

// ── Гость: вход ─────────────────────────────────────────────────────────────

router.post('/api/v1/guest/login', guestLoginLimit, h(async (req) => {
  requireBody(req.body, 'phone');
  if (req.body.consent === false) {
    const err = new Error('Нужно согласие на обработку персональных данных');
    err.status = 400;
    throw err;
  }
  return loginByPhone(req.body);
}));
router.post('/api/v1/guest/fuji', guestLoginLimit, h(async (req) => {
  requireBody(req.body, 'token');
  return loginByFujiToken(req.body.token);
}));
router.get('/api/v1/guest/me', h(async (req) => {
  const guest = await getGuestByToken(guestTokenFromRequest(req));
  if (!guest) {
    const err = new Error('Сессия гостя истекла');
    err.status = 401;
    err.code = 'GUEST_AUTH_REQUIRED';
    throw err;
  }
  return publicGuest(guest);
}));
router.patch('/api/v1/guest/me', guestAuth(), h(async (req) => updateGuestProfile(req.guest.id, req.body || {})));

// ── Гость: стол ─────────────────────────────────────────────────────────────

router.post('/api/v1/table/enter', guestAuth(), h(async (req) => {
  requireBody(req.body, 'tableNumber');
  return enterTable({
    restaurantSlug: req.body.restaurantSlug,
    tableNumber: req.body.tableNumber,
    guest: req.guest,
    previousSessionId: req.body.previousSessionId,
    join: req.body.join === true,
    name: req.body.name,
    qrKey: req.body.qrKey ? String(req.body.qrKey).slice(0, 64) : null,
  });
}));

// Гость работает только со столом, к которому присоединился
const atTable = (from) => async (req, res, next) => {
  try {
    if (req.guest) await assertGuestAtTable(from(req), req.guest.id);
    next();
  } catch (err) {
    sendError(res, err, req);
  }
};
const bySessionParam = atTable((req) => req.params.sessionId);
const bySessionBody = atTable((req) => req.body?.sessionId || '');

const iikoRefreshAt = new Map();
router.get('/api/v1/table/session/:sessionId', guestAuth(), bySessionParam, h(async (req) => {
  const last = iikoRefreshAt.get(req.params.sessionId) || 0;
  if (Date.now() - last > 30000) {
    iikoRefreshAt.set(req.params.sessionId, Date.now());
    await refreshFromIiko(req.params.sessionId);
  }
  return getSessionView(req.params.sessionId);
}));
router.post('/api/v1/table/activity', guestAuth(), bySessionBody, h(async (req) => {
  requireBody(req.body, 'sessionId');
  return trackActivity(req.body.sessionId);
}));
router.post('/api/v1/table-order/cart', guestAuth(), bySessionBody, h(async (req) => {
  requireBody(req.body, 'sessionId', 'items');
  return saveGuestCart(req.body.sessionId, req.body.items, req.guest?.id || null);
}));
router.post('/api/v1/table/submit-to-waiter', guestAuth(), bySessionBody, h(async (req) => {
  requireBody(req.body, 'sessionId');
  return submitToWaiter(req.body.sessionId, req.body.items, req.guest?.id || null);
}));
router.post('/api/v1/table/request-bill', guestAuth(), bySessionBody, h(async (req) => {
  requireBody(req.body, 'sessionId');
  return requestBill(req.body.sessionId, {
    guest: req.guest, guestIds: req.body.guestIds, method: req.body.method, part: req.body.part,
  });
}));
router.post('/api/v1/table/call-waiter', guestAuth(), bySessionBody, h(async (req) => {
  requireBody(req.body, 'sessionId');
  return callWaiter(req.body.sessionId, req.body.reason, req.body.comment);
}));
// Онлайн-оплата CloudPayments: счёт → виджет → проверка статуса по номеру счёта (колбэка нет)
router.post('/api/v1/table/pay/start', guestAuth(), bySessionBody, h(async (req) => {
  requireBody(req.body, 'sessionId');
  const guestIds = Array.isArray(req.body.guestIds) && req.body.guestIds.length ? req.body.guestIds.map(String) : null;
  return startOnlinePayment(req.body.sessionId, { tipAmount: req.body.tipAmount, guest: req.guest, guestIds });
}));
router.post('/api/v1/table/pay/confirm', guestAuth(), bySessionBody, h(async (req) => {
  requireBody(req.body, 'sessionId', 'invoiceId');
  const res = await confirmOnlinePayment(req.body.invoiceId);
  if (String(res.sessionId) !== String(req.body.sessionId)) throw Object.assign(new Error('Платёж не найден'), { status: 404 });
  return { ...res, session: await getSessionView(req.body.sessionId) };
}));
router.post('/api/v1/table/guest-pay', guestAuth(), bySessionBody, h(async (req) => {
  requireBody(req.body, 'sessionId');
  return payBill(req.body.sessionId, { method: req.body.method, tipAmount: req.body.tipAmount });
}));
router.post('/api/v1/table/feedback', guestAuth(), bySessionBody, h(async (req) => {
  requireBody(req.body, 'sessionId', 'rating');
  return submitFeedback(req.body.sessionId, req.body);
}));

// ── AI ──────────────────────────────────────────────────────────────────────

router.post('/api/v1/ai/suggest', aiLimit, guestAuth({ required: false }), h(async (req) => {
  requireBody(req.body, 'query');
  const restaurant = await resolveRestaurant(req.body.restaurantSlug);
  const query = String(req.body.query).slice(0, 300);
  const cartNames = Array.isArray(req.body.cart) ? req.body.cart.map((c) => String(c).slice(0, 100)) : [];
  const { suggestions, engine, answer } = await suggestForQuery(restaurant, query, 6, req.guest, { cartNames });
  logAiQuery(restaurant.slug, query, suggestions).catch(() => {});
  return { query, suggestions, engine, answer };
}));
router.get('/api/v1/ai/welcome', aiLimit, guestAuth({ required: false }), h(async (req) => {
  const restaurant = await resolveRestaurant(req.query.restaurant);
  return { suggestions: await getWelcomeSuggestions(restaurant, 4, req.guest) };
}));
router.post('/api/v1/ai/feedback', aiFeedbackLimit, guestAuth(), h(async (req) => {
  requireBody(req.body, 'query', 'productId');
  await recordAiFeedback(req.body.query, req.body.productId, req.body.action);
  return { ok: true };
}));

