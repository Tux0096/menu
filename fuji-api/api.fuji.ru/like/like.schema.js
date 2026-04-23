import { defaultError } from '../helpers/scheme.helper.js';

export const createLikeSchema = {
  description: 'Создание лайка для продукта',
  tags: ['Лайки'],
  summary: 'Позволяет пользователю поставить лайк на продукт',
  body: {
    type: 'object',
    properties: {
      productId: { type: 'string', description: 'ID продукта' },
      userId: { type: 'string', description: 'ID пользователя' },
    },
    required: ['productId', 'userId'],
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Лайк успешно добавлен',
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID лайка' },
        productId: { type: 'string', description: 'ID продукта' },
        userId: { type: 'string', description: 'ID пользователя' },
      },
    },
    ...defaultError,
  },
  security: [{ apiKey: [] }],
};

export const deleteLikeSchema = {
  description: 'Удаление лайка по ID',
  tags: ['Лайки'],
  summary: 'Позволяет удалить лайк по его ID',
  params: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID лайка' },
    },
    required: ['id'],
  },
  response: {
    200: {
      description: 'Лайк успешно удален',
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
      },
    },
    ...defaultError,
  },
  security: [{ apiKey: [] }],
};

export const deleteLikeByUserSchema = {
  description: 'Удаление лайка по ID пользователя и продукта',
  tags: ['Лайки'],
  summary: 'Позволяет удалить лайк по ID пользователя и ID продукта',
  params: {
    type: 'object',
    properties: {
      userId: { type: 'string', description: 'ID пользователя' },
      productId: { type: 'string', description: 'ID продукта' },
    },
    required: ['userId', 'productId'],
  },
  response: {
    200: {
      description: 'Лайк успешно удален',
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
      },
    },
    ...defaultError,
  },
  security: [{ apiKey: [] }],
};
