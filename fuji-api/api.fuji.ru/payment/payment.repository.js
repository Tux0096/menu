import { sequelize } from '../db.js';
import initModels from '../models/init-models.js';

const models = initModels(sequelize);
const {
  Sberbank,
  OrderSberbank,
  PaymentTypes,
} = models;

export const getSberbankAuth = async (zoneId = 0) => {
  try {
    return await Sberbank.findOne({
      where: {
        zoneId,
      },
    });
  } catch (e) {
    throw e;
  }
};

export const createOrderSberbank = async (orderSberbank) => {
  try {
    await OrderSberbank.create(orderSberbank);
  } catch (e) {
    throw e;
  }
};

export const updateOrderSberbank = async (orderSberbank) => {
  try {
    return await OrderSberbank.update(orderSberbank, {
      where: {
        orderId: orderSberbank.orderId,
      },
    });
  } catch (e) {
    throw e;
  }
};

export const getOrderId = async (sberbankOrderId) => {
  try {
    return await OrderSberbank.findOne({
      where: {
        sberbankOrderId,
      },
      attributes: [
        'orderId',
      ],
    });
  } catch (e) {
    throw e;
  }
};

export const getPayments = async () => {
  try {
    return await PaymentTypes.findAll({
      raw: true,
      nested: true,
    });
  } catch (e) {
    throw e;
  }
};

export const createPayments = async (payments) => {
  try {
    return await PaymentTypes.bulkCreate(payments, {
      updateOnDuplicate: [...Object.keys(payments[0])],
    });
  } catch (e) {
    throw e;
  }
};

export const getPaymentByCode = (code) => {
  try {
    return PaymentTypes.findOne({
      where: {
        code,
      },
      raw: true,
    });
  } catch (e) {
    throw e;
  }
};

export const getPaymentById = (id) => {
  try {
    return PaymentTypes.findOne({
      where: {
        id,
      },
      raw: true,
    });
  } catch (e) {
    throw e;
  }
};

export const getPaymentData = async (orderId) => {
  try {
    return await OrderSberbank.findOne({
      where: {
        orderId,
      },
      raw: true,

    });
  } catch (e) {
    throw e;
  }
};
