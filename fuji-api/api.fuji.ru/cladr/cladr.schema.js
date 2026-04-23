import { defaultError } from '../helpers/scheme.helper.js';

const cladrEntity = {
  iikoId: { type: 'string' },
  id: { type: 'string' },
  name: { type: 'string' },
  nameWithCity: { type: 'string' },
  classifierId: { type: 'string' },
  cityName: { type: 'string' },
};

export const getCladrSchema = {
  description: 'Получение списка КЛАДР',
  tags: ['КЛАДР'],
  params: {
    type: 'object',
    properties: {
      cityIikoId: { type: 'string', nullable: true },
    },
  },
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: cladrEntity,
      },
    },
    ...defaultError,
  },
};

export const getCityCladrSchema = {
  description: 'Получение КЛАДР для конкретного города',
  tags: ['КЛАДР'],
  params: {
    type: 'object',
    properties: {
      cityIikoId: {
        type: 'string',
        format: 'uuid',
        description: 'ID города в iiko',
      },
    },
    required: ['cityIikoId'],
  },
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: cladrEntity,
      },
    },
    ...defaultError,
  },
};
