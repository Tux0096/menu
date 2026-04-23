import CLogger from '../lib/CLogger.js';
import { generateAccessToken } from '../lib/helpers.js';
import { sendErrorTelegram } from '../sender/sender.service.js';
import * as smsApi from './sms.api.js';
import * as userHelper from '../user/user.helper.js';
import * as smsRepo from './sms.repsitory.js';
import * as settingService from '../setting/setting.service.js';
import eventEmitter from '../services/EventEmitter.js';

const logger = new CLogger();
const TESTING_PHONE = '+79111111111';
const EXPIRY_TIME_SECONDS = 90;

const SMSUtils = {
  generateCode(isTest = false) {
    if (isTest) {
      const date = new Date();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return day + month;
    }
    return String(Math.floor(Math.random() * 9999)).padStart(4, '0');
  },

  calculateExpiryTime(seconds = EXPIRY_TIME_SECONDS) {
    const expiry = new Date();
    expiry.setSeconds(expiry.getSeconds() + seconds);
    return expiry;
  },
};

export const sendSMS = async (phone, forceSendSMS = false) => {
  if (!phone) {
    throw new Error('Phone number is required');
  }

  const normalPhone = userHelper.normalizePhone(phone);

  const IS_AUTH_WITHOUT_SMS = await settingService.getSettingByName('IS_AUTH_WITHOUT_SMS');
  if (IS_AUTH_WITHOUT_SMS && !forceSendSMS) {
    const token = generateAccessToken({
      phone: normalPhone,
    });
    return {
      success: true,
      token,
    };
  }

  const codeData = await smsRepo.getCodeByPhone(normalPhone);

  if (codeData) {
    return {
      success: true,
      expireAt: new Date(codeData.expireAt).getTime(),
      expireAtSeconds: Math.round((codeData.expireAt - new Date()) / 1000), //  task 2332
      message: 'Код уже был отправлен',
      code: 'SMS_CODE_ALREADY_SENT',
    };
  }

  const code = SMSUtils.generateCode(normalPhone === TESTING_PHONE);
  try {
    if (normalPhone !== TESTING_PHONE) {
      const message = `${code} - код для входа в ЛК fuji.ru ${code}`;

      const res = await smsApi.sendSMS(normalPhone, message);
      if (Object.hasOwn(res, 'error')) {
        logger.log(res.error);
        await sendErrorTelegram(`Проблема отправки смс у клиента ${normalPhone} на стороне SMSC.RU\n ${res.error}`);
        return {
          success: false,
          error: 'Ошибка при отправке смс',
        };
      }
    }

    const expireAt = SMSUtils.calculateExpiryTime();
    const expireAtSeconds = Math.round((expireAt - new Date()) / 1000); // task 2332

    await smsRepo.saveCode({
      code,
      phone: normalPhone,
      expireAt,
    });

    return {
      success: true,
      expireAt: expireAt.getTime(),
      expireAtSeconds,
    };
  } catch (e) {
    logger.log(`sms.service.js:sendSMS ${normalPhone}`);
    logger.log(e);
    await sendErrorTelegram(`Проблема отправки смс у клиента ${normalPhone} на стороне сервера\n ${e.message}`);
    return {
      success: false,
      error: 'An error occurred',
    };
  }
};

export const verifySMS = async (phone, code) => {
  const normalPhone = userHelper.normalizePhone(phone);
  try {
    const codeData = await smsRepo.getCodeByPhone(normalPhone);
    if (!codeData) {
      return {
        success: false,
        error: 'Код не найден',
      };
    }
    if (codeData.code !== code) {
      return {
        success: false,
        error: 'Не правильный код',
      };
    }

    const token = generateAccessToken({
      phone: normalPhone,
    });

    eventEmitter.emit('user:auth', { phone: normalPhone });

    return {
      success: true,
      token,
    };
  } catch (e) {
    logger.log(`sms.service.js:verifySMS ${normalPhone}`);
    logger.log(e);
    return {
      success: false,
      error: 'An error occurred during verification',
    };
  }
};
