import { defaultError } from '../helpers/scheme.helper.js';

export const authRequestSendSMSSchema = {
  description: 'Запрос на отправку SMS для авторизации',
  tags: ['Аутентификация'],
  body: {
    type: 'object',
    properties: {
      phone: { type: 'string', nullable: false },
    },
    required: ['phone'],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        expireAt: { type: 'integer' },
        expireAtSeconds: { type: 'integer' },
      },
    },
    ...defaultError,
  },
};

export const adminVerifySMSSchema = {
  description: 'Запрос для проверки SMS-кода',
  tags: ['Аутентификация'],
  body: {
    type: 'object',
    properties: {
      phone: { type: 'string', nullable: false },
      code: { type: 'string', nullable: false },
    },
    required: ['phone', 'code'],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string', nullable: true },
        token: { type: 'string', nullable: true },
      },
    },
    ...defaultError,
  },
};
