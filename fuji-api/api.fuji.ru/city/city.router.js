import * as cityService from './city.service.js';
import { getCitiesSchema } from './city.schema.js';

export default (fastify, opts, done) => {
  fastify.get(
    '/',
    {
      schema: getCitiesSchema,
    },
    async (request, reply) => await cityService.getCities(),
  );
  done();
};
