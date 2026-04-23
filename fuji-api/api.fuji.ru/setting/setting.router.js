import * as settings from './setting.service.js';
import authMiddleware from '../middleware/auth.middleware.js';
import CustomError from '../errors/CustomError.js';

export default (fastify, opts, done) => {
  fastify.get(
    '/',
    { schema: { hide: true } },
    async (request, reply) => {
      const city = request.headers['x-city'] || 'samara';
      return await settings.getSettings(city);
    },
  );

  fastify.get('/:name', {
    schema: { hide: true },
    handler: async (request, reply) => {
      const { name } = request.params;
      const zoneId = request.headers['x-zone-id'];

      try {
        const result = await settings.getSettingByName(name, zoneId);
        return result;
      } catch (err) {
        request.log.error(err, 'Ошибка при получении настройки');
        return reply.status(500).send({ error: 'Internal Server Error' });
      }
    },
  });

  // from DB
  fastify.get(
    '/db/:name',
    { schema: { hide: true } },
    async (request, reply) => settings.getSettingByNameDB(request.params.name),
  );

  fastify.put('/db/:name', {
    preValidation: authMiddleware(['admin']),
    schema: { hide: true },
  }, async (request, reply) => {
    try {
      const { entity } = request.body;

      await settings.updateSetting(entity);
      return reply.code(204).send();
    } catch (e) {
      if (e instanceof CustomError) {
        return reply.code(e.data.statusCode).send(e.data);
      }
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });
  fastify.put(
    '/db',
    {
      preValidation: authMiddleware(['admin']),
      schema: { hide: true },
    },
    async (request, reply) => {
      try {
        const { entities } = request.body;

        await settings.updateSettings(entities);
        return reply.code(204).send();
      } catch (e) {
        if (e instanceof CustomError) {
          return reply.code(e.data.statusCode).send(e.data);
        }
        return reply.code(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  done();
};
