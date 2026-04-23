import { checkCaptcha } from '../lib/helpers.js';
import * as smsService from './sms.service.js';
import { getSettingByName } from '../setting/setting.service.js';
import { sendSMSSchema, verifySMSSchema } from './sms.schema.js';
import CLogger from '../lib/CLogger.js';

const logger = new CLogger();

/**
 * Роутер для работы с SMS
 * @param {import('fastify').FastifyInstance} fastify
 * @param {object} opts
 * @param {Function} done
 */
export default (fastify, opts, done) => {
  /**
   * Маршрут для отправки SMS
   * @route POST /send-sms/:phone
   * @param {string} phone - Номер телефона в формате E.164
   * @param {object} body - Тело запроса с токеном и типом
   * @returns {object} - Результат отправки SMS
   */
  fastify.post(
    '/send-sms/:phone',
    {
      schema: { hide: true },
    },
    async (request, reply) => {
      const { token, type } = request.body;
      const { phone } = request.params;

      try {
        const IS_WITHOUT_RECAPTCHA = await getSettingByName('IS_WITHOUT_RECAPTCHA');
        await checkCaptcha(token, type, IS_WITHOUT_RECAPTCHA);

        const result = await smsService.sendSMS(phone);
        return reply.code(result.success ? 200 : 500).send(result);
      } catch (e) {
        logger.log(`Ошибка при отправке SMS на ${phone}:`, e);
        return reply.code(400).send({
          success: false,
          message: 'Некорректный captcha или ошибка при отправке SMS',
        });
      }
    },
  );

  /**
   * Маршрут для верификации SMS кода
   * @route POST /verify-sms
   * @param {object} body - Тело запроса с номером телефона и кодом подтверждения
   * @returns {object} - Результат верификации кода
   */
  fastify.post(
    '/verify-sms',
    {
      schema: { hide: true },
    },
    async (request, reply) => {
      const { phone, code } = request.body;

      try {
        const verifyData = await smsService.verifySMS(phone, code);

        if (verifyData.success) {
          return reply.code(200).send(verifyData);
        }
        return reply.code(401).send(verifyData);
      } catch (e) {
        logger.log(`Ошибка при верификации SMS для ${phone}:`, e);
        return reply.code(500).send({
          success: false,
          error: 'Внутренняя ошибка сервера',
        });
      }
    },
  );

  done();
};
