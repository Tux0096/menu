import pLimit from 'p-limit';
import CLogger from '../lib/CLogger.js';
import * as iikoAdapterApi from './iiko-adapter.api.js';
import * as iikoAdapterConfig from './iiko-adapter.config.js';
import * as iikoService from '../iiko/iiko.service.js';
import * as orderService from '../order/order.service.js';
import {
  convertCustomer,
  convertGroups,
  convertHistory,
  convertOrder,
  convertProducts,
  convertStopList,
} from './iiko-adapter.helter.js';

const logger = new CLogger();

export const getToken = async (apiLogin) => {
  try {
    return await iikoAdapterApi.getToken(apiLogin);
  } catch (e) {
    logger.log(e);
    throw e;
  }
};

export const getNomenclature = async () => {
  try {
    const organizationId = await iikoService.getOrganizationId();

    const { groups, products, revision } = await iikoAdapterApi
      .getNomenclature(organizationId);

    const convertedProducts = products.map(convertProducts);

    const convertedGroups = groups.map(convertGroups);

    return { revision, groups: convertedGroups, products: convertedProducts };
  } catch (e) {
    console.log(e);
    logger.log(e);
    throw e;
  }
};

export const createOrder = async (order) => {
  const convertedOrder = await convertOrder(order);

  const fullOrder = await orderService.buildOrder(order.id);

  const terminalConfig = iikoAdapterConfig.getTerminalById(fullOrder.terminalId);

  if (!terminalConfig) {
    throw new Error(`Не удалось найти конфигурацию терминала для заказа ${order.id}`);
  }

  const {
    organizationId,
    terminalGroupId,
  } = terminalConfig;

  const requestData = {
    organizationId,
    terminalGroupId,
    ...convertedOrder,
  };

  return iikoAdapterApi.createOrder(requestData);
};

export const getCladr = async () => {
  try {
    const { cities: cityGroups } = await iikoAdapterApi.getCities();

    const cities = cityGroups
      .flatMap((cityGroup) => cityGroup.items).filter((city) => !city.isDeleted);

    const limit = pLimit(1); // Ограничение до 5 одновременных запросов

    const delay = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

    const cityAndStreetPromises = cities.map((city) => limit(async () => {
      await delay(15000);
      const { streets: rawStreets } = await iikoAdapterApi.getStreets(city.id);
      const streets = rawStreets.filter((street) => !street.isDeleted).map(
        (street) => ({ ...street, cityId: city.id, deleted: street.isDeleted }),
      );
      return { city: { ...city, deleted: city.isDeleted }, streets };
    }));

    return Promise.all(cityAndStreetPromises);
  } catch (error) {
    console.error(error);
    return undefined;
  }
};

export const getPayments = async () => {
  try {
    const { paymentTypes } = await iikoAdapterApi.getPayments();

    paymentTypes.forEach((paymentType) => {
      paymentType.deleted = paymentType.isDeleted;
    });
    return ({ paymentTypes });
  } catch (e) {
    console.log(e);
    return undefined;
  }
};

export const getStopList = async () => {
  try {
    const stopListData = await iikoAdapterApi.getStopList();

    const stopList = convertStopList(stopListData);

    return stopList;
  } catch (e) {
    console.error(e);
    return undefined;
  }
};

export const getDeliveryHistoryByPhone = async (phone) => {
  try {
    const historyData = await iikoAdapterApi.getDeliveryHistoryByPhone(phone);
    return convertHistory(historyData);
  } catch (e) {
    console.error(e);
    return undefined;
  }
};

export const getCustomerByPhone = async (phone) => {
  try {
    const customerData = await iikoAdapterApi.getCustomerByPhone(phone);
    const customer = convertCustomer(customerData);
    if (!customer) {
      throw new Error('Customer_CustomerNotFound'); // бросаем ошибку, если пользователь не найден
    }
    return customer;
  } catch (e) {
    console.error(e);
    throw e;
  }
};

export async function createOrUpdateCustomer(customer) {
  const { name, phone } = customer?.customer || {};

  if (!name || !phone) {
    throw new Error('Name and phone are required for creating/updating a customer.');
  }

  try {
    const customerId = await iikoAdapterApi.createOrUpdateCustomer({ name, phone });
    return customerId?.id;
  } catch (e) {
    console.error('Failed to create or update customer:', e);
    throw e;
  }
}
