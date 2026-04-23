import { defaultError } from '../helpers/scheme.helper.js';

export const sendVacancySchema = {
  description: 'Отправка заявки на вакансию',
  tags: ['Форма'],
  summary: 'Отправляет форму вакансии на указанные email адреса',
  body: {
    type: 'object',
    properties: {
      vacancies: { type: 'string', description: 'Название вакансии' },
      fio: { type: 'string', description: 'ФИО кандидата' },
      phone: { type: 'string', description: 'Телефон кандидата' },
    },
    required: ['vacancies', 'fio', 'phone'],
    additionalProperties: false,
  },
  querystring: {
    type: 'object',
    properties: {
      token: { type: 'string', description: 'reCaptcha токен' },
      type: { type: 'string', description: 'Тип проверки reCaptcha' },
    },
    required: ['token', 'type'],
  },
  response: {
    200: {
      description: 'Успешная отправка формы вакансии',
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Форма успешно отправлена' },
      },
    },
    ...defaultError,
  },
};
