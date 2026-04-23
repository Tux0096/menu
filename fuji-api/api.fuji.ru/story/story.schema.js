// story/story.schema.js
import { errorSchema } from '../helpers/scheme.helper.js';

/**
 * Схема модели Story для создания и обновления
 */
export const storyEntity = {
  type: 'object',
  properties: {
    fileId: {
      type: 'integer',
      description: 'ID файла, связанного со сторизой',
    },
    isMobile: {
      type: 'boolean',
      description: 'Флаг, указывающий, отображается ли сториза на мобильных устройствах',
    },
    sort: {
      type: 'integer',
      description: 'Порядковый номер для сортировки сториз',
    },
    type: {
      type: 'string',
      enum: ['image', 'video'],
      description: 'Тип сторизы (изображение или видео)',
    },
    link: {
      type: 'string',
      description: 'Ссылка, связанная со сторизой',
    },
    linkTitle: {
      type: 'string',
      maxLength: 255,
      description: 'Заголовок для связанной ссылки',
    },
  },
  additionalProperties: true,
};

/**
 * Схема для получения списка сториз (GET /)
 */
export const getStoriesSchema = {
  description: 'Получение списка всех сториз',
  tags: ['Story'],
  summary: 'Возвращает массив сториз, отсортированных по полю "sort" в порядке возрастания',
  response: {
    200: {
      description: 'Список сториз успешно получен',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'ID сторизы', example: 1 },
          src: {
            type: 'string', description: 'URL источника сторизы', example: 'https://example.com/image.jpg',
          },
          sort: { type: 'integer', description: 'Порядковый номер', example: 1 },
          link: {
            type: 'string', description: 'Связанная ссылка', example: 'https://example.com',
          },
          type: {
            type: 'string', enum: ['image', 'video'], description: 'Тип сторизы', example: 'image',
          },
          linkTitle: { type: 'string', description: 'Заголовок для ссылки', example: 'Перейти на сайт' },
          isMobile: { type: 'boolean', description: 'Отображается ли на мобильных устройствах', example: true },
        },
      },
    },
    500: errorSchema(500, 'Внутренняя ошибка сервера'),
  },

};

/**
 * Схема для создания новой сторизы (POST /)
 */
export const createStorySchema = {
  description: 'Создание новой сторизы',
  tags: ['Story'],
  summary: 'Создаёт новую сторизу и возвращает её данные',
  body: storyEntity,
  response: {
    201: {
      description: 'Сториза успешно создана',
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'ID созданной сторизы', example: 1 },
        src: {
          type: 'string', description: 'URL источника сторизы', example: 'https://example.com/image.jpg',
        },
        sort: { type: 'integer', description: 'Порядковый номер', example: 1 },
        link: {
          type: 'string', description: 'Связанная ссылка', example: 'https://example.com',
        },
        type: {
          type: 'string', enum: ['image', 'video'], description: 'Тип сторизы', example: 'image',
        },
        linkTitle: { type: 'string', description: 'Заголовок для ссылки', example: 'Перейти на сайт' },
        isMobile: { type: 'boolean', description: 'Отображается ли на мобильных устройствах', example: true },
      },
    },
    400: errorSchema(400, 'Некорректные данные для создания сторизы'),
    500: errorSchema(500, 'Внутренняя ошибка сервера'),
  },
  security: [{ apiKey: [] }],
};

/**
 * Схема для обновления нескольких сториз (PATCH /)
 */
export const updateStoriesSchema = {
  description: 'Массовое обновление сториз',
  tags: ['Story'],
  summary: 'Обновляет несколько сториз одновременно',
  body: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'ID сторизы для обновления' },
        ...storyEntity.properties,
      },
      additionalProperties: true,
    },
  },
  response: {
    200: {
      description: 'Сторизы успешно обновлены',
      type: 'object',
      properties: {
        success: { type: 'boolean', description: 'Статус операции', example: true },
        message: { type: 'string', description: 'Сообщение об успешном обновлении', example: 'Сторизы успешно обновлены' },
      },
    },
    400: errorSchema(400, 'Некорректные данные для обновления сториз'),
    500: errorSchema(500, 'Внутренняя ошибка сервера'),
  },
  security: [{ apiKey: [] }],
};

/**
 * Схема для обновления одной сторизы (PATCH /:id)
 */
export const updateStorySchema = {
  description: 'Обновление одной сторизы',
  tags: ['Story'],
  summary: 'Обновляет данные одной сторизы по её ID',
  params: {
    type: 'object',
    properties: {
      id: { type: 'integer', description: 'ID сторизы для обновления' },
    },
    additionalProperties: true,
  },
  body: storyEntity,
  response: {
    200: {
      description: 'Сториза успешно обновлена',
      type: 'object',
      properties: {
        success: { type: 'boolean', description: 'Статус операции', example: true },
        message: { type: 'string', description: 'Сообщение об успешном обновлении', example: 'Сториза успешно обновлена' },
      },
    },
    400: errorSchema(400, 'Некорректные данные для обновления сторизы'),
    404: errorSchema(404, 'Сториза с указанным ID не найдена'),
    500: errorSchema(500, 'Внутренняя ошибка сервера'),
  },
  security: [{ apiKey: [] }],
};

/**
 * Схема для удаления сторизы (DELETE /:id)
 */
export const deleteStorySchema = {
  description: 'Удаление сторизы',
  tags: ['Story'],
  summary: 'Удаляет сторизу по её ID',
  params: {
    type: 'object',
    properties: {
      id: { type: 'integer', description: 'ID сторизы для удаления' },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      description: 'Сториза успешно удалена',
      type: 'object',
      properties: {
        success: { type: 'boolean', description: 'Статус операции', example: true },
        message: { type: 'string', description: 'Сообщение об успешном удалении', example: 'Сториза успешно удалена' },
      },
    },
    404: errorSchema(404, 'Сториза с указанным ID не найдена'),
    500: errorSchema(500, 'Внутренняя ошибка сервера'),
  },
  security: [{ apiKey: [] }],
};
