import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clockText, collectReserves, collectStatuses, formatIikoTime, guestsText, maskPhone, normalizeName, normalizePhone,
  normalizeReserve, parseIikoTime, planReserve, reserveSettings, reserveState, reserveTexts, reserveWindow, searchReserves, sectionIdsOf,
} from '../lib/iiko-reserve-sync.js';

const TZ = 'Europe/Samara'; // UTC+4
const MIN = 60_000;
const at = (iso) => new Date(iso).getTime();

const raw = (extra = {}) => ({
  id: 'r-1',
  tableIds: ['t-5'],
  estimatedStartTime: '2026-10-20 19:00:00.000',
  durationInMinutes: 90,
  guestsCount: 4,
  customer: { name: 'Мария', surname: 'Иванова' },
  phone: '+7 (900) 156-08-08',
  comment: 'у окна',
  status: 'New',
  ...extra,
});

test('время iiko: местное время точки → UTC, обратно и «19:00» в часовом поясе точки', () => {
  assert.equal(parseIikoTime('2026-10-20 19:00:00.000', TZ), '2026-10-20T15:00:00.000Z');
  assert.equal(parseIikoTime('2026-10-20T19:00:00', TZ), '2026-10-20T15:00:00.000Z');
  assert.equal(parseIikoTime('2026-10-20T19:00:00+03:00', TZ), '2026-10-20T16:00:00.000Z', 'смещение в строке главнее пояса точки');
  assert.equal(parseIikoTime('2026-10-20T15:00:00Z', TZ), '2026-10-20T15:00:00.000Z');
  assert.equal(parseIikoTime('', TZ), null);
  assert.equal(parseIikoTime('вечером', TZ), null);
  assert.equal(formatIikoTime(new Date('2026-10-20T15:00:00Z'), TZ), '2026-10-20 19:00:00.000');
  assert.equal(clockText('2026-10-20T15:00:00Z', TZ), '19:00');
});

test('окно загрузки: рабочие сутки с 05:00 до 05:00 — сегодня и завтра до утра', () => {
  const day = reserveWindow(new Date('2026-10-20T15:00:00Z'), TZ); // 19:00 по Самаре
  assert.equal(day.from.toISOString(), '2026-10-20T01:00:00.000Z');
  assert.equal(day.to.toISOString(), '2026-10-21T01:00:00.000Z');
  const night = reserveWindow(new Date('2026-10-20T21:30:00Z'), TZ); // 01:30 ночи 21-го — ещё вчерашние сутки
  assert.equal(night.from.toISOString(), '2026-10-20T01:00:00.000Z');
  assert.equal(night.to.toISOString(), '2026-10-21T01:00:00.000Z');
});

test('нормализация брони: все поля iiko приведены к одному виду', () => {
  const n = normalizeReserve(raw(), { tz: TZ });
  assert.deepEqual(
    { id: n.id, status: n.status, startsAt: n.startsAt, durationMin: n.durationMin, endsAt: n.endsAt, tableIds: n.tableIds, guestName: n.guestName, phone: n.phone, guestsCount: n.guestsCount, comment: n.comment },
    { id: 'r-1', status: 'new', startsAt: '2026-10-20T15:00:00.000Z', durationMin: 90, endsAt: '2026-10-20T16:30:00.000Z', tableIds: ['t-5'], guestName: 'Мария Иванова', phone: '79001560808', guestsCount: 4, comment: 'у окна' },
  );
  assert.equal(n.statusKnown, true);
});

test('нормализация терпима к отсутствующим и переименованным полям', () => {
  // только ID и время: остальное — значения по умолчанию
  const bare = normalizeReserve({ id: 'x', estimatedStartTime: '2026-10-20 19:00:00.000' }, { tz: TZ });
  assert.equal(bare.guestName, ''); assert.equal(bare.phone, null); assert.equal(bare.guestsCount, 1);
  assert.equal(bare.durationMin, 120); assert.deepEqual(bare.tableIds, []); assert.equal(bare.status, 'new'); assert.equal(bare.statusKnown, false);
  // другие имена полей, телефон и имя в customer, гости объектом, столы объектами
  const alt = normalizeReserve({
    reserveId: 'y', startTime: '2026-10-20T19:00:00', duration: '45', guests: { count: 6 }, tables: [{ id: 't-1' }, { id: 't-2' }],
    customer: { name: 'Олег', phone: '8 900 000 11 22' },
  }, { tz: TZ });
  assert.equal(alt.id, 'y'); assert.equal(alt.durationMin, 45); assert.equal(alt.guestsCount, 6);
  assert.deepEqual(alt.tableIds, ['t-1', 't-2']); assert.equal(alt.guestName, 'Олег'); assert.equal(alt.phone, '79000001122');
  // customer строкой, мусор в числах
  const str = normalizeReserve({ id: 'z', estimatedStartTime: '2026-10-20 19:00:00', customer: 'Анна', guestsCount: 'много', durationInMinutes: -5 }, { tz: TZ });
  assert.equal(str.guestName, 'Анна'); assert.equal(str.guestsCount, 1); assert.equal(str.durationMin, 120);
  // без ID или без времени — не бронь
  assert.equal(normalizeReserve({ estimatedStartTime: '2026-10-20 19:00:00' }), null);
  assert.equal(normalizeReserve({ id: 'q' }), null);
  assert.equal(normalizeReserve(null), null);
  assert.equal(normalizeReserve({ id: 'e', creationStatus: 'Error' }), null);
});

test('статусы: New / Started / Closed и отмена (isDeleted, cancelReason, Cancelled)', () => {
  const st = (extra) => normalizeReserve(raw(extra), { tz: TZ }).status;
  assert.equal(st({ status: 'Started' }), 'started');
  assert.equal(st({ status: 'Closed' }), 'closed');
  assert.equal(st({ status: 'New' }), 'new');
  assert.equal(st({ isDeleted: true }), 'cancelled');
  assert.equal(st({ status: 'Cancelled' }), 'cancelled');
  assert.equal(st({ cancelReason: 'гость отказался' }), 'cancelled');
  assert.equal(st({ status: undefined }), 'new');
});

test('обёртка status_by_id и статусы без времени начала', () => {
  const wrapped = normalizeReserve({ id: 'w', creationStatus: 'Success', reserve: { ...raw({ id: undefined }), status: 'Started' } }, { tz: TZ });
  assert.equal(wrapped.id, 'w'); assert.equal(wrapped.status, 'started');
  const sts = collectStatuses({ reserves: [{ id: 'a', creationStatus: 'Success', reserve: { status: 'Closed' } }, { id: 'b', status: 'New' }, { id: 'c', creationStatus: 'Error' }, { status: 'New' }] });
  assert.deepEqual(sts.map((s) => [s.id, s.status]), [['a', 'closed'], ['b', 'new']]);
});

test('брони из ответа workload: по залам, по столам, с дублями, без брони в мусоре', () => {
  const byHall = collectReserves({ restaurantSectionsWorkload: [{ restaurantSectionId: 's1', reserves: [raw(), raw({ id: 'r-2', tableIds: ['t-6'] })] }, { restaurantSectionId: 's2', reserves: [] }] }, { tz: TZ });
  assert.deepEqual(byHall.map((r) => r.id), ['r-1', 'r-2']);
  // брони внутри столов: стол берётся из объекта-стола, если в самой брони его нет
  const byTable = collectReserves({ sections: [{ id: 'hall', tables: [{ id: 't-9', reserves: [{ id: 'r-3', estimatedStartTime: '2026-10-20 20:00:00' }] }] }] }, { tz: TZ });
  assert.equal(byTable.length, 1); assert.deepEqual(byTable[0].tableIds, ['t-9']);
  // та же бронь в двух залах/столах — одна запись со всеми столами
  const dup = collectReserves({ reserves: [raw({ tableIds: ['t-1'] }), raw({ tableIds: ['t-2'] })] }, { tz: TZ });
  assert.equal(dup.length, 1); assert.deepEqual(dup[0].tableIds, ['t-1', 't-2']);
  // пустой, битый и посторонний ответ
  assert.deepEqual(collectReserves(null), []);
  assert.deepEqual(collectReserves({ correlationId: 'x' }), []);
  assert.deepEqual(collectReserves({ reserves: [{ foo: 1 }, null, 'строка'] }), []);
  assert.deepEqual(sectionIdsOf({ restaurantSections: [{ id: 'a' }, { name: 'без id' }, { id: 'b' }] }), ['a', 'b']);
});

test('телефон: нормализация и маска с последними 4 цифрами', () => {
  assert.equal(normalizePhone('8 (900) 156-08-08'), '79001560808');
  assert.equal(normalizePhone('9001560808'), '79001560808');
  assert.equal(normalizePhone('123'), null);
  assert.equal(normalizePhone(null), null);
  assert.equal(maskPhone('+7 900 156-08-08'), '+7 *** ***-08-08');
  assert.equal(maskPhone('79001560808'), '+7 *** ***-08-08');
  assert.ok(!maskPhone('79001560808').includes('156'));
  assert.equal(maskPhone(''), '');
});

test('числительное: 1 гость, 4 гостя, 5 и 11 гостей, 21 гость', () => {
  assert.deepEqual([1, 2, 4, 5, 11, 12, 21, 25].map(guestsText), ['1 гость', '2 гостя', '4 гостя', '5 гостей', '11 гостей', '12 гостей', '21 гость', '25 гостей']);
});

test('настройки: за 15 минут до начала, 30 минут ожидания; свои — из env', () => {
  assert.deepEqual(reserveSettings({}), { leadMin: 15, noShowMin: 30 });
  assert.deepEqual(reserveSettings({ RESERVE_LEAD_MIN: '20', RESERVE_NOSHOW_MIN: '45' }), { leadMin: 20, noShowMin: 45 });
  assert.deepEqual(reserveSettings({ RESERVE_LEAD_MIN: 'abc', RESERVE_NOSHOW_MIN: '-1' }), { leadMin: 15, noShowMin: 30 });
});

// ── Решения ──
const START = at('2026-10-20T15:00:00Z'); // 19:00
const rsv = (extra = {}) => ({
  id: 'r-1', status: 'new', startsAt: new Date(START).toISOString(), endsAt: new Date(START + 90 * MIN).toISOString(),
  arrivedAt: null, noShowAt: null, tableCreatedAt: null, tableNumber: '5', conflictNotifiedAt: null, ...extra,
});
const plan = (reserve, session, nowMs) => planReserve({ reserve, session, now: nowMs, leadMs: 15 * MIN, noShowMs: 30 * MIN }).action;
const own = (extra = {}) => ({ reservationId: 'r-1', empty: true, staleNoShow: false, ...extra });

test('выбор момента создания стола: не раньше чем за 15 минут до начала', () => {
  assert.equal(plan(rsv(), null, START - 60 * MIN), 'none');
  assert.equal(plan(rsv(), null, START - 15 * MIN - 1000), 'none');
  assert.equal(plan(rsv(), null, START - 15 * MIN), 'create');
  assert.equal(plan(rsv(), null, START - 1 * MIN), 'create');
  assert.equal(plan(rsv(), null, START + 10 * MIN), 'create', 'сервис поднялся уже после начала — стол ещё создаём');
  assert.equal(plan(rsv(), null, START + 30 * MIN), 'none', 'после окна ожидания гостей стол уже не нужен');
});

test('стол под бронь не создаётся повторно, без стола и по отменённой/закрытой брони', () => {
  assert.equal(plan(rsv({ tableCreatedAt: new Date() }), null, START - 5 * MIN), 'none', 'визит уже создавали (закрыли вручную)');
  assert.equal(plan(rsv({ tableNumber: null }), null, START - 5 * MIN), 'none');
  assert.equal(plan(rsv({ status: 'cancelled' }), null, START - 5 * MIN), 'none');
  assert.equal(plan(rsv({ status: 'closed' }), null, START - 5 * MIN), 'none');
});

test('конфликт: стол занят прежними гостями — второй визит не создаём, уведомляем один раз', () => {
  const busy = { id: 's-old', reservationId: null, empty: false, staleNoShow: false };
  assert.deepEqual(planReserve({ reserve: rsv(), session: busy, now: START - 10 * MIN }), { action: 'conflict', notify: true });
  assert.deepEqual(planReserve({ reserve: rsv({ conflictNotifiedAt: new Date() }), session: busy, now: START - 5 * MIN }), { action: 'conflict', notify: false });
  // до окна создания конфликта ещё нет
  assert.equal(plan(rsv(), busy, START - 40 * MIN), 'none');
  // пустой визит без брони (официант открыл стол и ушёл) тоже занимает стол — решает официант
  assert.equal(plan(rsv(), { id: 's2', reservationId: null, empty: true, staleNoShow: false }, START - 5 * MIN), 'conflict');
  // пустой визит прежней брони, которая не пришла, стол не держит
  assert.equal(plan(rsv(), { id: 's3', reservationId: 'r-0', empty: true, staleNoShow: true }, START - 5 * MIN), 'replace');
  assert.equal(plan(rsv(), { id: 's3', reservationId: 'r-0', empty: false, staleNoShow: true }, START - 5 * MIN), 'conflict', 'за столом всё же сидят — не трогаем');
});

test('отмена в iiko: пустой визит закрываем, с гостями или после «пришли» — не трогаем', () => {
  assert.equal(plan(rsv({ status: 'cancelled' }), own(), START - 5 * MIN), 'close');
  assert.equal(plan(rsv({ status: 'cancelled' }), own({ empty: false }), START - 5 * MIN), 'none');
  assert.equal(plan(rsv({ status: 'cancelled', arrivedAt: new Date() }), own(), START + 5 * MIN), 'none');
  assert.equal(plan(rsv({ status: 'cancelled' }), { id: 's', reservationId: 'other', empty: true }, START - 5 * MIN), 'none', 'чужой визит отмена брони не закрывает');
  assert.equal(plan(rsv({ status: 'closed' }), own(), START + 100 * MIN), 'close');
});

test('«не пришли»: через 30 минут после начала, один раз; пустой визит закрывается к концу брони', () => {
  assert.equal(plan(rsv(), own(), START + 29 * MIN), 'none');
  assert.equal(plan(rsv(), own(), START + 30 * MIN), 'no_show');
  assert.equal(plan(rsv({ noShowAt: new Date() }), own(), START + 40 * MIN), 'none', 'уведомление не повторяется');
  assert.equal(plan(rsv({ noShowAt: new Date() }), own(), START + 90 * MIN), 'expire');
  assert.equal(plan(rsv({ noShowAt: new Date() }), own({ empty: false }), START + 90 * MIN), 'none');
  assert.equal(plan(rsv({ arrivedAt: new Date() }), own({ empty: false }), START + 60 * MIN), 'none', 'гости пришли — «не пришли» не ставится');
});

test('гостей посадили на кассе (в iiko «Started») — отмечаем «пришли»', () => {
  assert.equal(plan(rsv({ status: 'started' }), own(), START + 2 * MIN), 'arrive_iiko');
  assert.equal(plan(rsv({ status: 'started', arrivedAt: new Date() }), own(), START + 2 * MIN), 'none');
  assert.equal(plan(rsv({ status: 'started' }), null, START - 3 * MIN), 'create', 'визита ещё нет — создаём (пришли отметится при создании)');
});

test('состояние брони для официанта', () => {
  const now = START - 60 * MIN;
  assert.equal(reserveState({ startsAt: new Date(START), status: 'new' }, now), 'upcoming');
  assert.equal(reserveState({ startsAt: new Date(START), status: 'new', sessionId: 's' }, now), 'waiting');
  assert.equal(reserveState({ startsAt: new Date(START), status: 'new', arrivedAt: new Date(), sessionId: 's' }, now), 'arrived');
  assert.equal(reserveState({ startsAt: new Date(START), status: 'new', noShowAt: new Date() }, now), 'no_show');
  assert.equal(reserveState({ startsAt: new Date(START), status: 'cancelled', arrivedAt: new Date() }, now), 'cancelled');
});

test('тексты уведомлений: «Стол 5 · Бронь 19:00 · Мария, 4 гостя»', () => {
  const t = reserveTexts({ tableNumber: '5', startsAt: '2026-10-20T15:00:00Z', guestName: 'Мария', guestsCount: 4 }, TZ);
  assert.equal(`${t.title} · ${t.created}`, 'Стол 5 · Бронь 19:00 · Мария, 4 гостя');
  assert.equal(`${t.title} · ${t.arrived}`, 'Стол 5 · Пришли гости по брони: Мария (4)');
  assert.equal(t.noShow, 'Бронь не пришла · 19:00 · Мария, 4 гостя');
});

// ── Поиск ──
const day = [
  { id: 'a', guestName: 'Мария', phone: '79001560808', startsAt: '2026-10-20T16:00:00Z' },
  { id: 'b', guestName: 'Алёна Сидорова', phone: '79000001234', startsAt: '2026-10-20T14:00:00Z' },
  { id: 'c', guestName: 'мария', phone: '79001112233', startsAt: '2026-10-20T14:30:00Z' },
  { id: 'd', guestName: 'Мариам', phone: '79005550000', startsAt: '2026-10-20T17:00:00Z' },
  { id: 'e', guestName: 'Пётр', phone: '79007778899', startsAt: '2026-10-20T18:00:00Z' },
];

test('поиск: имя без регистра и ё = е, брони по времени', () => {
  assert.deepEqual(searchReserves(day, 'алена').map((r) => r.id), ['b']);
  assert.deepEqual(searchReserves(day, 'АЛЁНА').map((r) => r.id), ['b']);
  assert.deepEqual(searchReserves(day, 'петр').map((r) => r.id), ['e'], 'ё в имени, е в запросе');
  assert.deepEqual(searchReserves(day, 'пётр').map((r) => r.id), ['e']);
  assert.deepEqual(searchReserves(day, 'сидорова алёна').map((r) => r.id), ['b'], 'слова в любом порядке');
  assert.deepEqual(searchReserves(day, '').map((r) => r.id), ['b', 'c', 'a', 'd', 'e'], 'без запроса — все по времени');
  assert.deepEqual(searchReserves(day, 'ольга'), []);
});

test('поиск: одинаковые имена — все брони помечены sameName, у каждой свой телефон', () => {
  const res = searchReserves(day, 'мария');
  assert.deepEqual(res.map((r) => [r.id, r.sameName]), [['c', true], ['a', true]], 'Мариам — другое имя');
  assert.deepEqual(res.filter((r) => r.sameName).map((r) => maskPhone(r.phone)), ['+7 *** ***-22-33', '+7 *** ***-08-08']);
  assert.equal(searchReserves(day, 'мариам')[0].sameName, false);
  assert.deepEqual(searchReserves(day, 'мари').map((r) => [r.id, r.sameName]), [['c', true], ['a', true], ['d', false]], 'по началу имени находит и Мариам, но она не тёзка');
  assert.equal(normalizeName('  Алёна,  СИДОРОВА '), 'алена сидорова');
});

test('поиск по последним цифрам телефона', () => {
  assert.deepEqual(searchReserves(day, '0808').map((r) => r.id), ['a']);
  assert.deepEqual(searchReserves(day, '12'), [], 'меньше трёх цифр — не поиск по телефону');
});
