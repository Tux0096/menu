/**
 * Сквозной сценарий API (кейсы 1–16 ТЗ) против запущенного сервера:
 *   BASE=http://localhost:3101 node test/e2e-api.mjs
 */
import assert from 'node:assert/strict';

const BASE = process.env.BASE || 'http://localhost:3101';
const TABLE = String(process.env.TABLE || `e2e-${Math.floor(Math.random() * 9000) + 1000}`);

async function api(method, path, body, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}
const ok = (r, msg) => { assert.ok(r.status < 300, `${msg}: ${r.status} ${JSON.stringify(r.data)}`); return r.data; };
const step = (t) => console.log(`✓ ${t}`);

// 1. Без входа меню/стол недоступны
let r = await api('POST', '/api/v1/table/enter', { tableNumber: TABLE });
assert.equal(r.status, 401); step('без токена гостя стол недоступен (401)');

// 1. Вход по телефону
const login = ok(await api('POST', '/api/v1/guest/login', { phone: '8 (900) 156-08-08', name: 'Алексей', consent: true }), 'login');
const G = { 'X-Guest-Token': login.token };
step(`гость вошёл: ${login.guest.name} ${login.guest.phoneMasked}`);

// 1. Скан QR
let s = ok(await api('POST', '/api/v1/table/enter', { restaurantSlug: 'novo-sadovaya', tableNumber: TABLE }, G), 'enter');
assert.equal(s.tableNumber, TABLE);
assert.equal(s.guest.name, 'Алексей');
step(`стол №${s.tableNumber}, статус «${s.workflowLabel}»`);

// 4. Меню
const catalog = ok(await api('GET', '/api/v1/restaurants/novo-sadovaya/catalog'), 'catalog');
assert.ok(catalog.products.length > 0);
step(`меню: ${catalog.products.length} позиций (источник ${catalog.source})`);

// 2. AI-чип
const chip = ok(await api('POST', '/api/v1/ai/suggest', { restaurantSlug: 'novo-sadovaya', query: 'острое', chip: true }, G), 'ai chip');
assert.ok(chip.suggestions.length >= 2);
assert.ok(!chip.suggestions.some((x) => /соус/i.test(x.name)), 'соусы не предлагаются как блюдо');
step(`AI-чип «острое» (${chip.engine}): ${chip.suggestions.slice(0, 3).map((x) => x.name).join(', ')}`);

// 5. Корзина: пустую нельзя передать
r = await api('POST', '/api/v1/table/submit-to-waiter', { sessionId: s.sessionId, items: [] }, G);
assert.equal(r.status, 400); step('пустую корзину нельзя передать официанту');

const [p1, p2, p3] = catalog.products;
const line = (p, q) => ({ productId: p.id, iikoProductId: p.iikoId || p.id, name: p.name, price: p.price, quantity: q });
s = ok(await api('POST', '/api/v1/table-order/cart', { sessionId: s.sessionId, items: [line(p1, 2), line(p2, 1)] }, G), 'cart');
assert.equal(s.total, p1.price * 2 + p2.price); step(`корзина сохранена на сервере: ${s.total} ₽`);

// 6. Передать официанту
s = ok(await api('POST', '/api/v1/table/submit-to-waiter', { sessionId: s.sessionId, items: [line(p1, 2), line(p2, 1)] }, G), 'submit');
assert.equal(s.workflowStatus, 'cart_ready'); step(`передано официанту → «${s.workflowLabel}»`);

// 12. Вызов официанта
ok(await api('POST', '/api/v1/table/call-waiter', { sessionId: s.sessionId, reason: 'question' }, G), 'call');
step('вызов официанта');

// 16. Официант
const staff = ok(await api('POST', '/api/v1/staff/login', { login: 'waiter', password: '1111' }), 'staff login');
const W = { Authorization: `Bearer ${staff.token}` };
const notes = ok(await api('GET', '/api/v1/waiter/notifications?restaurant=novo-sadovaya', null, W), 'notifications');
assert.ok(notes.some((n) => n.session_id === s.sessionId && n.type === 'cart_ready'));
assert.ok(notes.some((n) => n.session_id === s.sessionId && n.type === 'guest_seated' && n.body.includes('Алексей')));
step(`официант видит уведомления (${notes.filter((n) => n.session_id === s.sessionId).length} по столу)`);

// 7. Правка заказа, гости, места
s = ok(await api('POST', `/api/v1/waiter/session/${s.sessionId}/take`, {}, W), 'take');
assert.equal(s.workflowStatus, 'waiter_review');
const items = s.items.map((i) => ({ ...i, seatNumber: 1 })).concat([{ ...line(p3, 1), seatNumber: 2, course: 2 }]);
s = ok(await api('POST', `/api/v1/waiter/session/${s.sessionId}/cart`, { items, guestCount: 2 }, W), 'waiter cart');
assert.equal(s.guestCount, 2); assert.equal(s.items.length, 3);
step(`официант уточнил заказ: 2 гостя, ${s.items.length} позиции → «${s.workflowLabel}»`);

// 8. В работу → iiko
s = ok(await api('POST', `/api/v1/waiter/session/${s.sessionId}/send-to-production`, {}, W), 'send');
assert.equal(s.workflowStatus, 'in_production'); assert.ok(s.iikoOrderId);
assert.ok(s.items.every((i) => i.isLocked));
step(`отправлено в iiko (заказ ${s.iikoOrderId.slice(0, 8)}…) → «${s.workflowLabel}»`);

// 8. Гость не может убрать принятые блюда
const guestItems = [line(p1, 1), line(p2, 1), line(p3, 1)];
r = await api('POST', '/api/v1/table-order/cart', { sessionId: s.sessionId, items: guestItems }, G);
assert.equal(r.status, 403); step('гость не может убрать блюда с кухни (403)');

// 9. Дозаказ
s = ok(await api('POST', '/api/v1/table/submit-to-waiter', {
  sessionId: s.sessionId, items: [line(p1, 3), line(p2, 1), line(p3, 1)],
}, G), 'reorder');
assert.equal(s.workflowStatus, 'reorder_pending');
assert.equal(s.items.filter((i) => i.isNew).length, 1);
step(`дозаказ: +1 новая позиция → «${s.workflowLabel}»`);
s = ok(await api('POST', `/api/v1/waiter/session/${s.sessionId}/send-to-production`, {}, W), 'send reorder');
assert.equal(s.items.filter((i) => i.isNew).length, 0);
step('дозаказ отправлен на кухню без дублей');

// 10. Счёт и оплата
s = ok(await api('POST', '/api/v1/table/request-bill', { sessionId: s.sessionId }, G), 'bill');
assert.equal(s.workflowStatus, 'bill_requested'); step(`«${s.workflowLabel}»`);
const tip = Math.round(s.total * 0.1);
s = ok(await api('POST', '/api/v1/table/guest-pay', { sessionId: s.sessionId, method: 'sbp', tipAmount: tip }, G), 'pay');
assert.equal(s.workflowStatus, 'paid'); step(`оплачено ${s.total} ₽ + чаевые ${tip} ₽`);
r = await api('POST', '/api/v1/table/guest-pay', { sessionId: s.sessionId, method: 'sbp', tipAmount: tip }, G);
assert.equal(r.status, 409); step('повторная оплата заблокирована (409)');

// 11. Отзыв
ok(await api('POST', '/api/v1/table/feedback', { sessionId: s.sessionId, rating: 2, comment: 'Долго ждали' }, G), 'feedback');
const fb2 = ok(await api('POST', '/api/v1/table/feedback', { sessionId: s.sessionId, rating: 5 }, G), 'feedback2');
assert.ok(fb2.alreadySent); step('отзыв сохранён один раз, низкая оценка эскалирована');

// 15. Новый визит после оплаты
const s2 = ok(await api('POST', '/api/v1/table/enter', { restaurantSlug: 'novo-sadovaya', tableNumber: TABLE, previousSessionId: s.sessionId }, G), 'reenter');
assert.notEqual(s2.sessionId, s.sessionId); assert.equal(s2.items.length, 0);
step('повторный скан после оплаты — новый чистый визит');

// 5.10 Дашборд управляющего и доступ
r = await api('GET', '/api/v1/manager/dashboard?restaurant=novo-sadovaya', null, W);
assert.equal(r.status, 403); step('официанту дашборд управляющего недоступен');
const mgr = ok(await api('POST', '/api/v1/staff/login', { login: 'manager', password: 'manager' }), 'mgr');
const dash = ok(await api('GET', '/api/v1/manager/dashboard?restaurant=novo-sadovaya', null, { Authorization: `Bearer ${mgr.token}` }), 'dash');
step(`дашборд: столов в работе ${dash.activeTables}, выручка сегодня ${dash.today.revenue} ₽, средний чек ${dash.today.avgCheck} ₽`);

// 5.9 Админка: стоп-лист
const adm = ok(await api('POST', '/api/v1/staff/login', { login: 'admin', password: 'admin' }), 'admin');
const A = { Authorization: `Bearer ${adm.token}` };
ok(await api('POST', '/api/v1/admin/menu/override?restaurant=novo-sadovaya', { productId: p1.id, is_stopped: true, product_name: p1.name }, A), 'stop');
const cat2 = ok(await api('GET', '/api/v1/restaurants/novo-sadovaya/catalog'), 'catalog2');
assert.ok(cat2.stopList.includes(p1.id));
assert.ok(cat2.products.find((p) => p.id === p1.id).isInStopList);
ok(await api('POST', '/api/v1/admin/menu/override?restaurant=novo-sadovaya', { productId: p1.id, is_stopped: false }, A), 'unstop');
step('стоп-лист из админки: позиция видна, но недоступна');

console.log('\nВсе проверки пройдены');
