import bcrypt from 'bcrypt';
import { sequelize } from '../db.js';
import initModels from '../models/init-models.js';
import CLogger from '../lib/CLogger.js';

const models = initModels(sequelize);
const { ExternalClients } = models;
const logger = new CLogger();

/**
 * Аутентификация ремаркета по Basic Auth используя external_clients
 * @param {string} clientId - ID клиента (должен быть "remarked")
 * @param {string} clientSecret - Секрет клиента
 * @returns {Promise<Object|null>} Клиент или null если аутентификация не удалась
 */
export const authenticateRemarkedClient = async (clientId, clientSecret) => {
  try {
    // Проверяем, что clientId = "remarked"
    if (clientId !== 'remarked') {
      logger.log('Remarked Auth: неверный clientId', { providedClientId: clientId });
      return null;
    }

    // Ищем клиента remarked в external_clients
    const client = await ExternalClients.findOne({
      where: {
        client_id: 'remarked',
        is_active: true,
      },
    });

    if (!client) {
      logger.log('Remarked Auth: клиент remarked не найден или неактивен');
      return null;
    }

    // Проверяем пароль через bcrypt
    const isSecretValid = await bcrypt.compare(clientSecret, client.clientSecret);

    if (!isSecretValid) {
      logger.log('Remarked Auth: неверный пароль для remarked');
      return null;
    }

    logger.log('Remarked Auth: успешная аутентификация', {
      clientId: client.clientId,
      clientName: client.name,
    });

    return {
      id: client.id,
      clientId: client.clientId,
      name: client.name,
      scopes: client.scopes,
    };
  } catch (e) {
    logger.log('Remarked Auth: ошибка аутентификации', { error: e.message });
    throw e;
  }
};

/**
 * Создание или обновление клиента remarked
 * @param {string} clientSecret - Новый пароль для remarked
 * @returns {Promise<Object>} Данные созданного/обновленного клиента
 */
export const createOrUpdateRemarkedClient = async (clientSecret) => {
  try {
    const SALT_ROUNDS = 12;
    const hashedSecret = await bcrypt.hash(clientSecret, SALT_ROUNDS);

    // Пытаемся найти существующего клиента
    const existingClient = await ExternalClients.findOne({
      where: { clientId: 'remarked' },
    });

    if (existingClient) {
      // Обновляем существующего клиента
      await existingClient.update({
        clientSecret: hashedSecret,
        isActive: true,
      });

      logger.log('Remarked Auth: клиент обновлен');
      return {
        id: existingClient.id,
        clientId: existingClient.clientId,
        name: existingClient.name,
        isActive: existingClient.isActive,
      };
    }
    // Создаем нового клиента
    const newClient = await ExternalClients.create({
      clientId: 'remarked',
      clientSecret: hashedSecret,
      name: 'Remarked Push Notifications',
      scopes: ['push:send'], // Права только на отправку пушей
      description: 'Клиент для массовой отправки push-уведомлений от системы ремаркет',
      tokenExpiresIn: 3600,
      isActive: true,
    });

    logger.log('Remarked Auth: новый клиент создан');
    return {
      id: newClient.id,
      clientId: newClient.clientId,
      name: newClient.name,
      isActive: newClient.isActive,
    };
  } catch (e) {
    logger.log('Remarked Auth: ошибка создания/обновления клиента', { error: e.message });
    throw e;
  }
};
