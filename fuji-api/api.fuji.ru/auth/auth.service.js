import * as userHelper from '../user/user.helper.js';
import * as smsService from '../sms/sms.service.js';
import { generateAccessToken } from '../lib/helpers.js';

const ALLOW_PHONES = [
  '+79601915575',
  '+79297062169',
  '+79171430800',
  '+79377986252',
  '+79119245039',
  '+79200272716',
  '+79033138295',
  '+79214380044',
  '+79111111111',
];

export const sendSMS = async (phone) => {
  if (!phone) {
    throw new Error('Phone number is required');
  }
  const normalPhone = userHelper.normalizePhone(phone);

  if (!ALLOW_PHONES.includes(normalPhone)) {
    throw new Error('Данный номер телефона не разрешен для входа в админку!!!');
  }

  return smsService.sendSMS(normalPhone, true);
};

export const processSMS = async (phone, code) => {
  if (!phone) {
    throw new Error('Phone number is required');
  }

  if (!code) {
    throw new Error('Code number is required');
  }

  // TODO: verifySMS должен только проверять смс, вынести из нее генерацию токена
  // пока такой костыль
  const isCodeValid = await smsService.verifySMS(phone, code);
  if (isCodeValid.success) {
    const roles = [
      'user',
      'admin',
    ];
    return { token: generateAccessToken({ phone }, roles) };
  }
  return isCodeValid;
};
