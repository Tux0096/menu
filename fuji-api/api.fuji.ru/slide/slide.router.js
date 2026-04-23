import authMiddleware from '../middleware/auth.middleware.js';
import * as slideService from './slide.service.js';
import {
  getSlidesSchema,
  createSlideSchema,
  updateSlideSchema,
  deleteSlideSchema, slideEntity,
} from './slide.schema.js';

export default (fastify, opts, done) => {
  fastify.get(
    '/',
    {
      schema: getSlidesSchema,
    },
    async () => slideService.getSlides(),
  );

  fastify.get(
    '/type/:type',
    {
      schema: {
        ...getSlidesSchema,
        params: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Тип слайда',
              enum: slideEntity.type.enum,
            },
          },
          required: ['type'],
        },
      },
    },
    async (request) => {
      const { type } = request.params;
      return slideService.getSlidesByType(type);
    },
  );

  fastify.post(
    '/',
    {
      preValidation: authMiddleware(['admin']),
      schema: createSlideSchema,
    },
    async (request) => {
      const slide = request.body;
      return slideService.createSlide(slide);
    },
  );

  fastify.patch(
    '/',
    {
      preValidation: authMiddleware(['admin']),
      schema: { hide: true },
    },
    async (request) => {
      const slides = request.body;
      return slideService.updateSlides(slides);
    },
  );

  fastify.delete(
    '/:id',
    {
      preValidation: authMiddleware(['admin']),
      schema: deleteSlideSchema,
    },
    async (request) => {
      const { id } = request.params;
      return slideService.deleteSlide(id);
    },
  );

  fastify.patch('/:id/link', { preValidation: authMiddleware(['admin']) }, async (request, reply) => {
    const { id } = request.params;
    const { link } = request.body;
    return await slideService.updateLink(id, link);
  });

  done();
};
