/** Гость QR-меню: вход, стол, корзина, счёт и оплата, AI-помощник. */
import express from 'express';
import { h, httpError, rateLimit, requireBody, sendError } from '../lib/http.js';
import { cleanText } from '../lib/sanitize.js';
import { stripNulMiddleware } from '../lib/sanitize.js';
import { confirmOnlinePayment, startOnlinePayment } from '../services/payments.js';
import { getWelcomeSuggestions, suggestForQuery } from '../services/ai-suggest.js';
import { logAiQuery, recordAiFeedback } from '../services/ai-learning.js';
import { eraseGuest, exportGuestData } from '../services/guest-privacy.js';
import {
  getGuestByToken, guestAuth, guestTokenFromRequest, loginByFujiToken, loginByPhone, publicGuest, updateGuestProfile,
} from '../services/guest-auth.js';
import { getVapidPublicKey, subscribeGuest, unsubscribeGuest } from '../services/guest-push.js';
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
const pushSubscribeLimit = rateLimit({ windowMs: 10 * 60_000, max: 60, message: 'Слишком много запросов — подождите' });
const aiFeedbackLimit = rateLimit({ windowMs: 60_000, max: 120 });

// ── Гость: вход ─────────────────────────────────────────────────────────────

// NUL в любой строке запроса PostgreSQL не принимает (22021) — убираем до обработчиков
router.use('/api/v1', stripNulMiddleware);

// Согласие на обработку ПДн обязательно (consent === true), по умолчанию в форме не отмечено
router.post('/api/v1/guest/login', guestLoginLimit, h(async (req) => {
  requireBody(req.body, 'phone');
  return loginByPhone(req.body);
}));
router.post('/api/v1/guest/fuji', guestLoginLimit, h(async (req) => {
  requireBody(req.body, 'token');
  return loginByFujiToken(req.body.token, { consent: req.body.consent });
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
// Права субъекта ПДн: выгрузка своих данных и удаление аккаунта
router.get('/api/v1/guest/me/export', guestAuth(), h(async (req, res) => {
  const data = await exportGuestData(req.guest.id);
  if (!data) throw httpError(404, 'Гость не найден');
  res.set({ 'Cache-Control': 'no-store', 'Content-Disposition': 'attachment; filename="fuji-my-data.json"' });
  return data;
}));
router.delete('/api/v1/guest/me', guestAuth(), h(async (req) => {
  await eraseGuest(req.guest.id, { reason: 'self' });
  return { ok: true };
}));

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
    qrKey: cleanText(req.body.qrKey, 64, { label: 'Подпись QR' }) || null,
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
    // Статусы из iiko — в фоне: гость не ждёт ответа iiko (свежие придут следующим опросом через 10 с)
    refreshFromIiko(req.params.sessionId).catch(() => {});
    if (iikoRefreshAt.size > 5000) {
      for (const [k, t] of iikoRefreshAt) if (Date.now() - t > 10 * 60_000) iikoRefreshAt.delete(k);
    }
  }
  return getSessionView(req.params.sessionId);
}));
router.post('/api/v1/table/activity', guestAuth(), bySessionBody, h(async (req) => {
  requireBody(req.body, 'sessionId');
  return trackActivity(req.body.sessionId);
}));
router.post('/api/v1/table-order/cart', guestAuth(), bySessionBody, h(async (req) => {
  requireBody(req.body, 'sessionId', 'items');
  // ageConfirmed — гость тапнул «Мне есть 18» в этом визите: сервер ставит отметку на алкогольные позиции
  return saveGuestCart(req.body.sessionId, req.body.items, req.guest?.id || null, { ageConfirmed: req.body.ageConfirmed === true });
}));
router.post('/api/v1/table/submit-to-waiter', guestAuth(), bySessionBody, h(async (req) => {
  requireBody(req.body, 'sessionId');
  return submitToWaiter(req.body.sessionId, req.body.items, req.guest?.id || null, { ageConfirmed: req.body.ageConfirmed === true });
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
  return submitFeedback(req.body.sessionId, { ...req.body, guestId: req.guest?.id || null });
}));

// ── Web Push гостю ──────────────────────────────────────────────────────────

router.get('/api/v1/push/vapid-public-key', h(async () => ({ publicKey: await getVapidPublicKey() })));
router.post('/api/v1/table-order/push-subscribe', pushSubscribeLimit, guestAuth(), bySessionBody, h(async (req) => {
  requireBody(req.body, 'sessionId', 'subscription');
  return subscribeGuest(req.body.sessionId, req.guest?.id || null, req.body.subscription);
}));
router.post('/api/v1/table-order/push-unsubscribe', pushSubscribeLimit, guestAuth(), bySessionBody, h(async (req) => {
  requireBody(req.body, 'sessionId', 'endpoint');
  return unsubscribeGuest(req.body.sessionId, req.body.endpoint);
}));

// ── AI ──────────────────────────────────────────────────────────────────────

router.post('/api/v1/ai/suggest', aiLimit, guestAuth({ required: false }), h(async (req) => {
  requireBody(req.body, 'query');
  const restaurant = await resolveRestaurant(req.body.restaurantSlug);
  const query = cleanText(req.body.query, 300, { label: 'Запрос' });
  if (!query) throw httpError(400, 'Не заполнено: query');
  const cartNames = Array.isArray(req.body.cart) ? req.body.cart.map((c) => cleanText(c, 100, { label: 'Корзина' })).filter(Boolean) : [];
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

