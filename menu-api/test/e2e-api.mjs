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
assert.ok(!chip.suggestions.some((x) => /^соус/i.test(x.name)), 'соусы не предлагаются как блюдо');
step(`AI-чип «острое» (${chip.engine}): ${chip.suggestions.slice(0, 3).map((x) => x.name).join(', ')}`);

// 5. Корзина: пустую нельзя передать
r = await api('POST', '/api/v1/table/submit-to-waiter', { sessionId: s.sessionId, items: [] }, G);
assert.equal(r.status, 400); step('пустую корзину нельзя передать официанту');

// Блюда без выбора: наборы бизнес-ланча (с составом) проверяются отдельно ниже
const [p1, p2, p3] = catalog.products.filter((p) => !p.lunchCombo && !p.sizes?.length && !p.modifierGroups?.length);
const line = (p, q) => ({ productId: p.id, iikoProductId: p.iikoId || p.id, name: p.name, price: p.price, quantity: q });
// Безопасность: цену и название ставит сервер по меню, а не клиент
s = ok(await api('POST', '/api/v1/table-order/cart', {
  sessionId: s.sessionId, items: [{ ...line(p1, 2), price: 1, name: 'Подделка' }, line(p2, 1)],
}, G), 'cart');
assert.equal(s.total, p1.price * 2 + p2.price, 'цена из меню, а не из запроса');
assert.ok(!s.items.some((i) => i.name === 'Подделка'), 'название из меню');
step(`корзина сохранена на сервере по ценам меню: ${s.total} ₽ (подменённая цена отброшена)`);
r = await api('POST', '/api/v1/table-order/cart', {
  sessionId: s.sessionId, items: [{ productId: '00000000-0000-4000-8000-000000000000', iikoProductId: '00000000-0000-4000-8000-000000000000', name: 'Нет такого', price: 1, quantity: 1 }],
}, G);
assert.equal(r.status, 400); step('блюдо не из меню не принимается (400)');
r = await api('POST', '/api/v1/table-order/cart', { sessionId: s.sessionId, items: [line(p1, 500)] }, G);
assert.equal(r.status, 400); step('500 штук одной позиции не принимается (400)');
s = ok(await api('POST', '/api/v1/table-order/cart', { sessionId: s.sessionId, items: [line(p1, 2), line(p2, 1)] }, G), 'cart again');

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

// Web Push гостю: подписка принимается, неверная — 400; отправка при «Взять стол» (сервер с WEB_PUSH_DRY_RUN=true — без сети)
{
  const { createECDH, randomBytes } = await import('node:crypto');
  const ecdh = createECDH('prime256v1'); ecdh.generateKeys();
  const sub = {
    endpoint: `https://fcm.googleapis.com/fcm/send/e2e-${randomBytes(6).toString('hex')}`,
    keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') },
  };
  r = await api('GET', '/api/v1/push/vapid-public-key');
  assert.equal(r.status, 200); assert.ok(r.data.publicKey && !('privateKey' in r.data));
  r = await api('POST', '/api/v1/table-order/push-subscribe', { sessionId: s.sessionId, subscription: sub });
  assert.equal(r.status, 401);
  r = await api('POST', '/api/v1/table-order/push-subscribe', { sessionId: s.sessionId, subscription: { endpoint: 'http://127.0.0.1/x', keys: sub.keys } }, G);
  assert.equal(r.status, 400);
  r = await api('POST', '/api/v1/table-order/push-subscribe', { sessionId: s.sessionId, subscription: { ...sub, keys: { p256dh: 'abc', auth: 'def' } } }, G);
  assert.equal(r.status, 400);
  r = await api('POST', '/api/v1/table-order/push-subscribe', { sessionId: s.sessionId, subscription: { endpoint: 'https://evil.example/x', keys: sub.keys } }, G);
  assert.equal(r.status, 400);
  ok(await api('POST', '/api/v1/table-order/push-subscribe', { sessionId: s.sessionId, subscription: sub }, G), 'push subscribe');
  ok(await api('POST', '/api/v1/table-order/push-subscribe', { sessionId: s.sessionId, subscription: sub }, G), 'push resubscribe');
  step('Web Push: публичный ключ отдаётся, подписка принимается (повтор — тот же адрес), неверная/чужой хост — 400, без входа — 401');
}

// 7. Правка заказа, гости, места
// Просмотр стола без «Взять стол» заказ в работу не принимает; взял стол — гость видит «Официант уточняет заказ»
s = ok(await api('POST', `/api/v1/waiter/session/${s.sessionId}/take`, {}, W), 'take');
assert.equal(s.workflowStatus, 'cart_ready'); assert.equal(s.waiterId, null);
s = ok(await api('POST', `/api/v1/waiter/session/${s.sessionId}/assign`, {}, W), 'assign');
assert.equal(s.workflowStatus, 'waiter_review'); assert.equal(s.waiterId, staff.staff.id);
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

// 9. Дозаказ. У каждого гостя своя корзина: блюдо, добавленное официантом на место 2, в неё не входит
s = ok(await api('POST', '/api/v1/table/submit-to-waiter', {
  sessionId: s.sessionId, items: [line(p1, 3), line(p2, 1)],
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
// 10. Демо-оплата без платёжного провайдера не отмечает счёт оплаченным (только DEMO_PAYMENTS локально)
r = await api('POST', '/api/v1/table/guest-pay', { sessionId: s.sessionId, method: 'sbp', tipAmount: 0 }, G);
if (process.env.DEMO_PAYMENTS === 'true') {
  assert.equal(r.status, 200); step('демо-оплата через меню');
} else {
  assert.equal(r.status, 403); step('оплата «без денег» через меню запрещена (403), заказ не отмечается оплаченным');
}

// 11. Отзыв
ok(await api('POST', '/api/v1/table/feedback', { sessionId: s.sessionId, rating: 2, comment: 'Долго ждали' }, G), 'feedback');
const fb2 = ok(await api('POST', '/api/v1/table/feedback', { sessionId: s.sessionId, rating: 5 }, G), 'feedback2');
assert.ok(fb2.alreadySent); step('отзыв сохранён один раз, низкая оценка эскалирована');

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

// Карточка сети по макету: несколько меток (мусор отсекается), большая карточка; выгрузка их не трогает
ok(await api('POST', '/api/v1/admin/network-menu/card', {
  productName: p2.iikoName || p2.name,
  targets: [{ restaurant: 'novo-sadovaya', productId: p2.id }],
  fields: { badge: 'spicy,new,<script>,NEW', card_size: 'big' },
}, A), 'card tags');
let p2c = ok(await api('GET', '/api/v1/restaurants/novo-sadovaya/catalog'), 'catalog3').products.find((p) => p.id === p2.id);
assert.equal(p2c.badge, 'spicy,new'); assert.equal(p2c.cardSize, 'big');
ok(await api('POST', '/api/v1/admin/network-menu/card', {
  productName: p2.iikoName || p2.name, targets: [{ restaurant: 'novo-sadovaya', productId: p2.id }], fields: { badge: '', card_size: '' },
}, A), 'card tags reset');
p2c = ok(await api('GET', '/api/v1/restaurants/novo-sadovaya/catalog'), 'catalog4').products.find((p) => p.id === p2.id);
assert.ok(!p2c.badge && !p2c.cardSize, 'снятые метки и большая карточка не возвращаются из карточки по названию');
// вернуть как было до теста
ok(await api('POST', '/api/v1/admin/network-menu/card', {
  productName: p2.iikoName || p2.name, targets: [{ restaurant: 'novo-sadovaya', productId: p2.id }],
  fields: { badge: p2.badge || '', card_size: p2.cardSize || '' },
}, A), 'card tags restore');
step('метки блюда: несколько через запятую, лишнее отсекается; большая карточка включается и выключается');

// Картинка раздела — по названию раздела, у гостя приходит в groups
const group = catalog.groups.find((g) => g.id === p1.parentGroup);
const groupImage0 = (ok(await api('GET', '/api/v1/admin/network-menu/categories', null, A), 'cats0').find((c) => c.name === group.name) || {}).image || null;
r = await api('POST', '/api/v1/admin/network-menu/categories', { name: group.name, image: 'javascript:alert(1)' }, A);
assert.equal(r.status, 400, 'чужие ссылки на картинку не принимаются');
ok(await api('POST', '/api/v1/admin/network-menu/categories', { name: group.name, image: '/media/e2e.png' }, A), 'cat image');
let g2 = ok(await api('GET', '/api/v1/restaurants/novo-sadovaya/catalog'), 'catalog5').groups.find((g) => g.id === group.id);
assert.equal(g2.image, '/media/e2e.png');
const cats = ok(await api('GET', '/api/v1/admin/network-menu/categories', null, A), 'cats');
assert.ok(cats.some((c) => c.name === group.name && c.image === '/media/e2e.png'));
ok(await api('POST', '/api/v1/admin/network-menu/categories', { name: group.name, image: null }, A), 'cat image reset');
g2 = ok(await api('GET', '/api/v1/restaurants/novo-sadovaya/catalog'), 'catalog6').groups.find((g) => g.id === group.id);
assert.ok(!g2.image || g2.image !== '/media/e2e.png');
if (groupImage0) ok(await api('POST', '/api/v1/admin/network-menu/categories', { name: group.name, image: groupImage0 }, A), 'cat image restore');
step('картинка раздела: сохраняется, видна гостю, сбрасывается на стандартную');

// Адрес и время работы точки — у гостя в выборе ресторана
const info0 = ok(await api('GET', '/api/v1/admin/point-info?restaurant=novo-sadovaya', null, A), 'info');
ok(await api('POST', '/api/v1/admin/point-info?restaurant=novo-sadovaya', { address: info0.address, workHours: '9:00 – 23:30' }, A), 'info save');
const rests = ok(await api('GET', '/api/v1/restaurants'), 'rests');
assert.equal(rests.find((x) => x.slug === 'novo-sadovaya').workHours, '9:00 – 23:30');
ok(await api('POST', '/api/v1/admin/point-info?restaurant=novo-sadovaya', { address: info0.address, workHours: info0.workHours }, A), 'info restore');
r = await api('POST', '/api/v1/admin/point-info?restaurant=novo-sadovaya', { workHours: '9-23' }, W);
assert.ok(r.status === 401 || r.status === 403, 'официант не меняет карточку точки');
step('адрес и время работы точки: сохраняются админом, гость видит, официанту нельзя');

// Разделы меню: порядок, своё название, вкладка, скрытие — у гостя сразу
{
  const cats0 = ok(await api('GET', '/api/v1/admin/network-menu/categories', null, A), 'cats list');
  assert.ok(cats0.length > 2, 'разделы есть');
  const reordered = [cats0[2], cats0[0], ...cats0.slice(1).filter((c) => c.key !== cats0[2].key)]
    .map((c, i) => ({ name: c.name, bar: c.bar, title: i === 0 ? 'Первый раздел' : c.title, tab: c.tab, hidden: c.key === cats0[1].key }));
  ok(await api('PUT', '/api/v1/admin/network-menu/categories', { items: reordered }, A), 'cats save');
  const cat3 = ok(await api('GET', '/api/v1/restaurants/novo-sadovaya/catalog'), 'catalog sections');
  assert.equal(cat3.groups[0].name, 'Первый раздел', 'свой порядок и название у гостя');
  assert.ok(!cat3.groups.some((g) => (g.iikoName || g.name) === cats0[1].name), 'скрытого раздела у гостя нет');
  assert.ok(!cat3.products.some((p) => p.parentGroupName === cats0[1].name), 'и его блюд тоже');
  const cats1 = ok(await api('GET', '/api/v1/admin/network-menu/categories', null, A), 'cats list 2');
  assert.ok(cats1.find((c) => c.key === cats0[1].key)?.hidden, 'скрытый раздел виден в админке');
  // вернуть как было (порядок — как до теста, без своих названий/скрытия, если их не было)
  ok(await api('PUT', '/api/v1/admin/network-menu/categories', { items: cats0.map((c) => ({ name: c.name, bar: c.bar, title: c.title, tab: c.tab, hidden: c.hidden })) }, A), 'cats restore');
  step('разделы меню: порядок, название и скрытие из админки — у гостя');
}

// Модификаторы и размеры: выбор гостя → цена с сервера → строка заказа → в iiko
{
  const cat4 = ok(await api('GET', '/api/v1/restaurants/novo-sadovaya/catalog'), 'catalog mods');
  // любое блюдо с одной обязательной группой «выберите 1» (соус, ролл в сет…); размеры — если есть в меню
  const pick1 = (g) => g.min >= 1 && g.max === 1 && !g.free && g.items.length >= 2;
  const dish = cat4.products.find((p) => p.modifierGroups?.length === 1 && pick1(p.modifierGroups[0]) && !p.isInStopList);
  const sized = cat4.products.find((p) => p.sizes?.length > 1 && !p.isInStopList);
  if (!dish) step('модификаторы: в этом меню нет блюд с выбором — пропуск');
  else {
    const g2 = { 'X-Guest-Token': login.token };
    const sm = ok(await api('POST', '/api/v1/table/enter', { restaurantSlug: 'novo-sadovaya', tableNumber: `${TABLE}m` }, g2), 'enter mods');
    const [grp] = dish.modifierGroups;
    const choice = grp.items[1];
    const line = { productId: dish.id, iikoProductId: dish.iikoId || dish.id, name: dish.name, quantity: 2, modifiers: [{ id: choice.id, groupId: grp.id, amount: 1 }] };
    const plain = { productId: dish.id, iikoProductId: dish.iikoId || dish.id, name: dish.name, quantity: 1 }; // без выбора — по умолчанию
    const big = sized?.sizes.find((z) => !z.isDefault);
    const sizedLine = sized && { productId: sized.id, iikoProductId: sized.iikoId || sized.id, name: sized.name, quantity: 1, sizeId: big.id };
    let sv = ok(await api('POST', '/api/v1/table-order/cart', { sessionId: sm.sessionId, items: [line, plain, { ...line, price: 1 }, ...(sizedLine ? [sizedLine] : [])] }, g2), 'cart mods');
    const lines = sv.items.filter((i) => String(i.iikoProductId) === String(dish.iikoId || dish.id));
    const chosen = lines.find((i) => i.modifiers.some((m) => m.id === choice.id));
    assert.equal(chosen.quantity, 4, 'одинаковый выбор — одна строка (2 + 2)');
    assert.equal(chosen.price, (dish.basePrice ?? dish.price) + choice.price, 'цена = блюдо + выбор (цена клиента не принимается)');
    assert.ok(chosen.name.includes(choice.name), 'выбор виден в названии для официанта');
    const def = lines.find((i) => i !== chosen);
    assert.ok(def && def.modifiers.some((m) => m.groupId === grp.id), 'без выбора — обязательный вариант по умолчанию');
    if (sized) {
      const pz = sv.items.find((i) => String(i.iikoProductId) === String(sized.iikoId || sized.id));
      assert.equal(pz.price, big.price); assert.equal(pz.sizeId, String(big.id));
    }
    r = await api('POST', '/api/v1/table-order/cart', { sessionId: sm.sessionId, items: [{ ...line, modifiers: [{ id: '00000000-0000-4000-8000-000000000999', amount: 1 }] }] }, g2);
    assert.equal(r.status, 400, 'несуществующий модификатор отклоняется');
    r = await api('POST', '/api/v1/table-order/cart', { sessionId: sm.sessionId, items: [{ ...line, modifiers: [...line.modifiers, { id: grp.items[0].id, groupId: grp.id, amount: 1 }] }] }, g2);
    assert.equal(r.status, 400, 'два варианта при «выберите 1» отклоняются');
    // официант отправляет на кухню: выбор сохраняется, позиции заблокированы
    sv = ok(await api('POST', '/api/v1/table/submit-to-waiter', { sessionId: sm.sessionId, items: sv.items.map((i) => ({ productId: i.productId, iikoProductId: i.iikoProductId, name: i.name, quantity: i.quantity, sizeId: i.sizeId, modifiers: i.modifiers })) }, g2), 'submit mods');
    ok(await api('POST', `/api/v1/waiter/session/${sm.sessionId}/take`, {}, W), 'take mods');
    // официант сохраняет корзину из приложения (без полей выбора, только id строк) — выбор не теряется
    const wv = ok(await api('GET', `/api/v1/waiter/session/${sm.sessionId}`, null, W), 'waiter view');
    ok(await api('POST', `/api/v1/waiter/session/${sm.sessionId}/cart`, { items: wv.items.map((i) => ({ id: i.id, productId: i.productId, iikoProductId: i.iikoProductId, name: i.name, quantity: i.quantity, seatNumber: 1 })) }, W), 'waiter cart mods');
    sv = ok(await api('POST', `/api/v1/waiter/session/${sm.sessionId}/send-to-production`, {}, W), 'send mods');
    const sent = sv.items.find((i) => i.modifiers.some((m) => m.id === choice.id));
    assert.ok(sent?.isLocked && sent.quantity === 4, 'вариант с выбором ушёл на кухню');
    if (sized) assert.ok(sv.items.find((i) => i.sizeId === String(big.id))?.isLocked, 'размер ушёл на кухню');
    // гость сохраняет корзину после отправки — отправленные варианты не теряются и не считаются убранными
    ok(await api('POST', '/api/v1/table-order/cart', { sessionId: sm.sessionId, items: sv.items.map((i) => ({ productId: i.productId, iikoProductId: i.iikoProductId, name: i.name, quantity: i.quantity, sizeId: i.sizeId, modifiers: i.modifiers })) }, g2), 'cart after send');
    // Оплата официанту картой: весь стол, ровно сумма отправленного; повторное нажатие не проводит второй раз
    const sentSum = sv.items.filter((i) => i.isLocked).reduce((n, i) => n + i.lineTotal, 0);
    const paid = ok(await api('POST', `/api/v1/waiter/session/${sm.sessionId}/pay`, { method: 'card' }, W), 'pay mods');
    assert.equal(Math.round(paid.amount), Math.round(sentSum), 'официанту — сумма отправленного');
    r = await api('POST', `/api/v1/waiter/session/${sm.sessionId}/pay`, { method: 'card' }, W);
    assert.equal(r.status, 409, 'второй раз не оплачивается');
    step('модификаторы и размеры: цена с сервера, обязательный выбор, отправка на кухню, официант не теряет выбор; оплата официанту — один раз');
  }
}

// Официант сохраняет корзину, не видя свежего блюда гостя — блюдо гостя остаётся (раньше молча стиралось)
{
  const g3 = { 'X-Guest-Token': login.token };
  const sk = ok(await api('POST', '/api/v1/table/enter', { restaurantSlug: 'novo-sadovaya', tableNumber: `${TABLE}k` }, g3), 'enter k');
  const [a, b] = catalog.products.filter((p) => !p.modifierGroups?.length && !p.sizes?.length && p.price > 0 && !p.isInStopList);
  const ln = (p, q) => ({ productId: p.id, iikoProductId: p.iikoId || p.id, name: p.name, quantity: q });
  ok(await api('POST', '/api/v1/table/submit-to-waiter', { sessionId: sk.sessionId, items: [ln(a, 1)] }, g3), 'submit k');
  const seen = ok(await api('POST', `/api/v1/waiter/session/${sk.sessionId}/take`, {}, W), 'take k');
  const rowA = seen.items.find((i) => !i.isLocked);
  // гость тем временем добавил второе блюдо
  ok(await api('POST', '/api/v1/table-order/cart', { sessionId: sk.sessionId, items: [ln(a, 1), ln(b, 1)] }, g3), 'guest adds');
  // официант сохраняет то, что видел: a ×2
  const saved = ok(await api('POST', `/api/v1/waiter/session/${sk.sessionId}/cart`, {
    knownIds: [rowA.id], items: [{ id: rowA.id, productId: a.id, iikoProductId: a.iikoId || a.id, name: a.name, quantity: 2, seatNumber: 1 }],
  }, W), 'waiter save k');
  const qa = saved.items.filter((i) => String(i.iikoProductId) === String(a.iikoId || a.id)).reduce((n, i) => n + i.quantity, 0);
  const qb = saved.items.filter((i) => String(i.iikoProductId) === String(b.iikoId || b.id)).reduce((n, i) => n + i.quantity, 0);
  assert.equal(qa, 2, 'правка официанта применилась');
  assert.equal(qb, 1, 'блюдо гостя, которого официант не видел, осталось');
  ok(await api('POST', `/api/v1/waiter/session/${sk.sessionId}/close`, { force: true }, W), 'close k');
  step('официант сохраняет свою правку и не стирает блюдо, которое гость добавил за это время');
}

// Модификаторы из админки: своё название группы и варианта, картинка — у гостя; официанту менять нельзя
{
  const mods = ok(await api('GET', '/api/v1/admin/network-menu/modifiers', null, A), 'mods list');
  const g = mods.find((x) => x.items.length >= 2);
  if (!g) step('модификаторы в админке: нет групп — пропуск');
  else {
    const it = g.items[0];
    ok(await api('PUT', '/api/v1/admin/network-menu/modifiers', { groups: [{ iikoName: g.iikoName, title: 'E2E группа' }], items: [{ iikoName: it.iikoName, title: 'E2E вариант' }] }, A), 'mods save');
    ok(await api('POST', '/api/v1/admin/network-menu/modifiers/image', { name: it.iikoName, image: 'https://example.com/e2e.png' }, A), 'mods image');
    r = await api('PUT', '/api/v1/admin/network-menu/modifiers', { groups: [], items: [] }, W);
    assert.equal(r.status, 403, 'официант не меняет модификаторы');
    const cat5 = ok(await api('GET', '/api/v1/restaurants/novo-sadovaya/catalog'), 'catalog mods 2');
    const gg = cat5.products.flatMap((p) => p.modifierGroups || []).find((x) => x.name === 'E2E группа');
    assert.ok(gg, 'своё название группы — у гостя');
    const ii = gg.items.find((x) => x.name === 'E2E вариант');
    assert.ok(ii && ii.image === 'https://example.com/e2e.png', 'своё название и картинка варианта — у гостя');
    ok(await api('PUT', '/api/v1/admin/network-menu/modifiers', { groups: [{ iikoName: g.iikoName, title: g.title }], items: [{ iikoName: it.iikoName, title: it.title }] }, A), 'mods restore');
    ok(await api('POST', '/api/v1/admin/network-menu/modifiers/image', { name: it.iikoName, image: it.image }, A), 'mods image restore');
    step('модификаторы в админке: название группы и варианта, картинка — у гостя; официанту нельзя (403)');
  }
}

// Конструктор бизнес-ланча: блок в каталоге, время действия, отказ вне времени (корзина, передача официанту, отправка на кухню)
{
  const bl = catalog.businessLunch;
  if (!bl?.combos?.length) console.log('- бизнес-ланч: в меню точки нет наборов (проверка пропущена)');
  else {
    const adminLunch = ok(await api('GET', '/api/v1/admin/business-lunch', null, A), 'lunch admin');
    const origin = adminLunch.schedule;
    const wdNow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(new Intl.DateTimeFormat('en-US', { timeZone: origin.tz, weekday: 'short' }).format(new Date())) || 7;
    async function setSchedule(schedule) { ok(await api('PUT', '/api/v1/admin/business-lunch', { schedule }, A), 'lunch schedule'); }
    const open = { days: [1, 2, 3, 4, 5, 6, 7], from: '00:00', to: '00:00', tz: origin.tz };
    const closed = { days: [(wdNow % 7) + 1], from: '00:00', to: '23:59', tz: origin.tz }; // только завтра
    try {
      await setSchedule(open);
      const cat1 = ok(await api('GET', '/api/v1/restaurants/novo-sadovaya/catalog'), 'catalog open');
      assert.equal(cat1.businessLunch.active, true);
      const combo = cat1.businessLunch.combos[0];
      const mods = combo.steps.map((st) => ({ id: st.items[0].id, groupId: st.groupId, amount: 1 }));
      const lunchLine = { productId: combo.productId, iikoProductId: combo.productId, name: combo.title, quantity: 1, sizeId: combo.sizeId, modifiers: mods };
      const lg = ok(await api('POST', '/api/v1/guest/login', { phone: '8 (900) 156-09-09', name: 'Ланч', consent: true }), 'login lunch');
      const LG = { 'X-Guest-Token': lg.token };
      const ls = ok(await api('POST', '/api/v1/table/enter', { restaurantSlug: 'novo-sadovaya', tableNumber: `${TABLE}-l` }, LG), 'enter lunch');
      const saved = ok(await api('POST', '/api/v1/table-order/cart', { sessionId: ls.sessionId, items: [lunchLine] }, LG), 'lunch cart');
      assert.ok(saved.items[0].price > 0 && saved.items[0].options, 'в корзине состав набора');
      step(`бизнес-ланч в своё время: набор «${combo.title}» в корзине (${saved.items[0].price} ₽, ${saved.items[0].options})`);

      await setSchedule(closed);
      const cat2 = ok(await api('GET', '/api/v1/restaurants/novo-sadovaya/catalog'), 'catalog closed');
      assert.equal(cat2.businessLunch.active, false); assert.ok(cat2.businessLunch.nextStart);
      r = await api('POST', '/api/v1/table-order/cart', { sessionId: ls.sessionId, items: [lunchLine] }, LG);
      assert.equal(r.status, 400); assert.match(r.data.error, /^Бизнес-ланч доступен с 00:00 до 23:59/);
      step(`вне времени корзина не принимает набор: 400 «${r.data.error}»`);
      r = await api('POST', '/api/v1/table/submit-to-waiter', { sessionId: ls.sessionId }, LG);
      assert.equal(r.status, 400); assert.match(r.data.error, /Бизнес-ланч доступен/);
      step('вне времени набор из корзины официанту не передать (400)');
      r = await api('POST', `/api/v1/waiter/session/${ls.sessionId}/send-to-production`, {}, W);
      assert.equal(r.status, 400); assert.match(r.data.error, /Бизнес-ланч доступен/);
      step('вне времени набор не отправить на кухню (400)');
      r = await api('PUT', '/api/v1/admin/business-lunch', { schedule: { days: [], from: '12:00', to: '16:00' } }, A);
      assert.equal(r.status, 400); step('расписание без дней не сохраняется (400)');
      r = await api('PUT', '/api/v1/admin/business-lunch', { schedule: open }, W);
      assert.equal(r.status, 403); step('официанту настройки бизнес-ланча недоступны (403)');
      await api('POST', `/api/v1/waiter/session/${ls.sessionId}/close`, { force: true }, W);
    } finally {
      await setSchedule(origin);
    }
  }
}

// Алкоголь: правила точки в админке, подтверждение 18+ с корзиной, отказ вне часов, плашка для официанта
{
  const alco = catalog.products.find((p) => p.isAlcohol && !p.isAlias && !p.lunchCombo && Number(p.price) > 0 && !p.isInStopList
    && !p.sizes?.length && !p.modifierGroups?.length);
  if (!alco) console.log('- алкоголь: в меню точки нет простых алкогольных позиций (проверка пропущена)');
  else {
    const origin = ok(await api('GET', '/api/v1/admin/alcohol', null, A), 'alcohol admin');
    const { preview: _p, ...originRules } = origin;
    const setRules = async (rules) => ok(await api('POST', '/api/v1/admin/alcohol', { ...originRules, ...rules }, A), 'alcohol save');
    const alcoLine = { productId: alco.id, iikoProductId: alco.iikoId || alco.id, name: alco.name, price: alco.price, quantity: 1 };
    // Окно часов продажи, в которое «сейчас» не попадает: со сдвигом +2 ч на час (по времени точки)
    const hhmm = (shiftMin) => new Intl.DateTimeFormat('en-GB', { timeZone: origin.tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .format(new Date(Date.now() + shiftMin * 60000));
    try {
      await setRules({ enabled: true, from: '', to: '', text: 'Алкоголь только с документом', requireAgeConfirm: true, requireDocCheck: true });
      const cat = ok(await api('GET', '/api/v1/restaurants/novo-sadovaya/catalog'), 'catalog alcohol');
      assert.equal(cat.alcohol.open, true); assert.equal(cat.alcohol.rulesText, 'Алкоголь только с документом');
      assert.ok(cat.products.find((p) => p.id === alco.id).isAlcohol);
      assert.ok(!p1.isAlcohol && !p2.isAlcohol, 'обычные блюда не помечены как алкоголь');
      step(`каталог: «${alco.name}» помечена 18+, правила точки «${cat.alcohol.rulesText}»`);

      const ag = ok(await api('POST', '/api/v1/guest/login', { phone: '8 (900) 156-10-10', name: 'Алкоголь', consent: true }), 'login alcohol');
      const AG = { 'X-Guest-Token': ag.token };
      const as = ok(await api('POST', '/api/v1/table/enter', { restaurantSlug: 'novo-sadovaya', tableNumber: `${TABLE}-a` }, AG), 'enter alcohol');
      r = await api('POST', '/api/v1/table-order/cart', { sessionId: as.sessionId, items: [alcoLine] }, AG);
      assert.equal(r.status, 409); assert.equal(r.data.code, 'ALCO_AGE_REQUIRED');
      step(`без подтверждения 18+ алкоголь в корзину не принимается: 409 «${r.data.error}»`);
      const withAge = ok(await api('POST', '/api/v1/table-order/cart', { sessionId: as.sessionId, items: [alcoLine], ageConfirmed: true }, AG), 'alcohol cart');
      assert.equal(withAge.items[0].isAlcohol, true); assert.equal(withAge.items[0].ageConfirmed, true);
      assert.equal(withAge.alcohol.guestConfirmed, true); assert.equal(withAge.alcohol.requireDocCheck, true);
      // Опрос корзины без флага (после перезагрузки страницы) строку с отметкой не ломает
      ok(await api('POST', '/api/v1/table-order/cart', { sessionId: as.sessionId, items: [alcoLine] }, AG), 'alcohol cart again');
      step('с подтверждением 18+ принято, отметка сохранена на позиции');
      const wv = ok(await api('GET', `/api/v1/waiter/session/${as.sessionId}`, null, W), 'waiter view alcohol');
      assert.equal(wv.alcohol.guestConfirmed, true); assert.match(wv.alcohol.rulesText, /документом/); assert.equal(wv.alcohol.warning, null);
      step('официант видит блок алкоголя: «гость подтвердил 18+», правила точки, проверка документа');

      await setRules({ from: hhmm(120), to: hhmm(180) });
      const closedCat = ok(await api('GET', '/api/v1/restaurants/novo-sadovaya/catalog'), 'catalog closed alcohol');
      assert.equal(closedCat.alcohol.open, false); assert.ok(closedCat.alcohol.nextChangeAt);
      r = await api('POST', '/api/v1/table-order/cart', { sessionId: as.sessionId, items: [alcoLine, line(p1, 1)], ageConfirmed: true }, AG);
      assert.equal(r.status, 409); assert.equal(r.data.code, 'ALCO_CLOSED'); assert.match(r.data.error, /^Алкоголь продаём с \d\d:\d\d до \d\d:\d\d$/);
      step(`вне часов продажи: 409 «${r.data.error}»`);
      r = await api('POST', '/api/v1/table/submit-to-waiter', { sessionId: as.sessionId }, AG);
      assert.equal(r.status, 409); assert.equal(r.data.code, 'ALCO_CLOSED');
      ok(await api('POST', '/api/v1/table-order/cart', { sessionId: as.sessionId, items: [line(p1, 1)] }, AG), 'food cart while closed');
      step('вне часов еда в корзину принимается, алкоголь из корзины официанту не передаётся');

      await setRules({ enabled: false, from: '', to: '' });
      r = await api('POST', '/api/v1/table-order/cart', { sessionId: as.sessionId, items: [alcoLine], ageConfirmed: true }, AG);
      assert.equal(r.status, 409); assert.equal(r.data.error, 'На этой точке алкоголь не продаётся');
      step('алкоголь выключен на точке: 409 «На этой точке алкоголь не продаётся»');

      r = await api('POST', '/api/v1/admin/alcohol', { ...originRules, from: '10:00', to: '' }, A);
      assert.equal(r.status, 400); step('часы только с одним временем не сохраняются (400)');
      r = await api('POST', '/api/v1/admin/alcohol', originRules, W);
      assert.equal(r.status, 403); step('официанту настройки алкоголя недоступны (403)');
      await api('POST', `/api/v1/waiter/session/${as.sessionId}/close`, { force: true }, W);
    } finally {
      await setRules(originRules);
    }
  }
}

// Бизнес-ланч: место карточки в меню, свои название/описание/вес блюд и фото набора — у гостя и официанта (общий каталог)
{
  const bl = catalog.businessLunch;
  if (!bl?.combos?.length) console.log('- бизнес-ланч: правки блюд и место карточки — в меню точки нет наборов (проверка пропущена)');
  else {
    const adm0 = ok(await api('GET', '/api/v1/admin/business-lunch', null, A), 'lunch admin 2');
    assert.ok(adm0.categories.length && adm0.categories.every((c) => c.key && ['kitchen', 'bar'].includes(c.tab)), 'список разделов для выбора места');
    const first = adm0.combos.find((c) => c.enabled);
    const comboBody = (patch = {}) => Object.fromEntries(adm0.combos.map((c, i) => [c.key, {
      enabled: c.enabled, title: c.custom, order: i, image: c.image, description: c.description, weight: c.weight, ...(c.key === first.key ? patch : {}),
    }]));
    const item0 = adm0.steps.flatMap((s) => s.items).find((i) => i.enabled);
    const origContent = [{ iikoName: item0.iikoName, title: item0.custom, description: item0.description, weight: item0.weight }];
    try {
      // Место: во втором (по списку) разделе кухни последним — карточка приходит в каталоге с ID раздела
      const target = adm0.categories.find((c) => c.tab === 'kitchen' && !/бизнес ланч/.test(c.key)) || adm0.categories[0];
      ok(await api('PUT', '/api/v1/admin/business-lunch', { placement: { category: target.key, position: 'index', index: 3 } }, A), 'lunch placement');
      const c1 = ok(await api('GET', '/api/v1/restaurants/novo-sadovaya/catalog'), 'catalog placement');
      const gid = c1.groups.find((g) => (g.iikoName || g.name) === target.name || g.name === target.name)?.id;
      assert.ok(gid && c1.businessLunch.placement?.groupId === gid, `место карточки: раздел «${target.name}»`);
      assert.deepEqual([c1.businessLunch.placement.position, c1.businessLunch.placement.index], ['index', 3]);
      step(`бизнес-ланч: карточка в разделе «${target.name}» на 3-м месте (сервер отдал placement)`);
      ok(await api('PUT', '/api/v1/admin/business-lunch', { placement: { category: 'нет такого раздела', position: 'last' } }, A), 'lunch placement bad');
      const c2 = ok(await api('GET', '/api/v1/restaurants/novo-sadovaya/catalog'), 'catalog placement 2');
      assert.equal(c2.businessLunch.placement, null, 'раздела нет — карточка остаётся на месте по умолчанию');
      r = await api('PUT', '/api/v1/admin/business-lunch', { placement: { category: target.key, position: 'first' } }, W);
      assert.equal(r.status, 403); step('официанту место карточки менять нельзя (403); нет такого раздела — место по умолчанию');

      // Блюдо шага: название, описание, вес; набор: фото, описание, вес
      ok(await api('PUT', '/api/v1/admin/business-lunch', {
        combos: comboBody({ image: 'https://example.com/e2e-combo.png', description: 'E2E состав набора', weight: '777 г' }),
        content: [{ iikoName: item0.iikoName, title: 'E2E блюдо ланча', description: 'E2E описание блюда', weight: '123 г' }],
      }, A), 'lunch content');
      const c3 = ok(await api('GET', '/api/v1/restaurants/novo-sadovaya/catalog'), 'catalog content');
      const combo0 = c3.businessLunch.combos.find((c) => c.title === (first.custom || first.auto));
      assert.ok(combo0, 'набор в каталоге');
      const steps = c3.businessLunch.combos.flatMap((c) => c.steps.flatMap((st) => st.items));
      const mine = steps.find((x) => x.name === 'E2E блюдо ланча');
      assert.ok(mine && mine.description === 'E2E описание блюда' && mine.weight === '123 г', 'своё название, описание и вес блюда — у гостя и официанта');
      assert.deepEqual([combo0.image, combo0.description, combo0.weight], ['https://example.com/e2e-combo.png', 'E2E состав набора', '777 г']);
      r = await api('PUT', '/api/v1/admin/business-lunch', { combos: comboBody({ image: 'javascript:alert(1)' }) }, A);
      assert.equal(r.status, 400); step('блюдо ланча: свои название, описание, вес и фото набора — в каталоге; плохая ссылка на фото — 400');
    } finally {
      await api('PUT', '/api/v1/admin/business-lunch', { placement: null, combos: comboBody({}), content: origContent }, A);
    }
  }
}

// Время показа разделов: «с … до …» по времени точки — скрыт у гостя вне времени, заказ позиции — 409
{
  const tzNow = (await api('GET', '/api/v1/admin/business-lunch', null, A)).data?.schedule?.tz || 'Europe/Samara';
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tzNow, hourCycle: 'h23', hour: 'numeric', minute: 'numeric' }).formatToParts(new Date());
  const nowMin = Number(parts.find((x) => x.type === 'hour').value) * 60 + Number(parts.find((x) => x.type === 'minute').value);
  const hhmm = (m) => `${String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, '0')}:${String(((m % 1440) + 1440) % 1440 % 60).padStart(2, '0')}`;
  const cats0 = ok(await api('GET', '/api/v1/admin/network-menu/categories', null, A), 'cats hours');
  const cat = cats0.find((c) => !c.hidden && !c.bar && c.items > 0 && c.tab !== 'bar' && !/ланч/i.test(c.name)
    && catalog.products.some((p) => (p.parentGroupName === (c.title || c.name) || p.parentGroupName === c.name) && !p.isAlias && !p.lunchCombo));
  if (!cat) console.log('- время показа разделов: нет подходящего раздела (проверка пропущена)');
  else {
    const save = (list) => api('PUT', '/api/v1/admin/network-menu/categories', {
      items: list.map((c) => ({ name: c.name, bar: c.bar, title: c.title, tab: c.tab || null, hidden: c.hidden, showFrom: c.showFrom || '', showUntil: c.showUntil || '' })),
    }, A);
    const withHours = (from, until) => cats0.map((c) => (c.key === cat.key ? { ...c, showFrom: from, showUntil: until } : c));
    try {
      // Ошибки ввода
      r = await save(withHours('25:00', ''));
      assert.equal(r.status, 400); assert.match(r.data.error, /ЧЧ:ММ/);
      r = await save(withHours('10:00', '10:00'));
      assert.equal(r.status, 400);
      r = await api('PUT', '/api/v1/admin/network-menu/categories', { items: withHours('', '').slice(0, 1) }, W);
      assert.equal(r.status, 403);
      step('время показа раздела: неверный формат и совпадающие границы — 400; официанту нельзя (403)');

      // Закрыт: окно через два часа, длится час
      ok(await save(withHours(hhmm(nowMin + 120), hhmm(nowMin + 180))), 'hours closed');
      const c1 = ok(await api('GET', '/api/v1/restaurants/novo-sadovaya/catalog'), 'catalog hours closed');
      const g1 = c1.groups.find((g) => (g.iikoName || g.name) === cat.name);
      assert.ok(g1?.window && g1.window.closedNow === true, 'раздел вне времени помечен window.closedNow');
      assert.match(g1.window.text, /^с \d\d:\d\d до \d\d:\d\d$/);
      const dish = c1.products.find((p) => p.parentGroup === g1.id && !p.isAlias && !p.lunchCombo && !p.sizes?.length && !p.modifierGroups?.length && !p.isInStopList
        && !c1.products.some((x) => x.id === p.id && x.parentGroup !== p.parentGroup));
      assert.ok(dish, 'в закрытом разделе есть простое блюдо');
      const hg = ok(await api('POST', '/api/v1/guest/login', { phone: '8 (900) 156-10-10', name: 'Часы', consent: true }), 'login hours');
      const HG = { 'X-Guest-Token': hg.token };
      const hs = ok(await api('POST', '/api/v1/table/enter', { restaurantSlug: 'novo-sadovaya', tableNumber: `${TABLE}-h` }, HG), 'enter hours');
      r = await api('POST', '/api/v1/table-order/cart', { sessionId: hs.sessionId, items: [line(dish, 1)] }, HG);
      assert.equal(r.status, 409); assert.match(r.data.error, new RegExp(`Раздел «${(g1.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}» доступен с \\d\\d:\\d\\d до \\d\\d:\\d\\d`));
      step(`раздел «${g1.name}» вне времени (${g1.window.text}): блюдо в корзину не берётся — 409 «${r.data.error}»`);

      // Открыт: окно вокруг «сейчас»
      ok(await save(withHours(hhmm(nowMin - 60), hhmm(nowMin + 60))), 'hours open');
      const c2 = ok(await api('GET', '/api/v1/restaurants/novo-sadovaya/catalog'), 'catalog hours open');
      assert.equal(c2.groups.find((g) => (g.iikoName || g.name) === cat.name).window.closedNow, false);
      const added = ok(await api('POST', '/api/v1/table-order/cart', { sessionId: hs.sessionId, items: [line(dish, 1)] }, HG), 'cart hours open');
      assert.equal(added.items.length, 1);
      step('в своё время тот же раздел открыт, блюдо добавляется');

      // Закрылся, пока блюдо лежало в корзине — официанту не передать (409)
      ok(await save(withHours(hhmm(nowMin + 120), hhmm(nowMin + 180))), 'hours closed again');
      await api('GET', '/api/v1/restaurants/novo-sadovaya/catalog');
      r = await api('POST', '/api/v1/table/submit-to-waiter', { sessionId: hs.sessionId }, HG);
      assert.equal(r.status, 409); assert.match(r.data.error, /доступен с/);
      step('раздел закрылся, пока блюдо было в корзине: передать официанту нельзя (409)');
      await api('POST', `/api/v1/waiter/session/${hs.sessionId}/close`, { force: true }, W);
    } finally {
      await save(cats0);
    }
  }
}

// Заказы, открытые на кассе iiko (демо-касса): импорт, дозаказ гостя в тот же заказ, правки и закрытие на кассе
{
  const T2 = `k${Math.floor(Math.random() * 9000) + 1000}`;
  const T3 = `m${Math.floor(Math.random() * 9000) + 1000}`;
  const till = (body) => api('POST', '/api/v1/iiko/demo/table-orders', body, { Authorization: `Bearer ${mgr.token}` });
  const hall = async () => ok(await api('GET', '/api/v1/waiter/sessions?restaurant=novo-sadovaya', null, W), 'sessions');
  const at = async (t) => (await hall()).filter((x) => x.tableNumber === t && x.status === 'open');
  r = await till({ op: 'upsert', order: { table: T2, waiter: { id: 'e2e-w', name: 'Анна с кассы' }, items: [
    { name: 'Касса: борщ', amount: 2, price: 350, status: 'CookingStarted' },
    { name: 'Касса: стейк', amount: 1, price: 900, status: 'CookingCompleted', modifiers: [{ name: 'medium', amount: 1, price: 0 }] },
  ] } });
  if (r.status === 404) {
    step('заказы с кассы iiko: не демо-режим — проверка пропущена');
  } else {
    assert.equal(r.status, 200, JSON.stringify(r.data));
    const tillOrderId = r.data.orderId;
    // 1. Заказ iiko на столе без нашего визита → визит «открыт на кассе» с позициями как отправленными
    let list = await at(T2);
    assert.equal(list.length, 1, 'ровно один визит на стол');
    let v = list[0];
    assert.equal(v.openedInIiko, true); assert.equal(v.iikoWaiterName, 'Анна с кассы');
    assert.equal(v.iikoOrderId, tillOrderId);
    assert.equal(v.items.length, 2); assert.ok(v.items.every((i) => i.isLocked && i.fromIiko));
    assert.equal(v.total, 1600); assert.equal(v.workflowStatus, 'in_production');
    step(`заказ с кассы: стол №${T2} в списке официанта, «открыт на кассе», ${v.items.length} позиции, ${v.total} ₽`);
    // 2. Повторный опрос не дублирует ни визиты, ни позиции
    await till({ op: 'noop' }); await till({ op: 'noop' });
    list = await at(T2);
    assert.equal(list.length, 1); assert.equal(list[0].items.length, 2); assert.equal(list[0].total, 1600);
    step('повторный опрос iiko: визит и позиции не задваиваются');
    // 3. Гость сканирует QR и видит заказ с кассы; дозаказ уходит в тот же заказ iiko
    const seen = ok(await api('POST', '/api/v1/table/enter', { restaurantSlug: 'novo-sadovaya', tableNumber: T2, join: true }, G), 'enter T2');
    assert.equal(seen.sessionId, v.sessionId); assert.equal(seen.items.length, 2); assert.equal(seen.sentTotal, 1600);
    ok(await api('POST', '/api/v1/table/submit-to-waiter', { sessionId: seen.sessionId, items: [line(p1, 1)] }, G), 'reorder T2');
    ok(await api('POST', `/api/v1/waiter/session/${seen.sessionId}/take`, {}, W), 'take T2');
    const sent2 = ok(await api('POST', `/api/v1/waiter/session/${seen.sessionId}/send-to-production`, {}, W), 'send T2');
    assert.equal(sent2.iikoOrderId, tillOrderId, 'дозаказ добавлен в тот же заказ iiko (add_items)');
    assert.equal(sent2.items.filter((i) => i.isLocked).length, 3);
    await till({ op: 'noop' });
    list = await at(T2);
    assert.equal(list[0].items.length, 3); assert.equal(list[0].total, 1600 + p1.price);
    step('гость видит заказ с кассы и дозаказывает в тот же заказ iiko, без дублей');
    // 4. Добавили на кассе позже — дописывается
    await till({ op: 'addItem', orderId: tillOrderId, item: { name: 'Касса: чай', amount: 2, price: 150, status: 'Added' } });
    list = await at(T2);
    assert.equal(list[0].items.length, 4); assert.equal(list[0].total, 1600 + p1.price + 300);
    step('позиции, добавленные на кассе позже, дописываются');
    // 5. Удалили на кассе: готовое блюдо, уменьшили количество — суммы и ленты официанта
    await till({ op: 'removeItem', orderId: tillOrderId, name: 'Касса: стейк' });
    await till({ op: 'removeItem', orderId: tillOrderId, name: 'Касса: борщ', mode: 'reduce', amount: 1 });
    list = await at(T2);
    v = list[0];
    assert.ok(!v.items.some((i) => /стейк/.test(i.name)), 'готовое блюдо удалено на кассе — убрано');
    assert.equal(v.items.find((i) => /борщ/.test(i.name)).quantity, 1);
    assert.equal(v.total, 350 + p1.price + 300);
    assert.deepEqual(v.removedItems.map((x) => x.name.replace(/ \(.*/, '')), ['Касса: стейк', 'Касса: борщ']);
    const feed = ok(await api('GET', '/api/v1/waiter/notifications?restaurant=novo-sadovaya', null, W), 'feed');
    assert.ok(feed.some((n) => n.session_id === v.sessionId && n.type === 'items_removed' && /на кассе удалено/i.test(n.title) && /стейк/.test(n.body)));
    const seen2 = ok(await api('POST', '/api/v1/table/enter', { restaurantSlug: 'novo-sadovaya', tableNumber: T2 }, G), 'enter T2 again');
    assert.equal(seen2.removedItems.length, 2); assert.equal(seen2.total, v.total);
    const dash2 = ok(await api('GET', '/api/v1/manager/dashboard?restaurant=novo-sadovaya', null, { Authorization: `Bearer ${mgr.token}` }), 'dash2');
    assert.equal(dash2.sessions.find((x) => x.sessionId === v.sessionId).total, v.total);
    step('удаление на кассе: готовое блюдо и уменьшенное количество убраны у официанта, гостя и в сводке, в ленте — «на кассе удалено»');
    // 6. Закрыли/оплатили на кассе → визит закрыт
    await till({ op: 'close', orderId: tillOrderId });
    assert.equal((await at(T2)).length, 0);
    step('счёт закрыт на кассе — визит закрыт');

    // 7. Стол с нашим открытым визитом, заказ iiko чужой → прицепляется как ещё один заказ
    const g3 = ok(await api('POST', '/api/v1/table/enter', { restaurantSlug: 'novo-sadovaya', tableNumber: T3 }, G), 'enter T3');
    ok(await api('POST', '/api/v1/table/submit-to-waiter', { sessionId: g3.sessionId, items: [line(p2, 1)] }, G), 'submit T3');
    ok(await api('POST', `/api/v1/waiter/session/${g3.sessionId}/take`, {}, W), 'take T3');
    const own = ok(await api('POST', `/api/v1/waiter/session/${g3.sessionId}/send-to-production`, {}, W), 'send T3');
    r = await till({ op: 'upsert', order: { table: T3, waiter: { id: 'e2e-w', name: 'Анна с кассы' }, items: [{ name: 'Касса: суп', amount: 1, price: 300, status: 'Added' }] } });
    await till({ op: 'noop' });
    list = await at(T3);
    assert.equal(list.length, 1); assert.equal(list[0].sessionId, g3.sessionId);
    assert.equal(list[0].iikoOrderId, own.iikoOrderId, 'свой заказ остаётся главным');
    assert.equal(list[0].items.length, 2); assert.equal(list[0].total, p2.price + 300);
    await till({ op: 'noop' });
    assert.equal((await at(T3))[0].items.length, 2);
    step('заказ с кассы на столе с нашим визитом прицеплен вторым заказом, без дублей при повторном опросе');
    await till({ op: 'close', orderId: r.data.orderId });
    ok(await api('POST', `/api/v1/waiter/session/${g3.sessionId}/close`, { force: true }, W), 'close T3');
  }
}

// Брони столов из iiko (демо-брони): стол ко времени брони без официанта → гость входит по QR → «пришли»; отмена, «не пришли», конфликт, поиск
{
  const rnd = () => `${Math.floor(Math.random() * 9000) + 1000}`;
  const [R1, R2, R3, R4, R5, R6] = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'].map((p) => `${p}${rnd()}`);
  const rsv = (body) => api('POST', '/api/v1/iiko/demo/reserves', body, { Authorization: `Bearer ${mgr.token}` });
  const put = (reserve) => rsv({ op: 'upsert', reserve });
  const hall = async () => ok(await api('GET', '/api/v1/waiter/sessions?restaurant=novo-sadovaya', null, W), 'sessions');
  const at = async (t) => (await hall()).filter((x) => x.tableNumber === t && x.status === 'open');
  const feed = async () => ok(await api('GET', '/api/v1/waiter/notifications?restaurant=novo-sadovaya', null, W), 'feed');
  const list = async (q = '') => ok(await api('GET', `/api/v1/waiter/reservations?restaurant=novo-sadovaya&q=${encodeURIComponent(q)}`, null, W), 'reservations');
  const first = await put({ table: R1, startsInMin: 10, name: 'Мария', phone: '+7 900 156-08-08', guests: 4, comment: 'у окна' });
  if (first.status === 404) {
    step('брони iiko: не демо-режим — проверка пропущена');
  } else {
    assert.equal(first.status, 200, JSON.stringify(first.data));
    // 1. За 15 минут до начала стол создан сам: без официанта, с именем и числом гостей
    let v = (await at(R1))[0];
    assert.ok(v, 'визит под бронь создан');
    assert.equal(v.waiterId, null, 'визит брони — без официанта («Общие столы»)');
    assert.equal(v.reservation.guestName, 'Мария'); assert.equal(v.reservation.guests, 4);
    assert.equal(v.reservation.state, 'waiting'); assert.equal(v.guestCount, 4);
    let n = (await feed()).find((x) => x.session_id === v.sessionId && x.type === 'reservation');
    assert.ok(n, 'уведомление о столе под бронь');
    assert.equal(n.title, `Стол ${R1}`); assert.match(n.body, /^Бронь \d\d:\d\d · Мария, 4 гостя$/);
    await rsv({ op: 'upsert', reserve: { id: first.data.reserveId, table: R1 } }); // повторный опрос второго стола не заводит
    assert.equal((await at(R1)).length, 1);
    step(`бронь за 10 минут: стол ${R1} создан без официанта — «${n.title} · ${n.body}»`);

    // 2. Гость сканирует QR и входит в визит брони → «Пришли гости по брони»
    const entered = ok(await api('POST', '/api/v1/table/enter', { restaurantSlug: 'novo-sadovaya', tableNumber: R1 }, G), 'enter reserve');
    assert.equal(entered.sessionId, v.sessionId, 'гость присоединился к визиту брони, а не завёл второй');
    assert.equal(entered.reservation.state, 'arrived');
    v = (await at(R1))[0];
    assert.equal(v.reservation.arrived, true); assert.equal(v.waiterId, null);
    const feed2 = await feed();
    n = feed2.find((x) => x.session_id === v.sessionId && x.type === 'reservation_arrived');
    assert.ok(n, 'уведомление «пришли»');
    assert.equal(n.body, 'Пришли гости по брони: Мария (4)'); assert.equal(n.title, `Стол ${R1}`);
    assert.ok(!feed2.some((x) => x.session_id === v.sessionId && x.type === 'guest_seated'), 'обычное «гость за столом» не дублирует');
    step(`гость вошёл по QR: «${n.title} · ${n.body}», в карточке стола — «пришли»`);

    // 3. Поиск по имени: ё = е, одинаковые имена — обе брони с телефоном (маска, полный номер — отдельным запросом)
    await put({ table: R2, startsInMin: 120, name: 'Мария', phone: '8 (900) 111-22-33', guests: 2 });
    await put({ table: R3, startsInMin: 150, name: 'Алёна', phone: '+7 900 000-12-34', guests: 3 });
    const found = await list('мария');
    const marias = found.items.filter((x) => x.guestName === 'Мария' && [R1, R2].includes(x.table));
    assert.equal(marias.length, 2); assert.ok(marias.every((x) => x.sameName && x.hasPhone));
    assert.deepEqual(marias.map((x) => x.phoneMasked).sort(), ['+7 *** ***-08-08', '+7 *** ***-22-33']);
    assert.ok(!JSON.stringify(found).includes('156-08-08') && !JSON.stringify(found).includes('9001560808'), 'в списке нет полного номера');
    assert.equal((await list('алена')).items.filter((x) => x.table === R3).length, 1, 'ё и е — одно и то же');
    assert.equal((await list('АЛЁНА')).items.filter((x) => x.table === R3).length, 1);
    const phone = ok(await api('GET', `/api/v1/waiter/reservations/${marias.find((x) => x.table === R1).id}/phone?restaurant=novo-sadovaya`, null, W), 'phone');
    assert.equal(phone.phone, '+7 900 156-08-08');
    step('поиск брони: «мария» → две брони с телефонами (маска), «алена» находит «Алёна», полный номер — по запросу');

    // 4. «Посадить сейчас»: стол создаётся досрочно, без официанта; «Гости пришли» вручную
    const second = marias.find((x) => x.table === R2);
    const seat = ok(await api('POST', `/api/v1/waiter/reservations/${second.id}/seat?restaurant=novo-sadovaya`, {}, W), 'seat');
    const sv = (await at(R2))[0];
    assert.equal(sv.sessionId, seat.sessionId); assert.equal(sv.waiterId, null); assert.equal(sv.reservation.state, 'waiting');
    ok(await api('POST', `/api/v1/waiter/reservations/${second.id}/arrived?restaurant=novo-sadovaya`, {}, W), 'arrived');
    assert.equal((await at(R2))[0].reservation.state, 'arrived');
    step('«Посадить сейчас» создаёт стол без официанта, «Гости пришли» отмечает вручную');

    // 5. Бронь отменена в iiko, гостей нет → визит закрыт
    const c = await put({ table: R4, startsInMin: 5, name: 'Олег', guests: 2 });
    assert.equal((await at(R4)).length, 1);
    await rsv({ op: 'cancel', reserveId: c.data.reserveId });
    assert.equal((await at(R4)).length, 0); step('бронь отменена в iiko, гостей нет — визит закрыт');

    // 6. Гость не пришёл через 30 минут после начала → «Бронь не пришла» и пометка «не пришли»
    const ns = await put({ table: R5, startsInMin: 5, name: 'Игорь', guests: 5 });
    assert.equal((await at(R5)).length, 1);
    await put({ id: ns.data.reserveId, startsInMin: -31 });
    n = (await feed()).find((x) => x.table_number === R5 && x.type === 'reservation_no_show');
    assert.ok(n && /^Бронь не пришла · \d\d:\d\d · Игорь, 5 гостей$/.test(n.body), JSON.stringify(n));
    assert.equal((await list('игорь')).items.find((x) => x.table === R5)?.state, 'no_show');
    assert.equal((await at(R5))[0].reservation.state, 'no_show');
    step(`гость не пришёл: «${n.body}», бронь помечена «не пришли»`);

    // 7. Стол занят прежними гостями: второй визит не создаётся, конфликт виден официанту
    ok(await api('POST', `/api/v1/waiter/tables/${R6}/open?restaurant=novo-sadovaya`, {}, W), 'open busy');
    const busy = (await at(R6))[0];
    await put({ table: R6, startsInMin: 5, name: 'Пётр', guests: 2 });
    assert.equal((await at(R6)).length, 1); assert.equal((await at(R6))[0].sessionId, busy.sessionId, 'второй визит не создан');
    assert.ok(!(await at(R6))[0].reservation, 'прежний визит не стал визитом брони');
    const cf = (await list('пётр')).items.find((x) => x.table === R6);
    assert.equal(cf.conflict, true); assert.equal(cf.conflictSessionId, busy.sessionId);
    assert.ok((await feed()).some((x) => x.table_number === R6 && x.type === 'reservation_conflict' && /стол ещё занят/.test(x.body)));
    r = await api('POST', `/api/v1/waiter/reservations/${cf.id}/seat?restaurant=novo-sadovaya`, {}, W);
    assert.equal(r.status, 409); assert.equal(r.data.code, 'TABLE_BUSY');
    ok(await api('POST', `/api/v1/waiter/session/${busy.sessionId}/close`, { force: true }, W), 'close busy');
    await rsv({ op: 'noop' });
    assert.equal((await at(R6)).length, 1); assert.equal((await at(R6))[0].reservation.guestName, 'Пётр', 'стол освободился — визит брони создан');
    step('стол занят прежними гостями: конфликт показан официанту, после ухода гостей визит брони создан');

    // 8. Список для управляющего (админка): маска телефона, без полного номера
    const adminList = ok(await api('GET', '/api/v1/manager/reservations?restaurant=novo-sadovaya', null, { Authorization: `Bearer ${mgr.token}` }), 'manager reservations');
    assert.ok(adminList.items.length >= 5); assert.ok(!JSON.stringify(adminList).includes('9001560808'));
    r = await api('GET', '/api/v1/manager/reservations?restaurant=novo-sadovaya', null, W);
    assert.equal(r.status, 403); step('брони в админке: только управляющему, телефон маскирован');

    for (const t of [R1, R2, R4, R5, R6]) for (const x of await at(t)) await api('POST', `/api/v1/waiter/session/${x.sessionId}/close`, { force: true }, W);
  }
}

// Безопасность: AI-отзыв — только от гостя, заголовки безопасности, внутренние адреса в /img
r = await api('POST', '/api/v1/ai/feedback', { query: 'x', productId: p1.id });
assert.equal(r.status, 401); step('отзыв о подсказке AI без входа гостя не принимается (401)');
const head = await fetch(`${BASE}/health`);
assert.equal(head.headers.get('x-content-type-options'), 'nosniff');
assert.match(head.headers.get('content-security-policy') || '', /frame-ancestors 'none'/);
step('заголовки безопасности на месте');
r = await fetch(`${BASE}/img?u=${encodeURIComponent('http://127.0.0.1:3101/health')}&w=160`);
assert.equal(r.status, 404); step('/img не ходит по внутренним адресам (404)');
r = await api('GET', `/api/v1/waiter/session/${s.sessionId}?token=${staff.token}`);
assert.equal(r.status, 401); step('токен персонала в адресе не принимается (401)');

// Общие и «мои» столы: официант A берёт стол, официант B получает 409 и не видит новых уведомлений стола
{
  const TABLE2 = `${TABLE}b`;
  const pinA = await api('POST', '/api/v1/staff/pin-login', { restaurant: 'novo-sadovaya', pin: '2580' });
  if (pinA.status !== 200) {
    step('пропуск: вход Анны по PIN 2580 недоступен (режим входа iiko) — шаг «общие и мои столы» не проверен');
  } else {
    const WA = { Authorization: `Bearer ${pinA.data.token}` };
    const nameA = pinA.data.staff.name;
    const sB = await api('POST', '/api/v1/staff/login', { login: 'waiter', password: '1111' });
    const WB = { Authorization: `Bearer ${sB.data.token}` };
    assert.notEqual(pinA.data.staff.id, sB.data.staff.id);

    let t2 = ok(await api('POST', '/api/v1/table/enter', { restaurantSlug: 'novo-sadovaya', tableNumber: TABLE2 }, G), 'enter t2');
    t2 = ok(await api('POST', '/api/v1/table/submit-to-waiter', { sessionId: t2.sessionId, items: [line(p1, 2), line(p2, 1)] }, G), 'submit t2');
    const sid2 = t2.sessionId;
    assert.equal(t2.waiterId, null); assert.equal(t2.waiterName, null);
    const mine = (list) => list.filter((n) => n.session_id === sid2);
    const wn = (who) => api('GET', '/api/v1/waiter/notifications?restaurant=novo-sadovaya&limit=200', null, who).then((x) => ok(x, 'notes'));
    assert.ok(mine(await wn(WA)).some((n) => n.type === 'cart_ready') && mine(await wn(WB)).some((n) => n.type === 'cart_ready'));
    step('стол без официанта («Общие»): новый заказ виден обоим официантам');
    // короткое событие вместо всего заказа
    const cart = mine(await wn(WA)).find((n) => n.type === 'cart_ready');
    assert.match(cart.title, /^Стол .+ · Новый заказ$/); assert.match(cart.body.replace(/\s/g, ' '), /^2 позиции · [\d ]+ ₽$/);
    step(`уведомление-событие: «${cart.title} · ${cart.body}»`);

    // Просмотр и блокировка стола официантом не назначают
    r = await api('GET', `/api/v1/waiter/session/${sid2}`, null, WA);
    assert.equal(r.data.waiterId, null);
    r = await api('POST', `/api/v1/waiter/session/${sid2}/assign`, {}, WA);
    assert.equal(r.status, 200); assert.equal(r.data.waiterId, pinA.data.staff.id); assert.equal(r.data.waiterName, nameA);
    step(`официант «${nameA}» взял стол №${TABLE2}`);
    r = await api('POST', `/api/v1/waiter/session/${sid2}/assign`, {}, WB);
    assert.equal(r.status, 409); assert.equal(r.data.code, 'ALREADY_ASSIGNED'); assert.ok(r.data.error.includes(nameA));
    step(`второй официант: 409 «${r.data.error}»`);
    r = await api('POST', `/api/v1/waiter/session/${sid2}/assign`, { staffId: pinA.data.staff.id }, WB);
    assert.equal(r.status, 403); step('официант не может назначать других (403)');

    // Гость видит имя официанта при обычном опросе визита
    const gv = ok(await api('GET', `/api/v1/table/session/${sid2}`, null, G), 'guest poll');
    assert.equal(gv.waiterName, nameA);
    step(`гость видит официанта: ${gv.waiterName}`);

    // Новые события стола: A видит, B — нет; «Стол взял(а) …» видят все
    ok(await api('POST', '/api/v1/table/call-waiter', { sessionId: sid2, reason: 'cutlery' }, G), 'call t2');
    const noteA = mine(await wn(WA)); const noteB = mine(await wn(WB));
    assert.ok(noteA.some((n) => n.type === 'call_waiter' && /Вызов/.test(n.title)));
    assert.ok(!noteB.some((n) => n.type === 'call_waiter' || n.type === 'cart_ready'), 'чужой стол: вызов и заказ скрыты');
    assert.ok(noteB.some((n) => n.type === 'table_assigned' && n.title.includes(nameA)));
    assert.ok(noteA.find((n) => n.type === 'cart_ready').is_read, 'общие уведомления стола закрыты при назначении');
    step('лента B не видит новых уведомлений стола; «Стол взял(а) …» видят все');
    // Управляющий видит всё
    const mgrNotes = mine(await wn({ Authorization: `Bearer ${mgr.token}` }));
    assert.ok(mgrNotes.some((n) => n.type === 'call_waiter'));
    step('управляющий видит все уведомления');

    // Управляющий переназначает; официант A отдаёт стол
    const waiters = ok(await api('GET', '/api/v1/waiter/waiters?restaurant=novo-sadovaya', null, { Authorization: `Bearer ${mgr.token}` }), 'waiters');
    assert.ok(waiters.some((w) => w.id === sB.data.staff.id));
    r = await api('GET', '/api/v1/waiter/waiters?restaurant=novo-sadovaya', null, WA);
    assert.equal(r.status, 403);
    r = await api('POST', `/api/v1/waiter/session/${sid2}/unassign`, {}, WB);
    assert.equal(r.status, 403);
    r = ok(await api('POST', `/api/v1/waiter/session/${sid2}/unassign`, {}, WA), 'unassign');
    assert.equal(r.waiterId, null);
    r = ok(await api('POST', `/api/v1/waiter/session/${sid2}/assign`, { staffId: sB.data.staff.id }, { Authorization: `Bearer ${mgr.token}` }), 'mgr assign');
    assert.equal(r.waiterId, sB.data.staff.id);
    step('«Отдать в общие» и переназначение управляющим');

    // «Выдача»: отправили на кухню — по названию блюда находится стол
    r = await api('POST', `/api/v1/waiter/session/${sid2}/take`, {}, WB);
    r = ok(await api('POST', `/api/v1/waiter/session/${sid2}/send-to-production`, {}, WB), 'send t2');
    const dish = r.items[0];
    assert.equal(dish.cook?.state, 'cooking'); assert.match(dish.cook.text, /^готовится \d+ мин/);
    step(`время готовки у отправленной позиции: «${dish.cook.text}»`);
    const aw = ok(await api('GET', `/api/v1/waiter/awaiting?restaurant=novo-sadovaya&q=${encodeURIComponent(dish.name.slice(0, 5))}`, null, WA), 'awaiting');
    assert.ok(aw.items.some((i) => i.sessionId === sid2 && i.tableNumber === TABLE2 && i.name === dish.name), 'стол найден по названию блюда');
    assert.ok(aw.dishes.some((d) => d.name === dish.name));
    step(`«Выдача»: «${dish.name.slice(0, 5)}» → стол №${TABLE2} (${aw.items.length} поз.)`);
    ok(await api('POST', `/api/v1/waiter/session/${sid2}/served`, { itemIds: [dish.id] }, WA), 'served');
    const aw2 = ok(await api('GET', `/api/v1/waiter/awaiting?restaurant=novo-sadovaya&q=${encodeURIComponent(dish.name.slice(0, 5))}`, null, WA), 'awaiting2');
    assert.ok(!aw2.items.some((i) => i.itemId === dish.id), 'вынесенное из выдачи пропало');
    step('вынесенное блюдо уходит из «Выдачи»');
    await api('POST', `/api/v1/waiter/session/${sid2}/close`, { force: true }, WB);

    // Официант открывает стол сам — он сразу его
    const opened = ok(await api('POST', `/api/v1/waiter/tables/${TABLE}c/open?restaurant=novo-sadovaya`, {}, WA), 'open by waiter');
    assert.equal(opened.waiterId, pinA.data.staff.id);
    step('«+ Открыть стол»: стол сразу назначен на официанта');
    await api('POST', `/api/v1/waiter/session/${opened.sessionId}/close`, { force: true }, WA);
  }
}

// Официант закрывает стол; в закрытый визит гость больше ничего не добавляет
r = await api('POST', `/api/v1/waiter/session/${s.sessionId}/close`, {}, W);
assert.equal(r.status, 409); assert.equal(r.data.code, 'UNPAID');
assert.ok(r.data.details.unpaid > 0); step(`закрыть неоплаченный стол — сначала предупреждение (не оплачено ${r.data.details.unpaid} ₽)`);
ok(await api('POST', `/api/v1/waiter/session/${s.sessionId}/close`, { force: true }, W), 'close');
r = await api('POST', '/api/v1/table-order/cart', { sessionId: s.sessionId, items: [line(p1, 4)] }, G);
assert.equal(r.status, 409); step('стол закрыт — гость не может дозаказать в закрытый визит (409)');

console.log('\nВсе проверки пройдены');
