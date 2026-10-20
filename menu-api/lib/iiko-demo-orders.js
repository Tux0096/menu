/**
 * Демо-режим iiko (ключей нет): «касса» в памяти процесса — открытые заказы по столам.
 * Наполняется из env IIKO_DEMO_TABLE_ORDERS (JSON-массив) и через /api/v1/iiko/demo/table-orders;
 * отвечает на order/by_table, order/by_id, add_items и схему зала так, как отвечал бы iiko.
 *
 * IIKO_DEMO_TABLE_ORDERS='[{"table":"7","waiter":{"id":"w1","name":"Анна"},
 *   "items":[{"name":"Борщ","amount":2,"price":350,"status":"CookingStarted"}]}]'
 */
import { createHash, randomUUID } from 'crypto';

const orders = new Map(); // orderId -> заказ в формате order/by_id
let seeded = false;

const uuidFrom = (text) => {
  const h = createHash('sha1').update(String(text)).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

/** UUID стола в демо-схеме зала — один и тот же для одного номера. */
export const demoTableId = (table) => uuidFrom(`demo-table:${table}`);

function buildOrder(spec) {
  const table = spec.table == null ? null : String(spec.table);
  const id = spec.id || randomUUID();
  const items = (spec.items || []).map((i) => addItemShape(i));
  return {
    id,
    number: spec.number || 1000 + orders.size + 1,
    status: spec.status || 'New',
    whenCreated: spec.whenCreated || new Date().toISOString(),
    tableIds: table == null ? [] : [demoTableId(table)],
    demoTable: table,
    waiter: spec.waiter || null,
    guests: { count: spec.guests || 1 },
    items,
    get sum() { return this.items.filter((i) => !i.deleted).reduce((n, i) => n + i.resultSum, 0); },
  };
}

function addItemShape(i) {
  const amount = Number(i.amount ?? i.quantity ?? 1);
  const price = Number(i.price ?? 0);
  const mods = (i.modifiers || []).map((m) => ({
    product: { id: m.productId || m.id || uuidFrom(m.name || 'mod'), name: m.name || 'Модификатор' },
    amount: Number(m.amount ?? 1), price: Number(m.price ?? 0), productGroupId: m.productGroupId || null,
  }));
  const modsSum = mods.reduce((n, m) => n + m.price * m.amount, 0);
  return {
    type: 'Product',
    product: { id: i.productId || uuidFrom(`demo-product:${i.name}`), name: i.name || 'Блюдо' },
    amount,
    price,
    resultSum: Number(i.resultSum ?? (price + modsSum) * amount),
    status: i.status || undefined,
    modifiers: mods,
    comment: i.comment || undefined,
    deleted: false,
  };
}

function seed() {
  if (seeded) return;
  seeded = true;
  try {
    const list = JSON.parse(process.env.IIKO_DEMO_TABLE_ORDERS || '[]');
    for (const spec of Array.isArray(list) ? list : []) {
      if (spec?.table != null) { const o = buildOrder(spec); orders.set(o.id, o); }
    }
  } catch (e) {
    console.warn('IIKO_DEMO_TABLE_ORDERS: не разобрать JSON —', e.message);
  }
}

/** Заказ есть в демо-кассе (иначе визит живёт на имитации кухни по времени). */
export function demoHasOrder(orderId) {
  seed();
  return orders.has(String(orderId));
}

/** Схема зала: столы 1–40, столы с демо-заказами и столы демо-броней (extraTables). */
export function demoSections(extraTables = []) {
  seed();
  const names = new Set(Array.from({ length: 40 }, (_, i) => String(i + 1)));
  for (const t of extraTables) names.add(String(t));
  for (const o of orders.values()) if (o.demoTable != null) names.add(o.demoTable);
  return { restaurantSections: [{ id: uuidFrom('demo-section'), name: 'Зал', tables: [...names].map((n) => ({ id: demoTableId(n), name: `Стол ${n}`, number: /^\d+$/.test(n) ? Number(n) : undefined, isDeleted: false })) }] };
}

export function demoOrdersByTable(body) {
  seed();
  const want = new Set((body?.tableIds || []).map(String));
  const statuses = new Set(body?.statuses || ['New', 'Bill']);
  return {
    orders: [...orders.values()]
      .filter((o) => statuses.has(o.status) && o.tableIds.some((t) => want.has(t)))
      .map((o) => ({ id: o.id, creationStatus: 'Success', order: o })),
  };
}

export function demoOrdersByIds(body) {
  seed();
  return { orders: (body?.orderIds || []).map((id) => orders.get(String(id))).filter(Boolean).map((o) => ({ id: o.id, creationStatus: 'Success', order: o })) };
}

/** Наш заказ из order/create в демо: хранится, чтобы удаление и дозаказ были видны, как на кассе. */
export function demoCreate(body) {
  seed();
  const o = buildOrder({ id: body?.order?.id, table: null, items: (body?.order?.items || []).map((i) => ({ ...i, name: i.name || 'Блюдо', productId: i.productId })), guests: body?.order?.guests?.count });
  orders.set(o.id, o);
  return o;
}

export function demoAddItems(body) {
  seed();
  const o = orders.get(String(body?.orderId));
  if (!o) return false;
  for (const i of body.items || []) o.items.push(addItemShape({ ...i, name: i.name || 'Блюдо' }));
  return true;
}

// ── Управление демо-кассой (для проверки сценария локально и в e2e) ─────────

export function demoApply(op) {
  seed();
  switch (op?.op) {
    case 'reset': orders.clear(); return { ok: true };
    case 'upsert': {
      const o = buildOrder(op.order);
      orders.set(o.id, o);
      return { ok: true, orderId: o.id };
    }
    case 'addItem': {
      const o = orders.get(String(op.orderId));
      if (!o) return { ok: false, error: 'нет такого заказа' };
      o.items.push(addItemShape(op.item));
      return { ok: true };
    }
    case 'setStatus': {
      const o = orders.get(String(op.orderId));
      if (!o) return { ok: false, error: 'нет такого заказа' };
      for (const i of o.items) if (!op.name || i.product.name === op.name) i.status = op.status;
      return { ok: true };
    }
    case 'removeItem': {
      // Удаление на кассе: целиком (mode 'delete', по умолчанию) или уменьшение количества (mode 'reduce', amount — на сколько)
      const o = orders.get(String(op.orderId));
      const it = o?.items.filter((i) => !i.deleted).find((i) => (op.name ? i.product.name === op.name : i.product.id === op.productId));
      if (!it) return { ok: false, error: 'нет такой позиции' };
      if (op.mode === 'reduce' && it.amount > Number(op.amount || 1)) {
        const unit = it.resultSum / it.amount;
        it.amount -= Number(op.amount || 1);
        it.resultSum = unit * it.amount;
      } else {
        it.deleted = true;
        it.removalType = op.removalType || 'writeoff';
      }
      return { ok: true };
    }
    case 'close': case 'delete': {
      const o = orders.get(String(op.orderId));
      if (!o) return { ok: false, error: 'нет такого заказа' };
      o.status = op.op === 'close' ? 'Closed' : 'Deleted';
      return { ok: true };
    }
    default: return { ok: false, error: 'неизвестная операция' };
  }
}
