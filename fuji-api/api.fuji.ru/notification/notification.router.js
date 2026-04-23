import axios from 'axios';
import authMiddleware from '../middleware/auth.middleware.js';
import * as notificationService from './notification.service.js';
import CLogger from '../lib/CLogger.js';

const logger = new CLogger();

export default (fastify, opts, done) => {
  fastify.get('/', { preValidation: authMiddleware(['user']), schema: { hide: true } }, async (request, reply) => {
    try {
      const queryData = request.query;
      const { authorization } = request.headers;

      const externalResponse = await axios.get(`${process.env.NOTIFICATION_SERVER_URL}/v1/notification`, {
        params: queryData,
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json',
        },
      });

      return reply.send(externalResponse.data);
    } catch (e) {
      logger.log(e);
      if (e.response) {
        return reply.code(e.response.status).send({ error: e.response.data });
      }

      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.get('/all', { preValidation: authMiddleware(['user']), schema: { hide: true } }, async (request, reply) => {
    try {
      const queryData = request.query;
      const { authorization } = request.headers;

      const externalResponse = await axios.get(`${process.env.NOTIFICATION_SERVER_URL}/v1/notification/all`, {
        params: queryData,
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json',
        },
      });

      return reply.send(externalResponse.data);
    } catch (e) {
      logger.log(e);
      if (e.response) {
        return reply.code(e.response.status).send({ error: e.response.data });
      }

      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.get('/:customerId', { preValidation: authMiddleware(['user']), schema: { hide: true } }, async (request, reply) => {
    try {
      const queryData = request.query;
      const { customerId } = request.params;
      const { authorization } = request.headers;

      const externalResponse = await axios.get(`${process.env.NOTIFICATION_SERVER_URL}/v1/notification/${customerId}`, {
        params: queryData,
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json',
        },
      });

      return reply.send(externalResponse.data);
    } catch (e) {
      logger.log(e);
      if (e.response) {
        return reply.code(e.response.status).send({ error: e.response.data });
      }

      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.post('/device', { preValidation: authMiddleware(['user']), schema: { hide: true } }, async (request, reply) => {
    try {
      const deviceDate = request.body;
      await notificationService.addDevice(deviceDate);
      return reply
        .code(201)
        .send();
    } catch (e) {
      logger.log(e);
      return reply.code(500)
        .send({ error: 'Internal Server Error' });
    }
  });

  fastify.post('/web-device', { preValidation: authMiddleware(['user']) }, async (request, reply) => {
    try {
      const { customerId, fcmToken } = request.body;

      if (!customerId || !fcmToken) {
        return reply.code(400).send({
          error: 'customerId и fcmToken обязательны для веб-устройств',
        });
      }

      const deviceData = {
        customerId,
        FCMToken: fcmToken,
        deviceType: 'web',
      };

      await notificationService.addDevice(deviceData);
      return reply.code(201).send({
        success: true,
        message: 'Веб-устройство успешно зарегистрировано',
      });
    } catch (e) {
      logger.log(e);
      return reply.code(500).send({
        error: 'Ошибка регистрации веб-устройства',
      });
    }
  });

  fastify.post('/send-bulk-notification-all-devices', { preValidation: authMiddleware(['admin']), schema: { hide: true } }, async (request, reply) => {
    try {
      const { title, body } = request.body;

      const result = await notificationService.sendBulkNotificationsAllDevices(title, body);

      reply.send({
        success: true,
        message: 'Сообщения были отправлены',
        result,
      });
    } catch (error) {
      logger.log(error);
      return reply.status(500)
        .send({
          success: false,
          message: 'Проблема с отправкой сообщений',
        });
    }
  });

  fastify.get('/customer', { schema: { hide: true } }, async (request, reply) => {
    try {
      const queryData = request.query;
      const result = await notificationService.getCustomers(queryData);

      return result;
    } catch (error) {
      logger.log(error);
      return reply.status(500)
        .send({
          success: false,
          message: 'Проблема с получением списка пользователей',
        });
    }
  });
  fastify.post('/send-bulk-notification-filter-customers', { schema: { hide: true } }, async (request, reply) => {
    try {
      const queryData = request.query;

      return await notificationService.sendBulkNotificationFilterCustomers(request.body, queryData);
    } catch (error) {
      logger.log(error);
      return reply.status(500)
        .send({
          success: false,
          message: 'Проблема с получением списка пользователей',
        });
    }
  });

  done();
};
