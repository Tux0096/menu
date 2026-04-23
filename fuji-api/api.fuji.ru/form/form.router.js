import * as formService from './form.service.js';
import { checkCaptcha } from '../lib/helpers.js';
import {
  getSettingByName,
} from '../setting/setting.service.js';
import { sendVacancySchema } from './form.schema.js';

export default (fastify, opts, done) => {
  fastify.post(
    '/vacancy',
    {
      schema: sendVacancySchema,
    },
    async (request, reply) => {
      const { token, type } = request.query;
      try {
        const IS_WITHOUT_RECAPTCHA = await getSettingByName('IS_WITHOUT_RECAPTCHA');
        await checkCaptcha(token, type, IS_WITHOUT_RECAPTCHA);
        return await formService.sendVacancy(request.body, token, type);
      } catch (e) {
        return {
          success: false,
          message: 'Invalid captcha',
        };
      }
    },
  );

  done();
};
