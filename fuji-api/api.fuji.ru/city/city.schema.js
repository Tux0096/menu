import { defaultError } from '../helpers/scheme.helper.js';

export const getCitiesSchema = {
  description: 'Получение списка городов',
  tags: ['Города'],
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          iikoId: { type: 'string' },
          name: { type: 'string' },
          additionalInfo: { type: 'string', nullable: true },
          classifierId: { type: 'string' },
          deleted: { type: 'integer' },
          externalRevision: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          slug: { type: 'string' },
          cityIn: { type: 'string' },
        },
      },
    },
    ...defaultError,
  },
};
