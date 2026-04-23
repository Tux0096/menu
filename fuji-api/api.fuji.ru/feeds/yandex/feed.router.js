import { generateFeed } from './feed.service.js';
import { isValidCity, getAvailableCities } from './feed.config.js';

/**
 * Роутер для Яндекс фида
 */
export default async function yandexFeedRouter(fastify) {
  /**
   * GET /api/v1/feeds/yandex
   * Получить YML фид для Яндекс.Карт
   */
  fastify.get('/', {
    schema: {
      description: 'Получить товарный фид в формате YML для Яндекс.Карт',
      tags: ['Feeds'],
      querystring: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: 'Город (samara, tolyatti, novokujbyshevsk)',
            default: 'samara',
          },
        },
      },
      response: {
        200: {
          type: 'string',
          description: 'XML фид в формате YML',
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            availableCities: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { city = 'samara' } = request.query;

    // Валидация города
    if (!isValidCity(city)) {
      return reply.code(400).send({
        error: `Invalid city: ${city}`,
        availableCities: getAvailableCities(),
      });
    }

    try {
      const feed = await generateFeed(city);

      reply
        .header('Content-Type', 'application/xml; charset=utf-8')
        .send(feed);
    } catch (error) {
      fastify.log.error('Error generating Yandex feed:', error);
      return reply.code(500).send({
        error: 'Failed to generate feed',
        message: error.message,
      });
    }
  });
}
