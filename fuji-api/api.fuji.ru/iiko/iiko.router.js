import authMiddleware from '../middleware/auth.middleware.js';
import * as iikoService from './iiko.service.js';
import {
  calculateCheckinResultSchema, checkAddressSchema,
  checkCreateOrderSchema,
} from './iiko.schema.js';

export default (fastify, opts, done) => {
  fastify.post('/calculate-checkin-result', {
    preValidation: authMiddleware(['user']),
    schema: calculateCheckinResultSchema,
  }, async (request, reply) => {
    const { body } = request;
    try {
      const result = await iikoService.calculateCheckinResult(body);
      return reply.send(result);
    } catch (error) {
      return reply.status(500).send({
        success: false,
        message: 'Internal Server Error',
      });
    }
  });

  fastify.post('/orders/check-create', {
    preValidation: authMiddleware(['user']),
    schema: checkCreateOrderSchema,
  }, async (request, reply) => {
    const { order } = request.body;
    try {
      const result = await iikoService.checkCreateOrder(order);
      return reply.send(result);
    } catch (error) {
      return reply.status(500).send({
        success: false,
        message: 'Internal Server Error',
      });
    }
  });

  fastify.post('/orders/checkAddress', {
    preValidation: authMiddleware(['user']),
    schema: checkAddressSchema,
  }, async (request, reply) => {
    const { city, street, home } = request.body;
    try {
      const result = await iikoService.checkAddress(city, street, home);
      return reply.send(result);
    } catch (error) {
      return reply.status(500).send({
        success: false,
        message: 'Internal Server Error',
      });
    }
  });

  done();
};
