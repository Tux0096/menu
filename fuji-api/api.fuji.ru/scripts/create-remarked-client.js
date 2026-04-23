/**
 * Скрипт для создания клиента remarked в external_clients
 *
 * Запуск: node scripts/create-remarked-client.js [password]
 * Если пароль не указан, будет сгенерирован случайный
 */

import crypto from 'crypto';
import { createOrUpdateRemarkedClient } from '../remarked/remarked-auth.service.js';

// Получаем пароль из аргументов командной строки или генерируем случайный
const providedPassword = process.argv[2];
const password = providedPassword || crypto.randomBytes(16).toString('hex');

async function main() {
  try {
    console.log('🔑 Создание/обновление клиента remarked в external_clients...');
    console.log('📱 Client ID: remarked');
    console.log('🔐 Password:', password);

    if (!providedPassword) {
      console.log('⚠️  Пароль был сгенерирован автоматически. Сохраните его!');
    }

    const client = await createOrUpdateRemarkedClient(password);

    console.log('✅ Клиент успешно создан/обновлен:');
    console.log('   ID:', client.id);
    console.log('   Client ID:', client.clientId);
    console.log('   Название:', client.name);
    console.log('   Активен:', client.isActive);

    console.log('\n📋 Данные для подключения к API:');
    console.log('   Client ID: remarked');
    console.log(`   Password: ${password}`);
    console.log(`   Base64: ${Buffer.from(`remarked:${password}`).toString('base64')}`);

    console.log('\n🌐 Пример использования:');
    console.log(`curl -H "Authorization: Basic ${Buffer.from(`remarked:${password}`).toString('base64')}" ...`);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

main();
