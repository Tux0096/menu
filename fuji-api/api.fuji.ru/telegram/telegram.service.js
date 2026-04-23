import * as telegramRepo from './telegram.repository.js';

export const telegramCallback = (data = {}) => {
  try {
    const { message } = data;

    if (!message) {
      return null;
    }

    const telegramChatId = message?.from.id;

    const user = {
      telegramChatId: message.from.id,
      firstName: message.from?.first_name || '',
      lastName: message.from?.last_name || '',
      username: message.from?.username || '',
    };
    switch (message.text) {
      case '/start':
        createTelegramUser(user);
        break;

      case '/sendOrder':
        enableTelegramUser(telegramChatId);
        break;

      case '/stopOrder':
        disableTelegramUser(telegramChatId);
    }
  } catch (e) {
    console.log(e);
  }
};

export const createTelegramUser = (telegramChatId) => {
  telegramRepo.createTelegramUser(telegramChatId);
};

export const enableTelegramUser = (telegramChatId) => {
  telegramRepo.enableTelegramUser(telegramChatId);
};

export const disableTelegramUser = (telegramChatId) => {
  telegramRepo.disableTelegramUser(telegramChatId);
};
