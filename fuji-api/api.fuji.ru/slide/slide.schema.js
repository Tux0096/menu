import { defaultError, errorSchema } from '../helpers/scheme.helper.js';

export const slideResponseEntity = {
  id: { type: 'integer', description: 'ID слайда' },
  path: { type: 'string', description: 'Путь к изображению слайда' },
  isMobile: {
    type: 'boolean',
    description: 'Флаг, указывает, что слайд предназначен для мобильных устройств',
    default: false,
  },
  link: { type: 'string', description: 'Ссылка для перехода', nullable: true },
  sort: { type: 'integer', description: 'Сортировка слайда' },
};

export const slideEntity = {
  type: {
    type: 'string',
    description: 'Тип слайда',
    enum: ['slide', 'promo'],
  },
  fileId: {
    type: 'integer',
    description: 'ID файла',
  },
  link: {
    type: 'string',
    nullable: true,
    description: 'Ссылка для перехода',
  },
  sort: {
    type: 'integer',
    description: 'Сортировка слайда',
  },
  isMobile: {
    type: 'boolean',
    description: 'Флаг для мобильного слайда',
    default: false,
  },
};

export const slideResponseSchema = {
  type: 'object',
  properties: slideResponseEntity,
};

export const getSlidesSchema = {
  description: 'Получить все слайды',
  tags: ['Слайды'],
  summary: 'Возвращает список всех слайдов',
  response: {
    200: {
      description: 'Успешный ответ. Возвращает массив объектов слайдов.',
      type: 'array',
      items: slideResponseSchema,
    },
    ...defaultError,
  },
};

export const createSlideSchema = {
  description: 'Создать новый слайд',
  tags: ['Слайды'],
  summary: 'Создает новый слайд',
  body: {
    type: 'object',
    properties: slideEntity,
    required: ['fileId', 'type'],
  },
  response: {
    201: {
      description: 'Слайд успешно создан',
      type: 'object',
      properties: slideResponseEntity,
    },
    ...defaultError,
  },
  additionalProperties: false,
  security: [{ apiKey: [] }],
};

export const updateSlideSchema = {
  description: 'Обновить слайд по ID',
  tags: ['Слайды'],
  summary: 'Обновляет слайд',
  params: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: 'ID слайда',
      },
    },
    required: ['id'],
  },
  body: {
    type: 'object',
    properties: slideEntity,
  },
  response: {
    200: {
      description: 'Слайд успешно обновлен',
      type: 'object',
      properties: slideResponseEntity,
    },
    401: errorSchema(401, 'Доступ запрещен'),
    500: errorSchema(500, 'Что-то пошло не так'),
  },
  security: [{ apiKey: [] }],
};

export const deleteSlideSchema = {
  description: 'Удалить слайд по ID',
  tags: ['Слайды'],
  summary: 'Удаляет слайд по указанному ID',
  params: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: 'ID слайда',
      },
    },
    required: ['id'],
  },
  response: {
    200: {
      description: 'Слайд успешно удален',
      type: 'object',
      properties: {
        statusCode: { type: 'integer' },
        message: { type: 'string' },
      },
    },
    401: errorSchema(401, 'Доступ запрещен'),
    500: errorSchema(500, 'Что-то пошло не так'),
  },
  security: [{ apiKey: [] }],
};
