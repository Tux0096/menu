import axios from 'axios';
import { getLocalFormatTime } from '../catalog/catalog.helper.js';
import { formatDeliveryHistoryDate, isCompanyEmployee } from './iiko.helper.js';

import { IIKO_CARD_PROGRAM_IDS, IIKO_SERVER_URL } from '../config/common.js';

import CLogger from '../lib/CLogger.js';
import { getOrganizationId, getToken } from '../storage/storage.service.js';
import { isActionProduct } from '../lib/helpers.js';
import { getSettingByName } from '../setting/setting.service.js';
import { getCategoryIdByProductId } from '../catalog/catalog.service.js';

const logger = new CLogger();

// implemented in new iiko service
export const getNomenclature = async () => {
  try {
    const [token, organizationId] = await Promise.all([getToken(), getOrganizationId()]);

    const res = await axios.get(`${IIKO_SERVER_URL}/api/0/nomenclature/${organizationId}`, {
      params: {
        access_token: token,
      },
    });

    return res.data;
  } catch (e) {
    console.error(e);
    throw e;
  }
};

// not implemented in new iiko service (not used)
export const getCustomer = async (phone) => {
  try {
    const [token, organizationId] = await Promise.all([getToken(), getOrganizationId()]);

    const { data } = await axios.get(
      `${IIKO_SERVER_URL}/api/0/customers/get_customer_by_phone`,
      {
        params: {
          access_token: token,
          organization: organizationId,
          phone,
        },
      },
    );

    const updatedData = data;

    let balance = 0;

    if (data.walletBalances && data.walletBalances.length > 0) {
      data.walletBalances.forEach((walletBalances) => {
        if (IIKO_CARD_PROGRAM_IDS.includes(walletBalances.wallet.id)) {
          balance += Number(walletBalances.balance);
        }
      });
    }
    updatedData.balance = balance;
    updatedData.isCompanyEmployee = isCompanyEmployee(updatedData.categories);

    return updatedData;
  } catch (e) {
    logger.log(e);
  }
};

// implemented in new iiko service
export const getCladr = async () => {
  const [token, organizationId] = await Promise.all([getToken(), getOrganizationId()]);

  if (!token || !organizationId) {
    console.log('Token and organizationId is required');
    return;
  }

  try {
    const res = await axios.get(`${IIKO_SERVER_URL}/api/0/cities/cities`, {
      params: {
        access_token: token,
        organization: organizationId,

      },
    });
    return res.data;
  } catch (e) {
    console.log(e);
  }
};

// TODO: нужно реализовать для нового транспорта
export const createOrUpdate = async (customer) => {
  const [token, organizationId] = await Promise.all([getToken(), getOrganizationId()]);

  if (!token || !organizationId) {
    console.log('Token and organizationId is required');
    return;
  }

  try {
    const { data } = await axios.post(
      `${IIKO_SERVER_URL}/api/0/customers/create_or_update`,
      {
        customer,
      },
      {
        params: {
          access_token: token,
          organization: organizationId,

        },
      },
    );

    return data;
  } catch (e) {
    console.log(e);
  }
};

export const sendMessageIiko = async (data) => {
  const [token, organizationId] = await Promise.all([getToken(), getOrganizationId()]);

  if (!token || !organizationId) {
    throw new Error('Token and organizationId is required');
  }
  data.organization = organizationId;

  const deliveryOrderDate = Number(new Date(data.order.date)) + 3600000;
  data.order.date = getLocalFormatTime(deliveryOrderDate); // 2022-09-17 18:58:36

  logger.orderLog({ requestOrder: data });

  const res = await axios.post(
    `${IIKO_SERVER_URL}/api/0/orders/add`,
    data,
    {
      params: {
        access_token: token,
        organization: organizationId,
        requestTimeout: 10000,
      },
    },
  );
  return res.data;
};

// not implemented in new iiko service (not used)
// loyalty program
export const calculateCheckinResult = async (order) => {
  const result = {
    discountTotal: 0,
    discounts: [],
    loyaltyProgramErrors: [],
    freeProducts: [],
    lostGift: [],
  };

  const [token, organizationId] = await Promise.all([getToken(), getOrganizationId()]);
  if (!token || !organizationId) {
    console.log('Token and organizationId is required');
    return result;
  }

  try {
    order.organization = organizationId;
    const { data } = await axios
      .post(
        `${IIKO_SERVER_URL}/api/0/orders/calculate_checkin_v2`,
        order,
        {
          params: {
            access_token: token,
            organization: organizationId,
          },
        },
      );

    const { loyatyResult, validationWarnings } = data;

    if (validationWarnings) {
      result.loyaltyProgramErrors = validationWarnings;
    }

    if (loyatyResult) {
      const { programResults } = loyatyResult;

      programResults.forEach((program) => {
        // discounts
        if (program.discounts?.length) {
          result.discounts = result.discounts.concat(program.discounts);
          result.discountTotal += program.discounts.reduce((acc, current) => {
            acc += current.discountSum;
            return acc;
          }, 0);
        }

        if (program.freeProducts?.length) {
          result.freeProducts = result
            .freeProducts.concat(
              program.freeProducts.flatMap((item) => item.productCodes),
            );
        }
      });

      // TODO: exclude this
      const LOST_GIFT_CODE = '457091542748';
      result.lostGift = result.freeProducts.filter((pCode) => pCode === LOST_GIFT_CODE);
      result.freeProducts = result.freeProducts.filter((pCode) => pCode !== LOST_GIFT_CODE);
    }
  } catch (e) {
    console.log(e);
  }
  return result;
};

// not implemented in new iiko service (not used)
export const getOrderInfo = async (orderId, organizationId = null, requestTimeout = 10000) => {
  const [token, defaultOrganizationId] = await Promise.all([getToken(), getOrganizationId()]);

  if (!token || (!organizationId && !defaultOrganizationId)) {
    console.log('Token and organizationId is required');
    return;
  }

  const orgId = organizationId || defaultOrganizationId;

  try {
    const res = await axios.get(`${IIKO_SERVER_URL}/api/0/orders/info`, {
      params: {
        access_token: token,
        organization: orgId,
        order: orderId,
        requestTimeout,
      },
    });
    return res.data;
  } catch (e) {
    console.log(e);
  }
};

// not implemented in new iiko service (not used)
export const checkCreateOrder = async (order) => {
  const [token, organizationId] = await Promise.all([getToken(), getOrganizationId()]);

  if (!token || !organizationId) {
    console.log('Token and organizationId is required');
    return;
  }

  const OrderRequest = {
    order,
  };

  OrderRequest.organization = organizationId;

  try {
    const res = await axios.post(
      `${IIKO_SERVER_URL}/api/0/orders/checkCreate`,
      OrderRequest,
      {
        params: {
          access_token: token,

        },
      },
    );
    return res.data;
  } catch (e) {
    console.log(e);
  }
};

// not implemented in new iiko service (not used)
export const checkAddress = async (city, street, home) => {
  const [token, organizationId] = await Promise.all([getToken(), getOrganizationId()]);

  if (!token || !organizationId) {
    console.log('Token and organizationId is required');
    return;
  }

  const params = {
    access_token: token,
    organizationId,
  };

  console.log(city, street, home);

  try {
    const res = await axios.post(
      `${IIKO_SERVER_URL}/api/0/orders/checkAddress`,
      { city, street, home },
      {
        params,
      },
    );
    return res.data;
  } catch (e) {
    console.log(e);
  }
};

// implemented in new iiko service
export const getPayments = async () => {
  const [token, organizationId] = await Promise.all([getToken(), getOrganizationId()]);

  if (!token || !organizationId) {
    console.log('Token and organizationId is required');
    return;
  }

  try {
    const res = await axios.get(`${IIKO_SERVER_URL}/api/0/rmsSettings/getPaymentTypes`, {
      params: {
        access_token: token,
        organization: organizationId,
      },
    });

    return res.data;
  } catch (e) {
    console.log(e);
  }
};

// implemented in new iiko service
export const getStopList = async () => {
  const [token, organizationId] = await Promise.all([getToken(), getOrganizationId()]);

  if (!token || !organizationId) {
    console.log('Token and organizationId is required');
    return;
  }

  try {
    const res = await axios.get(`${IIKO_SERVER_URL}/api/0/stopLists/getDeliveryStopList`, {
      params: {
        access_token: token,
        organization: organizationId,
      },
    });

    return res.data?.stopList || [];
  } catch (e) {
    console.log(e);
  }
};

function mappingStatus(iikoStatus) {
  function getStatuses(isNewIikoTransport = false) {
    if (isNewIikoTransport) {
      return ({
        Unconfirmed: 'Не подтверждён',
        WaitCooking: 'Ожидание приготовления',
        ReadyForCooking: 'Готов к приготовлению',
        CookingStarted: 'Готовится',
        CookingCompleted: 'Приготовлен',
        Waiting: 'Ожидает отправки',
        OnWay: 'В пути',
        Delivered: 'Доставлен',
        Closed: 'Доставлен',
        Cancelled: 'Отменен',
        New: 'Принят',
      });
    }
    return ({
      NEW: 'Принят',
      WAITING: 'Ждет отправки',
      ON_WAY: 'В пути',
      CLOSED: 'Закрыт',
      CANCELLED: 'Отменен',
      DELIVERED: 'Доставлен',
      UNCONFIRMED: 'Неподтвержденный',
    });
  }

  const IS_NEW_IIKO_TRANSPORT = getSettingByName('IS_NEW_IIKO_TRANSPORT');

  // в айко бизе и на новом транспорте статусы приходят в разных написаниях
  // напр: old CLOSED - new Closed
  const statusKey = Object.keys(getStatuses(IS_NEW_IIKO_TRANSPORT))
    .find((s) => s?.toLowerCase() === iikoStatus?.toLowerCase());

  return {
    key: statusKey,
    value: getStatuses(IS_NEW_IIKO_TRANSPORT)[statusKey] || 'Статус не определен',
  };
}

export const getDeliveryHistoryByPhone = async (phone) => {
  try {
    const [token, organizationId] = await Promise.all([getToken(), getOrganizationId()]);

    if (!token || !organizationId) {
      throw new Error('Token and organizationId are required');
    }

    const requestParams = {
      access_token: token,
      organization: organizationId,
      phone,
    };

    const userHistoryData = await axios.get(`${IIKO_SERVER_URL}/api/0/orders/deliveryHistoryByPhone`, {
      params: requestParams,
    });

    const { data } = userHistoryData;
    const { customersDeliveryHistory } = data;

    // TODO: переписать по проще
    const deliveryHistoryWithFormatDatePromises = customersDeliveryHistory
      .reduce((acc, customersDeliveryHistoryItem) => {
        const { deliveryHistory } = customersDeliveryHistoryItem;

        const temp = deliveryHistory
          .map(async (el) => {
            const status = mappingStatus(el.status);

            const items = await Promise.all(el.items.map(async (item) => {
              const categoryProduct = await getCategoryIdByProductId(item.id);
              const isAction = await isActionProduct(item.id, categoryProduct);
              return ({
                ...item,
                isAction,
              });
            }));

            const formatDate = (dateStr) => {
              const date = new Date(dateStr);
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const hour = String(date.getHours()).padStart(2, '0');
              const minute = String(date.getMinutes()).padStart(2, '0');
              return `${year}-${month}-${day} ${hour}:${minute}`;
            };

            return {
              ...el,
              createdAt: formatDate(el.date),
              timestamp: Date.parse(el.date),
              frontendStatus: status,
              items,
            };
          });

        return acc.concat(temp);
      }, []);
    const deliveryHistoryWithFormatDate = await Promise.all(deliveryHistoryWithFormatDatePromises);
    deliveryHistoryWithFormatDate.sort((a, b) => b.timestamp - a.timestamp);
    return deliveryHistoryWithFormatDate.filter((el) => el.items?.length > 0).slice(0, 20);
  } catch (e) {
    return [];
  }
};
