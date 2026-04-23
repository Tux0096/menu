import * as pageService from './page.service.js';

export default (fastify, opts, done) => {
  fastify.get(
    '/:slug/:cityId',
    {
      schema: {
        hide: true,
      },
    },
    async (request, reply) => {
      const { slug, cityId } = request.params;

      return pageService.getPage(slug, cityId);
    },
  );

  done();
};
