import { errorSchema } from '../helpers/scheme.helper.js';

/**
 * Схема для ответа маршрута GET /version
 */
export const getVersionSchema = {
  description: 'Получение текущей версии каталога iiko',
  tags: ['Storage'],
  summary: 'Возвращает текущую версию каталога iiko',
  response: {
    200: {
      description: 'Текущая версия успешно получена',
      type: 'integer',
      example: 123,
    },
    500: errorSchema(500, 'Внутренняя ошибка сервера'),
  },
};
