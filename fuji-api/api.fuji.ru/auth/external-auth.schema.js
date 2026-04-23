import { errorSchema } from '../helpers/scheme.helper.js';

/**
 * Схема для генерации токена (OAuth2-подобный эндпоинт)
 */
export const tokenSchema = {
  description: 'Получение access_token для внешней системы',
  tags: ['External Auth'],
  summary: 'OAuth2-подобный эндпоинт для получения JWT токена',
  body: {
    type: 'object',
    required: ['client_id', 'client_secret'],
    properties: {
      client_id: {
        type: 'string',
        description: 'Идентификатор клиентского приложения',
        minLength: 3,
        maxLength: 100,
      },
      client_secret: {
        type: 'string',
        description: 'Секретный ключ клиентского приложения',
        minLength: 8,
      },
      grant_type: {
        type: 'string',
        enum: ['client_credentials'],
        default: 'client_credentials',
        description: 'Тип авторизации (только client_credentials поддерживается)',
      },
    },
  },
  response: {
    200: {
      description: 'Токен успешно получен',
      type: 'object',
      properties: {
        access_token: { type: 'string', description: 'JWT access token' },
        token_type: { type: 'string', enum: ['Bearer'], description: 'Тип токена' },
        expires_in: { type: 'integer', description: 'Время жизни токена в секундах' },
        scope: {
          type: 'array',
          items: { type: 'string' },
          description: 'Массив разрешений клиента',
        },
      },
    },
    401: errorSchema(401, 'Недействительные учетные данные клиента'),
    400: errorSchema(400, 'Некорректные параметры запроса'),
    500: errorSchema(500, 'Ошибка генерации токена'),
  },
};

/**
 * Схема для создания клиента (админский эндпоинт)
 */
export const createClientSchema = {
  description: 'Создание нового клиентского приложения',
  tags: ['External Auth'],
  summary: 'Создает новое клиентское приложение с правами доступа',
  body: {
    type: 'object',
    required: ['client_id', 'client_secret', 'name', 'scopes'],
    properties: {
      client_id: {
        type: 'string',
        description: 'Уникальный идентификатор клиента',
        minLength: 3,
        maxLength: 100,
        pattern: '^[a-zA-Z0-9_-]+$',
      },
      client_secret: {
        type: 'string',
        description: 'Секретный ключ клиента (минимум 12 символов)',
        minLength: 12,
        maxLength: 128,
      },
      name: {
        type: 'string',
        description: 'Название клиентского приложения',
        minLength: 3,
        maxLength: 200,
      },
      scopes: {
        type: 'array',
        description: 'Массив разрешений в формате действие:ресурс',
        items: {
          type: 'string',
          pattern: '^[a-z]+:[a-z-]+$',
          examples: ['read:orders', 'update:delivery-status', 'admin:system'],
        },
        minItems: 1,
      },
      description: {
        type: 'string',
        description: 'Описание клиентского приложения',
        nullable: true,
      },
      token_expires_in: {
        type: 'integer',
        description: 'Время жизни генерируемых токенов в секундах',
        default: 3600,
        minimum: 300, // минимум 5 минут
        maximum: 86400, // максимум 24 часа
      },
    },
  },
  response: {
    201: {
      description: 'Клиент успешно создан',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'ID записи' },
            client_id: { type: 'string', description: 'Идентификатор клиента' },
            name: { type: 'string', description: 'Название приложения' },
            scopes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Разрешения клиента',
            },
            token_expires_in: { type: 'integer', description: 'Время жизни токенов' },
            description: { type: 'string', description: 'Описание', nullable: true },
            is_active: { type: 'boolean', description: 'Активен ли клиент' },
            created_at: { type: 'string', format: 'date-time', description: 'Дата создания' },
          },
        },
      },
    },
    400: errorSchema(400, 'Некорректные данные'),
    409: errorSchema(409, 'Клиент с таким client_id уже существует'),
    500: errorSchema(500, 'Ошибка создания клиента'),
  },
  security: [{ apiKey: [] }],
};

/**
 * Схема для получения списка клиентов (админский эндпоинт)
 */
export const getClientsSchema = {
  description: 'Получение списка всех клиентских приложений',
  tags: ['External Auth'],
  summary: 'Возвращает список всех клиентов (только для администраторов)',
  response: {
    200: {
      description: 'Список клиентов успешно получен',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer', description: 'ID записи' },
              client_id: { type: 'string', description: 'Идентификатор клиента' },
              name: { type: 'string', description: 'Название приложения' },
              scopes: {
                type: 'array',
                items: { type: 'string' },
                description: 'Разрешения клиента',
              },
              is_active: { type: 'boolean', description: 'Активен ли клиент' },
              token_expires_in: { type: 'integer', description: 'Время жизни токенов' },
              description: { type: 'string', description: 'Описание', nullable: true },
              created_at: { type: 'string', format: 'date-time', description: 'Дата создания' },
            },
          },
        },
      },
    },
    500: errorSchema(500, 'Ошибка получения списка клиентов'),
  },
  security: [{ apiKey: [] }],
};

/**
 * Схема для обновления scope клиента (админский эндпоинт)
 */
export const updateClientScopesSchema = {
  description: 'Обновление разрешений клиентского приложения',
  tags: ['External Auth'],
  summary: 'Обновляет список разрешений для указанного клиента',
  params: {
    type: 'object',
    required: ['clientId'],
    properties: {
      clientId: {
        type: 'string',
        description: 'Идентификатор клиента',
      },
    },
  },
  body: {
    type: 'object',
    required: ['scopes'],
    properties: {
      scopes: {
        type: 'array',
        description: 'Новый массив разрешений',
        items: {
          type: 'string',
          pattern: '^[a-z]+:[a-z-]+$',
        },
        minItems: 0,
      },
    },
  },
  response: {
    200: {
      description: 'Разрешения клиента успешно обновлены',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
    404: errorSchema(404, 'Активный клиент не найден'),
    400: errorSchema(400, 'Некорректные данные'),
    500: errorSchema(500, 'Ошибка обновления разрешений'),
  },
  security: [{ apiKey: [] }],
};

/**
 * Схема для деактивации клиента (админский эндпоинт)
 */
export const deactivateClientSchema = {
  description: 'Деактивация клиентского приложения',
  tags: ['External Auth'],
  summary: 'Деактивирует указанного клиента',
  params: {
    type: 'object',
    required: ['clientId'],
    properties: {
      clientId: {
        type: 'string',
        description: 'Идентификатор клиента',
      },
    },
  },
  response: {
    200: {
      description: 'Клиент успешно деактивирован',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
    404: errorSchema(404, 'Клиент не найден'),
    500: errorSchema(500, 'Ошибка деактивации клиента'),
  },
  security: [{ apiKey: [] }],
};
