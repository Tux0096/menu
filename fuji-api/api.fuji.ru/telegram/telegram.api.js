import axios from 'axios';
import * as senderRepo from '../sender/sender.repository.js';

import * as storageService from '../storage/storage.service.js';

export const sendMessageTelegram = async (telegramApiKey, telegramChatId, message) => {
  const telegramBotUrl = `https://api.telegram.org/bot${telegramApiKey}/sendMessage`;

  try {
    const { data } = await axios.get(telegramBotUrl, {
      params: {
        chat_id: telegramChatId,
        text: message,
        parse_mode: 'html',
        disable_web_page_preview: false,
        reply_to_message_id: null,
        reply_markup: null,
      },
    });
    return data;
  } catch (e) {
    console.log(`Проблемы с телегой. Чат ${telegramChatId} \n${e}`);
  }
};

export const sendMessageAllTelegramUsers = async (message) => {
  try {
    const telegramApiKey = await storageService.getTekegramApiKey();
    const telegramUsers = await senderRepo.getUsersToSend();
    await Promise.all(
      telegramUsers.map((user) => sendMessageTelegram(telegramApiKey, user.telegramChatId, message)),
    );
  } catch (e) {
    console.log('Проблемы с телегой');
  }
};
