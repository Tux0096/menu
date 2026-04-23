import { defaultError } from '../helpers/scheme.helper.js';

export const Group = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    slug: { type: 'string' },
    id: { type: 'string', format: 'uuid' },
    parentGroup: {
      type: 'string',
      format: 'uuid',
      nullable: true,
    },
    isIncludedInMenu: { type: 'integer' },
    order: { type: 'integer' },
    additionalInfo: {
      type: 'object',
      properties: {
        isServiceGroup: { type: 'boolean' },
      },
      nullable: true,
      additionalProperties: true,
    },
    isGroupModifier: { type: 'integer' },
    image: { type: 'string' },
    nameTo: { type: 'string' },
  },
  additionalProperties: true,
  required: [
    'name',
    'slug',
    'id',
    'isIncludedInMenu',
    'order',
    'isGroupModifier',
    'image',
    'nameTo',
  ],
};

export const getGroupSchema = {
  description: 'Получение списка групп',
  tags: ['Каталог'],
  response: {
    200: {
      type: 'array',
      items: Group,
    },
    ...defaultError,
  },
};
export const Product = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    nameTo: { type: 'string' },
    code: { type: 'string' },
    parentGroup: { type: 'string', format: 'uuid', nullable: true },
    price: { type: 'number' },
    composition: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          image: { type: 'string' },
        },
      },
    },
    weight: { type: 'number' },
    count: { type: 'integer', nullable: true },
    order: { type: 'integer' },
    energyAmount: { type: 'number' },
    fiberAmount: { type: 'number' },
    fatAmount: { type: 'number' },
    carbohydrateAmount: { type: 'number' },
    additionalInfo: {
      type: 'object',
      properties: {
        count: { type: 'integer', nullable: true },
        weight: { type: 'number', nullable: true },
        isNovokujbyshevskHidden: { type: 'boolean' },
        filters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              code: { type: 'string' },
            },
          },
          nullable: true,
        },
        allergens: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              code: { type: 'string' },
            },
          },
          additionalProperties: true,
          nullable: true,
        },
      },
      nullable: true,

    },
    groupModifiers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
        },
        additionalProperties: true,
      },
      nullable: true,

    },
    slug: { type: 'string' },
    likesCount: { type: 'integer' },
    isLiked: { type: 'boolean' },
    description: { type: 'string' },
    image: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    filters: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          code: { type: 'string' },
        },
      },
      nullable: true,
    },
    allergens: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          code: { type: 'string' },
        },
      },
      nullable: true,
    },
  },
  additionalProperties: true,
  required: ['id', 'name', 'code', 'price', 'weight', 'slug', 'createdAt'],
};

export const getProductSchema = {
  description: 'Получение списка товаров',
  tags: ['Каталог'],
  response: {
    200: {
      type: 'array',
      items: Product,
    },
    ...defaultError,
  },
};

export const getCatalogSchema = {
  description: 'Получение каталога',
  tags: ['Каталог'],
  querystring: {
    type: 'object',
    properties: {
      deliveryTerminalId: {
        type: 'string',
        format: 'uuid',
        description: 'ID терминала доставки для фильтрации по стоп-листам',
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        products: {
          type: 'array',
          items: Product,
        },
        groups: {
          type: 'array',
          items: Group,
        },
        stopList: {
          type: 'array',
          items: {
            type: 'string',
            format: 'uuid',
          },
          description: 'Массив ID товаров в стоп-листе для указанного терминала',
        },
      },
      additionalProperties: true,
    },
    ...defaultError,
  },
};
