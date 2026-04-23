import * as crypto from 'crypto';

import { Op, Sequelize } from 'sequelize';

import initModels from '../models/init-models.js';
import { sequelize } from '../db.js';

const models = initModels(sequelize);
const {
  Customers,
  Streets,
  Orders,
  Cities,
  Deliveries,
} = models;

export const getUserByPhone = async (phone) => await Customers.findOne({
  where: { phone },
});

export const createUser = async (user) => {
  user.id = crypto.randomUUID();

  const createdUser = await Customers.create(user);
  return createdUser.get({ plain: true });
};

export const updateUserByUserPhone = async (user) => {
  const userModel = await Customers.findOne({ where: { phone: user.phone } });
  // await userModel.update(user)
  Object.assign(userModel, user);
  await userModel.save();
  return userModel;
};

export const getUsers = async (page = 1) => {
  const limit = 50;
  const offset = (page - 1) * limit;

  const count = await Customers.count({ where: {} });

  const users = await Customers.findAll({
    attributes: {
      include: [
        [Sequelize.fn('SUM', Sequelize.col('orders.total')), 'sum'],
        [Sequelize.fn('COUNT', Sequelize.col('orders.id')), 'count'],
      ],
    },
    include: [
      {
        model: Orders,
        as: 'orders',
        attributes: [],
        required: false,
      },
    ],
    group: ['Customers.id'],
    order: [['id', 'DESC']],
    subQuery: false,
    raw: true,
    limit,
    offset,

  });

  return {
    items: users,
    pagination: {
      currentPage: page,
      pageSize: limit,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
    },
  };
};

export const updateUser = async (user) => await Customers.update(user, {
  where: {
    phone: user.phone,
  },
});

export const getUsersWithOrdersToday = async () => {
  const users = await Customers.findAll({
    attributes: [
      'id',
      'name',
      'phone',
      'birthday',
      [Sequelize.fn('sum', Sequelize.col('total')), 'sum'],
      [Sequelize.fn('count', Sequelize.col('orders.id')), 'count'],
    ],
    group: ['id'],
    include: [
      {
        model: Orders,
        as: 'orders',
        required: false,
        attributes: [],
        where: {
          createdAt: {
            [Op.gte]: new Date().setHours(0, 0, 0, 0),
            [Op.lte]: new Date().setHours(23, 59, 59, 999),
          },
        },
      },
    ],

  });

  return users.map((u) => u.get({ plain: true }));
};

/**
 * Получение активного заказа пользователя
 * Активным считается заказ с доставкой в статусе, отличном от завершенных
 */
export const getUserActiveOrder = async (userId) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const activeOrder = await Orders.findOne({
      where: {
        userId,
        isSelfService: false,
        status: {
          [Op.in]: ['NEW', 'WAIT_PAYMENT', 'PAYED'],
        },
        [Op.or]: [
          // Обычные заказы (без deliveryDateTime) - только за сегодня
          {
            deliveryDateTime: null,
            createdAt: {
              [Op.gte]: todayStart,
            },
          },
          // Предзаказы - на сегодня или будущее
          {
            deliveryDateTime: {
              [Op.gte]: todayStart,
            },
          },
        ],
      },
      include: [
        {
          model: Deliveries,
          as: 'delivery',
          attributes: ['id', 'number', 'phone', 'status', 'estimatedDeliveryTime', 'courierInfo', 'iikoId', 'externalId'],
          where: {
            status: {
              [Op.notIn]: ['Closed', 'Cancelled'],
            },
          },
          required: true, // Обязательно наличие доставки
        },
      ],
      attributes: ['id', 'userId', 'total', 'status', 'createdAt', 'deliveryDateTime'],
      order: [
        // Сначала предзаказы по deliveryDateTime, потом обычные по createdAt
        [sequelize.fn('ISNULL', sequelize.col('deliveryDateTime')), 'ASC'],
        ['deliveryDateTime', 'ASC'],
        ['createdAt', 'DESC'],
      ],
      raw: false,
    });

    if (!activeOrder) {
      return null;
    }
    return activeOrder.get({ plain: true });
  } catch (error) {
    throw error;
  }
};
