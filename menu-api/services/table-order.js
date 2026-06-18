import pool from '../db/pool.js';
import { suggestDishes } from '../services/ai-suggest.js';
import {
  addItemsToOrder,
  createTableOrder,
  getOrdersByTable,
  getRestaurantSections,
  initOrderByTable,
  matchTableIdFromSections,
  changeOrderPayments,
} from '../iiko-client.js';

async function getRestaurantBySlug(slug) {
  const { rows } = await pool.query(
    `SELECT * FROM restaurants WHERE slug = $1 AND is_disabled = FALSE`,
    [slug],
  );
  return rows[0] || null;
}

async function resolveIikoTableId(restaurant, tableNumber) {
  const { rows: cached } = await pool.query(
    `SELECT iiko_table_id FROM restaurant_table_cache
     WHERE restaurant_id = $1 AND table_number = $2`,
    [restaurant.id, String(tableNumber)],
  );
  if (cached[0]?.iiko_table_id) {
    return cached[0].iiko_table_id;
  }

  const sections = await getRestaurantSections(
    restaurant.organization_id,
    restaurant.terminal_group_id,
  );
  const tableId = matchTableIdFromSections(sections, tableNumber);
  if (tableId) {
    await pool.query(
      `INSERT INTO restaurant_table_cache (restaurant_id, table_number, iiko_table_id, table_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (restaurant_id, table_number) DO UPDATE SET
         iiko_table_id = EXCLUDED.iiko_table_id,
         updated_at = NOW()`,
      [restaurant.id, String(tableNumber), tableId, `Стол ${tableNumber}`],
    );
  }
  return tableId;
}

async function getSessionItems(sessionId) {
  const { rows } = await pool.query(
    `SELECT * FROM table_order_items WHERE session_id = $1 ORDER BY created_at`,
    [sessionId],
  );
  return rows;
}

function mapSessionRow(row, restaurant, items) {
  return {
    sessionId: row.id,
    restaurantSlug: restaurant.slug,
    restaurantName: restaurant.name,
    restaurantAddress: restaurant.address,
    tableNumber: row.table_number,
    iikoOrderId: row.iiko_order_id,
    status: row.status,
    paymentStatus: row.payment_status,
    total: parseFloat(row.total || 0),
    items: items.map((i) => ({
      id: i.id,
      productId: i.product_id,
      iikoProductId: i.iiko_product_id,
      name: i.name,
      price: parseFloat(i.price),
      quantity: i.quantity,
      lineTotal: parseFloat(i.line_total),
    })),
  };
}

async function findOpenSession(restaurantId, tableNumber) {
  const { rows } = await pool.query(
    `SELECT * FROM table_sessions
     WHERE restaurant_id = $1 AND table_number = $2 AND status = 'open'
     LIMIT 1`,
    [restaurantId, String(tableNumber)],
  );
  return rows[0] || null;
}

export async function enterTableSession(restaurantSlug, tableNumber) {
  const restaurant = await getRestaurantBySlug(restaurantSlug);
  if (!restaurant) {
    const err = new Error('Ресторан не найден');
    err.status = 404;
    throw err;
  }

  let session = await findOpenSession(restaurant.id, tableNumber);
  if (!session) {
    const { rows } = await pool.query(
      `INSERT INTO table_sessions (restaurant_id, table_number)
       VALUES ($1, $2)
       RETURNING *`,
      [restaurant.id, String(tableNumber)],
    );
    session = rows[0];
  }

  const items = await getSessionItems(session.id);
  return mapSessionRow(session, restaurant, items);
}

export async function getSessionById(sessionId) {
  const { rows } = await pool.query(
    `SELECT s.*, r.slug, r.name, r.address, r.organization_id, r.terminal_group_id,
            r.terminal_id
     FROM table_sessions s
     JOIN restaurants r ON r.id = s.restaurant_id
     WHERE s.id = $1`,
    [sessionId],
  );
  const row = rows[0];
  if (!row) return null;
  const restaurant = {
    id: row.restaurant_id,
    slug: row.slug,
    name: row.name,
    address: row.address,
    organization_id: row.organization_id,
    terminal_group_id: row.terminal_group_id,
    terminal_id: row.terminal_id,
  };
  const items = await getSessionItems(sessionId);
  return { session: row, restaurant, items };
}

export async function aiSuggest(restaurantSlug, query) {
  const restaurant = await getRestaurantBySlug(restaurantSlug);
  if (!restaurant) {
    const err = new Error('Ресторан не найден');
    err.status = 404;
    throw err;
  }

  const { rows: products } = await pool.query(
    `SELECT id, iiko_id, name, slug, description, price, image_url, sort_order, category_id
     FROM products
     WHERE restaurant_id = $1 AND is_published = TRUE AND price > 0
     ORDER BY sort_order`,
    [restaurant.id],
  );

  const suggestions = await suggestDishes(products, query, 6);
  return {
    query,
    suggestions: suggestions.map((s) => ({
      productId: s.product.id,
      iikoId: s.product.iiko_id,
      name: s.product.name,
      slug: s.product.slug,
      price: parseFloat(s.product.price),
      image: s.product.image_url,
      reason: s.reason,
      score: s.score,
    })),
  };
}

async function upsertSessionItems(sessionId, cartItems) {
  const { rows: prev } = await pool.query(
    `SELECT iiko_product_id, quantity FROM table_order_items WHERE session_id = $1`,
    [sessionId],
  );
  const prevMap = new Map(prev.map((r) => [r.iiko_product_id, Number(r.quantity)]));

  await pool.query(`DELETE FROM table_order_items WHERE session_id = $1`, [sessionId]);

  let total = 0;
  for (const item of cartItems) {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.price) || 0;
    const lineTotal = price * qty;
    total += lineTotal;
    await pool.query(
      `INSERT INTO table_order_items
         (session_id, product_id, iiko_product_id, name, price, quantity, line_total, synced_to_iiko)
       VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)`,
      [
        sessionId,
        item.productId || null,
        item.iikoProductId,
        item.name,
        price,
        qty,
        lineTotal,
      ],
    );
  }

  await pool.query(
    `UPDATE table_sessions SET total = $2, updated_at = NOW() WHERE id = $1`,
    [sessionId, total],
  );

  const delta = [];
  for (const item of cartItems) {
    const iikoId = item.iikoProductId;
    const qty = Number(item.quantity) || 1;
    const prevQty = prevMap.get(iikoId) || 0;
    const addQty = qty - prevQty;
    if (addQty > 0) {
      delta.push({ productId: iikoId, amount: addQty });
    }
  }

  return { total, delta };
}

export async function syncTableOrder(sessionId, cartItems) {
  const ctx = await getSessionById(sessionId);
  if (!ctx) {
    const err = new Error('Сессия не найдена');
    err.status = 404;
    throw err;
  }

  const { session, restaurant } = ctx;
  if (session.status !== 'open') {
    const err = new Error('Заказ уже закрыт');
    err.status = 400;
    throw err;
  }

  const { delta } = await upsertSessionItems(sessionId, cartItems);

  let iikoTableId = session.iiko_table_id;
  if (!iikoTableId) {
    iikoTableId = await resolveIikoTableId(restaurant, session.table_number);
    if (iikoTableId) {
      await pool.query(
        `UPDATE table_sessions SET iiko_table_id = $2, updated_at = NOW() WHERE id = $1`,
        [sessionId, iikoTableId],
      );
    }
  }

  const iikoItems = cartItems
    .filter((i) => i.iikoProductId)
    .map((i) => ({
      productId: i.iikoProductId,
      amount: Number(i.quantity) || 1,
    }));

  if (iikoItems.length === 0) {
    return enterTableSession(restaurant.slug, session.table_number);
  }

  let iikoOrderId = session.iiko_order_id;

  try {
    if (!iikoOrderId && iikoTableId && delta.length > 0) {
      const created = await createTableOrder({
        organizationId: restaurant.organization_id,
        terminalGroupId: restaurant.terminal_group_id,
        tableIds: [iikoTableId],
        items: delta,
      });
      iikoOrderId = created?.orderInfo?.id
        || created?.order?.id
        || created?.id
        || null;

      if (iikoOrderId) {
        await pool.query(
          `UPDATE table_sessions SET iiko_order_id = $2, updated_at = NOW() WHERE id = $1`,
          [sessionId, iikoOrderId],
        );
      }
    } else if (iikoOrderId && delta.length > 0) {
      await addItemsToOrder({
        organizationId: restaurant.organization_id,
        orderId: iikoOrderId,
        items: delta,
      });
    } else if (!iikoTableId && delta.length > 0) {
      console.warn(`Стол ${session.table_number}: iiko table UUID не найден, заказ сохранён локально`);
    }

    await pool.query(
      `UPDATE table_order_items SET synced_to_iiko = TRUE, updated_at = NOW()
       WHERE session_id = $1`,
      [sessionId],
    );
  } catch (e) {
    console.error('iiko sync error:', e.response?.data || e.message);
    const err = new Error(
      e.response?.data?.errorDescription || e.message || 'Ошибка отправки в iiko',
    );
    err.status = 502;
    err.details = e.response?.data;
    throw err;
  }

  return enterTableSession(restaurant.slug, session.table_number);
}

export async function payTableOrder(sessionId, { paymentType = 'Card' } = {}) {
  const ctx = await getSessionById(sessionId);
  if (!ctx) {
    const err = new Error('Сессия не найдена');
    err.status = 404;
    throw err;
  }

  const { session, restaurant, items } = ctx;
  if (!session.iiko_order_id) {
    const err = new Error('Заказ ещё не создан в iiko');
    err.status = 400;
    throw err;
  }

  const total = parseFloat(session.total || 0);
  try {
    await changeOrderPayments(restaurant.organization_id, session.iiko_order_id, [
      {
        paymentTypeKind: paymentType,
        sum: total,
        isProcessedExternally: true,
      },
    ]);
  } catch (e) {
    console.error('iiko payment error:', e.response?.data || e.message);
  }

  await pool.query(
    `UPDATE table_sessions
     SET payment_status = 'paid', status = 'paid', updated_at = NOW()
     WHERE id = $1`,
    [sessionId],
  );

  return mapSessionRow(
    { ...session, payment_status: 'paid', status: 'paid' },
    restaurant,
    items,
  );
}

export async function reopenTableForMore(sessionId) {
  const ctx = await getSessionById(sessionId);
  if (!ctx) {
    const err = new Error('Сессия не найдена');
    err.status = 404;
    throw err;
  }

  const { session, restaurant } = ctx;
  if (session.status === 'open') {
    return enterTableSession(restaurant.slug, session.table_number);
  }

  const existing = await findOpenSession(restaurant.id, session.table_number);
  if (existing) {
    const items = await getSessionItems(existing.id);
    return mapSessionRow(existing, restaurant, items);
  }

  const { rows } = await pool.query(
    `INSERT INTO table_sessions (restaurant_id, table_number, iiko_table_id)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [restaurant.id, session.table_number, session.iiko_table_id],
  );
  const items = await getSessionItems(rows[0].id);
  return mapSessionRow(rows[0], restaurant, items);
}

export async function pullOrderFromIiko(restaurantSlug, tableNumber) {
  const restaurant = await getRestaurantBySlug(restaurantSlug);
  if (!restaurant) return null;

  const tableId = await resolveIikoTableId(restaurant, tableNumber);
  if (!tableId) return null;

  try {
    await initOrderByTable(
      restaurant.organization_id,
      restaurant.terminal_group_id,
      [tableId],
    );
    const orders = await getOrdersByTable([restaurant.organization_id], [tableId]);
    const orderList = orders?.orders || orders?.orderInfos || [];
    if (!orderList.length) return null;

    const latest = orderList[0];
    const iikoOrderId = latest.id || latest.order?.id;
    let session = await findOpenSession(restaurant.id, tableNumber);
    if (!session) {
      const { rows } = await pool.query(
        `INSERT INTO table_sessions (restaurant_id, table_number, iiko_table_id, iiko_order_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [restaurant.id, String(tableNumber), tableId, iikoOrderId],
      );
      session = rows[0];
    } else if (iikoOrderId) {
      await pool.query(
        `UPDATE table_sessions SET iiko_order_id = $2, iiko_table_id = $3, updated_at = NOW()
         WHERE id = $1`,
        [session.id, iikoOrderId, tableId],
      );
    }

    const items = await getSessionItems(session.id);
    return mapSessionRow(session, restaurant, items);
  } catch (e) {
    console.error('pullOrderFromIiko:', e.message);
    return null;
  }
}
