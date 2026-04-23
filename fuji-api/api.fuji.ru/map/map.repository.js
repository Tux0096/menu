import { Op } from 'sequelize';
import initModels from '../models/init-models.js';
import { sequelize } from '../db.js';

const models = initModels(sequelize);
const { DeliveryZone } = models;

/**
 * Получение всех зон для указанного города (у которых есть терминал)
 * @param {string} cityId ID города
 * @returns {Promise<Array>} Массив зон
 */
export async function getZonesByCity(cityId) {
  return DeliveryZone.findAll({
    where: {
      city_id: cityId,
      terminal_id: {
        [Op.and]: [
          { [Op.not]: null },
          { [Op.ne]: '' },
        ],
      },
    },
    order: [['updated_at', 'DESC']],
    raw: true,
  });
}

/**
 * Получение зон по terminal_id
 * @param {string} terminalId ID терминала
 * @returns {Promise<Array>} Массив зон для терминала
 */
export const getZonesByTerminalId = async (terminalId) => {
  const zones = await DeliveryZone.findAll({
    where: { terminal_id: terminalId },
    order: [['updated_at', 'DESC']],
  });

  return zones;
};

/**
 * Получение зон по terminal_id и city_id
 * @param {string} cityId ID города
 * @param {string} terminalId ID терминала
 * @returns {Promise<Array>} Массив зон
 */
export const getZonesByTerminalAndCity = async (cityId, terminalId) => {
  const zones = await DeliveryZone.findAll({
    where: {
      city_id: cityId,
      terminal_id: terminalId,
    },
    order: [['updated_at', 'DESC']],
  });

  return zones;
};

/**
 * Получение зоны по ID с информацией о доставке
 * @param {string} zoneId ID зоны
 * @returns {Promise<Object|null>} Объект зоны или null, если зона не найдена
 */
export const getZoneById = async (zoneId) => {
  const zone = await DeliveryZone.findOne({
    where: { zone_id: zoneId },
  });

  return zone;
};

/**
 * Получение ID товара доставки для зоны
 * @param {string} zoneId ID зоны
 * @returns {Promise<string|null>} ID товара доставки или null
 */
export const getZoneDeliveryId = async (zoneId) => {
  const zone = await DeliveryZone.findOne({
    where: { zone_id: zoneId },
    attributes: ['deliveryId'],
  });

  return zone?.deliveryId || null;
};

/**
 * Создание новой зоны
 * @param {string} cityId ID города
 * @param {string} terminalId ID терминала
 * @param {string} deliveryId ID товара доставки
 * @param {Object} zoneData Данные зоны
 * @returns {Promise<Object>} Созданная зона
 */
export const createZone = async (cityId, terminalId, deliveryId, zoneData) => {
  // Проверяем, существует ли уже зона с таким ID
  const existingZone = await DeliveryZone.findOne({
    where: {
      zone_id: zoneData.zoneId,
    },
  });

  if (existingZone) {
    throw new Error(`Зона с ID ${zoneData.zoneId} уже существует`);
  }

  const zone = await DeliveryZone.create({
    city_id: cityId,
    zone_id: zoneData.zoneId,
    terminal_id: terminalId,
    deliveryId,
    address: zoneData.address,
    zoneName: zoneData.zoneName,
    preparationTime: zoneData.preparationTime,
    deliveryTime: zoneData.deliveryTime,
    zone_data: zoneData,
  });

  return zone;
};

/**
 * Обновление только терминала зоны
 * @param {string} zoneId ID зоны
 * @param {string|null} terminalId Новый ID терминала (или null для сброса)
 * @returns {Promise<Object|null>} Обновленная зона или null, если зона не найдена
 */
export const updateZoneTerminal = async (zoneId, terminalId) => {
  const zone = await DeliveryZone.findOne({
    where: { zone_id: zoneId },
  });

  if (!zone) {
    return null;
  }

  // Обновляем только terminal_id
  zone.terminal_id = terminalId;
  await zone.save();

  return zone;
};

/**
 * Обновление терминала, адреса и названия зоны
 * @param {string} zoneId ID зоны
 * @param {string|null} terminalId Новый ID терминала (или null для сброса)
 * @param {string|null} deliveryId ID товара доставки (опционально)
 * @param {string} address Новый адрес зоны
 * @param {string} zoneName Новое название зоны (опционально)
 * @param {number} preparationTime Время приготовления в минутах (опционально)
 * @param {number} deliveryTime Время доставки в минутах (опционально)
 * @returns {Promise<Object|null>} Обновленная зона или null, если зона не найдена
 */
export const updateZoneTerminalAndAddress = async (zoneId, terminalId, deliveryId, address, zoneName = null, preparationTime = null, deliveryTime = null) => {
  const zone = await DeliveryZone.findOne({
    where: { zone_id: zoneId },
  });

  if (!zone) {
    return null;
  }

  // Обновляем terminal_id, deliveryId, address, zoneName и время
  zone.terminal_id = terminalId;
  if (deliveryId !== undefined) {
    zone.deliveryId = deliveryId;
  }
  zone.address = address;
  if (zoneName) {
    zone.zoneName = zoneName;
  }
  if (preparationTime !== null) {
    zone.preparationTime = preparationTime;
  }
  if (deliveryTime !== null) {
    zone.deliveryTime = deliveryTime;
  }
  await zone.save();

  return zone;
};

/**
 * Обновление существующей зоны
 * @param {string} zoneId ID зоны
 * @param {Object} zoneData Данные зоны
 * @param {string} terminalId Новый ID терминала (опционально)
 * @param {string} deliveryId ID товара доставки (опционально)
 * @returns {Promise<Object|null>} Обновленная зона или null, если зона не найдена
 */
export const updateZone = async (zoneId, zoneData, terminalId = null, deliveryId = null) => {
  const zone = await DeliveryZone.findOne({
    where: { zone_id: zoneId },
  });

  if (!zone) {
    return null;
  }

  // Обновляем данные, сохраняя zoneId прежним
  const updatedZoneData = {
    ...zoneData,
    zoneId,
  };

  zone.zone_data = updatedZoneData;

  // Обновляем zoneName если передан
  if (zoneData.zoneName) {
    zone.zoneName = zoneData.zoneName;
  }

  // Обновляем preparationTime если передан
  if (zoneData.preparationTime !== undefined) {
    zone.preparationTime = zoneData.preparationTime;
  }

  // Обновляем deliveryTime если передан
  if (zoneData.deliveryTime !== undefined) {
    zone.deliveryTime = zoneData.deliveryTime;
  }

  // Обновляем terminal_id если передан
  if (terminalId) {
    zone.terminal_id = terminalId;
  }

  // Обновляем deliveryId если передан
  if (deliveryId) {
    zone.deliveryId = deliveryId;
  }

  await zone.save();

  return zone;
};

/**
 * Удаление зоны по ID
 * @param {string} zoneId ID зоны
 * @returns {Promise<boolean>} true если зона удалена, false если зона не найдена
 */
export const deleteZone = async (zoneId) => {
  const result = await DeliveryZone.destroy({
    where: { zone_id: zoneId },
  });

  return result > 0;
};

/**
 * Удаление всех зон для указанного города
 * @param {string} cityId ID города
 * @returns {Promise<number>} Количество удаленных зон
 */
export const deleteZonesByCity = async (cityId) => {
  const result = await DeliveryZone.destroy({
    where: { city_id: cityId },
  });

  return result;
};

/**
 * Удаление всех зон для терминала
 * @param {string} terminalId ID терминала
 * @returns {Promise<number>} Количество удаленных зон
 */
export const deleteZonesByTerminalId = async (terminalId) => {
  const result = await DeliveryZone.destroy({
    where: { terminal_id: terminalId },
  });

  return result;
};

/**
 * Массовое создание или обновление зон
 * @param {string} cityId ID города
 * @param {string} terminalId ID терминала
 * @param {string} deliveryId ID товара доставки
 * @param {Array} zonesData Массив данных зон
 * @returns {Promise<Object>} Результат операции с количеством созданных и обновленных записей
 */
export const bulkUpsertZones = async (cityId, terminalId, deliveryId, zonesData) => {
  let created = 0;
  let updated = 0;

  // Обрабатываем каждую зону отдельно
  for (const zoneData of zonesData) {
    try {
      const existingZone = await DeliveryZone.findOne({
        where: {
          zone_id: zoneData.zoneId,
        },
      });

      if (existingZone) {
        // Обновляем существующую зону
        existingZone.zone_data = zoneData;
        existingZone.terminal_id = terminalId;
        existingZone.deliveryId = deliveryId;
        if (zoneData.zoneName) {
          existingZone.zoneName = zoneData.zoneName;
        }
        if (zoneData.preparationTime !== undefined) {
          existingZone.preparationTime = zoneData.preparationTime;
        }
        if (zoneData.deliveryTime !== undefined) {
          existingZone.deliveryTime = zoneData.deliveryTime;
        }
        await existingZone.save();
        updated++;
      } else {
        // Создаем новую зону
        await DeliveryZone.create({
          city_id: cityId,
          zone_id: zoneData.zoneId,
          terminal_id: terminalId,
          deliveryId,
          zoneName: zoneData.zoneName,
          preparationTime: zoneData.preparationTime,
          deliveryTime: zoneData.deliveryTime,
          zone_data: zoneData,
        });
        created++;
      }
    } catch (error) {
      console.error(`Ошибка при обработке зоны ${zoneData.zoneId}:`, error);
      throw error;
    }
  }

  return { created, updated };
};

/**
 * Создание или обновление зоны доставки
 * @param {string} cityId ID города
 * @param {string} terminalId ID терминала
 * @param {string} deliveryId ID товара доставки
 * @param {Object} zoneData Данные зоны
 * @returns {Promise<{zone: Object, isNew: boolean}>} Объект зоны и флаг, указывающий была ли создана новая зона
 */
export const createOrUpdateZone = async (cityId, terminalId, deliveryId, zoneData) => {
  const existingZone = await DeliveryZone.findOne({
    where: { zone_id: zoneData.zoneId },
  });
  console.log(cityId, terminalId, deliveryId, zoneData);
  if (existingZone) {
    // Обновляем существующую зону
    const updatedZoneData = {
      ...zoneData,
      zoneId: existingZone.zone_id,
    };

    existingZone.zone_data = updatedZoneData;
    existingZone.terminal_id = terminalId;
    existingZone.deliveryId = deliveryId;
    existingZone.address = zoneData.address;
    if (zoneData.zoneName) {
      existingZone.zoneName = zoneData.zoneName;
    }
    if (zoneData.preparationTime !== undefined) {
      existingZone.preparationTime = zoneData.preparationTime;
    }
    if (zoneData.deliveryTime !== undefined) {
      existingZone.deliveryTime = zoneData.deliveryTime;
    }
    await existingZone.save();

    return { zone: existingZone, isNew: false };
  }

  // Создаем новую зону
  const newZone = await DeliveryZone.create({
    city_id: cityId,
    zone_id: zoneData.zoneId,
    terminal_id: terminalId,
    deliveryId,
    zoneName: zoneData.zoneName,
    preparationTime: zoneData.preparationTime,
    deliveryTime: zoneData.deliveryTime,
    zone_data: zoneData,
    address: zoneData.address,
  });

  return { zone: newZone, isNew: true };
};

/**
 * Получение всех зон из базы данных
 * @returns {Promise<Array>} Массив всех зон
 */
export const getAllZones = async () => {
  const zones = await DeliveryZone.findAll({
    order: [['updated_at', 'DESC']],
  });

  // Преобразуем в plain objects с правильным парсингом zone_data
  return zones.map((zone) => zone.get({ plain: true }));
};
