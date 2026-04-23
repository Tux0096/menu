import createError from 'http-errors';
import CLogger from '../lib/CLogger.js';
import * as userHelper from './user.helper.js';
import * as userRepo from './user.repository.js';
import * as orderService from '../order/order.service.js';
import { createOrUpdateCustomer } from '../iiko/iiko.service.js';
import {
  isValidEmail,
  validateBirthdayFormat,
} from '../lib/helpers.js';
import { ValidationError } from '../errors/ValidationError.js';
import { CITIES_DATA } from '../setting/config/common.js';
import { getProductById } from '../catalog/catalog.service.js';
import * as addressService from '../address/address.service.js';
import * as likeService from '../like/like.service.js';
import eventEmitter from '../services/EventEmitter.js';

const logger = new CLogger();

const enablePUSHNotifications = (phone) => {
  const updatingUser = {
    phone,
    PUSHNotifications: true,
    receiveAdvertisingInformation: true,
  };
  userRepo.updateUserByUserPhone(updatingUser).then();
};
const onUserAuth = (data) => {
  if (!data.phone) { return; }

  const { phone } = data;

  const normalizedPhone = userHelper.normalizePhone(phone);
  enablePUSHNotifications(normalizedPhone);
};

export const getUserByPhone = async (phone) => {
  const normalPhone = userHelper.normalizePhone(phone);
  try {
    return await userRepo.getUserByPhone(normalPhone);
  } catch (e) {
    logger.log(e);
  }
};

export const getUser = async (phone) => {
  const user = await getUserByPhone(phone);
  if (!user) {
    throw createError(404, 'User not found');
  }
  return user;
};

export const createUser = async (user) => {
  if (!user.phone?.length) {
    throw new Error('Phone is required');
  }
  const preparedUser = {
    phone: userHelper.normalizePhone(user.phone),
    name: user.name ?? 'Гость',
  };

  return userRepo.createUser(preparedUser);
};

export const deleteUser = async (phone) => {
  if (!phone?.length) {
    throw new Error('Phone is required');
  }

  try {
    const normalizedPhone = userHelper.normalizePhone(phone);
    const user = await getUserByPhone(normalizedPhone);
    user.name = 'Гость';
    user.birthday = new Date();
    user.email = '';
    user.save();
    await addressService.deleteAllAddressesByUserId(user.id);
    await likeService.deleteAllLikesByUserId(user.id);
    return true;
  } catch (e) {
    logger.log(e);
    throw e;
  }
};

const validateUser = (user) => {
  if (!user.phone?.length) {
    throw new ValidationError('Телефон обязателен');
  }
  if (user.email && !isValidEmail(user.email)) {
    throw new ValidationError('Не правильный формат электронной почты');
  }

  if (user.gender && !['male', 'female'].includes(user.gender)) {
    throw new ValidationError('Не правильный пол');
  }

  if (user.birthday) {
    validateBirthdayFormat(user.birthday);
  }
};
export const updateUser = async (user) => {
  try {
    validateUser(user);

    const preparedUser = {
      phone: userHelper.normalizePhone(user.phone),
      name: user.name ?? 'Гость',
      personalData: user.personalData ?? false,
      PUSHNotifications: user.PUSHNotifications ?? false,
      receiveAdvertisingInformation: user.receiveAdvertisingInformation ?? false,

    };

    if (user.email) {
      preparedUser.email = user.email;
    }
    if (user.gender) {
      preparedUser.gender = user.gender;
    }
    if (user.birthday) {
      preparedUser.birthday = user.birthday;
    }

    await createOrUpdateCustomer(preparedUser);
    return await userRepo.updateUser(preparedUser);
  } catch (e) {
    logger.log(e);
    throw e;
  }
};

export const updateUserByUserPhone = async (user) => {
  try {
    user.phone = userHelper.normalizePhone(user.phone);
    return await userRepo.updateUserByUserPhone(user);
  } catch (e) {
    logger.log(e);
  }
};

export const getUsers = async (page) => {
  const users = await userRepo.getUsers(Number(page));
  users.items.sort((a, b) => b.createdAt - a.createdAt);
  return users;
};
export const getUsersWithOrdersToday = async () => await userRepo.getUsersWithOrdersToday();

export const getUserLastOrder = async (userId) => {
  const getDeliveryIds = () => Object.values(CITIES_DATA)
    .map((c) => c.deliveryId);

  const lastOrder = await orderService.getUserLastOrder(userId);
  if (!lastOrder) { return null; }

  return {
    ...lastOrder,
    products: lastOrder.products.filter((lastOrderProduct) => {
      const {
        productId, isGift, mods: modsLastOrder, amount, name: productName, isAction,
      } = lastOrderProduct;

      if (isAction) {
        return false;
      }

      // remove gifts
      if (isGift) { return false; }

      // remove deliveries
      const deliveriesIds = getDeliveryIds();
      if (deliveriesIds.includes(productId)) { return false; }

      const product = getProductById(productId);

      if (product.price === 0) { return false; }

      return true;
    }),
  };
};

/**
 * Получение активного заказа пользователя
 * Активным считается заказ со статусом доставки, отличным от завершенных
 */
export const getUserActiveOrder = async (userId) => {
  try {
    const activeOrder = await userRepo.getUserActiveOrder(userId);

    if (!activeOrder) {
      return null;
    }

    // Форматируем данные для фронтенда
    return {
      id: activeOrder.id,
      userId: activeOrder.userId,
      total: activeOrder.total,
      status: activeOrder.status,
      createdAt: activeOrder.createdAt,
      delivery: activeOrder.delivery ? {
        id: activeOrder.delivery.id,
        number: activeOrder.delivery.number,
        status: activeOrder.delivery.status,
        estimatedDeliveryTime: activeOrder.delivery.estimatedDeliveryTime,
        courierInfo: activeOrder.delivery.courierInfo,
        iikoId: activeOrder.delivery.iikoId,
        externalId: activeOrder.delivery.externalId,
      } : null,
    };
  } catch (error) {
    logger.log('Ошибка получения активного заказа:', error);
    throw error;
  }
};

eventEmitter.on('user:auth', onUserAuth);
