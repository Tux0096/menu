// order/order.schema.js
import { errorSchema } from '../helpers/scheme.helper.js';

/**
 * Схема для запроса чека
 */
export const receiptSchema = {
  type: 'object',
  properties: {
    params: {
      type: 'object',
      properties: {
        iikoOrderId: {
          type: 'string',
          description: 'ID заказа в системе iiko',
        },
      },
      required: ['iikoOrderId'],
    },
  },
  required: ['params'],
};

/**
 * Схема для модификаторов продукта
 */
const productModifierSchema = {
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
      description: 'Является ли модификатор подарком',
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      description: 'Дата и время создания модификатора',
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      description: 'Дата и время последнего обновления модификатора',
    },
  },
  additionalProperties: true,
};

/**
 * Схема для продукта в заказе
 */
const orderProductSchema = {
  type: 'object',
  properties: {
    productId: {
      type: 'string',
      description: 'ID продукта',
    },
    amount: {
      type: 'integer',
      description: 'Количество продукта',
    },
    isGift: {
      type: 'integer',
      description: 'Продукт является подарком',
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
      items: productModifierSchema,
      description: 'Модификаторы продукта',
    },
  },
  additionalProperties: true,
};

/**
 * Схема для создания заказа (POST /order/)
 */
export const createOrderSchema = {
  description: 'Создание нового заказа',
  tags: ['Заказ'],
  summary: 'Создаёт новый заказ и возвращает его данные',
  body: {
    type: 'object',
    properties: {
      user: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID пользователя',
          },
          name: {
            type: 'string',
            description: 'Имя пользователя',
          },
          phone: {
            type: 'string',
            description: 'Номер телефона пользователя',
          },
        },

        additionalProperties: true,
      },
      coupon: {
        type: 'string',
        description: 'Купон пользователя',
        nullable: true,
      },
      spendBonus: {
        type: 'integer',
        description: 'Количество бонусов, которые пользователь хочет потратить',
        nullable: true,
      },
      order: {
        type: 'object',
        properties: {
          payment: {
            type: 'string',
            description: 'Тип оплаты',
            enum: ['SBP', 'ONL', 'CASH', 'CARD'],
          },
          delivery: {
            type: 'string',
            description: 'Способ доставки',
            enum: ['self', 'delivery'],
          },
          deliveryDateTime: {
            type: 'string',
            format: 'date-time',
            description: 'Дата и время доставки',
          },
          comment: {
            type: 'string',
            description: 'Комментарий к заказу',
            nullable: true,
          },
          personsCount: {
            type: 'integer',
            description: 'Количество человек',
          },
          basket: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                product: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string',
                      description: 'ID продукта',
                    },
                    name: {
                      type: 'string',
                      description: 'Название продукта',
                    },
                    code: {
                      type: 'string',
                      description: 'Код продукта',
                    },
                    price: {
                      type: 'integer',
                      description: 'Цена продукта',
                    },
                    isGift: {
                      type: 'boolean',
                      description: 'Является ли продукт подарком',
                    },
                  },
                  additionalProperties: true,
                },
                quantity: {
                  type: 'integer',
                  description: 'Количество продукта в корзине',
                },
                mods: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        description: 'ID модификатора',
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
                    },
                    additionalProperties: true,
                  },
                  description: 'Модификаторы продукта',
                },
              },
              additionalProperties: true,
            },
            description: 'Список продуктов в корзине',
            minItems: 1,
          },
          total: {
            type: 'integer',
            description: 'Общая сумма заказа после скидок',
            minimum: 0,
          },
          zoneId: {
            type: 'string',
            description: 'ID зоны доставки',
          },
          terminalId: {
            type: 'string',
            description: 'ID терминала который обрабатывает заказ',
            nullable: true,
          },
          isSelfService: {
            type: 'boolean',
            description: 'Является ли заказ заказом на самовывоз',
          },
          addressId: {
            type: 'integer',
            description: 'ID адреса доставки',
            nullable: true,
          },
        },
        additionalProperties: true,
      },
    },
    additionalProperties: true,
  },
  response: {
    201: {
      description: 'Заказ успешно создан',
      type: 'object',
      properties: {
        isOrderCreated: {
          type: 'boolean',
          description: 'Флаг успешного создания заказа',
        },
        orderId: {
          type: 'integer',
          description: 'ID созданного заказа',
        },
      },
      additionalProperties: true,
    },
    400: errorSchema(400, 'Некорректные данные для создания заказа'),
    403: errorSchema(403, 'Доставка по данному адресу временно недоступна'),
    422: errorSchema(422, 'Некорректные данные для создания заказа'),
    500: errorSchema(500, 'Внутренняя ошибка сервера'),
  },
  security: [{ apiKey: [] }],
};

/**
 * Схема для получения списка заказов (GET /order/)
 */
export const getOrdersSchema = {
  description: 'Получение списка заказов с пагинацией',
  tags: ['Заказ'],
  summary: 'Возвращает массив заказов с информацией о пагинации',
  querystring: {
    type: 'object',
    properties: {
      page: {
        type: 'integer',
        minimum: 1,
        default: 1,
        description: 'Номер страницы для пагинации',
      },
      filter: {
        type: 'string',
        description: 'Фильтр в формате JSON',
        nullable: true,
      },
      order: {
        type: 'string',
        description: 'Порядок сортировки в формате JSON',
        nullable: true,
      },
      limit: {
        type: 'integer',
        minimum: 1,
        default: 50,
        description: 'Количество элементов на странице',
      },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      description: 'Список заказов успешно получен',
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer', description: 'ID заказа' },
              userId: { type: 'string', description: 'ID пользователя' },
              addressId: { type: 'integer', description: 'ID адреса доставки' },
              zoneId: { type: 'string', description: 'ID зоны доставки' },
              terminalId: { type: 'string', description: 'ID терминала, который обрабатывает заказ' },
              total: { type: 'number', description: 'Общая сумма заказа' },
              paymentType: { type: 'string', description: 'Тип оплаты' },
              personsCount: { type: 'integer', description: 'Количество человек' },
              isSelfService: { type: 'boolean', description: 'Является ли заказ самообслуживанием' },
              comment: { type: 'string', description: 'Комментарий к заказу' },
              coupon: { type: 'string', description: 'Купон', nullable: true },
              spendBonus: { type: 'integer', description: 'Потраченные бонусы', nullable: true },
              status: {
                type: 'string',
                enum: ['NEW', 'WAIT_PAYMENT', 'PAYED', 'COMPLETED', 'ERROR_PAYMENT'],
                description: 'Статус заказа (платежей и обработки)',
              },
              isIikoSend: { type: 'boolean', description: 'Отправлен ли заказ в iiko' },
              isTelegramSend: { type: 'boolean', description: 'Отправлен ли заказ в Telegram' },
              deliveryDateTime: {
                type: 'string',
                format: 'date-time',
                description: 'Дата и время доставки',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: 'Дата и время создания заказа',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                description: 'Дата и время последнего обновления заказа',
              },
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
            totalItems: { type: 'integer', description: 'Общее количество элементов' },
          },
          additionalProperties: true,
        },
      },
      additionalProperties: true,
    },
    500: errorSchema(500, 'Внутренняя ошибка сервера'),
  },
  security: [{ apiKey: [] }],
};

/**
 * Схема для получения REST списка заказов (GET /order/rest)
 */
export const getOrdersRestSchema = {
  description: 'Получение списка ресторанов для заказов',
  tags: ['Заказ'],
  summary: 'Возвращает список ресторанов для заказов',
  response: {
    200: {
      description: 'Список ресторанов успешно получен',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID ресторана' },
          name: { type: 'string', description: 'Название ресторана' },
          address: { type: 'string', description: 'Адрес ресторана' },
        },
        additionalProperties: true,
      },
    },
    500: errorSchema(500, 'Внутренняя ошибка сервера'),
  },
  security: [{ apiKey: [] }],
};

/**
 * Схема для ответа на создание заказа (если необходимо)
 */
export const createOrderResponseSchema = {
  type: 'object',
  properties: {
    isOrderCreated: {
      type: 'boolean',
      description: 'Флаг успешного создания заказа',
    },
    orderId: {
      type: 'string',
      description: 'ID созданного заказа',
    },
  },
  additionalProperties: true,
};

export const orderStatusUpdateSchema = {
  description: 'Обновление статуса доставки из внешней системы',
  tags: ['Доставка'],
  body: {
    type: 'object',
    required: ['id', 'number', 'phone', 'status'],
    properties: {
      id: { type: 'string', description: 'ID заказа в системе iiko (UUID)' },
      number: { type: 'integer', description: 'Номер заказа' },
      phone: { type: 'string', description: 'Телефон клиента' },
      status: {
        type: 'string',
        enum: [
          'Unconfirmed', 'WaitCooking', 'ReadyForCooking', 'CookingStarted',
          'CookingCompleted', 'Waiting', 'OnWay', 'OnWayCourier', 'CourierNearby',
          'Delivered', 'Closed', 'Cancelled',
        ],
        description: 'Статус доставки',
      },
      courierInfo: {
        type: 'object',
        description: 'Информация о курьере',
        nullable: true,
        properties: {
          name: { type: 'string', description: 'Имя курьера' },
          phone: { type: 'string', description: 'Телефон курьера' },
        },
        additionalProperties: true,
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            deliveryId: { type: 'integer' },
            orderId: { type: 'integer' },
            status: { type: 'string' },
          },
        },
      },
    },
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' },
      },
    },
    401: {
      type: 'object',
      properties: {
        error: { type: 'string' },
      },
    },
    404: {
      type: 'object',
      properties: {
        error: { type: 'string' },
      },
    },
    500: {
      type: 'object',
      properties: {
        error: { type: 'string' },
      },
    },
  },
  security: [
    {
      apiKey: [],
    },
  ],
};
