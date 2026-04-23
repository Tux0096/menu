import * as cladrService from './cladr.service.js';
import { getCityCladrSchema, getCladrSchema } from './cladr.schema.js';

export default (fastify, opts, done) => {
  fastify.get(
    '/',
    {
      schema: getCladrSchema,
    },
    async (request, reply) => await cladrService.getCladrAll(),
  );

  fastify.get(
    '/city/:cityIikoId',
    {
      schema: getCityCladrSchema,
    },
    async (request, reply) => {
      const { cityIikoId } = request.params;
      return await cladrService.getCladrAll(cityIikoId);
    },
  );

  done();
};
