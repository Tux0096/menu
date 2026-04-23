import * as externalAuthService from './external-auth.service.js';
import * as externalAuthSchema from './external-auth.schema.js';
import authMiddleware from '../middleware/auth.middleware.js';

export default async function externalAuthRouter(fastify) {
  // OAuth2-подобный эндпоинт для получения токена
  fastify.post('/token', {
    schema: externalAuthSchema.tokenSchema,
  }, async (request, reply) => {
    try {
      const { client_id, client_secret, grant_type = 'client_credentials' } = request.body;

      // Проверяем тип авторизации
      if (grant_type !== 'client_credentials') {
        reply.status(400).send({
          error: 'unsupported_grant_type',
          error_description: 'Поддерживается только grant_type=client_credentials',
        });
        return;
      }

      // Генерируем токен
      const tokenData = await externalAuthService.generateAccessToken(client_id, client_secret);

      reply.status(200).send(tokenData);
    } catch (error) {
      // OAuth2-подобные ошибки
      if (error.code === 'INVALID_CLIENT_CREDENTIALS') {
        reply.status(401).send({
          error: 'invalid_client',
          error_description: 'Недействительные учетные данные клиента',
        });
        return;
      }

      reply.status(error.statusCode || 500).send({
        error: 'server_error',
        error_description: error.message || 'Внутренняя ошибка сервера',
      });
    }
  });

  // Админские эндпоинты для управления клиентами

  // Создание нового клиента
  fastify.post('/admin/clients', {
    schema: externalAuthSchema.createClientSchema,
    preHandler: [authMiddleware(['admin'])],
  }, async (request, reply) => {
    try {
      const clientData = {
        clientId: request.body.client_id,
        clientSecret: request.body.client_secret,
        name: request.body.name,
        scopes: request.body.scopes,
        description: request.body.description,
        tokenExpiresIn: request.body.token_expires_in || 3600,
      };

      const result = await externalAuthService.createClient(clientData);

      reply.status(201).send({
        success: true,
        data: {
          ...result,
          client_id: result.clientId, // Возвращаем в camelCase и snake_case для совместимости
        },
      });
    } catch (error) {
      // Проверяем на ошибку дубликата клиента
      if (error.name === 'SequelizeUniqueConstraintError') {
        reply.status(409).send({
          success: false,
          error: 'Клиент с таким client_id уже существует',
          code: 'CLIENT_ID_ALREADY_EXISTS',
        });
        return;
      }

      reply.status(error.statusCode || 500).send({
        success: false,
        error: error.message,
        code: error.code,
      });
    }
  });

  // Получение списка клиентов
  fastify.get('/admin/clients', {
    schema: externalAuthSchema.getClientsSchema,
    preHandler: [authMiddleware(['admin'])],
  }, async (request, reply) => {
    try {
      const clients = await externalAuthService.getAllClients();

      reply.status(200).send({
        success: true,
        data: clients.map((client) => ({
          ...client.toJSON(),
          client_id: client.clientId, // Добавляем snake_case для совместимости
        })),
      });
    } catch (error) {
      reply.status(error.statusCode || 500).send({
        success: false,
        error: error.message,
        code: error.code,
      });
    }
  });

  // Обновление scope клиента
  fastify.put('/admin/clients/:clientId/scopes', {
    schema: externalAuthSchema.updateClientScopesSchema,
    preHandler: [authMiddleware(['admin'])],
  }, async (request, reply) => {
    try {
      const { clientId } = request.params;
      const { scopes } = request.body;

      await externalAuthService.updateClientScopes(clientId, scopes);

      reply.status(200).send({
        success: true,
        message: 'Разрешения клиента успешно обновлены',
      });
    } catch (error) {
      reply.status(error.statusCode || 500).send({
        success: false,
        error: error.message,
        code: error.code,
      });
    }
  });

  // Деактивация клиента
  fastify.delete('/admin/clients/:clientId', {
    schema: externalAuthSchema.deactivateClientSchema,
    preHandler: [authMiddleware(['admin'])],
  }, async (request, reply) => {
    try {
      const { clientId } = request.params;
      await externalAuthService.deactivateClient(clientId);

      reply.status(200).send({
        success: true,
        message: 'Клиент успешно деактивирован',
      });
    } catch (error) {
      reply.status(error.statusCode || 500).send({
        success: false,
        error: error.message,
        code: error.code,
      });
    }
  });
}
