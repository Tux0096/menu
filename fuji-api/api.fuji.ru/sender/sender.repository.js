import initModels from '../models/init-models.js';
import { sequelize } from '../db.js';

const models = initModels(sequelize);
const { TelegramUsers } = models;

export const getUsersToSend = async () => {
  try {
    return await TelegramUsers.findAll({
      where: {
        isSendOrder: true,
      },
    });
  } catch (e) {
    throw e;
  }
};
