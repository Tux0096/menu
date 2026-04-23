import axios from 'axios';
import * as iikoService from '../iiko/iiko.service.js';
import { getTerminalsAll } from './iiko-adapter.config.js';
import { getOrganizationId } from '../iiko/iiko.service.js';

const IIKO_NEW_TRANSPORT_URL = 'https://api-ru.iiko.services';

let token = null;

export const getToken = async () => {
  const apiLogin = await iikoService.getApiLogin();
  const res = await axios
    .post(
      `${IIKO_NEW_TRANSPORT_URL}/api/1/access_token`,
      {
        apiLogin,
      },
    );

  if (res.status !== 200) {
    throw new Error(`Failed to get token: ${res.status} ${res.statusText}`);
  }

  token = res.data.token;

  return token;
};

const iikoServiceAxiosInstance = axios.create({
  baseURL: IIKO_NEW_TRANSPORT_URL,
});

// Add a request interceptor
iikoServiceAxiosInstance.interceptors.request.use(async (config) => {
  const originalRequestConfig = { ...config };
  originalRequestConfig.headers.Authorization = `Bearer ${token}`;
  return originalRequestConfig;
}, (error) => Promise.reject(error));

iikoServiceAxiosInstance
  .interceptors
  .response
  .use(
    (response) => response,
    async (error) => {
      const originalRequestConfig = error.config;
      if (error.response?.status === 401 && !originalRequestConfig.$_retry) {
        originalRequestConfig.$_retry = true;
        token = await getToken();
        originalRequestConfig.headers.Authorization = `Bearer ${token}`;
        return iikoServiceAxiosInstance(originalRequestConfig);
      }

      return Promise.reject(error);
    },
  );
export const getNomenclature = async (organizationId) => {
  const res = await iikoServiceAxiosInstance
    .post(
      '/api/1/nomenclature',
      {
        organizationId,
      },
    );
  return res.data;
};

export const createOrder = async (requestData) => {
  const res = await iikoServiceAxiosInstance.post(
    '/api/1/deliveries/create',
    requestData,
  );
  return res.data;
};

export const getCities = async () => {
  // КЛАДР загружаем с сервера КЦ Головин
  const organizationIds = [await getOrganizationId()];
  const res = await iikoServiceAxiosInstance
    .post(
      '/api/1/cities',
      {
        organizationIds,
      },
    );

  return res.data;
};

export const getStreets = async (cityId) => {
  const organizationId = await iikoService.getOrganizationId();
  const res = await iikoServiceAxiosInstance
    .post(
      '/api/1/streets/by_city',
      {
        organizationId,
        cityId,
      },
    );

  return res.data;
};

export const getPayments = async () => {
  const organizationId = await iikoService.getOrganizationId();
  const res = await iikoServiceAxiosInstance
    .post(
      '/api/1/payment_types',
      {
        organizationIds: [
          organizationId,
        ],

      },
    );

  return res.data;
};

export const getStopList = async () => {
  const organizationIds = getTerminalsAll().map((o) => o.organizationId);
  const res = await iikoServiceAxiosInstance
    .post(
      '/api/1/stop_lists',
      {
        organizationIds,

      },
    );

  return res.data;
};

export const getDeliveryHistoryByPhone = async (phone) => {
  const organizationIds = getTerminalsAll().map((o) => o.organizationId);
  const res = await iikoServiceAxiosInstance
    .post(
      '/api/1/deliveries/by_delivery_date_and_phone',
      {
        organizationIds,
        phone,
        rowsCount: 10,

      },
    );

  return res.data;
};

export const getCustomerByPhone = async (phone) => {
  const organizationId = await iikoService.getOrganizationId();
  const res = await iikoServiceAxiosInstance
    .post(
      '/api/1/loyalty/iiko/customer/info',
      {
        organizationId,
        phone,
        type: 'phone',
      },
    );

  return res.data;
};

export const createOrUpdateCustomer = async (customer) => {
  const organizationId = await iikoService.getOrganizationId();
  const res = await iikoServiceAxiosInstance
    .post(
      '/api/1/loyalty/iiko/customer/create_or_update',
      {
        organizationId,
        ...customer,
      },
    );
  console.log(res);
  return res.data;
};
