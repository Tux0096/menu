import * as externalAuthService from '../auth/external-auth.service.js';

const SCOPE_AUTH_ERROR = {
  message: 'Недостаточно прав доступа',
  code: 'INSUFFICIENT_SCOPE',
  description: 'У вас нет необходимых разрешений для выполнения этого действия.',
};

const TOKEN_AUTH_ERROR = {
  message: 'Недействительный или отсутствующий токен',
  code: 'INVALID_TOKEN',
  description: 'Пожалуйста, предоставьте действительный Bearer токен.',
};

/**
 * Middleware для проверки JWT токена и scope
 * @param {string|Array<string>} requiredScopes - Обязательные scope (строка или массив)
 * @returns {Function} Fastify middleware функция
 */
export default (requiredScopes = []) => (request, reply, done) => {
  if (request.method === 'OPTIONS') {
    done();
    return;
  }

  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply
        .code(401)
        .send({
          ...TOKEN_AUTH_ERROR,
          message: 'Отсутствует Bearer токен',
          description: 'Необходимо передать токен в заголовке Authorization: Bearer <token>.',
        });
      return;
    }

    // Извлекаем токен (убираем "Bearer " из начала)
    const token = authHeader.substring(7);

    // Асинхронная верификация токена
    externalAuthService.verifyAccessToken(token)
      .then((tokenPayload) => {
        // Проверяем scope
        const scopesToCheck = Array.isArray(requiredScopes) ? requiredScopes : [requiredScopes];

        // Если scope не требуется, просто пропускаем
        if (scopesToCheck.length === 0) {
          request.client = tokenPayload;
          done();
          return;
        }

        // Проверяем наличие всех необходимых scope
        const hasAllScopes = scopesToCheck.every((scope) => externalAuthService.hasScope(tokenPayload, scope));

        if (!hasAllScopes) {
          reply
            .code(403)
            .send({
              ...SCOPE_AUTH_ERROR,
              data: {
                required_scopes: scopesToCheck,
                client_scopes: tokenPayload.scope,
              },
            });
          return;
        }

        // Добавляем информацию о клиенте в request
        request.client = tokenPayload;
        done();
      })
      .catch((error) => {
        const statusCode = error.statusCode || 401;
        reply
          .code(statusCode)
          .send({
            message: error.message,
            code: error.code,
            description: statusCode === 401 ? 'Проблема с токеном аутентификации.' : 'Ошибка проверки токена.',
          });
      });
  } catch (e) {
    reply
      .code(500)
      .send({
        message: 'Ошибка проверки токена',
        code: 'TOKEN_VALIDATION_ERROR',
        description: 'Внутренняя ошибка при проверке токена.',
      });
  }
};

/**
 * Константы для часто используемых scope
 */
export const SCOPES = {
  // Управление заказами
  READ_ORDERS: 'read:orders',
  WRITE_ORDERS: 'write:orders',

  // Управление статусами доставки
  UPDATE_DELIVERY_STATUS: 'update:delivery-status',
  READ_DELIVERY_STATUS: 'read:delivery-status',

  // Управление клиентами
  READ_CLIENTS: 'read:clients',
  WRITE_CLIENTS: 'write:clients',

  // Административные функции
  ADMIN_USERS: 'admin:users',
  ADMIN_SYSTEM: 'admin:system',
};
