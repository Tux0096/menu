// user/user.router.js
import authMiddleware from '../middleware/auth.middleware.js';
import * as likeService from '../like/like.service.js';
import * as userService from './user.service.js';
import * as iikoApi from '../iiko/iiko.api.js';
import * as orderService from '../order/order.service.js';
import { ValidationError } from '../errors/ValidationError.js';
import CLogger from '../lib/CLogger.js';
import {
  getUsersSchema,
  getUserSchema,
  getUserHistorySchema,
  createUserSchema,
  deleteUserSchema,
  updateUserSchema,
  getUserLastOrderSchema,
  getUserLikesSchema,
} from './user.schema.js';

const logger = new CLogger();

/**
 * Роутер для работы с Пользователями
 * @param {import('fastify').FastifyInstance} fastify
 * @param {object} opts
 * @param {Function} done
 */
export default (fastify, opts, done) => {
  /**
   * Маршрут для получения списка пользователей с пагинацией
   * @route GET /user/
   * @query {integer} page - Номер страницы для пагинации
   * @returns {object} - Объект с массивом пользователей и информацией о пагинации
   */
  fastify.get(
    '/',
    {
      preValidation: authMiddleware(['admin']),
      schema: getUsersSchema,
    },
    async (request, reply) => {
      try {
        const { page } = request.query;
        const users = await userService.getUsers(page);
        return reply.send(users);
      } catch (e) {
        logger.log(e);
        return reply.code(500)
          .send({ error: 'Internal Server Error' });
      }
    },
  );

  /**
   * Маршрут для получения информации о пользователе по номеру телефона
   * @route GET /user/:phone
   * @param {string} phone - Номер телефона пользователя
   * @returns {object} - Объект с данными пользователя
   */
  fastify.get(
    '/:phone',
    {
      preValidation: authMiddleware(['user']),
      schema: getUserSchema,
    },
    async (request, reply) => {
      const { phone } = request.params;

      if (request.user.phone !== phone) {
        return reply.code(403)
          .send({ message: 'Нет прав для получения информации о другом пользователе' });
      }

      try {
        const user = await userService.getUser(phone);
        return reply.send(user);
      } catch (error) {
        if (error.statusCode === 404) {
          return reply.code(404)
            .send({ message: 'Пользователь не найден' });
        }
        logger.log(error);
        return reply.code(500)
          .send({ message: 'Internal Server Error' });
      }
    },
  );

  /**
   * Маршрут для получения истории доставки пользователя
   * @route GET /user/:phone/history
   * @param {string} phone - Номер телефона пользователя
   * @returns {array} - Массив объектов с информацией о заказах
   */
  fastify.get(
    '/:phone/history',
    {
      preValidation: authMiddleware(['user']),
      schema: getUserHistorySchema, // Добавлено использование схемы
    },
    async (request, reply) => {
      try {
        const { phone } = request.params;

        if (request.user.phone !== phone) {
          return reply.code(403)
            .send({ message: 'Нет прав для получения информации о другом пользователе' });
        }

        const history = await iikoApi.getDeliveryHistoryByPhone(phone);

        // Обогащаем историю URL чеков из нашей БД
        if (history && history.length > 0) {
          // Собираем все iikoOrderId из истории (предполагаем что поле называется id)
          const iikoOrderIds = history.map((order) => order.orderId).filter(Boolean);

          if (iikoOrderIds.length > 0) {
            // Получаем URL чеков из БД
            const receiptUrls = await orderService.getReceiptUrlsByIikoOrderIds(iikoOrderIds);

            // Обогащаем каждый заказ в истории
            history.forEach((order) => {
              if (order.orderId && receiptUrls[order.orderId]) {
                order.receiptUrl = receiptUrls[order.orderId];
              }
            });
          }
        }

        return reply.send(history);
      } catch (e) {
        logger.log(e);
        return reply.code(500)
          .send({ message: 'Internal Server Error' });
      }
    },
  );

  /**
   * Маршрут для создания нового пользователя
   * @route POST /user/
   * @param {object} body - Данные нового пользователя
   * @returns {object} - Созданный пользователь
   */
  fastify.post(
    '/',
    {
      preValidation: authMiddleware(['user']),
      schema: createUserSchema,
    },
    async (request, reply) => {
      try {
        const createdUser = await userService.createUser(request.body);
        return reply.code(201)
          .send(createdUser);
      } catch (error) {
        logger.log(error);
        return reply.code(500)
          .send({ message: 'Internal Server Error' });
      }
    },
  );

  /**
   * Маршрут для удаления пользователя по номеру телефона
   * @route DELETE /user/:phone
   * @param {string} phone - Номер телефона пользователя
   * @returns {null} - Успешное удаление без тела ответа
   */
  fastify.delete(
    '/:phone',
    {
      preValidation: authMiddleware(['user']),
      schema: deleteUserSchema,
    },
    async (request, reply) => {
      try {
        const { phone } = request.params;

        if (request.user.phone !== phone) {
          return reply.code(403)
            .send({ message: 'Нет прав для удаления другого пользователя' });
        }

        await userService.deleteUser(phone);
        return reply.code(204)
          .send();
      } catch (error) {
        logger.log(error);
        if (error.statusCode === 404) {
          return reply.code(404)
            .send({ message: 'Пользователь не найден' });
        }
        return reply.code(500)
          .send({ message: 'Internal Server Error' });
      }
    },
  );

  /**
   * Маршрут для обновления пользователя
   * @route PATCH /user/:phone
   * @param {string} phone - Номер телефона пользователя
   * @param {object} body - Обновляемые данные пользователя
   * @returns {object} - Объект с результатом обновления
   */
  fastify.patch(
    '/:phone',
    {
      preValidation: authMiddleware(['user']),
      schema: updateUserSchema,
    },
    async (request, reply) => {
      try {
        const { phone } = request.params;

        if (request.user.phone !== phone) {
          return reply.code(403)
            .send({ message: 'Нет прав для изменения данных другого пользователя' });
        }

        const {
          name,
          email,
          gender,
          birthday,
          personalData,
          PUSHNotifications,
          receiveAdvertisingInformation,
        } = request.body;

        const updatedUser = await userService.updateUser({
          name,
          phone,
          email,
          gender,
          birthday,
          personalData,
          PUSHNotifications,
          receiveAdvertisingInformation,
        });
        return reply.send(updatedUser);
      } catch (e) {
        if (e instanceof ValidationError) {
          return reply.code(422)
            .send({ message: e.message });
        }
        if (e.statusCode === 404) {
          return reply.code(404)
            .send({ message: 'Пользователь не найден' });
        }
        logger.log(e);
        return reply.code(500)
          .send({ message: 'Internal Server Error' });
      }
    },
  );

  /**
   * Маршрут для получения последнего заказа пользователя
   * @route GET /user/:id/last-order
   * @param {string} id - ID пользователя
   * @returns {object|null} - Последний заказ пользователя или null, если заказов нет
   */
  fastify.get(
    '/:id/last-order',
    {
      preValidation: authMiddleware(['user']),
      schema: getUserLastOrderSchema,
    },
    async (request, reply) => {
      try {
        const lastOrder = await userService.getUserLastOrder(request.params.id);
        if (!lastOrder) {
          return reply.code(404)
            .send({ message: 'Заказ не найден' });
        }
        return reply.code(200)
          .send(lastOrder);
      } catch (error) {
        logger.log(error);
        return reply.code(500)
          .send({ message: 'Internal Server Error' });
      }
    },
  );

  /**
   * Маршрут для получения лайков пользователя
   * @route GET /user/:id/like
   * @param {string} id - ID пользователя
   * @returns {array} - Массив лайков пользователя
   */
  fastify.get(
    '/:id/like',
    {
      preValidation: authMiddleware(['user']),
      schema: getUserLikesSchema,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const likes = await likeService.getLikesByUserId(id);
        return reply.code(200)
          .send(likes);
      } catch (error) {
        logger.log(error);
        return reply.code(500)
          .send({ message: 'Internal Server Error' });
      }
    },
  );

  /**
   * Получение активного заказа пользователя
   * @route GET /user/:id/active-order
   */
  fastify.get(
    '/:id/active-order',
    {
      preValidation: authMiddleware(['user']),
    },
    async (request, reply) => {
      try {
        const { id: userId } = request.params;

        const activeOrder = await userService.getUserActiveOrder(userId);

        if (!activeOrder) {
          return reply.code(404).send({ error: 'Активный заказ не найден' });
        }

        return reply.send(activeOrder);
      } catch (error) {
        logger.log(error);
        return reply.code(500).send({ error: 'Внутренняя ошибка сервера' });
      }
    },
  );

  done();
};
