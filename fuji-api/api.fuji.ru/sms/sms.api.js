import axios from 'axios';
import { getStorage } from '../storage/storage.service.js';
import CLogger from '../lib/CLogger.js';

const logger = new CLogger();

const buildSMSData = async (phone, message, sender) => {
  const { smsUser, smsPassword } = await getStorage();
  return {
    login: smsUser,
    psw: smsPassword,
    phones: phone,
    mes: message,
    sender,
    fmt: 3,
  };
};

const sendSMSRequest = async (dataForSending) => {
  try {
    const { data } = await axios.get('https://smsc.ru/sys/send.php', {
      params: dataForSending,
    });
    return data;
  } catch (error) {
    logger.log('Ошибка при отправке SMS:', error);
    throw error;
  }
};

export const sendSMS = async (phone, message, sender = 'fuji') => {
  const dataForSending = await buildSMSData(phone, message, sender);
  return sendSMSRequest(dataForSending);
};
