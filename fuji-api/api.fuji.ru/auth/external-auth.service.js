import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { sequelize } from '../db.js';
import initModels from '../models/init-models.js';
import env from '../env.js';
import CustomError from '../errors/CustomError.js';
import CLogger from '../lib/CLogger.js';

const models = initModels(sequelize);
const { ExternalClients } = models;
const logger = new CLogger();
const SALT_ROUNDS = 12;

/**
 * Аутентификация клиента по client_id и client_secret
 */
export const authenticateClient = async (clientId, clientSecret) => {
  try {
    const client = await ExternalClients.findOne({
      where: {
        clientId,
        isActive: true,
      },
    });

    if (!client) {
      return null;
    }

    const isSecretValid = await bcrypt.compare(clientSecret, client.clientSecret);
    if (!isSecretValid) {
      return null;
    }

    return client;
  } catch (e) {
    logger.log(e);
    throw e;
  }
};

/**
 * Генерация access_token для клиента
 */
export const generateAccessToken = async (clientId, clientSecret) => {
  try {
    // Аутентифицируем клиента
    const client = await authenticateClient(clientId, clientSecret);

    if (!client) {
      throw new CustomError({
        message: 'Недействительные учетные данные клиента',
        code: 'INVALID_CLIENT_CREDENTIALS',
        statusCode: 401,
      });
    }

    // Создаем payload для JWT
    const payload = {
      sub: client.clientId, // subject (идентификатор клиента)
      scope: client.scopes, // массив разрешений
      client_name: client.name,
      iat: Math.floor(Date.now() / 1000), // время выдачи
    };

    // Генерируем токен с истечением
    const accessToken = jwt.sign(
      payload,
      env.API_COURIER_SECRET_KEY || env.API_JWT_SECRET_KEY,
      {
        expiresIn: client.tokenExpiresIn, // время жизни в секундах
        issuer: 'fuji-api',
        algorithm: 'HS256',
      },
    );

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: client.tokenExpiresIn,
      scope: client.scopes,
    };
  } catch (e) {
    logger.log(e);
    if (e instanceof CustomError) {
      throw e;
    }
    throw new CustomError({
      message: 'Ошибка генерации токена',
      code: 'TOKEN_GENERATION_ERROR',
      statusCode: 500,
      data: { error: e.message },
    });
  }
};

/**
 * Верификация access_token и извлечение payload
 */
export const verifyAccessToken = async (token) => {
  try {
    const decoded = jwt.verify(
      token,
      env.API_COURIER_SECRET_KEY || env.API_JWT_SECRET_KEY,
      {
        issuer: 'fuji-api',
        algorithms: ['HS256'],
      },
    );

    return decoded;
  } catch (e) {
    if (e instanceof jwt.TokenExpiredError) {
      throw new CustomError({
        message: 'Токен истек',
        code: 'TOKEN_EXPIRED',
        statusCode: 401,
      });
    }

    if (e instanceof jwt.JsonWebTokenError) {
      throw new CustomError({
        message: 'Недействительный токен',
        code: 'INVALID_TOKEN',
        statusCode: 401,
      });
    }

    throw e;
  }
};

/**
 * Проверка наличия нужного scope у токена
 */
export const hasScope = (tokenPayload, requiredScope) => {
  const { scope } = tokenPayload;

  if (!Array.isArray(scope)) {
    return false;
  }

  return scope.includes(requiredScope);
};

/**
 * Создание нового клиента (админская функция)
 */
export const createClient = async (clientData) => {
  try {
    const {
      clientId, clientSecret, name, scopes = [], description, tokenExpiresIn = 3600,
    } = clientData;

    // Хешируем секрет
    const hashedSecret = await bcrypt.hash(clientSecret, SALT_ROUNDS);

    const client = await ExternalClients.create({
      clientId,
      clientSecret: hashedSecret,
      name,
      scopes,
      description,
      tokenExpiresIn,
      isActive: true,
    });

    // Возвращаем данные без хешированного секрета
    return {
      id: client.id,
      clientId: client.clientId,
      name: client.name,
      scopes: client.scopes,
      tokenExpiresIn: client.tokenExpiresIn,
      description: client.description,
      isActive: client.isActive,
      createdAt: client.createdAt,
    };
  } catch (e) {
    logger.log(e);
    throw new CustomError({
      message: 'Ошибка создания клиента',
      code: 'CLIENT_CREATION_ERROR',
      statusCode: 500,
      data: { error: e.message },
    });
  }
};

/**
 * Получение списка всех клиентов (админская функция)
 */
export const getAllClients = async () => {
  try {
    return await ExternalClients.findAll({
      attributes: ['id', 'clientId', 'name', 'scopes', 'isActive', 'tokenExpiresIn', 'description', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
  } catch (e) {
    logger.log(e);
    throw e;
  }
};

/**
 * Деактивация клиента (админская функция)
 */
export const deactivateClient = async (clientId) => {
  try {
    const result = await ExternalClients.update(
      { isActive: false },
      { where: { clientId } },
    );

    if (result[0] === 0) {
      throw new CustomError({
        message: 'Клиент не найден',
        code: 'CLIENT_NOT_FOUND',
        statusCode: 404,
      });
    }

    return { success: true };
  } catch (e) {
    logger.log(e);
    if (e instanceof CustomError) {
      throw e;
    }
    throw new CustomError({
      message: 'Ошибка деактивации клиента',
      code: 'CLIENT_DEACTIVATION_ERROR',
      statusCode: 500,
      data: { error: e.message },
    });
  }
};

/**
 * Обновление scope клиента (админская функция)
 */
export const updateClientScopes = async (clientId, newScopes) => {
  try {
    const result = await ExternalClients.update(
      { scopes: newScopes },
      { where: { clientId, isActive: true } },
    );

    if (result[0] === 0) {
      throw new CustomError({
        message: 'Активный клиент не найден',
        code: 'ACTIVE_CLIENT_NOT_FOUND',
        statusCode: 404,
      });
    }

    return { success: true };
  } catch (e) {
    logger.log(e);
    if (e instanceof CustomError) {
      throw e;
    }
    throw new CustomError({
      message: 'Ошибка обновления прав доступа клиента',
      code: 'CLIENT_SCOPES_UPDATE_ERROR',
      statusCode: 500,
      data: { error: e.message },
    });
  }
};
