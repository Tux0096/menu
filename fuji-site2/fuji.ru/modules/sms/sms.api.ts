import axios from 'axios';
import { nuxtInstance } from '~/plugins/nuxt-instance';
import { Response } from '~/types/common';
import { SendingSMSResponse, VerifySMSResponse } from './sms.type';

export async function sendSms(phone: string): Promise<SendingSMSResponse> {
  if (!nuxtInstance) {
    throw new Error('Не доступен экземпляр $nuxt');
  }

  const token = nuxtInstance.store.getters['setting/IS_WITHOUT_CAPTCHA']
    ? null
    : await nuxtInstance.$getResponseYandexCaptcha();

  try {
    const res: Response<SendingSMSResponse> = await axios.post(
      `${nuxtInstance.$config.FRONT_API_URL}/api/v1/sms/send-sms/${phone}`,
      {
        token,
        type: 'yandex',
      },
    );
    return res.data;
  } catch (error) {
    throw new Error(`Ошибка при отправке SMS: ${error.response?.data?.message || error.message}`);
  }
}

export async function verifySms(phone: string, code: string): Promise<VerifySMSResponse> {
  if (!nuxtInstance) {
    throw new Error('Не доступен экземпляр nuxtInstance');
  }

  try {
    const res: Response<VerifySMSResponse> = await axios.post(
      `${nuxtInstance.$config.FRONT_API_URL}/api/v1/sms/verify-sms`,
      { phone, code },
    );
    return res.data;
  } catch (error) {
    throw new Error(`Ошибка при верификации SMS: ${error.response?.data?.message || error.message}`);
  }
}
