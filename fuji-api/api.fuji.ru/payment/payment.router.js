import * as paymentService from './payment.service.js';

export default (fastify, opts, done) => {
  fastify.get(
    '/',
    {
      schema: {
        hide: true,
      },
    },
    async (request, reply) => await paymentService.getPayments(),
  );

  fastify.get(
    '/callback-sberbank',
    {
      schema: {
        hide: true,
      },
    },
    async (request, reply) => {
      // для сбера калбек, сейчас не используется
      return;

      const { orderNumber } = request.query;
      if (orderNumber) {
        paymentService.callbackSberbank(orderNumber);
      }
    },
  );

  fastify.post(
    '/callback/cloud-payments/:type',
    {
      schema: {
        hide: true,
      },
    },
    async (request, reply) => {
      const { type } = request.params;
      const data = request.body;
      try {
        await paymentService.callbackCloudPayments(type, data);
      } catch (e) {
        console.log(e);
      }

      return ({ code: 0 });
    },
  );

  done();
};
