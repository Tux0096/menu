// story/story.router.js
import authMiddleware from '../middleware/auth.middleware.js';
import * as storyService from './story.service.js';
import {
  getStoriesSchema,
  createStorySchema,
  updateStoriesSchema,
  updateStorySchema,
  deleteStorySchema,
} from './story.schema.js';

/**
 * Роутер для работы с Story
 * @param {import('fastify').FastifyInstance} fastify
 * @param {object} opts
 * @param {Function} done
 */
export default (fastify, opts, done) => {
  /**
   * Маршрут для получения списка сториз
   * @route GET /storage/story/
   * @returns {array} - Массив сториз
   */
  fastify.get(
    '/',
    {
      schema: getStoriesSchema,
    },
    async (request, reply) => {
      try {
        const stories = await storyService.getStories();
        return reply.code(200).send(stories);
      } catch (e) {
        fastify.log.error(`Ошибка при получении сториз: ${e.message}`);
        return reply.code(500).send('Внутренняя ошибка сервера');
      }
    },
  );

  /**
   * Маршрут для создания новой сторизы
   * @route POST /storage/story/
   * @param {object} body - Данные новой сторизы
   * @returns {object} - Созданная сториза
   */
  fastify.post(
    '/',
    {
      preValidation: authMiddleware(['admin']),
      schema: createStorySchema,
    },
    async (request, reply) => {
      const story = request.body;
      try {
        const createdStory = await storyService.createStory(story);
        return reply.code(201).send(createdStory);
      } catch (e) {
        fastify.log.error(`Ошибка при создании сторизы: ${e.message}`);
        return reply.code(400).send('Некорректные данные для создания сторизы');
      }
    },
  );

  /**
   * Маршрут для массового обновления сториз
   * @route PATCH /storage/story/
   * @param {array} body - Массив обновляемых сториз
   * @returns {object} - Результат обновления
   */
  fastify.patch(
    '/',
    {
      preValidation: authMiddleware(['admin']),
      schema: updateStoriesSchema,
    },
    async (request, reply) => {
      const stories = request.body;
      try {
        await storyService.updateStories(stories);
        return reply.code(200).send({
          success: true,
          message: 'Сторизы успешно обновлены',
        });
      } catch (e) {
        fastify.log.error(`Ошибка при массовом обновлении сториз: ${e.message}`);
        return reply.code(400).send('Некорректные данные для обновления сториз');
      }
    },
  );

  /**
   * Маршрут для обновления одной сторизы
   * @route PATCH /storage/story/:id
   * @param {integer} id - ID сторизы для обновления
   * @param {object} body - Обновляемые данные сторизы
   * @returns {object} - Результат обновления
   */
  fastify.patch(
    '/:id',
    {
      preValidation: authMiddleware(['admin']),
      schema: updateStorySchema,
    },
    async (request, reply) => {
      const { id } = request.params;
      const story = request.body;
      try {
        await storyService.updateStory(id, story);
        return reply.code(200).send({
          success: true,
          message: 'Сториза успешно обновлена',
        });
      } catch (e) {
        if (e.message === 'Сториза с указанным ID не найдена') {
          return reply.code(404).send('Сториза с указанным ID не найдена');
        }
        fastify.log.error(`Ошибка при обновлении сторизы: ${e.message}`);
        return reply.code(400).send('Некорректные данные для обновления сторизы');
      }
    },
  );

  /**
   * Маршрут для удаления сторизы
   * @route DELETE /storage/story/:id
   * @param {integer} id - ID сторизы для удаления
   * @returns {object} - Результат удаления
   */
  fastify.delete(
    '/:id',
    {
      preValidation: authMiddleware(['admin']),
      schema: deleteStorySchema,
    },
    async (request, reply) => {
      const { id } = request.params;
      try {
        await storyService.deleteStory(id);
        return reply.code(200).send({
          success: true,
          message: 'Сториза успешно удалена',
        });
      } catch (e) {
        if (e.message === 'Сториза с указанным ID не найдена') {
          return reply.code(404).send('Сториза с указанным ID не найдена');
        }
        fastify.log.error(`Ошибка при удалении сторизы: ${e.message}`);
        return reply.code(500).send('Внутренняя ошибка сервера');
      }
    },
  );

  done();
};
