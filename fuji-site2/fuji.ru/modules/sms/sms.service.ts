import * as smsApi from './sms.api';

export async function sendSms(phone: string) {
  const result = await smsApi
    .sendSms(phone);

  if (!result.success) {
    throw new Error('Возникла проблема при отправке смс. Попробуйте еще раз или свяжитесь с администратором.');
  }

  return result;
}

export async function verifySms(phone: string, code: string) {
  const res = await smsApi
    .verifySms(phone, code);

  if (!res.success) {
    throw new Error('Смс код введен не корректно.');
  }

  if (!res.token) {
    throw new Error('Проблема сервера. Попробуйте еще раз или свяжитесь с администратором.');
  }

  return res;
}
