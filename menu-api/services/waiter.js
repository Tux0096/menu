/**
 * Терминал официанта и контроль сервиса для управляющего.
 */
import pool from '../db/pool.js';
import { NOTIFY_TYPES, WAITER_RESPONSE_SLA_MS, WORKFLOW } from '../lib/table-workflow-config.js';
import { randomUUID } from 'crypto';
import {
  addItemsToOrder, createTableOrder, getOrderSnapshot, isIikoDemo, isTerminalGroupError, isUnknownOutcome,
  pickAliveTerminalGroup, withIikoCreds,
} from '../iiko-client.js';
import { createWaiterNotification } from './waiter-notifications.js';
import { getSource, listSources, MAIN, productSourceMap } from './sources.js';
import { menuIndex, priceLine, priceVariant, stopProblems } from './menu-pricing.js';
import { withSessionMutex } from '../lib/session-mutex.js';
import {
  getSessionContext,
  getSessionView,
  httpError,
  lineName,
  lockSession,
  mapSession,
  recalcTotal,
  resolveIikoTableId,
  tableGuests,
  withTransaction,
} from './table-session.js';

const EDIT_LOCK_MS = 2 * 60 * 1000;

export async function listActiveSessions(restaurantId) {
  const { rows } = await pool.query(
    `SELECT id FROM table_sessions
     WHERE restaurant_id = $1
       AND (status = 'open' OR (status = 'paid' AND paid_at > NOW() - INTERVAL '30 minutes'))
     ORDER BY
       CASE workflow_status
         WHEN 'cart_ready' THEN 0 WHEN 'reorder_pending' THEN 0 WHEN 'bill_requested' THEN 1
         WHEN 'waiter_review' THEN 2 WHEN 'in_production' THEN 3 ELSE 4 END,
       updated_at DESC`,
    [restaurantId],
  );
  const result = [];
  for (const row of rows) {
    const ctx = await getSessionContext(row.id);
    if (ctx) result.push(mapSession(ctx));
  }
  return result;
}

function assertEditable(ctx, staff) {
  const { session } = ctx;
  if (session.payment_status === 'paid') throw httpError(409, 'Счёт уже оплачен');
  const lockedByOther = session.locked_by && session.locked_by !== staff.id
    && session.locked_until && new Date(session.locked_until) > new Date();
  if (lockedByOther) throw httpError(409, 'Стол сейчас редактирует другой официант', { code: 'EDIT_LOCKED' });
}

/** Взять стол в работу (блокировка редактирования на 2 минуты). */
export async function takeSession(sessionId, staff) {
  await withTransaction(async (client) => {
    const ctx = await lockSession(client, sessionId);
    assertEditable(ctx, staff);
    await client.query(
      `UPDATE table_sessions SET locked_by = $2, locked_until = NOW() + ($3 || ' milliseconds')::interval,
         waiter_id = COALESCE(waiter_id, $2),
         workflow_status = CASE WHEN workflow_status IN ('cart_ready', 'reorder_pending') THEN 'waiter_review' ELSE workflow_status END,
         updated_at = NOW()
       WHERE id = $1`,
      [sessionId, staff.id, String(EDIT_LOCK_MS)],
    );
  });
  await markSessionNotificationsRead(sessionId);
  return getSessionView(sessionId);
}

/**
 * Официант правит состав (кейс 7): количество гостей, позиции, места (seatNumber), курс подачи.
 * Уже отправленные на кухню позиции не удаляются — только меняется место/курс.
 */
/** Имена мест от официанта: { "3": "Мария" } — место 1–30, имя до 40 символов, пустое — удалить. */
function cleanSeatNames(current, patch) {
  const out = { ...(current || {}) };
  for (const [k, v] of Object.entries(patch || {})) {
    const seat = Math.floor(Number(k));
    if (!(seat >= 1 && seat <= 30)) continue;
    const name = String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
    if (name) out[seat] = name; else delete out[seat];
  }
  return out;
}

export async function updateOrder(sessionId, staff, { items = [], guestCount, seatNames, knownIds } = {}) {
  if (!Array.isArray(items)) throw httpError(400, 'Нет списка позиций');
  await withSessionMutex(sessionId, () => withTransaction(async (client) => {
    const ctx = await lockSession(client, sessionId);
    assertEditable(ctx, staff);
    const lockedIds = new Set(ctx.items.filter((i) => i.is_locked).map((i) => i.id));
    // Место = гость за столом (по порядку присоединения); место без гостя — имя от официанта или номер места
    const guests = tableGuests(ctx);
    const names = seatNames ? cleanSeatNames(ctx.session.seat_names, seatNames) : (ctx.session.seat_names || {});
    const guestOf = (seat) => guests.find((g) => g.seat === Number(seat))
      || (names[Number(seat)] ? { id: null, name: names[Number(seat)] } : null);

    for (const it of items.filter((i) => i.id && lockedIds.has(i.id))) {
      const g = guestOf(it.seatNumber);
      await client.query(
        'UPDATE table_order_items SET seat_number = $2, course = $3, guest_id = $4, guest_name = $5, updated_at = NOW() WHERE id = $1',
        [it.id, it.seatNumber || null, it.course || null, g?.id || null, g?.name || null],
      );
    }

    // Сколько каждой позиции было в неотправленной корзине — блюдо из стоп-листа можно оставить, но не добавить
    const prevQty = new Map();
    for (const i of ctx.items.filter((x) => !x.is_locked)) {
      const k = String(i.iiko_product_id);
      prevQty.set(k, (prevQty.get(k) || 0) + i.quantity);
    }
    const index = await menuIndex(ctx.restaurant);
    const newQty = new Map();
    // Выбор гостя (размер, модификаторы) у неотправленной строки: приложение официанта присылает её id —
    // берём выбор из прежней строки, если в запросе его нет
    const prevRow = new Map(ctx.items.filter((x) => !x.is_locked).map((x) => [x.id, x]));

    // knownIds — неотправленные строки, которые официант видел на экране. Строки, добавленные гостем после этого,
    // остаются как есть (раньше сохранение официанта молча их стирало). Без knownIds (старый терминал) — как раньше.
    const known = Array.isArray(knownIds) ? new Set(knownIds.map(String)) : null;
    const unlocked = ctx.items.filter((x) => !x.is_locked);
    const replace = known ? unlocked.filter((x) => known.has(String(x.id))) : unlocked;
    if (replace.length) await client.query('DELETE FROM table_order_items WHERE id = ANY($1::uuid[])', [replace.map((x) => x.id)]);
    const nextBatch = Math.max(0, ...ctx.items.filter((i) => i.is_locked).map((i) => i.batch_no)) + 1;
    const sources = await productSourceMap(ctx.restaurant.id, items.map((i) => i.iikoProductId).filter(Boolean));
    for (const it of items.filter((i) => !(i.id && lockedIds.has(i.id)))) {
      // Строку, которую видел официант, гость уже убрал или изменил — устаревшую копию не воскрешаем
      // (local — строка, созданная в приложении официанта: её ID сохраняем, повтор заменит её же)
      if (known && it.id && !it.local && !prevRow.has(it.id)) continue;
      // Строка гостя, которую официант не видел, осталась в базе — не вставляем её второй раз
      if (known && it.id && prevRow.has(it.id) && !known.has(String(it.id))) continue;
      const qty = Math.floor(Number(it.quantity) || 0);
      if (qty <= 0 || !it.iikoProductId) continue;
      if (!/^[0-9a-f-]{36}$/i.test(String(it.iikoProductId))) throw httpError(400, `«${String(it.name || '').slice(0, 60)}»: нет ID блюда в iiko`);
      const key = String(it.iikoProductId);
      newQty.set(key, (newQty.get(key) || 0) + qty);
      // Цена и название — из меню ресторана, не из запроса
      const priced = priceLine(index, key, { qty, totalQty: newQty.get(key), prevQty: prevQty.get(key) || 0, clientName: it.name });
      // Размер и модификаторы: из запроса, иначе из прежней строки; блюдо без выбора — варианты по умолчанию из iiko
      const was = it.id ? prevRow.get(it.id) : null;
      const entry = index.get(key);
      const sizeId = it.sizeId !== undefined ? it.sizeId : was?.size_id || null;
      const mods = Array.isArray(it.modifiers) ? it.modifiers : was?.modifiers || [];
      const explicit = Array.isArray(it.modifiers) || Boolean(was);
      const v = entry.sizes.length || entry.groups.length || sizeId || mods.length
        ? priceVariant(entry, key, { sizeId, modifiers: mods, defaults: !explicit }) : null;
      const price = v ? v.price : priced.price;
      const ownId = it.id && /^[0-9a-f-]{36}$/i.test(String(it.id)) && (it.local || prevRow.has(it.id)) && !lockedIds.has(it.id)
        ? String(it.id) : null;
      await client.query(
        `INSERT INTO table_order_items
           (id, session_id, product_id, iiko_product_id, name, price, quantity, line_total, seat_number, course, batch_no, is_locked,
            guest_id, guest_name, source, size_id, size_name, modifiers, options_text)
         VALUES (COALESCE($18::uuid, gen_random_uuid()), $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,FALSE,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (id) DO NOTHING`,
        [sessionId, it.productId || null, it.iikoProductId, lineName(priced.name, v),
          price, qty, price * qty, it.seatNumber || null, it.course || null, nextBatch,
          guestOf(it.seatNumber)?.id || null, guestOf(it.seatNumber)?.name || null,
          sources.get(String(it.iikoProductId)) || 'main',
          v?.sizeId || null, v?.sizeName || null, v?.mods.length ? JSON.stringify(v.mods) : null, v?.text || null, ownId],
      );
    }
    await recalcTotal(client, sessionId);

    const gc = Math.floor(Number(guestCount) || 0);
    await client.query(
      `UPDATE table_sessions SET
         guest_count = CASE WHEN $2 > 0 THEN $2 ELSE guest_count END,
         workflow_status = CASE WHEN workflow_status IN ('browsing','building_cart','cart_ready','reorder_pending')
                                THEN 'waiter_review' ELSE workflow_status END,
         locked_by = $3, locked_until = NOW() + ($4 || ' milliseconds')::interval,
         waiter_id = COALESCE(waiter_id, $3), seat_names = $5::jsonb, updated_at = NOW()
       WHERE id = $1`,
      [sessionId, gc, staff.id, String(EDIT_LOCK_MS), JSON.stringify(names)],
    );
  }));
  return getSessionView(sessionId);
}

/** Запомнить рабочую терминальную группу источника и сбросить кэш столов (у другой группы свои ID столов). */
export async function saveTerminalGroup(restaurantId, code, terminalGroupId) {
  if (code === MAIN) await pool.query('UPDATE restaurants SET terminal_group_id = $2 WHERE id = $1', [restaurantId, terminalGroupId]);
  else await pool.query('UPDATE restaurant_sources SET terminal_group_id = $3 WHERE restaurant_id = $1 AND code = $2', [restaurantId, code, terminalGroupId]);
  await pool.query(
    `DELETE FROM restaurant_table_cache WHERE restaurant_id = $1 AND ${code === MAIN ? "table_number NOT LIKE '%:%'" : 'table_number LIKE $2'}`,
    code === MAIN ? [restaurantId] : [restaurantId, `${code}:%`],
  );
  console.log(`iiko: терминальная группа ${code === MAIN ? 'кухни' : code} → ${terminalGroupId}`);
}

/**
 * Дошла ли партия до заказа iiko: живых позиций каждого блюда в заказе не меньше, чем у нас уже отправлено + в партии.
 * Нужна, когда ответ iiko потерялся: повторить вслепую — задвоить блюда на кухне.
 */
export function batchLanded(snap, lockedRows, batchRows) {
  if (!snap?.exists || !batchRows.length) return false;
  const alive = new Map();
  for (const it of snap.items || []) alive.set(it.productId, (alive.get(it.productId) || 0) + it.amount);
  const need = new Map();
  for (const r of [...lockedRows, ...batchRows]) {
    const pid = String(r.iiko_product_id);
    need.set(pid, (need.get(pid) || 0) + Number(r.quantity || 0));
  }
  return batchRows.every((r) => (alive.get(String(r.iiko_product_id)) || 0) >= need.get(String(r.iiko_product_id)));
}

/**
 * «В работу» (кейс 8): отправить новые позиции в iiko на стол.
 * Позиции делятся по источникам iiko: кухня — в iiko ресторана, алкоголь — в iiko бара
 * (свой заказ на тот же стол). При ошибке одного iiko остальное уходит, не отправленное остаётся
 * в корзине, официант видит причину и может повторить.
 */
export function sendToKitchen(sessionId, staff) {
  // По одной отправке на визит: повторное нажатие ждёт первую и видит «нет новых позиций» вместо второго заказа в iiko
  return withSessionMutex(sessionId, () => sendToKitchenNow(sessionId, staff));
}

async function sendToKitchenNow(sessionId, staff) {
  const ctx = await getSessionContext(sessionId);
  if (!ctx) throw httpError(404, 'Визит не найден');
  assertEditable(ctx, staff);
  const { session, restaurant } = ctx;
  if (session.status !== 'open') throw httpError(409, 'Стол уже закрыт');
  const pending = ctx.items.filter((i) => !i.is_locked);
  if (!pending.length) throw httpError(400, 'Нет новых позиций для отправки');
  // Стоп-лист проверяем в момент отправки: блюдо могло закончиться, пока гость собирал корзину
  const index = await menuIndex(restaurant);
  const problems = stopProblems(index, pending.map((i) => ({
    key: i.iiko_product_id || i.product_id, quantity: i.quantity, name: i.name, sizeId: i.size_id || null, modifiers: i.modifiers || [],
  })));
  if (problems.length) {
    throw httpError(409, `Нельзя отправить: ${problems.join('; ')}. Уберите или уменьшите и предложите гостю замену.`, { code: 'STOP_LIST' });
  }

  const demo = isIikoDemo();
  const orders = { ...(session.iiko_orders || {}) };
  if (session.iiko_order_id && !orders[MAIN]) orders[MAIN] = { orderId: session.iiko_order_id, tableId: session.iiko_table_id };
  // Касса — по текущей настройке раздела («Кассы» в админке), а не по той, что была при добавлении в корзину
  const fresh = await productSourceMap(restaurant.id, pending.map((i) => i.iiko_product_id).filter(Boolean));
  const groups = new Map();
  for (const i of pending) {
    const code = fresh.get(String(i.iiko_product_id)) || i.source || MAIN;
    if (!groups.has(code)) groups.set(code, []);
    groups.get(code).push(i);
  }

  const sentIds = [];
  const sentByCode = new Map();
  const errors = [];
  const saveOrders = () => pool.query('UPDATE table_sessions SET iiko_orders = $2 WHERE id = $1', [sessionId, JSON.stringify(orders)]);
  for (const [code, all] of groups) {
    let items = all;
    // Запоминаем кассу позиции: по ней считается «бар — принять оплату» и статусы
    await pool.query('UPDATE table_order_items SET source = $2 WHERE id = ANY($1::uuid[]) AND source IS DISTINCT FROM $2',
      [items.map((i) => i.id), code]);
    const src = await getSource(restaurant, code);
    try {
      await withIikoCreds(src.creds, async () => {
        // Имя гостя, место и курс — комментарием к позиции (печатается на чеке); по порядку курсов
        const sortedItems = [...items].sort((a, b) => (a.course || 1) - (b.course || 1));
        let delta = sortedItems
          .map((i) => ({
            productId: i.iiko_product_id,
            amount: i.quantity,
            // Размер и модификаторы гостя (из внешнего меню iiko): iiko сам считает их цену
            // Продаётся один размер из нескольких (пицца: «по умолчанию» без цены) — iiko нужен его ID
            productSizeId: i.size_id || index.get(String(i.iiko_product_id))?.sizeId || undefined,
            modifiers: (i.modifiers || []).map((m) => ({ productId: m.id, amount: m.amount, productGroupId: m.groupId || undefined })),
            comment: [i.guest_name || null, i.seat_number ? `место ${i.seat_number}` : null, i.course ? `курс ${i.course}` : null]
              .filter(Boolean).join(', ') || undefined,
          }));
        let orderId = orders[code]?.orderId;
        const inOrder = (oid) => ctx.items.filter((r) => r.is_locked && (r.source || MAIN) === code
          && (!r.iiko_order_id || String(r.iiko_order_id) === String(oid)));
        const pend = orders[code]?.pending;
        // Прошлая отправка не дождалась ответа iiko — сначала узнаём, дошла ли она, иначе блюда задвоятся
        if (pend && orderId && !demo) {
          const snap = await getOrderSnapshot(src.organization_id, orderId).catch(() => null);
          if (!snap) throw new Error('iiko пока не подтвердил прошлую отправку — проверьте заказ на кассе и повторите через минуту');
          const prev = items.filter((r) => (pend.ids || []).includes(String(r.id)));
          if (snap.exists && prev.length && batchLanded(snap, inOrder(orderId), prev)) {
            sentIds.push(...prev.map((r) => r.id));
            sentByCode.set(code, [...(sentByCode.get(code) || []), ...prev.map((r) => r.id)]);
            items = items.filter((r) => !prev.includes(r));
          } else if (!snap.exists && pend.create) {
            orders[code] = { orderId: null, tableId: orders[code].tableId };
            orderId = null;
          }
        }
        if (orders[code]) delete orders[code].pending;
        if (!items.length) return;
        delta = delta.filter((d, i) => items.includes(sortedItems[i]));
        if (orderId) {
          orders[code].pending = { ids: items.map((r) => String(r.id)) };
          await saveOrders();
          try {
            await addItemsToOrder({ organizationId: src.organization_id, orderId, items: delta });
          } catch (e) {
            // Причину решает статус заказа в iiko, а не текст ошибки: «status code 500» — не «заказ закрыт»
            const snap = demo ? null : await getOrderSnapshot(src.organization_id, orderId).catch(() => null);
            if (snap && (!snap.exists || snap.status === 'Closed' || snap.status === 'Deleted')) {
              // Счёт закрыли или удалили на кассе — дозаказ уходит новым заказом на тот же стол
              console.warn(`iiko: заказ ${orderId} (${code}) ${snap.status || 'не найден'} — создаём новый`);
              orders[code] = { orderId: null, tableId: orders[code]?.tableId };
              if (code === MAIN) session.iiko_order_id = null;
              orderId = null;
            } else if (snap && isUnknownOutcome(e) && batchLanded(snap, inOrder(orderId), items)) {
              console.warn(`iiko: add_items ${orderId} без ответа, но позиции в заказе есть — считаем отправленными`);
            } else {
              if (!isUnknownOutcome(e) && orders[code]) delete orders[code].pending;
              throw e;
            }
          }
        }
        if (!orderId) {
          let tableId = orders[code]?.tableId || (code === MAIN ? session.iiko_table_id : null);
          let terminalGroupId = src.terminal_group_id;
          const resolveTable = async () => {
            if (tableId || demo) return;
            tableId = await resolveIikoTableId(
              { id: restaurant.id, organization_id: src.organization_id, terminal_group_id: terminalGroupId },
              session.table_number, code,
            );
            if (!tableId) throw new Error(`Стол №${session.table_number} не найден в схеме зала iiko`);
          };
          // Свой ID заказа сохраняем до вызова: потерялся ответ или упал процесс — следующая отправка проверит его в iiko
          const newId = randomUUID();
          orders[code] = { orderId: newId, tableId: tableId || null, pending: { ids: items.map((r) => String(r.id)), create: true } };
          await saveOrders();
          const create = () => createTableOrder({
            organizationId: src.organization_id,
            terminalGroupId,
            tableIds: tableId ? [tableId] : [],
            items: delta,
            guestCount: session.guest_count || 1,
            id: demo ? undefined : newId,
          });
          // Касса должна быть на связи: иначе iiko примет заказ, но он зависнет и не дойдёт до кассы
          if (!demo) {
            const picked = await pickAliveTerminalGroup(src.organization_id, terminalGroupId).catch(() => null);
            const current = picked?.list.find((t) => t.id === terminalGroupId);
            // Переключаемся, только если выбранная касса точно не на связи (у бара на отдельной кассе — не трогаем)
            // Кухню не уводим на кассу бара: там другое юрлицо и своё меню (iiko отклонит блюда кухни)
            const barTgs = code === MAIN ? new Set((await listSources(restaurant)).filter((x) => !x.isMain).map((x) => String(x.terminal_group_id))) : new Set();
            const alt = picked?.list.find((t) => t.isAlive && t.id !== terminalGroupId && !barTgs.has(String(t.id)) && !/бар|bar/i.test(t.name || ''));
            if (picked && code === MAIN) picked.id = alt?.id || null;
            if (picked && picked.id && picked.id !== terminalGroupId && current?.isAlive === false && !src.orderOverride) {
              terminalGroupId = picked.id;
              await saveTerminalGroup(restaurant.id, code, terminalGroupId);
              tableId = null;
            } else if (current?.isAlive === false) {
              throw new Error(`Касса ${code === MAIN ? 'кухни' : `«${src.name || code}»`} в iiko не на связи — включите iikoFront на этой кассе и повторите. `
                + `Кассы: ${picked.list.map((t) => `${t.name || t.id}${t.isAlive ? ' — на связи' : t.isAlive === false ? ' — не на связи' : ''}`).join('; ')}`);
            }
          }
          await resolveTable();
          let created;
          try {
            created = await create();
          } catch (e) {
            if (!demo && isUnknownOutcome(e)) {
              const snap = await getOrderSnapshot(src.organization_id, newId).catch(() => null);
              if (snap?.exists) created = { orderInfo: { id: newId } };
              else if (!snap) throw e; // не знаем — pending остаётся, следующая отправка проверит
            }
            if (created) { /* заказ создан, хоть ответ и потерялся */ } else if (demo || !isTerminalGroupError(e)) {
              if (!isUnknownOutcome(e)) orders[code] = { orderId: null, tableId: tableId || null };
              throw e;
            } else {
            // iiko не принял заказ через эту кассу — пробуем другие терминальные группы организации
            const { list } = await pickAliveTerminalGroup(src.organization_id, terminalGroupId);
            const others = src.orderOverride ? [] : list.filter((t) => t.id !== terminalGroupId && t.isAlive !== false && !/бар|bar/i.test(t.name || ''))
              .sort((x, y) => Number(Boolean(y.isAlive)) - Number(Boolean(x.isAlive)));
            let lastErr = e;
            const cacheKey = code === MAIN ? String(session.table_number) : `${code}:${session.table_number}`;
            const dropCache = () => pool.query(
              'DELETE FROM restaurant_table_cache WHERE restaurant_id = $1 AND table_number = $2', [restaurant.id, cacheKey],
            );
            const firstGroup = terminalGroupId;
            for (const t of others) {
              try {
                terminalGroupId = t.id;
                tableId = null;
                await dropCache();
                await resolveTable();
                created = await create();
                await saveTerminalGroup(restaurant.id, code, terminalGroupId);
                lastErr = null;
                break;
              } catch (e2) { lastErr = e2; }
            }
            if (lastErr) {
              if (others.length) { terminalGroupId = firstGroup; await dropCache(); }
              orders[code] = { orderId: null, tableId: null };
              const raw = e.response?.data?.errorDescription || e.message || '';
              const names = list.map((t) => `${t.name || t.id}${t.isAlive ? ' — на связи' : t.isAlive === false ? ' — не на связи' : ''}`).join('; ');
              throw new Error(/server version/i.test(raw)
                ? 'iiko Cloud не знает версию сервера iiko этого ресторана («0.0.0») и не принимает заказы на стол (нужна 7.1.5+). '
                  + 'Касса на связи — нужна синхронизация iikoRMS/iikoFront с iiko Cloud: обратитесь в поддержку iiko или к интегратору. '
                  + `Кассы: ${names || 'нет'}`
                : raw);
            }
            }
          }
          if (created?.orderInfo?.creationStatus === 'Error') {
            orders[code] = { orderId: null, tableId: tableId || null };
            throw new Error(created.orderInfo.errorInfo?.message || 'iiko отклонил заказ');
          }
          orderId = created?.orderInfo?.id || created?.order?.id || created?.id || null;
          if (!orderId) throw new Error('iiko не вернул номер заказа');
          orders[code] = { orderId, tableId: tableId || null };
        }
        if (orders[code]) delete orders[code].pending;
      });
      sentIds.push(...items.map((i) => i.id));
      sentByCode.set(code, [...(sentByCode.get(code) || []), ...items.map((i) => i.id)]);
    } catch (e) {
      const reason = e.response?.data?.errorDescription || e.response?.data?.message || e.message || 'Ошибка iiko';
      errors.push(groups.size > 1 || code !== MAIN ? `${src.name}: ${reason}` : reason);
    }
  }

  if (sentIds.length) {
    await pool.query(
      `UPDATE table_order_items SET is_locked = TRUE, synced_to_iiko = TRUE, sent_at = NOW(), kitchen_status = NULL, updated_at = NOW()
       WHERE id = ANY($1::uuid[])`,
      [sentIds],
    );
    // Строка помнит свой заказ iiko: оплата и сверка считаются по заказу, а не по всему столу
    for (const [code, ids] of sentByCode) {
      if (orders[code]?.orderId) {
        await pool.query('UPDATE table_order_items SET iiko_order_id = $2 WHERE id = ANY($1::uuid[])', [ids, String(orders[code].orderId)]);
      }
    }
  }
  const errorText = errors.length ? errors.join('; ') : null;
  await pool.query(
    `UPDATE table_sessions SET iiko_orders = $2, iiko_order_id = COALESCE($3, iiko_order_id),
       iiko_table_id = COALESCE($4, iiko_table_id), iiko_last_error = $5,
       workflow_status = CASE WHEN $6 AND workflow_status <> 'bill_requested' THEN $7 ELSE workflow_status END,
       sent_to_production_at = CASE WHEN $6 THEN NOW() ELSE sent_to_production_at END,
       waiter_id = COALESCE(waiter_id, $8),
       locked_by = CASE WHEN $6 AND $5::text IS NULL THEN NULL ELSE locked_by END,
       locked_until = CASE WHEN $6 AND $5::text IS NULL THEN NULL ELSE locked_until END,
       wait_notified_at = NULL, updated_at = NOW()
     WHERE id = $1`,
    [sessionId, JSON.stringify(orders), orders[MAIN]?.orderId || null, orders[MAIN]?.tableId || null,
      errorText, sentIds.length > 0, WORKFLOW.IN_PRODUCTION, staff.id],
  );
  if (errors.length) {
    await createWaiterNotification({
      restaurantId: restaurant.id,
      sessionId,
      tableNumber: session.table_number,
      type: NOTIFY_TYPES.IIKO_ERROR,
      title: `Стол №${session.table_number} — ошибка iiko`,
      body: `${errorText}.${sentIds.length ? ' Остальное отправлено.' : ''} Не отправленное сохранено, можно повторить.`,
      payload: { sessionId },
    });
    throw httpError(502, `iiko: ${errorText}${sentIds.length ? ' (остальные позиции отправлены)' : ''}`);
  }
  await markSessionNotificationsRead(sessionId);
  return getSessionView(sessionId);
}

export async function releaseSession(sessionId, staff) {
  await pool.query(
    'UPDATE table_sessions SET locked_by = NULL, locked_until = NULL WHERE id = $1 AND locked_by = $2',
    [sessionId, staff.id],
  );
  return getSessionView(sessionId);
}

/** Официант принял оплату на своём терминале / закрыл стол. */
/**
 * Закрыть стол в меню (заказы iiko не трогаем — счёт закрывают на кассе). Неоплаченное или неотправленное —
 * сначала 409 с суммой: официант подтверждает (force), и в журнал пишется «закрыт без оплаты».
 */
export async function closeSession(sessionId, staff, { force = false } = {}) {
  const ctx = await getSessionContext(sessionId);
  if (!ctx) throw httpError(404, 'Визит не найден');
  const { session } = ctx;
  if (session.status !== 'open' && session.status !== 'paid') return { ...(await getSessionView(sessionId)), unpaid: 0 };
  const lockedByOther = session.locked_by && session.locked_by !== staff.id
    && session.locked_until && new Date(session.locked_until) > new Date();
  if (lockedByOther && !force) throw httpError(409, 'Стол сейчас редактирует другой официант', { code: 'EDIT_LOCKED' });
  const isPaid = session.payment_status === 'paid';
  const unpaid = isPaid ? 0 : Math.round(ctx.items.filter((i) => i.is_locked && !i.paid_payment_id)
    .reduce((n, i) => n + parseFloat(i.line_total || 0), 0));
  const unsent = ctx.items.filter((i) => !i.is_locked).reduce((n, i) => n + i.quantity, 0);
  if (!force && (unpaid > 0 || unsent > 0)) {
    throw httpError(409, [
      unpaid > 0 ? `Не оплачено ${unpaid} ₽` : null,
      unsent > 0 ? `не отправлено позиций: ${unsent}` : null,
    ].filter(Boolean).join(', ') + '. Если гости расплатились на кассе — закройте счёт там; закрыть стол без оплаты?',
    { code: 'UNPAID', details: { unpaid, unsent } });
  }
  await pool.query(
    `UPDATE table_sessions SET
       status = 'closed',
       workflow_status = CASE WHEN payment_status = 'paid' THEN 'paid' ELSE 'closed' END,
       closed_at = NOW(), locked_by = NULL, locked_until = NULL, updated_at = NOW()
     WHERE id = $1`,
    [sessionId],
  );
  await markSessionNotificationsRead(sessionId);
  return { ...(await getSessionView(sessionId)), unpaid };
}

async function markSessionNotificationsRead(sessionId) {
  await pool.query(
    'UPDATE waiter_notifications SET is_read = TRUE WHERE session_id = $1 AND is_read = FALSE',
    [sessionId],
  );
}

// ── Контроль сервиса (управляющий) ──────────────────────────────────────────

export async function getHallDashboard(restaurantId) {
  const sessions = await listActiveSessions(restaurantId);
  const open = sessions.filter((s) => s.status === 'open');

  const { rows: [today] } = await pool.query(
    `SELECT
       COUNT(*)::int AS visits,
       COUNT(*) FILTER (WHERE sent_to_production_at IS NOT NULL)::int AS orders,
       COUNT(*) FILTER (WHERE payment_status = 'paid')::int AS paid,
       COALESCE(SUM(total) FILTER (WHERE sent_to_production_at IS NOT NULL), 0)::float AS revenue,
       COALESCE(AVG(EXTRACT(EPOCH FROM (sent_to_production_at - cart_ready_at)) / 60)
         FILTER (WHERE sent_to_production_at IS NOT NULL AND cart_ready_at IS NOT NULL
                 AND sent_to_production_at >= cart_ready_at), 0)::float AS avg_response_min
     FROM table_sessions
     WHERE restaurant_id = $1 AND created_at::date = CURRENT_DATE`,
    [restaurantId],
  );
  const { rows: [pay] } = await pool.query(
    `SELECT COALESCE(SUM(p.amount), 0)::float AS paid_sum, COALESCE(SUM(p.tip_amount), 0)::float AS tips
     FROM table_payments p JOIN table_sessions s ON s.id = p.session_id
     WHERE s.restaurant_id = $1 AND p.created_at::date = CURRENT_DATE AND p.status = 'completed'`,
    [restaurantId],
  );
  const { rows: [fb] } = await pool.query(
    `SELECT COUNT(*)::int AS count, COALESCE(AVG(f.rating), 0)::float AS avg,
            COUNT(*) FILTER (WHERE f.rating <= 3)::int AS low
     FROM visit_feedback f JOIN table_sessions s ON s.id = f.session_id
     WHERE s.restaurant_id = $1 AND f.created_at > NOW() - INTERVAL '30 days'`,
    [restaurantId],
  );
  const { rows: calls } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM waiter_notifications
     WHERE restaurant_id = $1 AND is_read = FALSE AND type IN ('call_waiter', 'bill_requested', 'wait_too_long')`,
    [restaurantId],
  );
  const { rows: waiters } = await pool.query(
    `SELECT u.name, COUNT(s.id)::int AS tables,
            COALESCE(SUM(s.total), 0)::float AS revenue,
            COALESCE(AVG(f.rating), 0)::float AS rating,
            COALESCE(SUM(p.tip_amount), 0)::float AS tips
     FROM table_sessions s
     JOIN staff_users u ON u.id = s.waiter_id
     LEFT JOIN visit_feedback f ON f.session_id = s.id
     LEFT JOIN table_payments p ON p.session_id = s.id AND p.status = 'completed'
     WHERE s.restaurant_id = $1 AND s.created_at::date = CURRENT_DATE
     GROUP BY u.name ORDER BY revenue DESC`,
    [restaurantId],
  );

  return {
    slaMinutes: Math.round(WAITER_RESPONSE_SLA_MS / 60000),
    activeTables: open.length,
    overdueTables: open.filter((s) => s.isOverdue).length,
    waitingTables: open.filter((s) => ['cart_ready', 'reorder_pending', 'bill_requested'].includes(s.workflowStatus)).length,
    openCalls: calls[0].n,
    today: {
      ...today,
      paidSum: pay.paid_sum,
      tips: pay.tips,
      avgCheck: today.orders ? Math.round(today.revenue / today.orders) : 0,
    },
    feedback30d: fb,
    waiters,
    sessions,
  };
}
