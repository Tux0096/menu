import { defaultError, errorSchema } from '../helpers/scheme.helper.js';

export const addressModelScheme = {
  id: { type: 'integer', description: 'ID адреса' },
  userId: {
    type: 'string',
    format: 'uuid',
    nullable: true,
    description: 'ID пользователя',
  },
  isDeleted: {
    type: 'boolean',
    default: false,
    description: 'Флаг удаления',
  },
  city: { type: 'string', description: 'Наименование города' },
  street: { type: 'string', description: 'Наименование улицы' },
  zoneId: { type: 'string', nullable: true, description: 'ID зоны' },
  streetId: {
    type: 'string',
    nullable: true,
    description: 'Идентификатор улицы в RMS',
  },
  streetClassifierId: {
    type: 'string',
    nullable: true,
    description: 'Идентификатор улицы в классификаторе (например, КЛАДР)',
  },
  home: { type: 'string', description: 'Дом' },
  housing: { type: 'string', nullable: true, description: 'Корпус' },
  apartment: { type: 'string', nullable: true, description: 'Квартира' },
  entrance: { type: 'string', nullable: true, description: 'Подъезд' },
  floor: { type: 'string', nullable: true, description: 'Этаж' },
  doorphone: { type: 'string', nullable: true, description: 'Домофон' },
  isPrivateHouse: {
    type: 'boolean',
    default: false,
    description: 'Признак частного дома',
  },
  comment: {
    type: 'string',
    nullable: true,
    description: 'Дополнительная информация',
  },
  regionId: {
    type: 'string',
    nullable: true,
    description: 'Идентификатор района',
  },
  externalCartographyId: {
    type: 'string',
    nullable: true,
    description: 'ID во внешней картографической системе',
  },
  index: { type: 'string', nullable: true, description: 'Почтовый индекс' },
  createdAt: {
    type: 'string',
    format: 'date-time',
    description: 'Дата и время создания записи',
  },
  updatedAt: {
    type: 'string',
    format: 'date-time',
    description: 'Дата и время последнего обновления записи',
  },
};

export const addressEntity = {
  city: {
    type: 'string',
    description: 'Наименование города',
  },
  street: {
    type: 'string',
    description: 'Наименование улицы',
  },
  home: {
    type: 'string',
    description: 'Дом',
  },
  apartment: {
    type: 'string',
    nullable: true,
    description: 'Квартира',
  },
  entrance: {
    type: 'string',
    nullable: true,
    description: 'Подъезд',
  },
  floor: {
    type: 'string',
    nullable: true,
    description: 'Этаж',
  },
  housing: {
    type: 'string',
    nullable: true,
    description: 'Корпус',
  },
  doorphone: {
    type: 'string',
    nullable: true,
    description: 'Домофон',
  },
  isPrivateHouse: {
    type: 'boolean',
    default: false,
    description: 'Признак частного дома',
  },
  zoneId: {
    type: 'string',
    format: 'uuid',
    nullable: true,
    description: 'ID зоны',
  },
  streetId: {
    type: 'string',
    format: 'uuid',
    nullable: true,
    description: 'Идентификатор улицы в RMS',
  },
  userId: {
    type: 'string',
    format: 'uuid',
    nullable: true,
    description: 'ID пользователя',
  },
};

export const addressSchema = {
  type: 'object',
  properties: addressModelScheme,
  required: ['id', 'city', 'street', 'home'],
};

export const getAddressesSchema = {
  description: 'Получить адреса по ID пользователя',
  tags: ['Адрес'],
  summary: 'Возвращает список адресов для указанного пользователя',
  params: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        description: 'ID пользователя',
      },
    },
    required: ['id'],
  },
  response: {
    200: {
      description: 'Успешный ответ. Возвращает массив адресов.',
      type: 'array',
      items: addressSchema,
    },
    ...defaultError,
  },
  security: [{ apiKey: [] }],
};

export const createAddressSchema = {
  description: 'Создать новый адрес',
  tags: ['Адрес'],
  summary: 'Создает новый адрес для пользователя',
  body: addressEntity,
  response: {
    201: {
      description: 'Адрес успешно создан',
      type: 'object',
      properties: addressSchema.properties,
    },
    ...defaultError,
  },
  required: ['city', 'street', 'home'],
  additionalProperties: false,
  security: [{ apiKey: [] }],
};

export const updateAddressSchema = {
  description: 'Обновить адрес по ID',
  tags: ['Адрес'],
  summary: 'Обновляет адрес для указанного пользователя',
  params: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        description: 'ID адреса',
      },
    },
    required: ['id'],
  },
  body: addressEntity,
  response: {
    200: {
      description: 'Адрес успешно обновлен',
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', description: 'ID обновленного адреса' },
        ...addressSchema.properties,
      },
    },
    401: errorSchema(401, 'Доступ запрещен'),
    500: errorSchema(500, 'Что-то пошло не так'),
  },
  security: [{ apiKey: [] }],
};

export const deleteAddressSchema = {
  description: 'Удалить адрес по ID',
  tags: ['Адрес'],
  summary: 'Удаляет адрес для указанного пользователя',
  params: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: 'ID адреса',
      },
    },
    required: ['id'],
  },
  response: {
    200: {
      description: 'Адрес успешно удален',
      type: 'object',
      properties: {
        statusCode: { type: 'integer', example: 200 },
        message: { type: 'string', example: 'Адрес успешно удален' },
      },
    },
    401: errorSchema(401, 'Доступ запрещен'),
    500: errorSchema(500, 'Что-то пошло не так'),
  },
  security: [{ apiKey: [] }],
};
