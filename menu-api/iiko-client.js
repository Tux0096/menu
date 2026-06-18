import axios from 'axios';

const IIKO_URL = 'https://api-ru.iiko.services';

let cachedToken = null;
let tokenExpiresAt = 0;

export async function getIikoToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }
  const apiLogin = process.env.IIKO_API_LOGIN;
  if (!apiLogin) {
    throw new Error('IIKO_API_LOGIN не задан в .env');
  }
  const res = await axios.post(`${IIKO_URL}/api/1/access_token`, { apiLogin });
  cachedToken = res.data.token;
  tokenExpiresAt = Date.now() + 50 * 60 * 1000;
  return cachedToken;
}

async function iikoPost(path, body) {
  const token = await getIikoToken();
  const res = await axios.post(`${IIKO_URL}${path}`, body, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
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
