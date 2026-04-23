import { Op, Sequelize } from 'sequelize';
import { sequelize } from '../db.js';
import initModels from '../models/init-models.js';

const models = initModels(sequelize);
const {
  Orders,
  Addresses,
  Customers,
  OrderProducts,
  OrderIikoAnswer,
  OrderProductModifiers,
  OrderStatusLogs,
  Deliveries,
} = models;

export const getOrdersAll = async ({
  page, filter, limit, order, offset,
}) => {
  const where = {};
  if (filter.zoneId) {
    where.zoneId = filter.zoneId;
  }

  const customerWhere = {};

  if (filter.phone?.length) {
    customerWhere.phone = {
      [Op.like]: `%${filter.phone}%`,
    };
  }

  const count = await Orders.count({
    where,
  });
  const orders = await Orders.findAll({
    where,
    include: [
      {
        model: Customers, as: 'user', where: customerWhere, required: true,
      }, {
        model: Addresses, as: 'address',
      }, {
        model: OrderProducts,
        as: 'orderProducts',
        include: [
          {
            model: OrderProductModifiers, as: 'orderProductModifiers',
          }],
      }],
    order,
    limit,
    offset,
  });

  return {
    items: orders,
    pagination: {
      currentPage: page,
      pageSize: limit,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
    },
  };
};
export const getOrderStatus = async (id) => await Orders.findOne({
  attributes: ['status'],
  where: {
    id,
  },
  raw: true,
});

export const createOrder = async (order) => {
  try {
    const transaction = await sequelize.transaction();

    try {
      // Создаём заказ
      const createdOrder = await Orders.create(order, { transaction });

      // Автоматически создаём запись о доставке для заказов на доставку
      if (!order.isSelfService) {
        // Получаем информацию о клиенте для добавления номера телефона
        const customer = await Customers.findByPk(order.userId, { transaction });

        await Deliveries.create({
          orderId: createdOrder.id,
          status: 'Unconfirmed',
          phone: customer?.phone,
        }, { transaction });
      }

      await transaction.commit();
      return createdOrder;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (e) {
    throw e;
  }
};

export const setStatus = async (id, status) => {
  try {
    await Orders.update({
      status,
    }, {
      where: { id },
    });
  } catch (e) {
    throw e;
  }
};

export const setIsTelegramSend = async (id, status) => {
  try {
    await Orders.update({
      isTelegramSend: status,
    }, {
      where: { id },
    });
  } catch (e) {
    throw e;
  }
};

export const setIsIikoSend = async (id, status) => {
  try {
    await Orders.update({
      isIikoSend: status,
    }, {
      where: { id },
    });
  } catch (e) {
    throw e;
  }
};

export const setIikoOrderId = async (id, iikoOrderId) => {
  try {
    await Orders.update({
      iikoOrderId,
    }, {
      where: { id },
    });
  } catch (e) {
    throw e;
  }
};

export const setReceiptUrl = async (id, receiptUrl) => {
  await Orders.update({
    receiptUrl,
  }, {
    where: { id },
  });
};

/**
 * Получение URL чеков по массиву iikoOrderId
 * @param {Array<string>} iikoOrderIds - массив ID заказов в системе iiko
 * @returns {Object} - объект где ключ = iikoOrderId, значение = receiptUrl
 */
export const getReceiptUrlsByIikoOrderIds = async (iikoOrderIds) => {
  try {
    if (!iikoOrderIds || iikoOrderIds.length === 0) {
      return {};
    }

    const orders = await Orders.findAll({
      where: {
        iikoOrderId: iikoOrderIds,
        receiptUrl: {
          [Op.ne]: null,
        },
      },
      attributes: ['iikoOrderId', 'receiptUrl'],
      raw: true,
    });

    // Преобразуем в объект для быстрого поиска
    const receiptUrlsMap = {};
    orders.forEach((order) => {
      receiptUrlsMap[order.iikoOrderId] = order.receiptUrl;
    });

    return receiptUrlsMap;
  } catch (e) {
    throw e;
  }
};

export const getOrder = async (id) => {
  try {
    return await Orders.findByPk(id, {

      include: [
        {
          model: OrderProducts,
          as: 'orderProducts',

          include: [
            {
              model: OrderProductModifiers, as: 'orderProductModifiers',
            }],
        }, {
          model: Customers, as: 'user',
        }, {
          model: Addresses, as: 'address',
        }],
    });
  } catch (e) {
    throw e;
  }
};

export const getOrderZoneId = async (orderId) => {
  const zoneIdData = await Orders.findByPk(orderId, {
    attributes: ['zoneId'],
    raw: true,
  });
  return zoneIdData.zoneId;
};

/**
 * Получение заказа по iikoOrderId
 * @param {string} iikoOrderId - ID заказа в системе iiko
 * @returns {Object|null} - Заказ или null
 */
export const getOrderByIikoOrderId = async (iikoOrderId) => {
  try {
    return await Orders.findOne({
      where: { iikoOrderId },
      include: [
        {
          model: OrderProducts,
          as: 'orderProducts',
          include: [
            {
              model: OrderProductModifiers, as: 'orderProductModifiers',
            }],
        }, {
          model: Customers, as: 'user',
        }, {
          model: Addresses, as: 'address',
        }],
    });
  } catch (e) {
    throw e;
  }
};

export const getUserLastOrder = async (userId) => {
  try {
    return await Orders.findOne({
      where: { userId },
      order: [
        ['id', 'DESC']],
      raw: true,
    });
  } catch (e) {
    throw e;
  }
};

export const createOrderItem = async (basketItem) => {
  try {
    return await OrderProducts.create(basketItem);
  } catch (e) {
    throw e;
  }
};

export const getOrderItem = async (orderId) => {
  try {
    return await OrderProducts.findAll({
      where: {
        orderId,
      },
      raw: true,
    });
  } catch (e) {
    throw e;
  }
};

export const createOrderProductModifier = async (mod) => {
  try {
    return await OrderProductModifiers.create(mod);
  } catch (e) {
    throw e;
  }
};

export const getOrderProductModifier = async (orderProductId) => {
  try {
    return await OrderProductModifiers.findAll({
      where: {
        orderProductId,
      },
    });
  } catch (e) {
    throw e;
  }
};

export const createOrderIikoAnswer = async (answerData) => {
  try {
    return await OrderIikoAnswer.create(answerData);
  } catch (e) {
    throw e;
  }
};

export const getProductsInOrdersLastMonthGroupUser = async () => Orders.findAll({
  where: {
    createdAt: {
      [Op.gt]: new Date(new Date().setMonth(new Date().getMonth()
        - 1)), // [Op.gt]: new Date(new Date().setDate(new Date().getDate() - 1)),
      // [Op.gt]: new Date(new Date().setHours(new Date().getHours() - 23)),
    },
  },
  attributes: [
    'userId', [
      Sequelize.fn('group_concat', Sequelize.col('orderProducts.iikoId')),
      'productsIds']],

  group: 'userId',
  include: [

    {
      model: OrderProducts, as: 'orderProducts', attributes: [],

    }],
  raw: true,

});

export const getOrdersCountByCoupon = async (customerPhone, coupon) => Customers.count({
  include: [
    {
      model: Orders,
      as: 'orders',
      where: {
        coupon: Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('coupon')), coupon.toLowerCase()),
      },
      required: true,
    }],
  where: {
    phone: customerPhone,
  },
  raw: true,
});

/**
 * Очищает все ссылки на чеки (receiptUrl) у всех заказов
 * @returns {number} - количество обновленных строк
 */
export const clearAllReceiptUrls = async () => {
  try {
    const [affectedCount] = await Orders.update({
      receiptUrl: null,
    }, {
      where: {
        receiptUrl: {
          [Op.ne]: null,
        },
      },
    });
    return affectedCount;
  } catch (e) {
    throw e;
  }
};

export const findOrderByExternalIdOrPhoneAndNumber = async (externalId, phone, number) => {
  try {
    // Поиск по externalId, если он передан
    if (externalId) {
      const orderByExternalId = await OrderIikoAnswer.findOne({
        where: {
          answer: { [Op.like]: `%${externalId}%` },
        },
        include: [
          {
            model: Orders,
            as: 'order',
          },
        ],
      });

      if (orderByExternalId?.order) {
        return orderByExternalId.order;
      }
    }

    // Поиск по телефону и номеру заказа
    const normalizedPhone = phone.replace(/\s+/g, '');

    return await Orders.findOne({
      include: [
        {
          model: Customers,
          as: 'user',
          where: {
            phone: { [Op.like]: `%${normalizedPhone}%` },
          },
        },
      ],
      where: {
        id: number,
      },
    });
  } catch (e) {
    throw e;
  }
};

export const updateOrderStatus = async (orderId, newStatus) => {
  try {
    // Получаем текущий статус заказа
    const currentOrder = await Orders.findByPk(orderId);
    const previousStatus = currentOrder.status;

    // Обновляем статус заказа
    await Orders.update({
      status: newStatus,
    }, {
      where: { id: orderId },
    });

    return { previousStatus, newStatus };
  } catch (e) {
    throw e;
  }
};

export const createOrderStatusLog = async (logData) => {
  try {
    return await OrderStatusLogs.create(logData);
  } catch (e) {
    throw e;
  }
};
