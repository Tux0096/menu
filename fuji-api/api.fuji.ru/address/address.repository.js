import initModels from '../models/init-models.js';
import { sequelize } from '../db.js';
import CLogger from '../lib/CLogger.js';

const logger = new CLogger();

const models = initModels(sequelize);
const {
  Addresses,
} = models;

export const getAddresses = async () => {
  try {
    return await Addresses.findAll({
      where: {
        isDeleted: false,
      },
    });
  } catch (e) {
    logger.log(e);
    throw e;
  }
};

export const getAddressesByUserId = async (userId) => {
  try {
    return await Addresses.findAll({
      where: {
        userId,
        isDeleted: false,
      },
      raw: true,
    });
  } catch (e) {
    logger.log(e);
    throw e;
  }
};

export const getAddressById = async (id) => {
  try {
    return await Addresses.findByPk(id);
  } catch (e) {
    logger.log(e);
    throw e;
  }
};

export const createAddress = async (address) => {
  try {
    const foundAddress = await Addresses.findOne({
      where: {
        ...address,
        isDeleted: false,
      },
    });

    if (foundAddress) {
      return foundAddress;
    }

    return await Addresses.create(address);
  } catch (e) {
    logger.log(e);
    throw e;
  }
};

export const updateAddress = async (id, address) => {
  try {
    await Addresses.update({
      ...address,
    }, {
      where: {
        id,
      },
    });

    return getAddressById(id);
  } catch (e) {
    logger.log(e);
    throw e;
  }
};

export const deleteAddress = async (id) => {
  try {
    await Addresses.update({
      isDeleted: true,
    }, {
      where: {
        id,
      },
    });
  } catch (e) {
    logger.log(e);
    throw e;
  }
};

export const deleteAllAddressesByUserId = async (userId) => {
  try {
    return Addresses
      .update({ isDeleted: true }, {
        where: { userId },
      });
  } catch (e) {
    logger.log(e);
    throw e;
  }
};
