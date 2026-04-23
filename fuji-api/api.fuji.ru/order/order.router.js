import authMiddleware from '../middleware/auth.middleware.js';
import scopeMiddleware, { SCOPES } from '../middleware/scope.middleware.js';
import * as orderService from './order.service.js';
import * as cloudKassirService from './cloudkassir.service.js';
import CustomError from '../errors/CustomError.js';
import CLogger from '../lib/CLogger.js';
import {
  createOrderSchema,
  getOrdersSchema,
  getOrdersRestSchema,
  orderStatusUpdateSchema,
  receiptSchema,
} from './order.schema.js';

const logger = new CLogger();

export default (fastify, opts, done) => {
  /**
   * Маршрут для получения списка заказов с пагинацией
   * @route GET /order/
   * @query {integer} page - Номер страницы для пагинации
   * @query {string} filter - Фильтр в формате JSON
   * @query {string} order - Порядок сортировки в формате JSON
   * @query {integer} limit - Количество элементов на странице
   * @returns {object} - Объект с массивом заказов и информацией о пагинации
   */
  fastify.get(
    '/',
    {
      preValidation: authMiddleware(['admin']),
      schema: getOrdersSchema,
    },
    async (request, reply) => {
      try {
        const queryData = request.query;
        const orders = await orderService.getOrdersAll(queryData);
        return reply.send(orders);
      } catch (e) {
        logger.log(e);
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  /**
   * Очистка всех URL чеков (receiptUrl) в базе
   * @route POST /order/clear-receipts
   */
  fastify.post(
    '/clear-receipts',
    {
      preValidation: authMiddleware(['admin']),
    },
    async (request, reply) => {
      try {
        const result = await orderService.clearAllReceiptUrls();
        return reply.send(result);
      } catch (e) {
        logger.log(e);
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  /**
   * Маршрут для получения списка ресторанов (REST) для заказов
   * @route GET /order/rest
   * @returns {array} - Массив ресторанов
   */
  fastify.get(
    '/rest',
    {
      preValidation: authMiddleware(['admin']),
      schema: getOrdersRestSchema,
    },
    async (request, reply) => {
      try {
        const restList = await orderService.getOrdersRest();
        return reply.send(restList);
      } catch (e) {
        logger.log(e);
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  /**
   * Маршрут для создания нового заказа
   * @route POST /order/
   * @param {object} body - Данные нового заказа
   * @returns {object} - Результат создания заказа
   */
  fastify.post(
    '/',
    {
      preValidation: authMiddleware(['user']),
      schema: createOrderSchema,
    },
    async (request, reply) => {
      try {
        const orderData = request.body;
        const result = await orderService.createOrder(orderData);
        if (result) {
          return reply.code(201).send(result);
        }
        return reply.code(400).send({ error: 'Не удалось создать заказ' });
      } catch (e) {
        logger.log(e);
        if (e instanceof CustomError) {
          return reply.code(e.data?.statusCode).send(e);
        }
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  /**
   * Маршрут для проверки элементов корзины
   * @route POST /order/
   * @param {object} body - Элементы корзины
   * @returns {object} - Результат проверки
   */
  fastify.post(
    '/validate-cart-items',
    {
      preValidation: authMiddleware(['user']),
      schema: { hide: true },
    },
    async (request, reply) => {
      try {
        const cartItems = request.body;
        return await orderService.validateBasketItems(cartItems);
      } catch (e) {
        logger.log(e);
        if (e instanceof CustomError) {
          return reply.code(e.data?.statusCode).send({ ...e, data: e.data });
        }
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  /**
   * Маршрут для обновления статуса заказа из внешней системы
   * @route POST /order/status-update
   * @param {object} body - Данные о статусе заказа
   * @returns {object} - Результат обновления статуса
   */
  fastify.post(
    '/status-update',
    {
      preValidation: scopeMiddleware(SCOPES.UPDATE_DELIVERY_STATUS),
      schema: orderStatusUpdateSchema,
    },
    async (request, reply) => {
      try {
        const statusData = request.body;
        const result = await orderService.updateOrderStatus(statusData);
        return reply.code(200).send(result);
      } catch (e) {
        logger.log(e);
        if (e instanceof CustomError) {
          return reply.code(e.data?.statusCode || 500).send({
            error: e.message,
            code: e.code,
          });
        }
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  /**
   * Маршрут для получения уже созданного чека заказа
   * @route GET /order/:iikoOrderId/receipt
   * @param {string} iikoOrderId - ID заказа в системе iiko
   * @returns {object} - URL готового чека
   */
  fastify.get(
    '/:iikoOrderId/receipt',
    {
      preValidation: authMiddleware(['user']),
    },
    async (request, reply) => {
      try {
        const { iikoOrderId } = request.params;

        // Для обычных пользователей проверяем, что заказ принадлежит им
        const order = await orderService.getOrderByIikoOrderId(iikoOrderId);
        if (!order || order.userPhone !== request.user.phone) {
          return reply.code(403).send({
            error: 'Нет прав для получения чека этого заказа',
          });
        }

        // Сначала проверяем URL чека в базе данных
        if (order.receiptUrl) {
          return reply.send({
            success: true,
            url: order.receiptUrl,
            exists: true,
            source: 'database',
          });
        }
      } catch (e) {
        logger.log(e);
        if (e instanceof CustomError) {
          return reply.code(e.data?.statusCode || 500).send({
            error: e.message,
            code: e.code,
          });
        }
        return reply.code(500).send({
          error: 'Внутренняя ошибка сервера при получении чека',
        });
      }
    },
  );

  done();
};
