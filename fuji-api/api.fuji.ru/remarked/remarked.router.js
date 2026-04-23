import basicAuthMiddleware from '../middleware/basic-auth.middleware.js';
import * as notificationService from '../notification/notification.service.js';
import { bulkSendRemarkedSchema } from './remarked.schema.js';
import CLogger from '../lib/CLogger.js';

const logger = new CLogger();

export default (fastify, opts, done) => {
  // API для ремаркета - массовая отправка push-сообщений по номерам телефонов
  fastify.post('/push-messages/bulk-send', {
    schema: bulkSendRemarkedSchema,
    preValidation: [basicAuthMiddleware('remarked')],
  }, async (request, reply) => {
    try {
      const { phone_numbers, title, text } = request.body;

      logger.log('Remarked API: Получен запрос на массовую отправку push', {
        phoneCount: phone_numbers.length,
        title,
        clientId: request.basicAuth?.clientId,
        clientName: request.basicAuth?.clientName,
      });

      const result = await notificationService.sendBulkNotificationsByPhoneNumbers(
        phone_numbers,
        title,
        text,
      );

      logger.log('Remarked API: Отправка инициирована', {
        foundPhonesCount: result.phone_numbers.length,
        requestedCount: phone_numbers.length,
      });

      reply.code(200).send(result);
    } catch (error) {
      logger.log('Remarked API: Ошибка при отправке push-уведомлений', {
        error: error.message,
        stack: error.stack,
      });

      reply.code(500).send({
        message: 'Внутренняя ошибка сервера',
        code: 'INTERNAL_SERVER_ERROR',
        description: 'Произошла ошибка при отправке push-уведомлений.',
      });
    }
  });

  done();
};
