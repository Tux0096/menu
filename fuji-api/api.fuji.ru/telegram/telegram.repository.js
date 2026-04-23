import initModels from '../models/init-models.js';
import { sequelize } from '../db.js';

const models = initModels(sequelize);
const {
  TelegramUsers,
} = models;

export const createTelegramUser = async (user) => {
  await TelegramUsers.findOrCreate({
    where: {
      telegramChatId: user.telegramChatId,

    },
    defaults: {
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
    },
  });
};

export const enableTelegramUser = async (telegramChatId) => {
  await TelegramUsers.update(
    {
      isSendOrder: true,
    },
    {
      where: {
        telegramChatId,
      },
    },
  );
};

export const disableTelegramUser = async (telegramChatId) => {
  await TelegramUsers.update(
    {
      isSendOrder: false,
    },
    {
      where: {
        telegramChatId,
      },
    },
  );
};
