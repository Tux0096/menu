import * as telegramService from './telegram.service.js';

export default (fastify, opts, done) => {
  fastify.post(
    '/callback',
    {
      schema: {
        hide: true,
      },
    },
    async (request, reply) => telegramService.telegramCallback(request.body),
  );
  done();
};
