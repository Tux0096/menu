import fs from 'fs/promises';
import path from 'path';
import * as mapRepo from './map.repository.js';
import connectionManager from '../services/ConnectionManager.js';
import { getRevision, updateRevision } from '../storage/storage.repository.js';
import * as catalogService from '../catalog/catalog.service.js';

// Кеш для хранения зон по городам и терминалам
let zonesCache = {};
let terminalZonesCache = {};
// Таймер для очистки кеша
let cacheClearTimer = null;

/**
 * Валидация данных зоны перед сохранением
 * @param {Object} zoneData Данные зоны
 * @returns {boolean} Результат валидации
 * @throws {Error} Ошибка валидации
 */
export const validateZoneData = (zoneData) => {
  if (!zoneData || typeof zoneData !== 'object') {
    throw new Error('Данные зоны должны быть объектом');
  }

  // Проверка обязательных полей
  if (!zoneData.coords) {
    throw new Error('Поле coords обязательно для заполнения');
  }

  if (!Array.isArray(zoneData.coords) || zoneData.coords.length < 3) {
    throw new Error('coords должен быть массивом с минимум 3 точками');
  }

  // Проверка формата координат
  for (const coord of zoneData.coords) {
    if (!coord.lat || !coord.lng) {
      throw new Error('Каждая точка должна содержать поля lat и lng');
    }

    if (typeof coord.lat !== 'number' || typeof coord.lng !== 'number') {
      throw new Error('Координаты должны быть числами');
    }

    if (coord.lat < -90 || coord.lat > 90) {
      throw new Error('Широта (lat) должна быть от -90 до 90');
    }

    if (coord.lng < -180 || coord.lng > 180) {
      throw new Error('Долгота (lng) должна быть от -180 до 180');
    }
  }

  // Проверка наличия zoneId для новых зон
  if (!zoneData.zoneId) {
    throw new Error('Поле zoneId обязательно для заполнения');
  }

  if (zoneData.fillColor && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(zoneData.fillColor)) {
    throw new Error('fillColor должен быть в формате HEX (#RRGGBB или #RGB)');
  }
  return true;
};

/**
 * Преобразование зон в формат, ожидаемый фронтендом
 * @param {Array} zones Массив объектов зон из БД
 * @param {Object} mapCenter Центр карты {latitude, longitude}
 * @param {number} mapZoom Масштаб карты
 * @returns {Object} Данные в формате для фронтенда
 */
export const transformZonesForFrontend = (zones, mapCenter, mapZoom) => {
  const zonesData = zones.map((zone) => ({
    ...JSON.parse(zone.zone_data),
    address: zone.address,
    cityId: zone.city_id,
    zoneId: zone.zone_id,
    terminalId: zone.terminal_id,
    zoneName: zone.zoneName,

  }));

  return {
    mapCenter: mapCenter || { latitude: 53.183330, longitude: 50.116670 },
    mapZoom: mapZoom || 16,
    mapZones: zonesData,

  };
};

/**
 * Получение всех зон для указанного города
 * @param {string} cityId ID города
 * @returns {Promise<Array>} Массив зон
 */
export const getZonesByCity = async (cityId) => {
  // Проверяем кеш
  if (zonesCache[cityId]) {
    return zonesCache[cityId];
  }

  const zones = await mapRepo.getZonesByCity(cityId);

  // Сохраняем в кеш
  zonesCache[cityId] = zones;

  // Настраиваем автоочистку кеша через 5 минут
  if (!cacheClearTimer) {
    cacheClearTimer = setTimeout(() => {
      zonesCache = {};
      terminalZonesCache = {};
      cacheClearTimer = null;
    }, 5 * 60 * 1000); // 5 минут
  }

  return zones;
};

/**
 * Получение зон для терминала
 * @param {string} terminalId ID терминала
 * @returns {Promise<Array>} Массив зон для терминала
 */
export const getZonesByTerminalId = async (terminalId) => {
  // Проверяем кеш
  if (terminalZonesCache[terminalId]) {
    return terminalZonesCache[terminalId];
  }

  const zones = await mapRepo.getZonesByTerminalId(terminalId);

  // Сохраняем в кеш
  terminalZonesCache[terminalId] = zones;

  return zones;
};

/**
 * Получение зон для терминала в конкретном городе
 * @param {string} cityId ID города
 * @param {string} terminalId ID терминала
 * @returns {Promise<Array>} Массив зон
 */
export async function getZonesByTerminalAndCity(cityId, terminalId) {
  return mapRepo.getZonesByTerminalAndCity(cityId, terminalId);
}

/**
 * Получение зоны по ID
 * @param {string} zoneId ID зоны
 * @returns {Promise<Object|null>} Объект зоны или null, если зона не найдена
 */
export const getZoneById = async (zoneId) => mapRepo.getZoneById(zoneId);

/**
 * Создание новой зоны для терминала
 * @param {string} cityId ID города
 * @param {string} terminalId ID терминала
 * @param {string} deliveryId ID товара доставки
 * @param {Object} zoneData Данные зоны
 * @returns {Promise<Object>} Созданная зона
 */
export const createZoneForTerminal = async (cityId, terminalId, deliveryId, zoneData) => {
  // Валидация данных
  validateZoneData(zoneData);

  // Создание зоны
  const zone = await mapRepo.createZone(cityId, terminalId, deliveryId, zoneData);

  // Очищаем кеш
  delete zonesCache[cityId];
  delete terminalZonesCache[terminalId];

  // Обновляем ревизию для уведомления клиентов об изменениях
  await updateRevisionAndNotifyClients();

  return zone;
};

/**
 * Обновление только терминала зоны
 * @param {string} zoneId ID зоны
 * @param {string|null} terminalId Новый ID терминала (или null для сброса)
 * @returns {Promise<Object|null>} Обновленная зона или null, если зона не найдена
 */
export const updateZoneTerminalOnly = async (zoneId, terminalId) => {
  // Получаем текущую зону
  const currentZone = await mapRepo.getZoneById(zoneId);
  if (!currentZone) {
    return null;
  }

  // Обновление только терминала
  const zone = await mapRepo.updateZoneTerminal(zoneId, terminalId);

  if (zone) {
    // Очищаем кеш для старого и нового терминала
    delete zonesCache[zone.city_id];
    delete terminalZonesCache[currentZone.terminal_id];
    if (terminalId && terminalId !== currentZone.terminal_id) {
      delete terminalZonesCache[terminalId];
    }

    // Обновляем ревизию для уведомления клиентов об изменениях
    await updateRevisionAndNotifyClients();
  }

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
  // Получаем текущую зону
  const currentZone = await mapRepo.getZoneById(zoneId);
  if (!currentZone) {
    return null;
  }

  // Обновление терминала, доставки, адреса и названия
  const zone = await mapRepo.updateZoneTerminalAndAddress(zoneId, terminalId, deliveryId, address, zoneName, preparationTime, deliveryTime);

  if (zone) {
    // Очищаем кеш для старого и нового терминала
    delete zonesCache[zone.city_id];
    delete terminalZonesCache[currentZone.terminal_id];
    if (terminalId && terminalId !== currentZone.terminal_id) {
      delete terminalZonesCache[terminalId];
    }

    // Обновляем ревизию для уведомления клиентов об изменениях
    await updateRevisionAndNotifyClients();
  }

  return zone;
};

/**
 * Обновление зоны с терминалом
 * @param {string} zoneId ID зоны
 * @param {Object} zoneData Данные зоны
 * @param {string} newTerminalId Новый ID терминала (опционально)
 * @param {string} deliveryId ID товара доставки (опционально)
 * @returns {Promise<Object|null>} Обновленная зона или null, если зона не найдена
 */
export const updateZoneWithTerminal = async (zoneId, zoneData, newTerminalId = null, deliveryId = null) => {
  // Валидация данных
  validateZoneData(zoneData);

  // Получаем текущую зону
  const currentZone = await mapRepo.getZoneById(zoneId);
  if (!currentZone) {
    return null;
  }

  // Обновление зоны
  const zone = await mapRepo.updateZone(zoneId, zoneData, newTerminalId, deliveryId);

  if (zone) {
    // Очищаем кеш для старого и нового терминала
    delete zonesCache[zone.city_id];
    delete terminalZonesCache[currentZone.terminal_id];
    if (newTerminalId && newTerminalId !== currentZone.terminal_id) {
      delete terminalZonesCache[newTerminalId];
    }

    // Обновляем ревизию для уведомления клиентов об изменениях
    await updateRevisionAndNotifyClients();
  }

  return zone;
};

/**
 * Создание или обновление зоны для терминала
 * @param {string} cityId ID города
 * @param {string} terminalId ID терминала
 * @param {string} deliveryId ID товара доставки
 * @param {Object} zoneData Данные зоны
 * @returns {Promise<{zone: Object, isNew: boolean}>} Объект зоны и флаг, указывающий была ли создана новая зона
 */
export const createOrUpdateZoneForTerminal = async (cityId, terminalId, deliveryId, zoneData) => {
  // Валидация данных
  validateZoneData(zoneData);

  // Создание или обновление зоны
  const result = await mapRepo.createOrUpdateZone(cityId, terminalId, deliveryId, zoneData);

  // Очищаем кеш
  delete zonesCache[cityId];
  delete terminalZonesCache[terminalId];

  // Обновляем ревизию для уведомления клиентов об изменениях
  await updateRevisionAndNotifyClients();

  return result;
};

/**
 * Удаление зоны по ID
 * @param {string} zoneId ID зоны
 * @returns {Promise<boolean>} true если зона удалена, false если зона не найдена
 */
export const deleteZone = async (zoneId) => {
  // Получаем текущую зону, чтобы знать cityId и terminalId
  const currentZone = await mapRepo.getZoneById(zoneId);
  if (!currentZone) {
    return false;
  }

  // Удаление зоны
  const result = await mapRepo.deleteZone(zoneId);

  if (result) {
    // Очищаем кеш для этого города и терминала
    delete zonesCache[currentZone.city_id];
    delete terminalZonesCache[currentZone.terminal_id];

    // Обновляем ревизию для уведомления клиентов об изменениях
    await updateRevisionAndNotifyClients();
  }

  return result;
};

/**
 * Обновление ревизии и отправка уведомлений клиентам об изменениях
 * @returns {Promise<void>}
 */
const updateRevisionAndNotifyClients = async () => {
  try {
    const currentRevision = await getRevision();
    await updateRevision(currentRevision + 1);
    connectionManager.sendMessageToAll(JSON.stringify({ type: 'map:update' }));
  } catch (error) {
    console.error('Ошибка при обновлении ревизии:', error);
  }
};

/**
 * Получение зон для фронтенда
 * @param {string} cityId ID города
 * @param {Object} cityMapData Данные карты города
 * @param {Object} cityMapData.mapCenter Центр карты
 * @param {number} cityMapData.mapCenter.latitude Широта центра карты
 * @param {number} cityMapData.mapCenter.longitude Долгота центра карты
 * @param {number} cityMapData.mapZoom Масштаб карты
 * @returns {Promise<Object>} Объект с зонами в формате для фронтенда
 */
export const getZonesForFrontend = async (cityId, cityMapData) => {
  const zones = await getZonesByCity(cityId);

  const { mapCenter, mapZoom } = cityMapData;
  return transformZonesForFrontend(zones, mapCenter, mapZoom);
};

/**
 * Обновление или создание файлов зон для обратной совместимости
 * @param {string} cityId ID города
 * @returns {Promise<void>}
 */
export const updateZoneFiles = async (cityId) => {
  try {
    const zones = await getZonesByCity(cityId);

    const cityDirs = {
      'a85360f2-55a8-47cc-8a79-1eb88a40c4f0': 'samara',
      '3f02eb06-e771-434c-ab73-2ec5bbde1265': 'tolyatti',
      'e27dec5a-4447-4bcb-a124-0c1795618998': 'novokujbyshevsk',
    };

    const cityDir = cityDirs[cityId];
    if (!cityDir) {
      console.error(`Неизвестный cityId: ${cityId}`);
      return;
    }

    const baseDir = path.join(process.cwd(), 'setting', 'config', 'map', 'zones', cityDir);

    // Обновляем файлы
    for (const zone of zones) {
      const zoneData = zone.zone_data;
      const fileName = `${zoneData.zoneId}.json`;
      const filePath = path.join(baseDir, fileName);

      await fs.writeFile(filePath, JSON.stringify(zoneData, null, 2), 'utf8');
    }

    console.log(`Файлы зон для города ${cityId} обновлены`);
  } catch (error) {
    console.error('Ошибка при обновлении файлов зон:', error);
  }
};

/**
 * Получение всех зон из базы данных
 * @returns {Promise<Array>} Массив всех зон
 */
export const getAllZones = async () => mapRepo.getAllZones();

/**
 * Получение списка терминалов доставки для внешних систем
 * @returns {Promise<Array>} Массив терминалов с полями address, deliveryTerminalId, organizationId
 */
export const getDeliveryTerminals = async () => {
  try {
    const { getActiveTerminals } = await import('../terminals/terminals.service.js');

    // Получаем все активные терминалы из базы данных
    const allTerminals = await getActiveTerminals();

    // Возвращаем только нужные поля для внешних систем
    return allTerminals.map((terminal) => ({
      address: terminal.address,
      deliveryTerminalId: terminal.terminalId,
      organizationId: terminal.organizationId,
    }));
  } catch (error) {
    console.error('Ошибка получения терминалов для внешних систем:', error);
    throw new Error('Не удалось получить список терминалов');
  }
};

/**
 * Получение стоимости доставки по зоне
 * @param {string} zoneId ID зоны
 * @returns {Promise<Object|null>} Информация о доставке или null
 */
export const getZoneDeliveryCost = async (zoneId) => {
  try {
    // Получаем deliveryId зоны
    const deliveryId = await mapRepo.getZoneDeliveryId(zoneId);
    if (!deliveryId) {
      return null;
    }

    // Получаем информацию о товаре доставки
    const deliveryProduct = await catalogService.getProductById(deliveryId);
    if (!deliveryProduct) {
      return null;
    }

    return {
      deliveryId: deliveryProduct.id,
      price: deliveryProduct.price,
      name: deliveryProduct.name,
    };
  } catch (error) {
    console.error(`Error getting delivery cost for zone ${zoneId}:`, error);
    return null;
  }
};
