import { errorSchema } from '../helpers/scheme.helper.js';

/**
 * Схема модели User для создания и обновления
 */
export const userEntity = {
  type: 'object',
  properties: {
    phone: {
      type: 'string',
      description: 'Номер телефона пользователя',
    },
    name: {
      type: 'string',
      maxLength: 60,
      description: 'Имя пользователя',
      nullable: true,
    },
    email: {
      type: 'string',
      maxLength: 60,
      description: 'Электронная почта пользователя',
      nullable: true,
    },
    gender: {
      type: 'string',
      enum: ['male', 'female'],
      description: 'Пол пользователя',
    },
    birthday: {
      type: 'string',
      description: 'Дата рождения пользователя',
    },
    isActive: {
      type: 'boolean',
      description: 'Активен ли пользователь',
    },
    balance: {
      type: 'integer',
      description: 'Баланс пользователя',
    },
    isCompanyEmployee: {
      type: 'boolean',
      description: 'Является ли сотрудником компании',
    },
    PUSHNotifications: {
      type: 'boolean',
      description: 'Получает ли пользователь PUSH-уведомления',
    },
    receiveAdvertisingInformation: {
      type: 'boolean',
      description: 'Получает ли пользователь рекламную информацию',
    },
  },
  additionalProperties: true,
};

/**
 * Схема для получения списка пользователей (GET /user/)
 */
export const getUsersSchema = {
  description: 'Получение списка пользователей с пагинацией',
  tags: ['Пользователь'],
  summary: 'Возвращает массив пользователей с информацией о пагинации',
  querystring: {
    type: 'object',
    properties: {
      page: {
        type: 'integer',
        minimum: 1,
        default: 1,
        description: 'Номер страницы для пагинации',
      },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      description: 'Список пользователей успешно получен',
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'ID пользователя' },
              name: { type: 'string', description: 'Имя пользователя' },
              phone: { type: 'string', description: 'Номер телефона' },
              email: { type: 'string', description: 'Электронная почта' },
              gender: { type: 'string', enum: ['male', 'female'], description: 'Пол пользователя' },
              birthday: { type: ['string', 'null'], description: 'Дата рождения' },
              isActive: { type: 'boolean', description: 'Активен ли пользователь' },
              balance: { type: 'integer', description: 'Баланс пользователя' },
              isCompanyEmployee: { type: 'boolean', description: 'Является ли сотрудником компании' },
              PUSHNotifications: { type: 'boolean', description: 'Получает ли пользователь PUSH-уведомления' },
              receiveAdvertisingInformation: { type: 'boolean', description: 'Получает ли пользователь рекламную информацию' },
              createdAt: { type: 'string', description: 'Дата создания записи' },
              updatedAt: { type: 'string', description: 'Дата последнего обновления записи' },
              sum: { type: 'number', description: 'Сумма заказов пользователя' },
              count: { type: 'integer', description: 'Количество заказов пользователя' },
            },
            additionalProperties: true,
          },
        },
        pagination: {
          type: 'object',
          properties: {
            currentPage: { type: 'integer', description: 'Текущая страница' },
            pageSize: { type: 'integer', description: 'Количество элементов на странице' },
            totalPages: { type: 'integer', description: 'Общее количество страниц' },
            totalItems: { type: 'integer', description: 'Общее количество пользователей' },
          },
        },
      },
    },
    500: errorSchema(500, 'Внутренняя ошибка сервера'),
  },
  security: [{ apiKey: [] }],
};

/**
 * Схема для получения одного пользователя по номеру телефона (GET /user/:phone)
 */
export const getUserSchema = {
  description: 'Получение информации о пользователе по номеру телефона',
  tags: ['Пользователь'],
  summary: 'Возвращает данные пользователя, если номер телефона совпадает с аутентифицированным',
  params: {
    type: 'object',
    properties: {
      phone: {
        type: 'string',
        description: 'Номер телефона пользователя',
      },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      description: 'Информация о пользователе успешно получена',
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID пользователя' },
        name: { type: 'string', description: 'Имя пользователя' },
        phone: { type: 'string', description: 'Номер телефона' },
        email: { type: 'string', description: 'Электронная почта' },
        gender: { type: 'string', enum: ['male', 'female'], description: 'Пол пользователя' },
        birthday: { type: ['string', 'null'], description: 'Дата рождения' },
        isActive: { type: 'boolean', description: 'Активен ли пользователь' },
        balance: { type: 'integer', description: 'Баланс пользователя' },
        isCompanyEmployee: { type: 'boolean', description: 'Является ли сотрудником компании' },
        PUSHNotifications: { type: 'boolean', description: 'Получает ли пользователь PUSH-уведомления' },
        receiveAdvertisingInformation: { type: 'boolean', description: 'Получает ли пользователь рекламную информацию' },
        createdAt: { type: 'string', description: 'Дата создания записи' },
        updatedAt: { type: 'string', description: 'Дата последнего обновления записи' },
      },
      additionalProperties: true,
    },
    403: errorSchema(403, 'Нет прав для получения информации о другом пользователе'),
    404: errorSchema(404, 'Пользователь не найден'),
    500: errorSchema(500, 'Внутренняя ошибка сервера'),
  },
  security: [{ apiKey: [] }],
};

/**
 * Схема для получения истории доставки пользователя (GET /user/:phone/history)
 */
export const getUserHistorySchema = {
  description: 'Получение истории доставки пользователя по номеру телефона',
  tags: ['Пользователь'],
  summary: 'Возвращает историю доставки пользователя, если номер телефона совпадает с аутентифицированным',
  params: {
    type: 'object',
    properties: {
      phone: {
        type: 'string',
        description: 'Номер телефона пользователя',
      },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      description: 'История доставки успешно получена',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'ID заказа' },
          createdAt: { type: 'string', description: 'Дата и время создания заказа' },
          total: { type: 'number', description: 'Общая сумма заказа' },
          status: { type: 'string', description: 'Статус заказа' },
          products: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                productId: { type: 'string', description: 'ID продукта' },
                name: { type: 'string', description: 'Название продукта' },
                amount: { type: 'integer', description: 'Количество' },
                price: { type: 'number', description: 'Цена за единицу' },
                isGift: { type: 'boolean', description: 'Подарок' },
                isAction: { type: 'boolean', description: 'Акционный продукт' },
              },
              additionalProperties: true,
            },
            description: 'Список продуктов в заказе',
          },
        },
        additionalProperties: true,
      },
    },
    403: errorSchema(403, 'Нет прав для получения информации о другом пользователе'),
    500: errorSchema(500, 'Внутренняя ошибка сервера'),
  },
  security: [{ apiKey: [] }],
};

/**
 * Схема для создания нового пользователя (POST /user/)
 */
export const createUserSchema = {
  description: 'Создание нового пользователя',
  tags: ['Пользователь'],
  summary: 'Создаёт нового пользователя и возвращает его данные',
  body: userEntity,
  response: {
    201: {
      description: 'Пользователь успешно создан',
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID пользователя' },
        name: { type: 'string', description: 'Имя пользователя' },
        phone: { type: 'string', description: 'Номер телефона' },
        email: { type: 'string', description: 'Электронная почта' },
        gender: { type: 'string', enum: ['male', 'female'], description: 'Пол пользователя' },
        birthday: { type: ['string', 'null'], description: 'Дата рождения' },
        isActive: { type: 'boolean', description: 'Активен ли пользователь' },
        balance: { type: 'integer', description: 'Баланс пользователя' },
        isCompanyEmployee: { type: 'boolean', description: 'Является ли сотрудником компании' },
        PUSHNotifications: { type: 'boolean', description: 'Получает ли пользователь PUSH-уведомления' },
        receiveAdvertisingInformation: { type: 'boolean', description: 'Получает ли пользователь рекламную информацию' },
        createdAt: { type: 'string', description: 'Дата создания записи' },
        updatedAt: { type: 'string', description: 'Дата последнего обновления записи' },
      },
      additionalProperties: true,
    },
    400: errorSchema(400, 'Некорректные данные для создания пользователя'),
    500: errorSchema(500, 'Внутренняя ошибка сервера'),
  },
  security: [{ apiKey: [] }],
};

/**
 * Схема для удаления пользователя (DELETE /user/:phone)
 */
export const deleteUserSchema = {
  description: 'Удаление пользователя по номеру телефона',
  tags: ['Пользователь'],
  summary: 'Удаляет пользователя, если номер телефона совпадает с аутентифицированным',
  params: {
    type: 'object',
    properties: {
      phone: {
        type: 'string',
        description: 'Номер телефона пользователя',
      },
    },
    additionalProperties: true,
  },
  response: {
    204: {
      description: 'Пользователь успешно удалён',
      type: 'null',
    },
    403: errorSchema(403, 'Нет прав для удаления другого пользователя'),
    404: errorSchema(404, 'Пользователь не найден'),
    500: errorSchema(500, 'Внутренняя ошибка сервера'),
  },
  security: [{ apiKey: [] }],
};

/**
 * Схема для обновления пользователя (PATCH /user/:phone)
 */
export const updateUserSchema = {
  description: 'Обновление данных пользователя по номеру телефона',
  tags: ['Пользователь'],
  summary: 'Обновляет данные пользователя',
  params: {
    type: 'object',
    properties: {
      phone: {
        type: 'string',
        description: 'Номер телефона пользователя',
      },
    },
    additionalProperties: true,
  },
  body: {
    type: 'object',
    properties: {
      phone: userEntity.properties.phone,
      name: userEntity.properties.name,
      email: userEntity.properties.email,
      gender: userEntity.properties.gender,
      birthday: userEntity.properties.birthday,
      isActive: {
        type: 'boolean',
        description: 'Активен ли пользователь',
      },
      balance: {
        type: 'integer',
        description: 'Баланс пользователя',
      },
      isCompanyEmployee: {
        type: 'boolean',
        description: 'Является ли сотрудником компании',
      },
      PUSHNotifications: {
        type: 'boolean',
        description: 'Получает ли пользователь PUSH-уведомления',
      },
      receiveAdvertisingInformation: {
        type: 'boolean',
        description: 'Получает ли пользователь рекламную информацию',
      },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      description: 'Данные пользователя успешно обновлены',
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID пользователя' },
        name: { type: 'string', description: 'Имя пользователя' },
        phone: { type: 'string', description: 'Номер телефона' },
        email: { type: 'string', description: 'Электронная почта' },
        gender: { type: 'string', enum: ['male', 'female'], description: 'Пол пользователя' },
        birthday: { type: ['string', 'null'], description: 'Дата рождения' },
        isActive: { type: 'boolean', description: 'Активен ли пользователь' },
        balance: { type: 'integer', description: 'Баланс пользователя' },
        isCompanyEmployee: { type: 'boolean', description: 'Является ли сотрудником компании' },
        PUSHNotifications: { type: 'boolean', description: 'Получает ли пользователь PUSH-уведомления' },
        receiveAdvertisingInformation: { type: 'boolean', description: 'Получает ли пользователь рекламную информацию' },
        createdAt: { type: 'string', description: 'Дата создания записи' },
        updatedAt: { type: 'string', description: 'Дата последнего обновления записи' },
      },
      additionalProperties: true,
    },
    403: errorSchema(403, 'Нет прав для изменения данных другого пользователя'),
    422: errorSchema(422, 'Некорректные данные для обновления пользователя'),
    404: errorSchema(404, 'Пользователь не найден'),
    500: errorSchema(500, 'Внутренняя ошибка сервера'),
  },
  security: [{ apiKey: [] }],
};

/**
 * Схема для получения последнего заказа пользователя (GET /user/:id/last-order)
 */
export const getUserLastOrderSchema = {
  description: 'Получение последнего заказа пользователя по ID',
  tags: ['Пользователь'],
  summary: 'Возвращает последний заказ пользователя',
  params: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'ID пользователя',
      },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      description: 'Последний заказ пользователя успешно получен',
      type: 'object',
      properties: {
        createdAt: {
          type: 'string',
          description: 'Дата и время создания заказа',
        },
        products: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productId: {
                type: 'string',
                description: 'ID продукта',
              },
              amount: {
                type: 'integer',
                description: 'Количество',
              },
              isGift: {
                type: 'integer',
                description: 'Подарок (0 или 1)',
              },
              name: {
                type: 'string',
                description: 'Название продукта',
              },
              isAction: {
                type: 'boolean',
                description: 'Акционный продукт',
              },
              mods: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'integer',
                      description: 'ID модификатора',
                    },
                    orderProductId: {
                      type: 'integer',
                      description: 'ID заказа продукта',
                    },
                    iikoId: {
                      type: 'string',
                      description: 'iiko ID модификатора',
                    },
                    name: {
                      type: 'string',
                      description: 'Название модификатора',
                    },
                    code: {
                      type: 'string',
                      description: 'Код модификатора',
                    },
                    price: {
                      type: 'integer',
                      description: 'Цена модификатора',
                    },
                    amount: {
                      type: 'integer',
                      description: 'Количество модификатора',
                    },
                    groupId: {
                      type: 'string',
                      description: 'ID группы модификаторов',
                    },
                    groupName: {
                      type: 'string',
                      description: 'Название группы модификаторов',
                    },
                    isGift: {
                      type: 'boolean',
                      description: 'Подарок модификатора',
                    },
                    createdAt: {
                      type: 'string',
                      description: 'Дата и время создания модификатора',
                    },
                    updatedAt: {
                      type: 'string',
                      description: 'Дата и время последнего обновления модификатора',
                    },
                  },
                  additionalProperties: true,
                },
                description: 'Модификаторы продукта',
              },
            },
            additionalProperties: true,
          },
          description: 'Список продуктов в заказе',
        },
      },
      additionalProperties: true,
    },
    404: errorSchema(404, 'Заказ не найден'),
    500: errorSchema(500, 'Внутренняя ошибка сервера'),
  },
  security: [{ apiKey: [] }],
};

/**
 * Схема для получения лайков пользователя (GET /user/:id/like)
 */
export const getUserLikesSchema = {
  description: 'Получение лайков пользователя по ID пользователя',
  tags: ['Пользователь'],
  summary: 'Возвращает список лайков пользователя',
  params: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'ID пользователя',
      },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      description: 'Лайки пользователя успешно получены',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'ID лайка' },
          productId: { type: 'string', description: 'ID продукта' },
          userId: { type: 'string', description: 'ID пользователя' },
        },
        additionalProperties: true,
      },
    },
    404: errorSchema(404, 'Пользователь не найден'),
    500: errorSchema(500, 'Внутренняя ошибка сервера'),
  },
  security: [{ apiKey: [] }],
};
