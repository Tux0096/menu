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

// Официант закрывает стол; в закрытый визит гость больше ничего не добавляет
r = await api('POST', `/api/v1/waiter/session/${s.sessionId}/close`, {}, W);
assert.equal(r.status, 409); assert.equal(r.data.code, 'UNPAID');
assert.ok(r.data.details.unpaid > 0); step(`закрыть неоплаченный стол — сначала предупреждение (не оплачено ${r.data.details.unpaid} ₽)`);
ok(await api('POST', `/api/v1/waiter/session/${s.sessionId}/close`, { force: true }, W), 'close');
r = await api('POST', '/api/v1/table-order/cart', { sessionId: s.sessionId, items: [line(p1, 4)] }, G);
assert.equal(r.status, 409); step('стол закрыт — гость не может дозаказать в закрытый визит (409)');

console.log('\nВсе проверки пройдены');
