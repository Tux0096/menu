// Конфигурация CloudKassir
export const CLOUDKASSIR_CONFIG = {
  // API URL CloudKassir
  apiUrl: process.env.CLOUDKASSIR_API_URL || 'https://api.cloudpayments.ru',

  // Public ID для аутентификации (логин) - тестовые данные ИП Сидоренко
  publicId: process.env.CLOUDKASSIR_PUBLIC_ID || 'pk_41f2195cf1df0c8f87a011d18f5d4',

  // API Secret для аутентификации (пароль) - тестовые данные
  apiSecret: process.env.CLOUDKASSIR_API_SECRET || 'ab77640852a88dff29a0e26235e26217',

  // ИНН организации
  inn: process.env.CLOUDKASSIR_INN || '631304455014',

  // Заводской номер кассы
  cashRegisterNumber: process.env.CLOUDKASSIR_CASH_REGISTER_NUMBER || '1992320030114065',

  // Номер ФН
  fiscalNumber: process.env.CLOUDKASSIR_FISCAL_NUMBER || '7384440900696733',

  // Регистрационный номер кассы
  registrationNumber: process.env.CLOUDKASSIR_REGISTRATION_NUMBER || '0009290172048275',

  // ОФД (Оператор фискальных данных)
  ofd: process.env.CLOUDKASSIR_OFD || 'taxcom',

  // Система налогообложения (1 - ОСНО)
  taxSystem: process.env.CLOUDKASSIR_TAX_SYSTEM || 1,

  // Email организации
  email: process.env.CLOUDKASSIR_EMAIL || 'buh-st-zagora@mail.ru',

  // Телефон организации
  phone: process.env.CLOUDKASSIR_PHONE || '+79879825326',

  // БСО (Бланки строгой отчетности)
  bso: process.env.CLOUDKASSIR_BSO === 'true' || false,

  // Тип операции (sale - продажа, refund - возврат)
  operationType: 'sale',

  // НДС (0 - без НДС, 10 - НДС 10%, 20 - НДС 20%)
  vat: 0, // Для ресторанов обычно НДС 0%

  // Таймаут запросов в миллисекундах
  timeout: 10000,
};

// Проверка обязательных переменных окружения
export const validateCloudKassirConfig = () => {
  const requiredVars = ['CLOUDKASSIR_PUBLIC_ID', 'CLOUDKASSIR_API_SECRET'];
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn('⚠️  CloudKassir: Отсутствуют переменные окружения:', missingVars.join(', '));
    console.warn('   Используются тестовые значения');
  } else {
    console.log('✅ CloudKassir: Конфигурация загружена успешно');
    console.log(`   ИНН: ${CLOUDKASSIR_CONFIG.inn}`);
    console.log(`   Касса: ${CLOUDKASSIR_CONFIG.cashRegisterNumber}`);
    console.log(`   ОФД: ${CLOUDKASSIR_CONFIG.ofd}`);
  }

  return missingVars.length === 0;
};
