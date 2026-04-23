import authMiddleware from '../middleware/auth.middleware.js';
import * as likeService from './like.service.js';
import {
  createLikeSchema,
  deleteLikeSchema,
  deleteLikeByUserSchema,
} from './like.schema.js';

export default (fastify, opts, done) => {
  fastify.post(
    '/',
    { preValidation: authMiddleware(['user']), schema: createLikeSchema },
    async (request, reply) => {
      const { productId, userId } = request.body;

      try {
        const like = await likeService.createLike({ productId, userId });
        reply.send(like);
      } catch (error) {
        reply.status(500).send({
          success: false,
          message: 'Internal Server Error',
        });
      }
    },
  );

  fastify.delete(
    '/:id',
    { preValidation: authMiddleware(['user']), schema: deleteLikeSchema },
    async (request, reply) => {
      const { id } = request.params;

      try {
        await likeService.deleteLike(id);
        reply.send({ status: 'success' });
      } catch (error) {
        reply.status(500).send({
          success: false,
          message: 'Internal Server Error',
        });
      }
    },
  );

  fastify.delete(
    '/:userId/:productId',
    { preValidation: authMiddleware(['user']), schema: deleteLikeByUserSchema },
    async (request, reply) => {
      const { userId, productId } = request.params;

      try {
        await likeService.deleteLikeByUser(userId, productId);
        reply.send({ status: 'success' });
      } catch (error) {
        reply.status(500).send({
          success: false,
          message: 'Internal Server Error',
        });
      }
    },
  );

  done();
};
