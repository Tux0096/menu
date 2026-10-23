// Конфигурация CloudKassir
export const CLOUDKASSIR_CONFIG = {
  // API URL CloudKassir
  apiUrl: process.env.CLOUDKASSIR_API_URL || 'https://api.cloudpayments.ru',

  // Public ID для аутентификации (логин)
  publicId: process.env.CLOUDKASSIR_PUBLIC_ID || '',

  // API Secret для аутентификации (пароль)
  apiSecret: process.env.CLOUDKASSIR_API_SECRET || '',

  // ИНН организации
  inn: process.env.CLOUDKASSIR_INN || '',

  // Заводской номер кассы
  cashRegisterNumber: process.env.CLOUDKASSIR_CASH_REGISTER_NUMBER || '',

  // Номер ФН
  fiscalNumber: process.env.CLOUDKASSIR_FISCAL_NUMBER || '',

  // Регистрационный номер кассы
  registrationNumber: process.env.CLOUDKASSIR_REGISTRATION_NUMBER || '',

  // ОФД (Оператор фискальных данных)
  ofd: process.env.CLOUDKASSIR_OFD || 'taxcom',

  // Система налогообложения (1 - ОСНО)
  taxSystem: process.env.CLOUDKASSIR_TAX_SYSTEM || 1,

  // Email организации
  email: process.env.CLOUDKASSIR_EMAIL || '',

  // Телефон организации
  phone: process.env.CLOUDKASSIR_PHONE || '',

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
  const requiredVars = ['CLOUDKASSIR_PUBLIC_ID', 'CLOUDKASSIR_API_SECRET', 'CLOUDKASSIR_INN'];
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn('⚠️  CloudKassir: Отсутствуют переменные окружения:', missingVars.join(', '));
    console.warn('   Задайте их в .env (см. docs/CLOUDKASSIR_SETUP.md), без них чеки не отправляются');
  } else {
    console.log('✅ CloudKassir: Конфигурация загружена успешно');
    console.log(`   ОФД: ${CLOUDKASSIR_CONFIG.ofd}`);
  }

  return missingVars.length === 0;
};
