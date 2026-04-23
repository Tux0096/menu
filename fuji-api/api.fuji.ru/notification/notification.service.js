import amqp from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import env from '../env.js';

import * as notificationRepo from './notification.repository.js';

import CLogger from '../lib/CLogger.js';
import { processingQueryData } from '../lib/helpers.js';
import * as orderService from '../order/order.service.js';
import {
  formatBirthday,
  formatLastMessageSentAt,
  formatLastOrderDate,
} from './notification.helper.js';

const logger = new CLogger();

export const addDevice = async (deviceDate) => {
  try {
    await notificationRepo.addDevice(deviceDate);
  } catch (e) {
    logger.log(e);
    throw e;
  }
};

export const getTokensAll = async () => {
  try {
    return await notificationRepo.getTokensAll();
  } catch (e) {
    logger.log(e);
    throw e;
  }
};

export const sendBulkNotifications = async (tokens, title, body, customerIDs = null) => {
  try {
    const connection = await amqp.connect(env.RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(env.QUEUE_NAME, {
      durable: true,
    });
    const uuid = uuidv4();
    const message = JSON.stringify({
      tokens,
      title,
      body,
      uuid,
      customerIDs,
    });

    channel.sendToQueue(env.QUEUE_NAME, Buffer.from(message), {
      persistent: true,
    });

    console.log('[x] Sending message completed');

    setTimeout(() => {
      connection.close();
    }, 500);

    return Promise.resolve('Messages sent to RabbitMQ');
  } catch (error) {
    console.error('Failed to send messages to RabbitMQ:', error);
    return Promise.reject(error);
  }
};

export const sendBulkNotificationsAllDevices = async (title, body) => {
  const tokensData = await getTokensAll();
  const tokens = tokensData.map((token) => token.FCMToken);

  return sendBulkNotifications(tokens, title, body);
};

export const getCustomers = async (queryData, noLimit = false) => {
  const processedQueryData = processingQueryData(queryData);
  let filteredData = await notificationRepo.getCustomers(processedQueryData);

  const { filter } = processedQueryData;
  const { page = 1, limit = 50 } = processedQueryData;
  const offset = (page - 1) * limit;

  if (filter?.birthday?.from !== undefined && filter?.birthday?.to
    !== undefined && filter?.birthday?.to > 0) {
    const today = moment();

    filteredData = filteredData.filter((item) => {
      // Приводим дату рождения пользователя к текущему году
      const birthdayThisYear = moment(item.birthday)
        .year(today.year());

      // Если день рождения уже прошел в этом году, рассматриваем следующий год
      if (birthdayThisYear.isBefore(today, 'day')) {
        birthdayThisYear.add(1, 'year');
      }

      // Рассчитываем количество дней до следующего дня рождения
      const daysUntilBirthday = birthdayThisYear.diff(today, 'days');

      // Возвращаем true, если день рождения в заданном диапазоне
      return daysUntilBirthday >= filter.birthday.from && daysUntilBirthday
        <= filter.birthday.to;
    });
  }

  // Фильтр по количеству заказов (orderCount)
  if (filter?.orderCount?.from !== undefined && filter?.orderCount?.to
    !== undefined && filter?.orderCount?.to > 0) {
    filteredData = filteredData.filter((item) => {
      const orderCount = item.orderCount || 0;
      return orderCount >= filter.orderCount.from && orderCount
        <= filter.orderCount.to;
    });
  }

  // Фильтр по дате последнего заказа (lastOrderDate)
  if (filter?.lastOrderDate?.from !== undefined && filter?.lastOrderDate?.to
    !== undefined && filter?.lastOrderDate?.to > 0) {
    const today = moment();

    filteredData = filteredData.filter((item) => {
      if (!item.lastOrderDate) {
        return false; // Если lastOrderDate отсутствует, исключаем элемент
      }

      // Рассчитываем количество дней с последнего заказа
      const lastOrderDate = moment(item.lastOrderDate);
      const daysSinceLastOrder = today.diff(lastOrderDate, 'days');

      // Возвращаем true, если количество дней с последнего заказа в заданном диапазоне
      return daysSinceLastOrder >= filter.lastOrderDate.from
        && daysSinceLastOrder <= filter.lastOrderDate.to;
    });
  }
  // Фильтр по среднему чеку (averageCheck)
  if (filter?.averageCheck?.from !== undefined && filter?.averageCheck?.to
    !== undefined && filter?.averageCheck?.to > 0) {
    filteredData = filteredData.filter((item) => {
      const averageCheck = item.averageCheck || 0;
      return averageCheck >= filter.averageCheck.from && averageCheck
        <= filter.averageCheck.to;
    });
  }
  // Фильтр по самовывозу (isSelfService)
  if (filter?.isSelfService !== undefined && filter?.isSelfService !== 'none') {
    filteredData = filteredData.filter((item) => item.isSelfService
      === Number(filter.isSelfService));
  }
  // Фильтр по ресторану (lastOrderTerminalId)
  if (filter?.lastOrderTerminalId !== undefined
    && filter?.lastOrderTerminalId !== 'none') {
    filteredData = filteredData.filter((item) => item.lastOrderTerminalId
      === filter.lastOrderTerminalId);
  }

  // Фильтр по заказанным продуктам (orderedProducts)
  if (filter?.orderedProducts !== undefined && filter?.orderedProducts !== 'none' && filter?.orderedProducts.trim() !== '') {
    filteredData = filteredData.filter((item) => {
      const itemOrderedProductIds = item.orderedProducts ? item.orderedProducts.split(',') : [];
      return itemOrderedProductIds.includes(filter.orderedProducts);
    });
  }

  const rests = await orderService.getOrdersRest();

  filteredData = filteredData.map((item) => {
    const rest = rests.find((r) => r.value === item.lastOrderTerminalId);

    return {
      ...item,
      lastOrderTerminal: rest?.text || 'Не определен',
      lastMessageSentAtFormat: formatLastMessageSentAt(item.lastMessageSentAt),
      birthdayFormat: formatBirthday(item.birthday),
      lastOrderDateFormat: formatLastOrderDate(item.lastOrderDate),
    };
  });

  if (noLimit) {
    return filteredData;
  }

  // Пагинация данных
  const paginatedData = filteredData.slice(offset, offset + limit);

  return {
    items: paginatedData,
    pagination: {
      currentPage: page,
      pageSize: limit,
      totalPages: Math.ceil(filteredData.length / limit),
      totalItems: filteredData.length,
    },
  };
};

export const sendBulkNotificationFilterCustomers = async (messageDate, queryData) => {
  const customerData = await getCustomers(queryData, true);

  const { title, body } = messageDate;

  const tokens = customerData.map((token) => token.FCMToken);
  const customerIDs = customerData.map((customers) => customers.customerId);
  notificationRepo.setLastMessageSentAtByFCMToken(tokens, new Date()).catch((e) => console.log(e));

  return sendBulkNotifications(tokens, title, body, customerIDs);
};

export const getCustomerDevices = async (customerId) => {
  try {
    return await notificationRepo.getCustomerDevices(customerId);
  } catch (e) {
    logger.log(e);
    return [];
  }
};

export const sendBulkNotificationsByPhoneNumbers = async (phoneNumbers, title, body) => {
  try {
    // Получаем токены устройств по номерам телефонов
    const {
      foundPhones,
      tokens,
      customerIds,
    } = await notificationRepo.getTokensByPhoneNumbers(phoneNumbers);

    if (tokens.length === 0) {
      return {
        phone_numbers: [],
        message: 'Устройства для указанных номеров телефонов не найдены',
      };
    }

    // Отправляем push-уведомления через существующую систему
    await sendBulkNotifications(tokens, title, body, customerIds);

    return {
      phone_numbers: foundPhones,
    };
  } catch (e) {
    logger.log('sendBulkNotificationsByPhoneNumbers: ОШИБКА', e);
    throw e;
  }
};
