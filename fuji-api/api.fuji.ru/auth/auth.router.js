import * as authService from './auth.service.js';
import {
  adminVerifySMSSchema,
  authRequestSendSMSSchema,
} from './auth.schema.js';

export default (fastify, opts, done) => {
  fastify.post(
    '/admin/send-sms',
    {
      schema: { hide: true },
    },
    async (request, reply) => {
      const { phone } = request.body;

      //  TODO: реализовать капчу
      // await checkCaptcha(token);

      return authService.sendSMS(phone);
    },
  );

  fastify.post(
    '/admin/verify-sms',
    {
      schema: { hide: true },
    },
    async (request, reply) => {
      const { phone, code } = request.body;

      //  TODO: реализовать капчу
      // await checkCaptcha(token);

      return authService.processSMS(phone, code);
    },
  );
  done();
};
