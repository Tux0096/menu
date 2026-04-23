import { col, literal, Op } from 'sequelize';
import { sequelize } from '../db.js';
import initModels from '../models/init-models.js';

const models = initModels(sequelize);
const {
  Devices,
  Customers,
  Orders,
} = models;

export const addDevice = async (deviceData) => {
  const { customerId, deviceType = 'mobile' } = deviceData;

  const customer = await Customers.findByPk(customerId);
  if (!customer) {
    throw new Error(`Customer with id ${customerId} does not exist`);
  }

  const whereCondition = deviceType === 'web'
    ? { customerId, deviceType: 'web' }
    : { customerId };

  const [device, created] = await Devices.findOrCreate({
    where: whereCondition,
    defaults: deviceData,
  });

  if (!created) {
    await device.update(deviceData);
  }

  return device.get({ plain: true });
};

export const getTokensAll = () => Devices.findAll({
  attributes: ['FCMToken'],
  raw: true,
});

export const setLastMessageSentAtByFCMToken = async (tokens, date) => {
  if (!Array.isArray(tokens)) {
    throw new Error('tokens should be an array');
  }

  if (!(date instanceof Date) && typeof date !== 'string') {
    throw new Error('date should be a valid Date object or a date string');
  }

  return Devices.update(
    { lastMessageSentAt: date },
    {
      where: {
        FCMToken: {
          [Op.in]: tokens,
        },
      },
    },
  );
};

export const getCustomers = async (processedQueryData) => {
  const { filter } = processedQueryData;

  // Ограничение периода (12 месяцев)
  const periodMonths = 12;
  const periodCondition = `AND o.createdAt >= DATE_SUB(NOW(), INTERVAL ${periodMonths} MONTH)`;

  // Нужно ли включать продукты
  const includeOrderedProducts = filter?.orderedProducts
          && filter?.orderedProducts !== 'none'
          && filter?.orderedProducts.trim() !== '';

  const query = `
      SELECT
          d.id AS deviceId,
          d.FCMToken,
          d.lastMessageSentAt,
          c.id AS customerId,
          c.name AS fullName,
          c.birthday,
          odata.orderStatus,
          odata.lastZoneId AS lastOrderTerminalId,
          odata.isSelfService,
          odata.orderCount,
          odata.lastOrderDate,
          odata.averageCheck
              ${includeOrderedProducts ? ', odata.orderedProducts' : ''}
      FROM devices d
               INNER JOIN customers c ON c.id = d.customerId
               LEFT JOIN (
          SELECT
              o.userId,
              COUNT(*) AS orderCount,
              MAX(o.createdAt) AS lastOrderDate,
              ROUND(AVG(o.total), 2) AS averageCheck,
              SUBSTRING_INDEX(GROUP_CONCAT(o.status ORDER BY o.createdAt DESC), ',', 1) AS orderStatus,
              SUBSTRING_INDEX(GROUP_CONCAT(o.zoneId ORDER BY o.createdAt DESC), ',', 1) AS lastZoneId,
              SUBSTRING_INDEX(GROUP_CONCAT(o.isSelfService ORDER BY o.createdAt DESC), ',', 1) AS isSelfService
              ${
  includeOrderedProducts
    ? ', GROUP_CONCAT(DISTINCT op.iikoId ORDER BY op.iikoId ASC SEPARATOR ",") AS orderedProducts'
    : ''
}
          FROM orders o
              ${includeOrderedProducts ? 'LEFT JOIN order_products op ON op.orderId = o.id' : ''}
          WHERE 1=1 ${periodCondition}
          GROUP BY o.userId
      ) odata ON odata.userId = c.id
      ORDER BY d.id;
  `;

  const customers = await sequelize.query(query, {
    type: sequelize.QueryTypes.SELECT,
    raw: true,
  });

  return customers;
};

export const getCustomerDevices = async (customerId) => {
  try {
    const devices = await models.Devices.findAll({
      where: {
        customerId,
        FCMToken: {
          [Op.not]: null,
        },
      },
      raw: true,
    });
    return devices;
  } catch (e) {
    throw e;
  }
};

export const getTokensByPhoneNumbers = async (phoneNumbers) => {
  try {
    const results = await Devices.findAll({
      attributes: ['FCMToken'],
      include: [
        {
          model: Customers,
          as: 'customer',
          attributes: ['id', 'phone'],
          where: {
            phone: {
              [Op.in]: phoneNumbers,
            },
          },
          required: true,
        },
      ],
      where: {
        FCMToken: {
          [Op.not]: null,
        },
      },
      raw: true,
    });

    // Группируем по номерам телефонов для возврата найденных номеров
    const foundPhones = [...new Set(results.map((item) => item['customer.phone']))];
    const tokens = results.map((item) => item.FCMToken);
    const customerIds = [...new Set(results.map((item) => item['customer.id']))];

    return {
      foundPhones,
      tokens,
      customerIds,
    };
  } catch (e) {
    throw e;
  }
};
