import * as dateFnsTz from 'date-fns-tz';
import * as terminalsService from '../terminals/terminals.service.js';
import * as iikoService from '../iiko/iiko.service.js';
import * as senderService from '../sender/sender.service.js';
import * as cityService from '../city/city.service.js';
import * as userService from '../user/user.service.js';
import * as orderRepo from './order.repository.js';
import * as notificationService from '../notification/notification.service.js';
import * as orderQueues from './order.queues.js';
import { isAddressAvailable } from '../address/address.service.js';
import CLogger from '../lib/CLogger.js';
import * as deliveryRepo from './delivery.repository.js';

import CustomError from '../errors/CustomError.js';
import { isActionProduct, processingQueryData } from '../lib/helpers.js';
import eventEmitter from '../services/EventEmitter.js';
import { getSettings } from '../setting/setting.service.js';
import {
  getCatalog,
  getCategoryIdByProductId,
} from '../catalog/catalog.service.js';
import * as mapService from '../map/map.service.js';
import connectionManager from '../services/ConnectionManager.js';
import * as userHelper from '../user/user.helper.js';
import * as promoService from '../promo/promo.service.js';

const { IS_SITE_NOT_WORKING, TEXT_SITE_NOT_WORKING } = await getSettings('samara');

const logger = new CLogger();

export const getOrdersAll = async (queryData) => {
  const processedQueryData = processingQueryData(queryData);

  try {
    const orders = await orderRepo.getOrdersAll(processedQueryData);
    orders.items.sort((a, b) => b.createdAt - a.createdAt);
    return orders;
  } catch (e) {
    logger.log(e);
    throw e;
  }
};

export const getOrdersRest = async () => await terminalsService.getRestaurantList();

export const getOrderStatus = async (id) => {
  const result = await orderRepo.getOrderStatus(id);
  return result?.status || null;
};

export const setStatus = async (id, status) => {
  try {
    await orderRepo.setStatus(id, status);
  } catch (e) {
    throw e;
  }
};

export const setIsTelegramSend = async (id, status) => {
  try {
    await orderRepo.setIsTelegramSend(id, status);
  } catch (e) {
    throw e;
  }
};

export const setIsIikoSend = async (id, status) => {
  try {
    await orderRepo.setIsIikoSend(id, status);
  } catch (e) {
    throw e;
  }
};

export const setIikoId = async (id, iikoId) => {
  try {
    await orderRepo.setIikoId(id, iikoId);
  } catch (e) {
    throw e;
  }
};

export const setIikoOrderId = async (id, iikoOrderId) => {
  try {
    await orderRepo.setIikoOrderId(id, iikoOrderId);
  } catch (e) {
    throw e;
  }
};

export const setReceiptUrl = async (id, receiptUrl) => {
  try {
    await orderRepo.setReceiptUrl(id, receiptUrl);
  } catch (e) {
    throw e;
  }
};

export const getReceiptUrlsByIikoOrderIds = async (iikoOrderIds) => {
  try {
    return await orderRepo.getReceiptUrlsByIikoOrderIds(iikoOrderIds);
  } catch (e) {
    throw e;
  }
};

export const getOrderInfo = async (id) => {
  try {
    await iikoService.getOrderInfo(id);
  } catch (e) {
    throw e;
  }
};

export const getUserLastOrder = async (userId) => {
  const lastOrder = await orderRepo.getUserLastOrder(userId);
  if (!lastOrder) {
    return null;
  }

  const result = {
    createdAt: lastOrder.createdAt,
    products: [],
  };

  const lastOrderProducts = await orderRepo.getOrderItem(lastOrder.id);

  const productsPromises = lastOrderProducts
    .map(async (lastOrderProduct) => {
      const mods = await orderRepo.getOrderProductModifier(lastOrderProduct.id);
      const categoryProduct = await getCategoryIdByProductId(lastOrderProduct.iikoId);
      return {
        productId: lastOrderProduct.iikoId,
        amount: lastOrderProduct.amount,
        isGift: lastOrderProduct.isGift,
        name: lastOrderProduct.name,
        isAction: await isActionProduct(lastOrderProduct.iikoId, categoryProduct),
        mods,
      };
    });

  result.products = await Promise.all(productsPromises);
  return result;
};

export const buildOrder = async (orderId) => {
  const orderModel = await orderRepo.getOrder(orderId);

  const result = JSON.parse(JSON.stringify(orderModel));
  if (result.address?.streetId) {
    const city = await cityService.getCityByStreetId(result.address.streetId);
    if (!result?.address?.street?.includes(city.name)) {
      result.address.street = `${city.name}, ${result.address.street}`;
    }
  }

  return result;
};

export const getOrderZoneId = (orderId) => orderRepo.getOrderZoneId(orderId);

/**
 * Получает заказ по ID с проверкой прав доступа
 * @param {string} orderId - ID заказа
 * @returns {Object|null} - Данные заказа или null
 */
export const getOrderById = async (orderId) => {
  try {
    const order = await orderRepo.getOrder(orderId);

    if (!order) {
      return null;
    }

    // Форматируем данные для CloudKassir
    return {
      orderId: order.id,
      userPhone: order.user?.phone,
      total: order.total,

    };
  } catch (e) {
    logger.log(e);
    return null;
  }
};

/**
 * Получает заказ по iikoOrderId с проверкой прав доступа
 * @param {string} iikoOrderId - ID заказа в системе iiko
 * @returns {Object|null} - Данные заказа или null
 */
export const getOrderByIikoOrderId = async (iikoOrderId) => {
  try {
    const order = await orderRepo.getOrderByIikoOrderId(iikoOrderId);
    if (!order) {
      return null;
    }

    // Форматируем данные для CloudKassir
    return {
      orderId: order.id,
      iikoOrderId: order.iikoOrderId,
      userPhone: order.user?.phone,
      total: order.total,
      receiptUrl: order.receiptUrl, // URL чека из БД
      // Другие поля по необходимости
    };
  } catch (e) {
    logger.log(e);
    return null;
  }
};

async function saveBasketItems(basketItem, orderId) {
  const { product } = basketItem;
  const basketItemData = {
    orderId,
    iikoId: product.id,
    name: product.name,
    code: product.code,
    price: product.price,
    isGift: product.isGift,
    amount: basketItem.quantity,
  };

  const { id: orderProductId } = await orderRepo.createOrderItem(basketItemData);
  if (basketItem.mods.length) {
    const { mods } = basketItem;

    await Promise.all(
      [
        ...mods.map((mod) => {
          const orderProductModifier = {
            orderProductId,
            amount: mod.amount,
            iikoId: mod.id,
            name: mod.name,
            code: mod.code,
            price: mod.price,
            groupId: mod.groupId,
            groupName: mod.groupName,
          };
          return orderRepo.createOrderProductModifier(orderProductModifier);
        })],
    );
  }
}

export const validateBasketItems = async (basket) => {
  const catalog = await getCatalog();
  const { products } = catalog;
  const productById = (productId) => products.find((p) => p.id === productId);

  basket.forEach((item) => {
    if (!item.product) {
      throw new CustomError({
        message: 'Ошибка корзины',
        code: 'WRONG_CART',
        statusCode: 422,
      });
    }
    const { product: { id: productId, price }, mods } = item;
    const product = productById(productId);
    if (!product) {
      throw new CustomError({
        message: 'Ошибка корзины',
        code: 'WRONG_CART',
        statusCode: 422,
      });
    } else {
      if (price !== product.price) {
        throw new CustomError({
          message: 'Ошибка корзины',
          code: 'WRONG_CART',
          statusCode: 422,
        });
      }

      mods.forEach((mod) => {
        const foundMod = product.groupModifiers.find(
          (gm) => {
            const foundModInner = gm.modifiers
              .find((m) => mod.id === m.modifierId);

            if (foundModInner && foundModInner.price !== mod.price) {
              throw new CustomError({
                message: 'Ошибка корзины',
                code: 'WRONG_CART',
                statusCode: 422,
              });
            }
            return foundModInner && foundModInner.price === mod.price;
          },
        );

        if (!foundMod) {
          throw new CustomError({
            message: 'Ошибка корзины',
            code: 'WRONG_CART',
            statusCode: 422,
          });
        }
      });
    }
  });
  return true;
};

export const checkOrderCreatingAvailable = async (data) => {
  if (IS_SITE_NOT_WORKING) {
    throw new CustomError({
      message: TEXT_SITE_NOT_WORKING,
      code: 'SITE_NOT_WORKING',
      statusCode: 403,
    });
  }

  const {
    user, order: orderData, coupon, spendBonus,
  } = data;

  const { basket } = orderData;

  await validateBasketItems(basket);

  if (coupon) {
    const promocodes = await promoService.getPromocodes();
    const normalizedCoupon = coupon.trim().toLowerCase();
    const promocode = promocodes
      .find((p) => p.coupon.toLowerCase() === normalizedCoupon && p.active);

    if (promocode && promocode.hasTimeRestriction && promocode.timeFrom && promocode.timeTo) {
      const timeZone = 'Europe/Samara';
      const deliveryDate = new Date(Date.now());
      const deliverySamara = dateFnsTz.toZonedTime(deliveryDate, timeZone);

      const deliveryTime = `${String(deliverySamara.getHours()).padStart(2, '0')}:${String(deliverySamara.getMinutes()).padStart(2, '0')}`;
      if (deliveryTime < promocode.timeFrom || deliveryTime > promocode.timeTo) {
        throw new CustomError({
          message: `Промокод можно использовать только для заказов с доставкой с ${promocode.timeFrom} до ${promocode.timeTo}. Промокод будет удален из заказа!`,
          code: 'PROMO_TIME_RESTRICTION',
          statusCode: 422,
        });
      }
    }
  }

  return true;
};

export const createOrder = async (data) => {
  await checkOrderCreatingAvailable(data);
  const {
    user, order: orderData, coupon, spendBonus,
  } = data;

  if (!orderData.isSelfService
    && !await isAddressAvailable(orderData.addressId)) {
    throw new CustomError({
      message: 'В данный момент нет доставки по данному адресу. '
        + '\nВведите другой адрес или свяжитесь с менеджером.',
      code: 'ADDRESS_NOT_AVAILABLE',
      statusCode: 422,
    });
  }

  let userId = null;

  try {
    const { id } = await userService.updateUserByUserPhone(user);
    userId = id;
  } catch (e) {
    console.log(e);
  }

  if (!userId) {
    return null;
  }

  // Определяем terminalId:
  // - если заказ сделан через терминал самообслуживания, берём terminalId из orderData;
  // - иначе — получаем зону по zoneId и используем её terminal_id (или null, если зона не найдена).
  const terminalId = orderData.isSelfService
    ? orderData.terminalId
    : (await mapService.getZoneById(orderData.zoneId))?.terminal_id || null;

  const order = {
    userId,
    personsCount: orderData.personsCount,
    total: orderData.total,
    comment: orderData.comment,
    coupon,
    paymentType: orderData.payment,
    zoneId: orderData.zoneId,
    terminalId,
    isSelfService: orderData.isSelfService,
    addressId: orderData.addressId,
    status: 'NEW',
    spendBonus,
    deliveryDateTime: orderData.deliveryDateTime,
  };

  const { id: orderId } = await orderRepo.createOrder(order);

  const { basket } = orderData;

  await Promise.all(basket.map((basketItem) => saveBasketItems(basketItem, orderId)));

  const createdOrder = await buildOrder(orderId);
  if (orderData.payment !== 'ONL') {
    senderService.sendMessage(createdOrder)
      .then(() => { });
  }

  if (orderData.payment === 'ONL') {
    await setStatus(orderId, 'WAIT_PAYMENT');
  }

  eventEmitter.emit('order:create', data);

  return ({
    isOrderCreated: true,
    orderId: createdOrder.id,
  });
};

export const createOrderIikoAnswer = async (orderId, answer) => {
  const answerData = {
    orderId, answer,
  };
  return orderRepo.createOrderIikoAnswer(answerData);
};

export const getProductsInOrdersLastMonthGroupUser = async () => {
  try {
    return await orderRepo.getProductsInOrdersLastMonthGroupUser();
  } catch (e) {
    logger.log(e);
  }
};

export const getOrdersCountByCoupon = async (customerPhone, coupon) => {
  if (!coupon) { return 0; }
  if (typeof coupon !== 'string') { return 0; }
  try {
    const normalizedCoupon = coupon.toLowerCase();
    return await orderRepo.getOrdersCountByCoupon(customerPhone, normalizedCoupon);
  } catch (e) {
    logger.log(e);
  }
  return 0;
};

export const clearAllReceiptUrls = async () => {
  try {
    const affected = await orderRepo.clearAllReceiptUrls();
    return { success: true, affected };
  } catch (e) {
    throw e;
  }
};

// Словарь маппинга статусов на русский язык
export const statusTranslations = {
  Unconfirmed: 'Заказ не подтвержден',
  WaitCooking: 'Ожидает приготовления',
  ReadyForCooking: 'Готов к приготовлению',
  CookingStarted: 'Заказ готовится',
  CookingCompleted: 'Приготовление завершено',
  Waiting: 'Ожидает курьера',
  OnWay: 'В пути',
  OnWayCourier: 'Курьер в пути',
  CourierNearby: 'Курьер рядом',
  Delivered: 'Заказ доставлен',
  Closed: 'Заказ закрыт',
  Cancelled: 'Заказ отменен',
};

// Определение ключевых статусов для уведомлений
export const notifiableStatuses = ['OnWay'];

// Шаблоны уведомлений
export const notificationTemplates = {
  CookingCompleted: { title: 'Приготовление завершено', body: 'Заказ #{number}. Приготовление завершено.' },
  OnWay: { title: 'В пути', body: 'Заказ #{number}. В пути.' },
};

// Обновляем функцию обновления статуса заказа для работы с доставками
export const updateOrderStatus = async (statusData) => {
  try {
    // Вариант 1: Обработка в синхронном режиме
    if (process.env.ORDER_STATUS_SYNC === 'true') {
      return await processDeliveryStatusUpdate(statusData);
    }

    // Вариант 2: Асинхронная обработка через RabbitMQ
    await orderQueues.sendStatusUpdate(statusData);

    return {
      success: true,
      message: 'Запрос на обновление статуса доставки принят в обработку',
      data: {
        status: 'pending',
      },
    };
  } catch (e) {
    logger.log(e);
    if (e instanceof CustomError) {
      throw e;
    }
    throw new CustomError({
      message: 'Ошибка обновления статуса доставки',
      code: 'DELIVERY_STATUS_UPDATE_ERROR',
      statusCode: 500,
      data: { error: e.message },
    });
  }
};

export const processDeliveryStatusUpdate = async (statusData) => {
  const {
    id, number, phone: dirtyPhone, status,
  } = statusData;

  const phone = userHelper.normalizePhone(dirtyPhone);
  try {
    // 1. Найти доставку по различным критериям
    let delivery = null;

    // Ищем по iikoId (поле id из запроса)
    if (id) {
      delivery = await deliveryRepo.findDeliveryByIikoId(id);
    }

    // Если не найдено по iikoId, ищем по телефону
    if (!delivery && phone) {
      delivery = await deliveryRepo.findDeliveryByPhone(phone);
    }

    if (!delivery) {
      throw new CustomError({
        message: 'Доставка не найдена',
        code: 'DELIVERY_NOT_FOUND',
        statusCode: 404,
      });
    }

    // Обновляем number если он пришёл
    if (number) {
      await deliveryRepo.setDeliveryNumber(delivery.id, number);
    }
    // Обновляем id (на случай если iiko "лежала", когда создавался заказ и не вернула id)
    if (id) {
      await deliveryRepo.setDeliveryIikoId(delivery.id, id);
    }

    // 3. Обновляем статус доставки
    const { previousStatus } = await deliveryRepo.updateDeliveryStatus(
      delivery.id,
      status,
      statusData.courierInfo ? { courierInfo: statusData.courierInfo } : {},
    );

    // 4. Создаём запись в логе обновлений статусов
    orderRepo.createOrderStatusLog({
      orderId: delivery.order.id,
      phone,
      previousStatus,
      newStatus: status,
      source: 'COURIER_APP',
      rawData: JSON.stringify(statusData),
    }).catch((err) => {
      console.error('Failed to log order status change:', err);
    });

    // 5. Отправляем push-уведомление для ключевых статусов
    // требование заказчика: Приготовлен, высылаем пуш который стоял на c
    // ookingcompleted через 3 минуты после отправляем статус в пути + пуш
    if (notifiableStatuses.includes(status)) {
      await sendDeliveryStatusNotification(delivery.order, 'CookingCompleted');
      const THREE_MINUTES = 1000 * 60 * 3;
      setTimeout(async () => {
        await sendDeliveryStatusNotification(delivery.order, 'OnWay');
      }, THREE_MINUTES);
    }

    // 6. Отправляем WebSocket уведомление о смене статуса
    const wsMessage = {
      type: 'order:status_update',
      orderId: delivery.order.id,
      userId: delivery.order.userId,
      status,
      previousStatus,
      timestamp: new Date().toISOString(),
    };

    connectionManager.sendMessageToUser(delivery.order.user.phone, wsMessage);

    // 7. Отправляем событие об изменении статуса доставки
    eventEmitter.emit('delivery:status_change', {
      deliveryId: delivery.id,
      orderId: delivery.order.id,
      status,
      previousStatus,
      statusData,
    });

    return {
      success: true,
      message: 'Статус доставки успешно обновлен',
      data: {
        deliveryId: delivery.id,
        orderId: delivery.order.id,
        status,
      },
    };
  } catch (e) {
    logger.log(e);
    if (e instanceof CustomError) {
      throw e;
    }
    throw new CustomError({
      message: 'Ошибка обновления статуса доставки',
      code: 'DELIVERY_STATUS_UPDATE_ERROR',
      statusCode: 500,
      data: { error: e.message },
    });
  }
};

// Обновляем функцию отправки уведомлений для доставки
export async function sendDeliveryStatusNotification(order, status) {
  try {
    // Получаем шаблон уведомления
    const template = notificationTemplates[status];
    if (!template) {
      return null;
    }

    // Получаем информацию о доставке для получения номера доставки
    const delivery = await deliveryRepo.findDeliveryByOrderId(order.id);
    if (!delivery) {
      return null;
    }

    if (!order || !order.userId) {
      return null;
    }

    // Получаем устройства пользователя для отправки push-уведомлений
    const customerDevices = await notificationService.getCustomerDevices(order.userId);
    if (!customerDevices || customerDevices.length === 0) {
      return null;
    }

    // Форматируем сообщение с подстановкой номера доставки
    const { title } = template;
    const body = template.body.replace('{number}', delivery.number);

    // Получаем токены устройств
    const tokens = customerDevices.map((device) => device.FCMToken);

    // Отправляем push-уведомления
    return await notificationService.sendBulkNotifications(tokens, title, body, [order.userId]);
  } catch (e) {
    logger.log(e);
    return null;
  }
}

// Добавляем функцию для установки iikoId в доставку
export const setDeliveryIikoIdByOrderId = async (orderId, iikoId) => {
  try {
    await deliveryRepo.setDeliveryIikoIdByOrderId(orderId, iikoId);
  } catch (e) {
    throw e;
  }
};

// Добавляем функцию для получения информации о доставке
export const getDeliveryInfo = async (deliveryId) => {
  try {
    return await deliveryRepo.getDeliveryInfo(deliveryId);
  } catch (e) {
    throw e;
  }
};

// Добавляем функцию для получения доставки по заказу
export const getDeliveryByOrderId = async (orderId) => {
  try {
    return await deliveryRepo.findDeliveryByOrderId(orderId);
  } catch (e) {
    throw e;
  }
};
