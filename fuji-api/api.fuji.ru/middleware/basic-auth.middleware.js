import { authenticateRemarkedClient } from '../remarked/remarked-auth.service.js';

const BASIC_AUTH_ERROR = {
  message: 'Недействительная аутентификация',
  code: 'INVALID_BASIC_AUTH',
  description: 'Необходимо передать корректные данные Basic Authentication.',
};

/**
 * Middleware для Basic Authentication с проверкой через external_clients
 * @param {string} requiredClientId - Требуемый client_id (например, "remarked")
 * @returns {Function} Fastify middleware функция
 */
export default (requiredClientId) => async (request, reply, done) => {
  if (request.method === 'OPTIONS') {
    done();
    return;
  }

  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      reply
        .code(401)
        .send({
          ...BASIC_AUTH_ERROR,
          message: 'Отсутствует Basic Authentication',
          description: 'Необходимо передать данные аутентификации в заголовке Authorization: Basic <credentials>.',
        });
      return;
    }

    // Извлекаем закодированные credentials (убираем "Basic " из начала)
    const encodedCredentials = authHeader.substring(6);

    let decodedCredentials;
    try {
      decodedCredentials = Buffer.from(encodedCredentials, 'base64')
        .toString('utf-8');
    } catch (decodeError) {
      reply
        .code(401)
        .send({
          ...BASIC_AUTH_ERROR,
          message: 'Некорректный формат Basic Authentication',
          description: 'Данные аутентификации должны быть закодированы в Base64.',
        });
      return;
    }

    // Разделяем client_id:client_secret
    const [clientId, clientSecret] = decodedCredentials.split(':');

    if (!clientId || !clientSecret) {
      reply
        .code(401)
        .send({
          ...BASIC_AUTH_ERROR,
          message: 'Некорректные данные аутентификации',
          description: 'Необходимо передать client_id и client_secret.',
        });
      return;
    }

    // Аутентификация через external_clients
    const client = await authenticateRemarkedClient(clientId, clientSecret);

    if (!client) {
      reply
        .code(403)
        .send({
          message: 'Недостаточно прав доступа',
          code: 'FORBIDDEN',
          description: 'Неверные учетные данные или клиент неактивен.',
        });
      return;
    }

    // Добавляем информацию об аутентифицированном клиенте в request
    request.basicAuth = {
      clientId: client.clientId,
      clientName: client.name,
      scopes: client.scopes,
    };
  } catch (error) {
    reply
      .code(401)
      .send({
        ...BASIC_AUTH_ERROR,
        message: 'Ошибка обработки аутентификации',
        description: 'Произошла ошибка при проверке данных аутентификации.',
      });
  }
};
