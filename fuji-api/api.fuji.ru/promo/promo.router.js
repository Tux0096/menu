import authMiddleware from '../middleware/auth.middleware.js';
import * as promoService from './promo.service.js';
import CustomError from '../errors/CustomError.js';
import {
  getPromocodesSchema,
  addPromocodeSchema,
  updatePromocodeSchema,
  deletePromocodeSchema,
  deletePromoBannerSchema,
  getPromocodeBannersSchema,
} from './promo.schema.js';

export default (fastify, opts, done) => {
  fastify.get(
    '/',
    {
      preValidation: authMiddleware(['admin', 'user']),
      schema: getPromocodesSchema,
    },
    async (request, reply) => {
      try {
        // Отладочный вывод параметров запроса
        console.log('Request query params:', request.query);

        // Если передан ID пользователя, учитываем сегменты
        const { userId } = request.query;
        console.log('Extracted userId:', userId);

        let promocodes;

        if (userId) {
          // Не преобразуем userId в число, так как в модели он CHAR(36)
          promocodes = await promoService.getUserAvailablePromocodes(userId);
        } else {
          // Стандартное поведение - получаем все промокоды (для админки)
          promocodes = await promoService.getPromocodes();
        }

        return reply.send(promocodes);
      } catch (e) {
        console.log(e);
        if (e instanceof CustomError) {
          return reply.code(e.data.statusCode).send(e.data);
        }
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  fastify.get(
    '/:id',
    {
      preValidation: authMiddleware(['admin', 'user']),
    },
    async (request, reply) => {
      const { id } = request.params;
      try {
        const promoData = await promoService.getPromocode(id);
        return reply.code(201).send(promoData);
      } catch (e) {
        if (e instanceof CustomError) {
          return reply.code(e.data.statusCode).send(e.data);
        }
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  // Проверить промокод
  fastify.post(
    '/',
    {
      preValidation: authMiddleware(['user']),
      schema: { hide: true },
    },
    async (request, reply) => {
      try {
        const { customer } = request.body;

        if (customer && !customer.id && request.user && request.user.id) {
          request.body.customer.id = request.user.id;
        }

        const promoData = await promoService.getPromoData(request.body);

        return reply.send(promoData);
      } catch (e) {
        console.error('Ошибка при проверке промокода:', e);
        if (e instanceof CustomError) {
          return reply.code(e.data.statusCode).send(e.data);
        }
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  fastify.post(
    '/add',
    {
      preValidation: authMiddleware(['admin']),
      schema: addPromocodeSchema,
    },
    async (request, reply) => {
      try {
        if (request.body.segmentFilter) {
          request.body.segmentFilter = JSON.stringify(request.body.segmentFilter); // костыль
        }
        const promoData = await promoService.addPromocode(request.body);

        return reply.code(201).send(promoData);
      } catch (e) {
        if (e instanceof CustomError) {
          return reply.code(e.data.statusCode).send(e.data);
        }
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  fastify.patch(
    '/:id',
    {
      preValidation: authMiddleware(['admin']),
      schema: updatePromocodeSchema,
    },
    async (request, reply) => {
      const { id } = request.params;

      try {
        if (request.body.segmentFilter) {
          request.body.segmentFilter = JSON.stringify(request.body.segmentFilter); // костыль
        }
        const promoData = await promoService.updatePromocode(id, request.body);
        return reply.code(201).send(promoData);
      } catch (e) {
        console.log(e);
        if (e instanceof CustomError) {
          return reply.code(e.data.statusCode).send(e.data);
        }
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  // Удалить промокод
  fastify.delete(
    '/:id',
    {
      preValidation: authMiddleware(['admin']),
      schema: deletePromocodeSchema,
    },
    async (request, reply) => {
      const { id } = request.params;
      try {
        await promoService.deletePromocode(id);
        return reply.code(201).send({
          message: 'Промокод успешно удален',
        });
      } catch (e) {
        if (e instanceof CustomError) {
          return reply.code(e.data.statusCode).send(e.data);
        }
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  // Загрузить баннер для промокода
  fastify.post(
    '/:id/banner/:type',
    {
      preValidation: authMiddleware(['admin']),
    },
    async (request, reply) => {
      const file = await request.file(); // получаем файл через fastify-multipart
      const { id, type } = request.params;

      if (!file) {
        throw new CustomError({
          message: 'Файл не загружен',
          code: 'FILE_NOT_UPLOADED',
          statusCode: 400,
        });
      }

      const fileData = {
        filename: file.filename,
        file: file.file, // это Readable stream
      };

      try {
        const result = await promoService.uploadPromoBanner(Number(id), type, fileData);
        return reply.code(201).send(result);
      } catch (e) {
        if (e instanceof CustomError) {
          return reply.code(e.data.statusCode).send(e.data);
        }
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  // Удалить баннер промокода
  fastify.delete(
    '/:id/banner/:type',
    {
      preValidation: authMiddleware(['admin']),
      schema: deletePromoBannerSchema,
    },
    async (request, reply) => {
      const { id, type } = request.params;

      try {
        const result = await promoService.deletePromoBanner(Number(id), type);
        return reply.code(201).send(result);
      } catch (e) {
        if (e instanceof CustomError) {
          return reply.code(e.data.statusCode).send(e.data);
        }
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  // Получить информацию о баннерах промокода
  fastify.get(
    '/:id/banners',
    {
      preValidation: authMiddleware(['admin']),
      schema: getPromocodeBannersSchema,
    },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const result = await promoService.getPromocodeBanners(Number(id));
        return reply.code(200).send(result);
      } catch (e) {
        console.log(e);
        if (e instanceof CustomError) {
          return reply.code(e.data.statusCode).send(e.data);
        }
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  fastify.get('/customer', async (request, reply) => {
    try {
      const queryData = request.query;
      return await promoService.getCustomers(queryData);
    } catch (error) {
      console.log(error);
      return reply.status(500)
        .send({
          success: false,
          message: 'Проблема с получением списка пользователей',
        });
    }
  });

  // API для работы с сегментами пользователей

  // Расчет сегмента для промокода
  fastify.post(
    '/segment/calculate/:id',
    {
      preValidation: authMiddleware(['admin']),
    },
    async (request, reply) => {
      const { id } = request.params;
      const { filter } = request.body;

      try {
        const result = await promoService
          .calculateSegmentForPromocode(Number(id), JSON.stringify(filter)); // JSON.stringify костыль
        return reply.code(200).send(result);
      } catch (e) {
        console.log(e);
        if (e instanceof CustomError) {
          return reply.code(e.data.statusCode).send(e.data);
        }
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  // Получение информации о сегменте промокода
  fastify.get(
    '/segment/:id',
    {
      preValidation: authMiddleware(['admin']),
    },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const result = await promoService.getPromocodeSegment(Number(id));
        return reply.code(200).send(result);
      } catch (e) {
        console.log(e);
        if (e instanceof CustomError) {
          return reply.code(e.data.statusCode).send(e.data);
        }
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  // Получение промокодов, доступных конкретному пользователю
  fastify.get(
    '/user/:userId',
    {
      preValidation: authMiddleware(['user', 'admin']),
    },
    async (request, reply) => {
      const { userId } = request.params;
      console.log('User endpoint - userId:', userId);

      try {
        // Не преобразуем userId в число
        const result = await promoService.getUserAvailablePromocodes(userId);
        return reply.code(200).send(result);
      } catch (e) {
        console.log(e);
        if (e instanceof CustomError) {
          return reply.code(e.data.statusCode).send(e.data);
        }
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  // Тестирование промокода для пользователя по номеру телефона
  fastify.get(
    '/test-segment',
    {
      preValidation: authMiddleware(['admin']),
      schema: {
        querystring: {
          type: 'object',
          required: ['phone', 'coupon'],
          properties: {
            phone: { type: 'string' },
            coupon: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { phone, coupon } = request.query;

      try {
        const result = await promoService.testPromocodeSegment(phone, coupon);
        return reply.code(200).send(result);
      } catch (e) {
        console.log(e);
        if (e instanceof CustomError) {
          return reply.code(e.data.statusCode).send(e.data);
        }
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  done();
};
