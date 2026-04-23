// storage/storage.router.js
import * as storage from './storage.service.js';
import { getVersionSchema } from './storage.schema.js';
import CLogger from '../lib/CLogger.js';

const logger = new CLogger();

/**
 * Роутер для работы с Storage
 * @param {import('fastify').FastifyInstance} fastify
 * @param {object} opts
 * @param {Function} done
 */
export default (fastify, opts, done) => {
  /**
   * Маршрут для получения текущей версии каталога iiko
   * @route GET /version
   * @returns {integer} - Текущая версия каталога iiko
   */
  fastify.get(
    '/version',
    {
      schema: getVersionSchema,
    },
    async (request, reply) => {
      try {
        const revision = await storage.getRevision();
        return reply.code(200).send(revision);
      } catch (e) {
        logger.log(`Ошибка при получении ревизии: ${e.message}`);
        return reply.code(500).send('Внутренняя ошибка сервера');
      }
    },
  );

  done();
};
