import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import * as mapRepo from './map.repository.js';

/**
 * Города и их идентификаторы
 */
const CITY_IDS = {
  samara: 'a85360f2-55a8-47cc-8a79-1eb88a40c4f0',
  tolyatti: '3f02eb06-e771-434c-ab73-2ec5bbde1265',
  novokujbyshevsk: 'e27dec5a-4447-4bcb-a124-0c1795618998',
};

/**
 * Чтение файла зоны
 * @param {string} filePath Путь к файлу
 * @returns {Promise<Object>} Данные зоны
 */
const readZoneFile = async (filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Ошибка при чтении файла ${filePath}:`, error);
    throw error;
  }
};

/**
 * Получение списка файлов в директории
 * @param {string} dirPath Путь к директории
 * @returns {Promise<Array<string>>} Список файлов
 */
const getZoneFiles = async (dirPath) => {
  try {
    const files = await fs.readdir(dirPath);
    return files.filter((file) => file.endsWith('.json'));
  } catch (error) {
    console.error(`Ошибка при чтении директории ${dirPath}:`, error);
    throw error;
  }
};

/**
 * Миграция зон для указанного города
 * @param {string} cityName Название города (ключ из CITY_IDS)
 * @returns {Promise<Object>} Результат миграции
 */
const migrateCity = async (cityName) => {
  const cityId = CITY_IDS[cityName];
  if (!cityId) {
    throw new Error(`Неизвестный город: ${cityName}`);
  }

  const baseDir = path.join(process.cwd(), 'setting', 'config', 'map', 'zones', cityName);
  const zoneFiles = await getZoneFiles(baseDir);

  console.log(`Найдено ${zoneFiles.length} файлов зон для города ${cityName}`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of zoneFiles) {
    try {
      const filePath = path.join(baseDir, file);
      const zoneData = await readZoneFile(filePath);

      // Проверяем, есть ли уже такая зона в БД
      const existingZone = await mapRepo.getZoneById(zoneData.zoneId);

      if (existingZone) {
        console.log(`Зона ${zoneData.zoneId} уже существует в БД, пропускаем`);
        skipped++;
        continue;
      }

      // Создаем новую зону (при миграции старых зон id зоны === id терминала)
      await mapRepo.createZone(cityId, zoneData.zoneId, null, zoneData);
      console.log(`Зона ${zoneData.zoneId} успешно мигрирована`);
      migrated++;
    } catch (error) {
      console.error(`Ошибка при миграции файла ${file}:`, error);
      errors++;
    }
  }

  return { migrated, skipped, errors };
};

/**
 * Запуск миграции для всех городов
 * @returns {Promise<void>}
 */
export const migrateAllZones = async () => {
  console.log('Начало миграции зон...');

  const results = {};

  for (const cityName of Object.keys(CITY_IDS)) {
    console.log(`Миграция зон для города ${cityName}...`);
    try {
      results[cityName] = await migrateCity(cityName);
    } catch (error) {
      console.error(`Ошибка при миграции города ${cityName}:`, error);
      results[cityName] = { error: error.message };
    }
  }

  console.log('Миграция завершена.');
  console.log('Результаты:', JSON.stringify(results, null, 2));
};

// Если файл запущен напрямую, запускаем миграцию
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrateAllZones()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Ошибка при миграции:', error);
      process.exit(1);
    });
}
