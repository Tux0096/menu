import * as mapService from './map.service.js';
import authMiddleware from '../middleware/auth.middleware.js';
import * as terminalsService from '../terminals/terminals.service.js';

export default (fastify, opts, done) => {
  fastify.get('/zones/:cityId', {
    preValidation: authMiddleware(['admin']),
    schema: { hide: true },
  }, async (request, reply) => {
    try {
      const { cityId } = request.params;
      const zones = await mapService.getZonesByCity(cityId);
      return zones;
    } catch (error) {
      console.error('Ошибка получения зон:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Ошибка при получении зон',
      });
    }
  });

  fastify.get('/terminals', {
    preValidation: authMiddleware(['admin']),
    schema: { hide: true },
  }, async (request, reply) => {
    try {
      // Получаем все терминалы из базы данных
      const allTerminals = await terminalsService.getActiveTerminals();

      return allTerminals.map((terminal) => ({
        deliveryTerminalId: terminal.terminalId,
        name: terminal.name || terminal.address,
        address: terminal.address,
        isDisable: terminal.isDisabled,
        deliveryGroupName: terminal.deliveryGroupName,
        deliveryRestaurantName: terminal.deliveryRestaurantName,
        organizationId: terminal.organizationId,
      }));
    } catch (error) {
      console.error('Ошибка получения терминалов:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Ошибка при получении терминалов',
      });
    }
  });

  // Новый эндпоинт для обновления терминала и доставки зоны
  fastify.patch('/zone/:zoneId/terminal', {
    preValidation: authMiddleware(['admin']),
    schema: {
      hide: true,
      tags: ['Админка - Зоны'],
      summary: 'Обновление терминала и доставки зоны',
      description: 'Обновляет терминал, товар доставки и другие параметры для указанной зоны.',
      params: {
        type: 'object',
        required: ['zoneId'],
        properties: {
          zoneId: { type: 'string', minLength: 1 },
        },
      },
      body: {
        type: 'object',
        required: ['terminalId'],
        properties: {
          terminalId: {
            type: ['string', 'null'],
            description: 'ID терминала или null для сброса',
          },
          deliveryId: {
            type: 'string',
            description: 'ID товара доставки из iiko (опционально)',
          },
          address: {
            type: 'string',
            description: 'Адрес зоны доставки',
          },
          zoneName: {
            type: 'string',
            description: 'Название зоны в формате "зона X.Y"',
          },
          preparationTime: {
            type: 'integer',
            minimum: 1,
            maximum: 999,
            description: 'Время приготовления в минутах',
          },
          deliveryTime: {
            type: 'integer',
            minimum: 1,
            maximum: 999,
            description: 'Время доставки в минутах',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            zone: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                city_id: { type: 'string' },
                zone_id: { type: 'string' },
                terminal_id: { type: ['string', 'null'] },
                deliveryId: { type: 'string' },
                address: { type: 'string', description: 'адрес зоны доставки' },
                zoneName: { type: 'string' },
                preparationTime: { type: 'integer' },
                deliveryTime: { type: 'integer' },
                updated_at: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
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
      const { zoneId } = request.params;
      const {
        terminalId, deliveryId, address, zoneName, preparationTime, deliveryTime,
      } = request.body;

      const updatedZone = await mapService
        .updateZoneTerminalAndAddress(
          zoneId,
          terminalId,
          deliveryId,
          address,
          zoneName,
          preparationTime,
          deliveryTime,
        );

      if (!updatedZone) {
        return reply.code(404).send({
          error: 'Not Found',
          message: `Зона с ID ${zoneId} не найдена`,
        });
      }

      return reply.code(200).send({
        success: true,
        message: 'Зона успешно обновлена',
        zone: {
          id: updatedZone.id,
          city_id: updatedZone.city_id,
          zone_id: updatedZone.zone_id,
          terminal_id: updatedZone.terminal_id,
          deliveryId: updatedZone.deliveryId,
          address: updatedZone.address,
          zoneName: updatedZone.zoneName,
          preparationTime: updatedZone.preparationTime,
          deliveryTime: updatedZone.deliveryTime,
          updated_at: updatedZone.updated_at,
        },
      });
    } catch (error) {
      console.error('Ошибка обновления зоны:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Ошибка при обновлении зоны',
      });
    }
  });

  fastify.patch('/zones/:zoneId/terminal', {
    preValidation: authMiddleware(['admin']),
    schema: { hide: true },
  }, async (request, reply) => {
    try {
      const { zoneId } = request.params;
      const { terminalId } = request.body;

      // Проверяем что зона существует
      const existingZone = await mapService.getZoneById(zoneId);
      if (!existingZone) {
        return reply.code(404).send({
          error: 'Not Found',
          message: `Зона с ID ${zoneId} не найдена`,
        });
      }

      const updatedZone = await mapService.updateZoneWithTerminal(zoneId, {}, terminalId);

      return {
        success: true,
        message: 'Терминал успешно назначен зоне',
        zone: {
          id: updatedZone.id,
          zone_id: updatedZone.zone_id,
          terminal_id: updatedZone.terminal_id,
          updated_at: updatedZone.updated_at,
        },
      };
    } catch (error) {
      console.error('Ошибка обновления терминала зоны:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Ошибка при обновлении терминала зоны',
      });
    }
  });

  done();
};
