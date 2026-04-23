import CustomError from '../errors/CustomError.js';
import env from '../env.js';

/**
 * Middleware для проверки API-ключа внешнего сервиса
 * @param {Object} request Запрос
 * @param {Object} reply Ответ
 * @param {Function} done Функция продолжения обработки запроса
 */
export const apiKeyAuth = (request, reply, done) => {
  const apiKey = request.headers['x-api-key'];

  // Проверка наличия API-ключа
  if (!apiKey) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'API-ключ отсутствует в заголовке x-api-key',
    });
  }

  // Проверка соответствия API-ключа
  const validApiKey = env.EXTERNAL_SERVISE_MAP_ZONES_API_KEY;
  if (!validApiKey) {
    console.error('EXTERNAL_SERVISE_MAP_ZONES_API_KEY не настроен в переменных окружения');
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'Ошибка проверки аутентификации',
    });
  }

  if (apiKey !== validApiKey) {
    return reply.code(403).send({
      error: 'Forbidden',
      message: 'Недействительный API-ключ',
    });
  }

  // Если ключ действителен, продолжаем обработку запроса
  done();
};

/**
 * Обработчик ошибок для API зон
 * @param {Error} error Объект ошибки
 * @param {Object} request Запрос
 * @param {Object} reply Ответ
 */
export const errorHandler = (error, request, reply) => {
  console.error(`Ошибка в API зон: ${error.message}`, error.stack);

  if (error instanceof CustomError) {
    return reply.code(error.data.statusCode).send(error.data);
  }

  // Обработка ошибок валидации
  if (error.message && (
    error.message.includes('должен быть')
    || error.message.includes('обязательно')
    || error.message.includes('формате')
  )) {
    return reply.code(400).send({
      error: 'Bad Request',
      message: error.message,
    });
  }

  // Обработка ошибок с существующими данными
  if (error.message && error.message.includes('уже существует')) {
    return reply.code(409).send({
      error: 'Conflict',
      message: error.message,
    });
  }

  // Общая обработка ошибок
  return reply.code(500).send({
    error: 'Internal Server Error',
    message: 'Произошла внутренняя ошибка сервера',
  });
};
