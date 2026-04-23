// iiko.schema.js
import { defaultError } from '../helpers/scheme.helper.js';

export const calculateCheckinResultSchema = {
  description: 'Расчет результата регистрации в программе лояльности',
  tags: ['iiko'],
  summary: 'Выполняет расчет по заказу для применения программы лояльности',
  body: {
    type: 'object',
    properties: {
      order: { type: 'object', description: 'Информация о заказе' },
    },
    required: ['order'],
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Успешный расчет',
      type: 'object',
      properties: {
        discountTotal: { type: 'number', description: 'Общая сумма скидки' },
        discounts: { type: 'array', items: { type: 'object' }, description: 'Примененные скидки' },
        loyaltyProgramErrors: { type: 'array', items: { type: 'string' }, description: 'Ошибки программы лояльности' },
        freeProducts: { type: 'array', items: { type: 'string' }, description: 'Бесплатные продукты' },
        lostGift: { type: 'array', items: { type: 'string' }, description: 'Потерянные подарки' },
      },
    },
    ...defaultError,
  },
  security: [{ apiKey: [] }],
};

export const checkCreateOrderSchema = {
  description: 'Проверка возможности создания заказа',
  tags: ['iiko'],
  summary: 'Проверяет, можно ли создать заказ',
  body: {
    type: 'object',
    properties: {
      order: { type: 'object', description: 'Информация о заказе' },
    },
    required: ['order'],
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Успешная проверка',
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Заказ может быть создан' },
      },
    },
    ...defaultError,
  },
  security: [{ apiKey: [] }],
};

export const checkAddressSchema = {
  description: 'Проверка корректности адреса доставки',
  tags: ['iiko'],
  summary: 'Проверяет корректность адреса для доставки',
  body: {
    type: 'object',
    properties: {
      city: { type: 'string', description: 'Название города' },
      street: { type: 'string', description: 'Название улицы' },
      home: { type: 'string', description: 'Номер дома' },
    },
    required: ['city', 'street', 'home'],
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Адрес успешно проверен',
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Адрес проверен и валиден' },
      },
    },
    ...defaultError,
  },
  security: [{ apiKey: [] }],
};
