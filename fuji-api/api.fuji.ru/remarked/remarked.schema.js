import { defaultError } from '../helpers/scheme.helper.js';

/**
 * Схема для массовой отправки push-уведомлений от ремаркета
 */
export const bulkSendRemarkedSchema = {
  description: 'Массовая отправка push-сообщений пользователям по номерам телефонов от ремаркета',
  tags: ['Remarked API'],
  summary: 'Отправляет push-уведомления пользователям по списку номеров телефонов',
  security: [
    {
      BasicAuth: [],
    },
  ],
  body: {
    type: 'object',
    required: ['phone_numbers', 'title', 'text'],
    properties: {
      phone_numbers: {
        type: 'array',
        description: 'Список номеров телефонов пользователей',
        items: {
          type: 'string',
          pattern: '^\\+7[0-9]{10}$',
          description: 'Номер телефона в формате +79178198209',
        },
        minItems: 1,
        examples: [['+79178198209', '+79178198210']],
      },
      title: {
        type: 'string',
        description: 'Заголовок push-сообщения',
        minLength: 1,
        maxLength: 100,
        examples: ['Заголовок пуша'],
      },
      text: {
        type: 'string',
        description: 'Текст push-сообщения',
        minLength: 1,
        maxLength: 500,
        examples: ['Описание пуша'],
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Успешная инициация отправки push-сообщений',
      type: 'object',
      properties: {
        phone_numbers: {
          type: 'array',
          description: 'Список номеров телефонов, для которых успешно инициирована отправка',
          items: {
            type: 'string',
          },
          examples: [['+79178198209', '+79178198210']],
        },
      },
      required: ['phone_numbers'],
    },
    400: {
      description: 'Ошибка валидации данных',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'string' },
        description: { type: 'string' },
      },
    },
    401: {
      description: 'Отсутствует или некорректная аутентификация',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'string' },
        description: { type: 'string' },
      },
    },
    403: {
      description: 'Недостаточно прав для выполнения запроса',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'string' },
        description: { type: 'string' },
      },
    },
    ...defaultError,
  },
};
