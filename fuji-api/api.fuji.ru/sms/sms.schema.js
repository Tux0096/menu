import { defaultError, errorSchema } from '../helpers/scheme.helper.js';

/**
 * Схема модели SMS
 */
export const smsModelScheme = {
  id: { type: 'integer', description: 'ID SMS' },
  code: {
    type: 'string',
    maxLength: 20,
    description: 'Код подтверждения',
  },
  phone: {
    type: 'string',
    pattern: '^\\+?[1-9]\\d{1,14}$', // E.164 формат
    description: 'Номер телефона в формате E.164',
  },
  expireAt: {
    type: 'string',
    format: 'date-time',
    description: 'Время истечения срока действия кода',
  },
};

/**
 * Схема сущности SMS для создания и обновления
 */
export const smsEntity = {
  code: {
    type: 'string',
    maxLength: 20,
    description: 'Код подтверждения',
  },
  phone: {
    type: 'string',
    pattern: '^\\+?[1-9]\\d{1,14}$', // E.164 формат
    description: 'Номер телефона в формате E.164',
  },
  expireAt: {
    type: 'string',
    format: 'date-time',
    description: 'Время истечения срока действия кода',
  },
};

/**
 * Схема для отправки SMS сообщения
 */
export const sendSMSSchema = {
  description: 'Отправка SMS сообщения',
  tags: ['SMS'],
  summary: 'Отправляет SMS сообщение с кодом подтверждения на указанный номер телефона',
  params: {
    type: 'object',
    properties: {
      phone: {
        type: 'string',
        description: 'Номер телефона на который будет отправлено сообщение',
      },
    },
    additionalProperties: true,
  },
  body: {
    type: 'object',
    properties: {
      token: {
        type: 'string',
        description: 'Токен для проверки капчи',
      },
      type: {
        type: 'string',
        description: 'Тип капчи',
      },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      description: 'Сообщение успешно отправлено',
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        expireAt: { type: 'integer', description: 'Время истечения срока действия кода (timestamp)' },
        expireAtSeconds: { type: 'integer', description: 'Оставшееся время до истечения (в секундах)' },
        message: { type: 'string', description: 'Статус отправки сообщения', example: 'Сообщение успешно отправлено' },
        code: { type: 'string', description: 'Код состояния', example: 'SMS_CODE_ALREADY_SENT' },
      },
      additionalProperties: true,
    },
    400: errorSchema(400, 'Некорректный запрос или ошибка при отправке SMS'),
    500: errorSchema(500, 'Внутренняя ошибка сервера'),
  },
  security: [{ apiKey: [] }],
};

/**
 * Схема для верификации SMS кода
 */
export const verifySMSSchema = {
  description: 'Верификация кода SMS',
  tags: ['SMS'],
  summary: 'Проверяет правильность введенного кода подтверждения',
  body: {
    type: 'object',
    properties: {
      phone: {
        type: 'string',
        description: 'Номер телефона на который был отправлен код',
      },
      code: {
        type: 'string',
        pattern: '^\\d{4}$', // Предполагается 4-значный код
        description: 'Код для подтверждения (4 цифры)',
      },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      description: 'Код успешно проверен',
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        token: { type: 'string', description: 'Токен доступа для пользователя', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...' },
      },
    },
    400: errorSchema(400, 'Некорректный код или номер телефона'),
    401: errorSchema(401, 'Неверный код подтверждения'),
    500: errorSchema(500, 'Внутренняя ошибка сервера'),
  },
  security: [{ apiKey: [] }],
};
