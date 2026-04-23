import { defaultError } from '../helpers/scheme.helper.js';

// Общая схема для файла для использования в ответах API
const fileSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer', description: 'ID файла' },
    originalName: { type: 'string', description: 'Оригинальное имя файла', nullable: true },
    fileName: { type: 'string', description: 'Имя файла в системе', nullable: true },
    path: { type: 'string', description: 'Путь к файлу', nullable: true },
    createdAt: { type: 'string', format: 'date-time', description: 'Дата создания файла' },
    updatedAt: { type: 'string', format: 'date-time', description: 'Дата обновления файла' },
  },
};

export const getPromocodesSchema = {
  description: 'Получить список всех доступных промокодов',
  tags: ['Промокоды'],
  summary: 'Возвращает все доступные промокоды',
  response: {
    200: {
      description: 'Успешный ответ. Возвращает массив промокодов.',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'ID промокода' },
          active: { type: 'boolean', description: 'Активен ли промокод', default: true },
          coupon: { type: 'string', description: 'Код промокода' },
          fullPrice: { type: 'number', description: 'Минимальная сумма для использования промокода' },
          code: { type: 'string', description: 'Артикул товара, которой будет добавлен по промокоду' },
          dateFrom: {
            type: 'string', format: 'date-time', description: 'Дата начала действия промокода', nullable: true,
          },
          dateTo: {
            type: 'string', format: 'date-time', description: 'Дата окончания действия промокода', nullable: true,
          },
          times: { type: 'integer', description: 'Максимальное количество использований', nullable: true },
          hasProduct: { type: 'string', description: 'Необходимый продукт для использования промокода', nullable: true },
          title: { type: 'string', description: 'Заголовок промокода', nullable: true },
          description: { type: 'string', description: 'Описание промокода', nullable: true },
          isForSegment: { type: 'boolean', description: 'Флаг, указывающий, что промокод доступен только для определенного сегмента пользователей', default: false },
          hasTimeRestriction: { type: 'boolean', description: 'Ограничение по времени (Пн-Чт)', default: false },
          timeFrom: { type: 'string', description: 'Время начала действия (формат: HH:mm)', nullable: true },
          timeTo: { type: 'string', description: 'Время окончания действия (формат: HH:mm)', nullable: true },
          listBannerId: { type: 'integer', description: 'ID файла баннера для списка', nullable: true },
          cardBannerId: { type: 'integer', description: 'ID файла баннера для карточки', nullable: true },
          listBanner: { ...fileSchema, nullable: true, description: 'Файл баннера для списка' },
          cardBanner: { ...fileSchema, nullable: true, description: 'Файл баннера для карточки' },
        },
      },
    },
    ...defaultError,
  },
  security: [{ apiKey: [] }],
};

export const addPromocodeSchema = {
  description: 'Добавить новый промокод',
  tags: ['Промокоды'],
  summary: 'Добавляет новый промокод',
  body: {
    type: 'object',
    properties: {
      active: { type: 'boolean', description: 'Активен ли промокод', default: true },
      coupon: { type: 'string', description: 'Код промокода' },
      fullPrice: { type: 'number', description: 'Минимальная сумма для использования промокода', default: 0 },
      code: { type: 'string', description: 'Артикул товара, которой будет добавлен по промокоду' },
      dateFrom: {
        type: 'string', format: 'date-time', description: 'Дата начала действия промокода', nullable: true,
      },
      dateTo: {
        type: 'string', format: 'date-time', description: 'Дата окончания действия промокода', nullable: true,
      },
      times: { type: 'integer', description: 'Максимальное количество использований', nullable: true },
      hasProduct: { type: 'string', description: 'Необходимый продукт для использования промокода', nullable: true },
      title: { type: 'string', description: 'Заголовок промокода', nullable: true },
      description: { type: 'string', description: 'Описание промокода', nullable: true },
      hasTimeRestriction: { type: 'boolean', description: 'Ограничение по времени (Пн-Чт)', default: false },
      timeFrom: { type: 'string', description: 'Время начала действия (формат: HH:mm)', nullable: true },
      timeTo: { type: 'string', description: 'Время окончания действия (формат: HH:mm)', nullable: true },
      listBannerId: { type: 'integer', description: 'ID файла баннера для списка', nullable: true },
      cardBannerId: { type: 'integer', description: 'ID файла баннера для карточки', nullable: true },
    },
    required: ['coupon', 'code'],
  },
  response: {
    201: {
      description: 'Промокод успешно добавлен',
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'ID промокода' },
        coupon: { type: 'string', description: 'Код промокода' },
        active: { type: 'boolean', description: 'Активен ли промокод' },
        code: { type: 'string', description: 'Код для идентификации промокода' },
        title: { type: 'string', description: 'Заголовок промокода', nullable: true },
        description: { type: 'string', description: 'Описание промокода', nullable: true },
        listBannerId: { type: 'integer', description: 'ID файла баннера для списка', nullable: true },
        cardBannerId: { type: 'integer', description: 'ID файла баннера для карточки', nullable: true },
      },
    },
    ...defaultError,
  },
  security: [{ apiKey: [] }],
};

export const updatePromocodeSchema = {
  description: 'Обновить существующий промокод',
  tags: ['Промокоды'],
  summary: 'Обновляет данные промокода по ID',
  params: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: 'ID промокода',
      },
    },
    required: ['id'],
  },
  body: {
    type: 'object',
    properties: {
      active: { type: 'boolean', description: 'Активен ли промокод', default: true },
      coupon: { type: 'string', description: 'Код промокода' },
      fullPrice: { type: 'number', description: 'Минимальная сумма для использования промокода', default: 0 },
      code: { type: 'string', description: 'Код для идентификации промокода' },
      dateFrom: {
        type: 'string', format: 'date-time', description: 'Дата начала действия промокода', nullable: true,
      },
      dateTo: {
        type: 'string', format: 'date-time', description: 'Дата окончания действия промокода', nullable: true,
      },
      times: { type: 'integer', description: 'Максимальное количество использований', nullable: true },
      hasProduct: { type: 'string', description: 'Необходимый продукт для использования промокода', nullable: true },
      title: { type: 'string', description: 'Заголовок промокода', nullable: true },
      description: { type: 'string', description: 'Описание промокода', nullable: true },
      hasTimeRestriction: { type: 'boolean', description: 'Ограничение по времени (Пн-Чт)', default: false },
      timeFrom: { type: 'string', description: 'Время начала действия (формат: HH:mm)', nullable: true },
      timeTo: { type: 'string', description: 'Время окончания действия (формат: HH:mm)', nullable: true },
      listBannerId: { type: 'integer', description: 'ID файла баннера для списка', nullable: true },
      cardBannerId: { type: 'integer', description: 'ID файла баннера для карточки', nullable: true },
    },
  },
  response: {
    201: {
      description: 'Промокод успешно обновлен',
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'ID промокода' },
        coupon: { type: 'string', description: 'Код промокода' },
        active: { type: 'boolean', description: 'Активен ли промокод' },
        code: { type: 'string', description: 'Код для идентификации промокода' },
        title: { type: 'string', description: 'Заголовок промокода', nullable: true },
        description: { type: 'string', description: 'Описание промокода', nullable: true },
        listBannerId: { type: 'integer', description: 'ID файла баннера для списка', nullable: true },
        cardBannerId: { type: 'integer', description: 'ID файла баннера для карточки', nullable: true },
      },
    },
    ...defaultError,
  },
  security: [{ apiKey: [] }],
};

export const deletePromocodeSchema = {
  description: 'Удалить промокод',
  tags: ['Промокоды'],
  summary: 'Удаляет промокод по ID',
  params: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: 'ID промокода',
      },
    },
    required: ['id'],
  },
  response: {
    201: {
      description: 'Промокод успешно удален',
      type: 'object',
      properties: {
        statusCode: { type: 'integer', example: 201 },
        message: { type: 'string', example: 'Промокод успешно удален' },
      },
    },
    ...defaultError,
  },
  security: [{ apiKey: [] }],
};

// Схема для загрузки баннеров промокодов
export const uploadPromoBannerSchema = {
  description: 'Загрузить баннер для промокода',
  tags: ['Промокоды'],
  summary: 'Загружает баннер для промокода и связывает его с промокодом',
  params: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: 'ID промокода',
      },
      type: {
        type: 'string',
        enum: ['list', 'card'],
        description: 'Тип баннера: для списка или для карточки',
      },
    },
    required: ['id', 'type'],
  },
  consumes: ['multipart/form-data'],
  body: {
    type: 'object',
    properties: {
      file: {
        type: 'string',
        format: 'binary',
        description: 'Файл баннера',
      },
    },
    required: ['file'],
  },
  response: {
    201: {
      description: 'Баннер успешно загружен и связан с промокодом',
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'ID промокода' },
        type: { type: 'string', description: 'Тип баннера: list или card' },
        bannerId: { type: 'integer', description: 'ID загруженного файла баннера' },
        file: { ...fileSchema, description: 'Информация о загруженном файле' },
      },
    },
    ...defaultError,
  },
  security: [{ apiKey: [] }],
};

// Схема для удаления баннера промокода
export const deletePromoBannerSchema = {
  description: 'Удалить баннер промокода',
  tags: ['Промокоды'],
  summary: 'Удаляет баннер промокода и отвязывает его от промокода',
  params: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: 'ID промокода',
      },
      type: {
        type: 'string',
        enum: ['list', 'card'],
        description: 'Тип баннера: для списка или для карточки',
      },
    },
    required: ['id', 'type'],
  },
  response: {
    201: {
      description: 'Баннер успешно удален',
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'ID промокода' },
        type: { type: 'string', description: 'Тип баннера: list или card' },
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Баннер успешно удален' },
      },
    },
    ...defaultError,
  },
  security: [{ apiKey: [] }],
};

// Схема для получения информации о баннерах промокода
export const getPromocodeBannersSchema = {
  description: 'Получить информацию о баннерах промокода',
  tags: ['Промокоды'],
  summary: 'Возвращает информацию о баннерах для списка и карточки промокода',
  params: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: 'ID промокода',
      },
    },
    required: ['id'],
  },
  response: {
    200: {
      description: 'Информация о баннерах промокода',
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'ID промокода' },
        listBanner: {
          type: 'object',
          nullable: true,
          properties: {
            ...fileSchema.properties,
          },
          description: 'Информация о баннере для списка',
        },
        cardBanner: {
          type: 'object',
          nullable: true,
          properties: {
            ...fileSchema.properties,
          },
          description: 'Информация о баннере для карточки',
        },
      },
    },
    ...defaultError,
  },
  security: [{ apiKey: [] }],
};
