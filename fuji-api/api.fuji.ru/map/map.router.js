import * as mapService from './map.service.js';
import { apiKeyAuth, errorHandler } from './map.middleware.js';
import authMiddleware from '../middleware/auth.middleware.js';

export default (fastify, opts, done) => {
  const zoneSchema = {
    type: 'object',
    required: ['coords', 'fillColor', 'zoneId', 'address'],
    properties: {
      coords: {
        type: 'array',
        minItems: 3,
        items: {
          type: 'object',
          required: ['lat', 'lng'],
          properties: {
            lat: { type: 'number' },
            lng: { type: 'number' },
          },
        },
      },
      fillColor: { type: 'string', pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$' },
      zoneName: { type: 'string', maxLength: 50, description: 'название зоны (например: "зона 10.1")' },
      zone_id: {
        type: 'string', minLength: 36, maxLength: 36, description: 'уникальный ID зоны',
      },
      city_id: {
        type: 'string', minLength: 36, maxLength: 36, description: 'уникальный ID города',
      },
      terminal_id: {
        type: 'string', minLength: 36, maxLength: 36, description: 'уникальный ID терминала',
      },
      deliveryId: {
        type: 'string', minLength: 36, maxLength: 36, description: 'ID товара доставки из iiko',
      },
      address: { type: 'string', minLength: 1, description: 'адрес зоны доставки' },
      preparationTime: { type: 'integer', description: 'время приготовления в минутах' },
      deliveryTime: { type: 'integer', description: 'время доставки в минутах' },
    },
  };

  // Получение стоимости доставки по зоне
  fastify.get('/delivery/:zoneId', {
    preValidation: authMiddleware(['user']),
    schema: {
      hide: true,
      tags: ['Зоны доставки'],
      summary: 'Получение стоимости доставки по зоне',
      description: 'Возвращает стоимость доставки для указанной зоны.',
      params: {
        type: 'object',
        required: ['zoneId'],
        properties: {
          zoneId: { type: 'string', minLength: 1 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            deliveryId: { type: 'string', description: 'ID товара доставки' },
            price: { type: 'number', description: 'Стоимость доставки' },
            name: { type: 'string', description: 'Название товара доставки' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { zoneId } = request.params;
      const deliveryInfo = await mapService.getZoneDeliveryCost(zoneId);
      if (!deliveryInfo) {
        return reply.code(404).send({
          error: 'Not Found',
          message: `Стоимость доставки для зоны ${zoneId} не найдена`,
        });
      }
      return deliveryInfo;
    } catch (error) {
      return errorHandler(error, request, reply);
    }
  });

  // Получение списка терминалов доставки для внешних систем
  fastify.get('/terminals', {
    preValidation: apiKeyAuth,
    schema: {
      tags: ['Терминалы доставки'],
      summary: 'Получение списка терминалов для внешних систем',
      description: 'Возвращает список всех терминалов доставки с их адресами и идентификаторами для внешних систем.',
      security: [{ externalApiKey: [] }],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              address: { type: 'string', description: 'Адрес терминала' },
              deliveryTerminalId: { type: 'string', description: 'ID терминала доставки' },
              organizationId: { type: ['string', 'null'], description: 'ID организации' },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const terminals = await mapService.getDeliveryTerminals();
      return terminals;
    } catch (error) {
      return errorHandler(error, request, reply);
    }
  });

  // Получение всех зон из базы данных
  fastify.get('/all', {
    preValidation: apiKeyAuth,
    schema: {
      tags: ['Зоны доставки'],
      summary: 'Получение всех зон',
      description: 'Возвращает список всех зон доставки из базы данных.',
      security: [{ externalApiKey: [] }],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              city_id: { type: 'string' },
              zone_id: { type: 'string' },
              terminal_id: { type: ['string', 'null'] },
              deliveryId: { type: 'string', description: 'ID товара доставки из iiko' },
              address: { type: 'string', description: 'адрес зоны доставки' },
              zoneName: { type: 'string', description: 'название зоны' },
              preparationTime: { type: 'integer', description: 'время приготовления в минутах' },
              deliveryTime: { type: 'integer', description: 'время доставки в минутах' },
              zone_data: {
                type: 'object',
                additionalProperties: true,
              },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const zones = await mapService.getAllZones();
      return zones;
    } catch (error) {
      return errorHandler(error, request, reply);
    }
  });

  // Получение всех зон для города (для фронтенда)
  fastify.get('/:cityId', {
    preValidation: authMiddleware(['user']),
    schema: {
      hide: true,
      tags: ['Зоны доставки'],
      summary: 'Получение всех зон для города',
      description: 'Возвращает список всех зон доставки для указанного города.',
      params: {
        type: 'object',
        required: ['cityId'],
        properties: {
          cityId: { type: 'string', minLength: 36, maxLength: 36 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            mapCenter: {
              type: 'object',
              properties: {
                latitude: { type: 'number' },
                longitude: { type: 'number' },
              },
            },
            mapZoom: { type: 'number' },
            mapZones: {
              type: 'array',
              items: zoneSchema,
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { cityId } = request.params;
      const zones = await mapService.getZonesForFrontend(cityId);
      return zones;
    } catch (error) {
      return errorHandler(error, request, reply);
    }
  });

  // Получение зон терминала в конкретном городе
  fastify.get('/:cityId/terminal/:terminalId', {
    preValidation: apiKeyAuth,
    schema: {
      tags: ['Зоны доставки'],
      summary: 'Получение зон терминала в городе',
      description: 'Возвращает зоны конкретного терминала в указанном городе.',
      security: [{ externalApiKey: [] }],
      params: {
        type: 'object',
        required: ['cityId', 'terminalId'],
        properties: {
          cityId: { type: 'string', minLength: 36, maxLength: 36 },
          terminalId: { type: 'string', minLength: 1 },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              city_id: { type: 'string' },
              zone_id: { type: 'string' },
              terminal_id: { type: 'string' },
              deliveryId: { type: 'string', description: 'ID товара доставки из iiko' },
              address: { type: 'string', description: 'адрес зоны доставки' },
              zoneName: { type: 'string', description: 'название зоны' },
              preparationTime: { type: 'integer', description: 'время приготовления в минутах' },
              deliveryTime: { type: 'integer', description: 'время доставки в минутах' },
              zone_data: zoneSchema,
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { cityId, terminalId } = request.params;
      const zones = await mapService.getZonesByTerminalAndCity(cityId, terminalId);
      return zones;
    } catch (error) {
      return errorHandler(error, request, reply);
    }
  });

  // Получение конкретной зоны
  fastify.get('/zone/:zoneId', {
    preValidation: authMiddleware(['user']),
    schema: {
      hide: true,
      tags: ['Зоны доставки'],
      summary: 'Получение данных зоны по ID',
      description: 'Возвращает данные конкретной зоны доставки по ID, включая terminal_id.',
      params: {
        type: 'object',
        required: ['zoneId'],
        properties: {
          zoneId: { type: 'string', minLength: 1 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            city_id: { type: 'string' },
            zone_id: { type: 'string' },
            terminal_id: { type: 'string' },
            deliveryId: { type: 'string', description: 'ID товара доставки из iiko' },
            address: { type: 'string', description: 'адрес зоны доставки' },
            zoneName: { type: 'string', description: 'название зоны' },
            preparationTime: { type: 'integer', description: 'время приготовления в минутах' },
            deliveryTime: { type: 'integer', description: 'время доставки в минутах' },
            zone_data: zoneSchema,
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { zoneId } = request.params;
      const zone = await mapService.getZoneById(zoneId);
      if (!zone) {
        return reply.code(404).send({
          error: 'Not Found',
          message: `Зона с идентификатором ${zoneId} не найдена`,
        });
      }
      return zone;
    } catch (error) {
      return errorHandler(error, request, reply);
    }
  });

  // Получение конкретной зоны
  fastify.get('/:cityId/:zoneId', {
    preValidation: apiKeyAuth,
    schema: {
      tags: ['Зоны доставки'],
      summary: 'Получение данных зоны',
      description: 'Возвращает данные конкретной зоны доставки по ID.',
      security: [{ externalApiKey: [] }],
      params: {
        type: 'object',
        required: ['zoneId'],
        properties: {
          zoneId: { type: 'string', minLength: 36, maxLength: 36 },
        },
      },
      response: {
        200: zoneSchema,
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { zoneId } = request.params;
      const zone = await mapService.getZoneById(zoneId);
      if (!zone) {
        return reply.code(404).send({
          error: 'Not Found',
          message: `Зона с идентификатором ${zoneId} не найдена`,
        });
      }
      return zone.zone_data;
    } catch (error) {
      return errorHandler(error, request, reply);
    }
  });

  // Создание новой зоны для терминала
  fastify.post('/:cityId/terminal/:terminalId', {
    preValidation: apiKeyAuth,
    schema: {
      tags: ['Зоны доставки'],
      summary: 'Создание зоны для терминала',
      description: 'Создает новую зону доставки для указанного терминала.',
      security: [{ externalApiKey: [] }],
      params: {
        type: 'object',
        required: ['cityId', 'terminalId'],
        properties: {
          cityId: { type: 'string', minLength: 36, maxLength: 36 },
          terminalId: { type: 'string', minLength: 1 },
        },
      },
      body: {
        type: 'object',
        required: ['coords', 'fillColor', 'zoneId', 'address'],
        properties: {
          coords: {
            type: 'array',
            minItems: 3,
            items: {
              type: 'object',
              required: ['lat', 'lng'],
              properties: {
                lat: { type: 'number' },
                lng: { type: 'number' },
              },
            },
          },
          fillColor: { type: 'string', pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$' },
          zoneName: { type: 'string', maxLength: 50, description: 'название зоны (например: "зона 10.1")' },
          zoneId: {
            type: 'string', minLength: 36, maxLength: 36, description: 'уникальный ID зоны',
          },
          deliveryId: {
            type: 'string', minLength: 36, maxLength: 36, description: 'ID товара доставки из iiko',
          },
          address: { type: 'string', minLength: 1, description: 'адрес зоны доставки' },
          preparationTime: { type: 'integer', description: 'время приготовления в минутах' },
          deliveryTime: { type: 'integer', description: 'время доставки в минутах' },
        },
      },
      response: {
        201: zoneSchema,
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
        409: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { cityId, terminalId } = request.params;
      const { deliveryId, ...zoneData } = request.body;
      const zone = await mapService.createZoneForTerminal(cityId, terminalId, deliveryId || null, zoneData);
      return reply.code(201).send(zone.zone_data);
    } catch (error) {
      return errorHandler(error, request, reply);
    }
  });

  // Создание или обновление зоны для терминала
  fastify.put('/:cityId/terminal/:terminalId', {
    preValidation: apiKeyAuth,
    schema: {
      tags: ['Зоны доставки'],
      summary: 'Создание или обновление зоны для терминала',
      description: 'Создает новую зону или обновляет существующую для терминала.',
      security: [{ externalApiKey: [] }],
      params: {
        type: 'object',
        required: ['cityId', 'terminalId'],
        properties: {
          cityId: { type: 'string', minLength: 36, maxLength: 36 },
          terminalId: { type: 'string', minLength: 1 },
        },
      },
      body: {
        type: 'object',
        required: ['coords', 'fillColor', 'zoneId', 'address'],
        properties: {
          coords: {
            type: 'array',
            minItems: 3,
            items: {
              type: 'object',
              required: ['lat', 'lng'],
              properties: {
                lat: { type: 'number' },
                lng: { type: 'number' },
              },
            },
          },
          fillColor: { type: 'string', pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$' },
          zoneName: { type: 'string', maxLength: 50, description: 'название зоны (например: "зона 10.1")' },
          zoneId: {
            type: 'string', minLength: 36, maxLength: 36, description: 'уникальный ID зоны',
          },
          deliveryId: {
            type: 'string', minLength: 36, maxLength: 36, description: 'ID товара доставки из iiko',
          },
          address: { type: 'string', minLength: 1, description: 'адрес зоны доставки' },
          preparationTime: { type: 'integer', description: 'время приготовления в минутах' },
          deliveryTime: { type: 'integer', description: 'время доставки в минутах' },
        },
      },
      response: {
        201: zoneSchema,
        200: zoneSchema,
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { cityId, terminalId } = request.params;
      const { deliveryId, ...zoneData } = request.body;
      const { zone, isNew } = await mapService
        .createOrUpdateZoneForTerminal(cityId, terminalId, deliveryId || null, zoneData);
      return reply.code(isNew ? 201 : 200).send(zone.zone_data);
    } catch (error) {
      return errorHandler(error, request, reply);
    }
  });

  // Обновление существующей зоны
  fastify.put('/:zoneId', {
    preValidation: apiKeyAuth,
    schema: {
      hide: true,
      tags: ['Зоны доставки'],
      summary: 'Обновление зоны',
      description: 'Обновляет данные существующей зоны доставки по её идентификатору.',
      security: [{ externalApiKey: [] }],
      params: {
        type: 'object',
        required: ['zoneId'],
        properties: {
          zoneId: { type: 'string', minLength: 1 },
        },
      },
      body: {
        type: 'object',
        properties: {
          coords: {
            type: 'array',
            minItems: 3,
            items: {
              type: 'object',
              required: ['lat', 'lng'],
              properties: {
                lat: { type: 'number' },
                lng: { type: 'number' },
              },
            },
          },
          fillColor: { type: 'string', pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$' },
          address: { type: 'string', description: 'адрес зоны доставки' },
          terminalId: { type: 'string', description: 'Новый ID терминала (опционально)' },
        },
      },
      response: {
        200: zoneSchema,
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { zoneId } = request.params;
      const { terminalId, ...zoneData } = request.body;
      const zone = await mapService.updateZoneWithTerminal(zoneId, zoneData, terminalId);
      if (!zone) {
        return reply.code(404).send({
          error: 'Not Found',
          message: `Зона с идентификатором ${zoneId} не найдена`,
        });
      }
      return zone.zone_data;
    } catch (error) {
      return errorHandler(error, request, reply);
    }
  });

  // Удаление зоны
  fastify.delete('/:zoneId', {
    preValidation: apiKeyAuth,
    schema: {
      tags: ['Зоны доставки'],
      summary: 'Удаление зоны',
      description: 'Удаляет существующую зону доставки по её идентификатору.',
      security: [{ externalApiKey: [] }],
      params: {
        type: 'object',
        required: ['zoneId'],
        properties: {
          zoneId: { type: 'string', minLength: 1 },
        },
      },
      response: {
        204: { type: 'null' },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { zoneId } = request.params;
      const zone = await mapService.getZoneById(zoneId);
      if (!zone) {
        return reply.code(404).send({
          error: 'Not Found',
          message: `Зона с идентификатором ${zoneId} не найдена`,
        });
      }
      const result = await mapService.deleteZone(zoneId);
      if (!result) {
        return reply.code(404).send({
          error: 'Not Found',
          message: `Зона с идентификатором ${zoneId} не найдена`,
        });
      }
      return reply.code(204).send();
    } catch (error) {
      return errorHandler(error, request, reply);
    }
  });

  done();
};
