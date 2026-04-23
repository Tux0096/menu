/**
 * Скрипт миграции терминалов доставки из статических файлов в БД
 * Задача #2582: Перенос точек продаж в админку
 *
 * Использование:
 * node api.fuji.ru/migrations/migrateTerminals.js
 */

import availableTerminals from '../setting/config/citiesData/deliveryTerminals.js';
import initModels from '../models/init-models.js';
import { sequelize } from '../db.js';

// Включение логирования SQL запросов для миграции
sequelize.options.logging = console.log;

// Инициализация моделей
const models = initModels(sequelize);
const { DeliveryTerminals } = models;

// Маппинг городов
const CITY_MAPPING = {
  'a85360f2-55a8-47cc-8a79-1eb88a40c4f0': 'samara',
  '3f02eb06-e771-434c-ab73-2ec5bbde1265': 'tolyatti',
  'e27dec5a-4447-4bcb-a124-0c1795618998': 'novokujbyshevsk',
};

/**
 * Функция миграции терминалов
 */
async function migrateTerminals() {
  try {
    console.log('🚀 Начинаем миграцию терминалов доставки...');

    // Проверка подключения к БД
    await sequelize.authenticate();
    console.log('✅ Подключение к базе данных установлено');

    let totalMigrated = 0;
    let totalErrors = 0;

    // Обработка каждого города
    for (const [cityId, terminals] of Object.entries(availableTerminals)) {
      const cityName = CITY_MAPPING[cityId] || 'unknown';
      console.log(`\n📍 Обработка города ${cityName} (${cityId})`);
      console.log(`   Найдено терминалов: ${terminals.length}`);

      // Обработка каждого терминала в городе
      for (const [index, terminal] of terminals.entries()) {
        try {
          console.log(`   ⏳ Обработка терминала ${index + 1}/${terminals.length}: ${terminal.address}`);

          // Подготовка данных для вставки
          const terminalData = {
            terminalId: terminal.deliveryTerminalId,
            cityId,
            name: terminal.name,
            address: terminal.address,
            organizationId: terminal.organizationId,
            deliveryGroupName: terminal.deliveryGroupName,
            deliveryRestaurantName: terminal.deliveryRestaurantName,
            isDisabled: terminal.isDisable || false,
            isRestHide: terminal.isRestHide || false,
            isOnlinePaymentHideDelivery: terminal.isOnlinePaymentHide?.delivery || false,
            isOnlinePaymentHideSelf: terminal.isOnlinePaymentHide?.self || false,
            sberbankLogin: terminal.sberbank?.login || null,
            sberbankPassword: terminal.sberbank?.password || null,
            cloudPaymentsPublicId: terminal.cloudPayments?.publicId || null,
            openingHours: terminal.openingHours || null,
            times: terminal.times || null,
            technicalInformation: terminal.technicalInformation || null,
          };

          // Вставка или обновление записи
          const [instance, created] = await DeliveryTerminals.upsert(terminalData);

          if (created) {
            console.log(`   ✅ Создан новый терминал: ${terminal.address}`);
          } else {
            console.log(`   🔄 Обновлен существующий терминал: ${terminal.address}`);
          }

          totalMigrated++;
        } catch (error) {
          console.error(`   ❌ Ошибка при обработке терминала ${terminal.address}:`, error.message);
          totalErrors++;
        }
      }
    }

    // Итоговая статистика
    console.log('\n📊 Результаты миграции:');
    console.log(`✅ Успешно обработано терминалов: ${totalMigrated}`);
    console.log(`❌ Ошибок при обработке: ${totalErrors}`);

    // Проверяем количество записей в таблице
    const count = await DeliveryTerminals.count();
    console.log(`📈 Общее количество записей в таблице: ${count}`);

    // Показываем статистику по городам
    console.log('\n🏙️ Статистика по городам:');
    for (const [cityId, cityName] of Object.entries(CITY_MAPPING)) {
      const cityCount = await DeliveryTerminals.count({
        where: { cityId },
      });
      console.log(`   ${cityName}: ${cityCount} терминалов`);
    }

    console.log('\n🎉 Миграция терминалов завершена успешно!');
  } catch (error) {
    console.error('💥 Критическая ошибка миграции:', error);
    throw error;
  } finally {
    // Закрытие подключения к БД
    await sequelize.close();
    console.log('🔐 Подключение к базе данных закрыто');
  }
}

/**
 * Функция отката миграции (удаление всех записей)
 */
async function rollbackMigration() {
  try {
    console.log('🔄 Начинаем откат миграции...');

    await sequelize.authenticate();
    console.log('✅ Подключение к базе данных установлено');

    const deletedCount = await DeliveryTerminals.destroy({
      where: {},
      truncate: true,
    });

    console.log(`🗑️ Удалено записей: ${deletedCount}`);
    console.log('✅ Откат миграции завершен успешно');
  } catch (error) {
    console.error('💥 Ошибка отката:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Запуск миграции или отката в зависимости от аргументов командной строки
const command = process.argv[2];

if (command === 'rollback') {
  rollbackMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  migrateTerminals()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { migrateTerminals, rollbackMigration };
