import * as catalogService from './catalog.service.js';
import {
  getCatalogSchema,
  getGroupSchema,
  getProductSchema,
} from './catalog.schema.js';
import authMiddleware from '../middleware/auth.middleware.js';
import CLogger from '../lib/CLogger.js';

const logger = new CLogger();

export default (fastify, opts, done) => {
  fastify.get(
    '/',
    {
      schema: getCatalogSchema,
    },
    async (request, reply) => {
      const isAdmin = request.headers['x-admin'] === 'true'
        || (request.user && request.user.role === 'admin');
      const city = request.headers['x-city'] || 'samara';
      const { deliveryTerminalId } = request.query;

      // Получаем terminalId из заголовков (для SSR), куков или из query параметров
      const terminalId = request.headers['x-terminal-id']
        || request.cookies?.terminalId
        || deliveryTerminalId;

      const result = await catalogService.getCatalogCache(city, terminalId);

      // Если JSON уже сериализован - отправляем напрямую
      if (result.isPreSerialized) {
        reply
          .type('application/json')
          .header('Content-Length', Buffer.byteLength(result.json, 'utf8'))
          .send(result.json);
      } else {
        return result.data;
      }
    },
  );

  fastify.get(
    '/group',
    {
      schema: getGroupSchema,
    },
    async (request, reply) => await catalogService.getGroupsAll(),
  );

  fastify.get(
    '/product',
    {
      schema: getProductSchema,
    },
    async (request, reply) => {
      try {
        const isAdmin = request.headers['x-admin'] === 'true'
          || (request.user && request.user.role === 'admin');

        return await catalogService.getProductsAll(isAdmin);
      } catch (error) {
        logger.log(`Ошибка при получении списка товаров: ${error.message}`, error);
        return reply.code(500).send({
          error: 'Произошла ошибка при получении списка товаров',
          message: error.message,
          code: 'PRODUCTS_FETCH_ERROR',
        });
      }
    },
  );

  fastify.get(
    '/product/:id',
    {
      preValidation: authMiddleware(['admin']),
    },
    async (request, reply) => {
      const product = await catalogService.getProductById(request.params.id);
      if (!product) {
        return reply.code(404).send({ message: 'Product not found' });
      }
      return product;
    },
  );

  fastify.patch(
    '/product/:id',
    {
      preValidation: authMiddleware(['admin']),
    },
    async (request, reply) => {
      try {
        const product = await catalogService.updateProduct(
          request.params.id,
          request.body,
        );

        if (!product) {
          return reply.code(404).send({ message: 'Product not found' });
        }

        return product;
      } catch (error) {
        return reply.code(500).send({ error: error.message });
      }
    },
  );

  fastify.get('/delivery-products', {
    schema: {
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              code: { type: 'string' },
              price: { type: 'number' },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const deliveryProducts = await catalogService.getDeliveryProducts();
      return reply.send(deliveryProducts);
    } catch (error) {
      logger.log(`Error getting delivery products: ${error.message}`);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  done();
};
