import { Op, Sequelize } from 'sequelize';
import { sequelize } from '../db.js';
import initModels from '../models/init-models.js';

const models = initModels(sequelize);
const { Deliveries, Orders, Customers } = models;

/**
 * Создание записи о доставке
 */
export const createDelivery = async (deliveryData) => {
  try {
    return await Deliveries.create(deliveryData);
  } catch (e) {
    throw e;
  }
};

/**
 * Поиск доставки по ID заказа
 */
export const findDeliveryByOrderId = async (orderId) => {
  try {
    return await Deliveries.findOne({
      where: { orderId },
      include: [
        {
          model: Orders,
          as: 'order',
          include: [
            {
              model: Customers,
              as: 'user',
            },
          ],
        },
      ],
    });
  } catch (e) {
    throw e;
  }
};

/**
 * Поиск доставки по iikoId
 */
export const findDeliveryByIikoId = async (iikoId) => {
  try {
    return await Deliveries.findOne({
      where: { iikoId },
      include: [
        {
          model: Orders,
          as: 'order',
          include: [
            {
              model: Customers,
              as: 'user',
            },
          ],
        },
      ],
    });
  } catch (e) {
    throw e;
  }
};

/**
 * Поиск доставки по externalId
 */
export const findDeliveryByExternalId = async (externalId) => {
  try {
    return await Deliveries.findOne({
      where: { externalId },
      include: [
        {
          model: Orders,
          as: 'order',
          include: [
            {
              model: Customers,
              as: 'user',
            },
          ],
        },
      ],
    });
  } catch (e) {
    throw e;
  }
};

/**
 * Поиск доставки по телефону клиента и номеру заказа
 */
export const findDeliveryByPhone = async (phone) => {
  try {
    return await Deliveries.findOne({
      where: { phone, iikoId: null },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Orders,
          as: 'order',
          include: [
            {
              model: Customers,
              as: 'user',
            },
          ],
        },
      ],
    });
  } catch (e) {
    console.log(e);
    throw e;
  }
};

/**
 * Обновление статуса доставки
 */
export const updateDeliveryStatus = async (deliveryId, newStatus, additionalData = {}) => {
  try {
    const currentDelivery = await Deliveries.findByPk(deliveryId);
    const previousStatus = currentDelivery.status;

    const updateData = {
      status: newStatus,
      ...additionalData,
    };

    // Устанавливаем время доставки при статусе "Delivered"
    if (newStatus === 'Delivered') {
      updateData.actualDeliveryTime = new Date();
    }

    await Deliveries.update(updateData, {
      where: { id: deliveryId },
    });

    return { previousStatus, newStatus };
  } catch (e) {
    throw e;
  }
};

/**
 * Обновление iikoId для доставки
 */
export const setDeliveryIikoIdByOrderId = async (orderId, iikoId) => {
  try {
    await Deliveries.update(
      { iikoId },
      { where: { orderId } },
    );
  } catch (e) {
    throw e;
  }
};

export const setDeliveryNumber = async (id, number) => {
  try {
    await Deliveries.update(
      { number },
      { where: { id } },
    );
  } catch (e) {
    console.log(e);
    throw e;
  }
};

export const setDeliveryIikoId = async (id, iikoId) => {
  try {
    await Deliveries.update(
      { iikoId },
      { where: { id } },
    );
  } catch (e) {
    console.log(e);
    throw e;
  }
};

/**
 * Получение информации о доставке
 */
export const getDeliveryInfo = async (deliveryId) => {
  try {
    return await Deliveries.findByPk(deliveryId, {
      include: [
        {
          model: Orders,
          as: 'order',
          include: [
            {
              model: Customers,
              as: 'user',
            },
          ],
        },
      ],
    });
  } catch (e) {
    throw e;
  }
};
