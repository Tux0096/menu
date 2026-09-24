import axios from 'axios';
import { randomUUID } from 'crypto';
import { IIKO_URL, requestIikoToken } from './lib/iiko-token.js';


/**
 * Демо-режим: IIKO_DEMO=true или не задан IIKO_API_LOGIN.
 * Заказы «создаются» локально с фиктивным orderId — прототип работает без доступа к iiko.
 */
export function isIikoDemo() {
  return process.env.IIKO_DEMO === 'true' || !process.env.IIKO_API_LOGIN;
}

let cachedToken = null;
let tokenExpiresAt = 0;

export async function getIikoToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }
  cachedToken = await requestIikoToken(process.env.IIKO_API_LOGIN);
  tokenExpiresAt = Date.now() + 50 * 60 * 1000;
  return cachedToken;
}

async function iikoPost(path, body) {
  if (isIikoDemo()) return demoResponse(path, body);
  const token = await getIikoToken();
  const res = await axios.post(`${IIKO_URL}${path}`, body, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30000,
  });
  return res.data;
}

function demoResponse(path, body) {
  console.log(`[iiko demo] ${path}`);
  if (path === '/api/1/order/create') {
    return { orderInfo: { id: randomUUID(), creationStatus: 'Success' } };
  }
  if (path === '/api/1/reserve/available_restaurant_sections') {
    return { restaurantSections: [] };
  }
  if (path === '/api/1/order/by_id') {
    return { orders: [] };
  }
  if (path === '/api/1/order/by_table') {
    return { orders: [] };
  }
  if (path === '/api/1/stop_lists') {
    return { terminalGroupStopLists: [] };
  }
  return { correlationId: randomUUID(), demo: true, body };
}

/** Стоп-лист iiko для организации: Set productId с нулевым остатком. */
export async function getStopListProductIds(organizationId, terminalGroupId) {
  const data = await iikoPost('/api/1/stop_lists', { organizationIds: [organizationId] });
  const ids = new Set();
  for (const org of data?.terminalGroupStopLists || []) {
    for (const group of org.items || []) {
      if (terminalGroupId && group.terminalGroupId && group.terminalGroupId !== terminalGroupId) continue;
      for (const item of group.items || []) {
        if (Number(item.balance) <= 0) ids.add(String(item.productId));
      }
    }
  }
  return ids;
}

export async function getRestaurantSections(organizationId, terminalGroupId) {
  return iikoPost('/api/1/reserve/available_restaurant_sections', {
    organizationId,
    terminalGroupIds: [terminalGroupId],
  });
}

export async function createTableOrder({
  organizationId,
  terminalGroupId,
  tableIds,
  items,
  guestCount = 1,
}) {
  return iikoPost('/api/1/order/create', {
    organizationId,
    terminalGroupId,
    order: {
      tableIds,
      items: items.map((item) => ({
        productId: item.productId,
        type: 'Product',
        amount: item.amount,
      })),
      guests: { count: guestCount },
    },
  });
}

export async function addItemsToOrder({
  organizationId,
  orderId,
  items,
}) {
  return iikoPost('/api/1/order/add_items', {
    organizationId,
    orderId,
    items: items.map((item) => ({
      productId: item.productId,
      type: 'Product',
      amount: item.amount,
    })),
  });
}

export async function getOrdersByTable(organizationIds, tableIds) {
  return iikoPost('/api/1/order/by_table', {
    organizationIds,
    tableIds,
    statuses: ['New', 'Bill'],
  });
}

/** Заказы на стол по ID (статус заказа и статусы блюд на кухне). */
export async function getOrdersByIds(organizationId, orderIds) {
  return iikoPost('/api/1/order/by_id', { organizationIds: [organizationId], orderIds });
}

export async function initOrderByTable(organizationId, terminalGroupId, tableIds) {
  return iikoPost('/api/1/order/init_by_table', {
    organizationId,
    terminalGroupId,
    tableIds,
  });
}

export async function changeOrderPayments(organizationId, orderId, payments) {
  return iikoPost('/api/1/order/change_payments', {
    organizationId,
    orderId,
    payments,
  });
}

export async function closeTableOrder(organizationId, orderId) {
  return iikoPost('/api/1/order/close', {
    organizationId,
    orderId,
  });
}

/** Найти UUID стола iiko по номеру (из секций или кэша). */
export function matchTableIdFromSections(sectionsResponse, tableNumber) {
  const num = String(tableNumber).trim();
  const sections = sectionsResponse?.restaurantSections
    || sectionsResponse?.sections
    || [];

  for (const section of sections) {
    const tables = section?.tables || [];
    for (const table of tables) {
      const name = String(table.name || table.number || '').trim();
      const id = table.id;
      if (!id) continue;
      if (name === num || name === `Стол ${num}` || name === `стол ${num}`) {
        return id;
      }
      if (name.replace(/\D/g, '') === num) {
        return id;
      }
    }
  }
  return null;
}
