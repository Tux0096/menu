import axios from 'axios';
import CLogger from '../lib/CLogger.js';
import { CLOUDKASSIR_CONFIG, validateCloudKassirConfig } from '../config/cloudkassir.config.js';
import { CITIES_DATA } from '../setting/config/common.js';

const logger = new CLogger();

// Проверяем конфигурацию при загрузке модуля
validateCloudKassirConfig();

// Соберем наборы id для определения услуг (доставка/бесплатная доставка/сервисный сбор)
const DELIVERY_IDS = new Set(
  Object.values(CITIES_DATA)
    .flatMap((c) => [c.deliveryId, c.freeDeliveryId].filter(Boolean)),
);
const SERVICE_FEE_IDS = new Set(
  Object.values(CITIES_DATA)
    .map((c) => c.serviceFeeId)
    .filter(Boolean),
);

const isServiceFeeItem = (item) => {
  const product = item?.product || {};
  // Возможный явный флаг
  if (product?.additionalInfo?.isServiceFee === true) {
    return true;
  }
  // По id из конфигурации города
  const productId = product.id || product.productId;
  if (productId && SERVICE_FEE_IDS.has(productId)) {
    return true;
  }
  return false;
};

const isServiceItem = (item) => {
  const product = item?.product || {};
  // Приоритет — флаги из additionalInfo, если пришли
  if (product?.additionalInfo?.isDelivery || product?.additionalInfo?.isFreeDelivery) {
    return true;
  }
  if (isServiceFeeItem(item)) {
    return true;
  }
  // Fallback по id продукта (поддерживаем id и productId)
  const productId = product.id || product.productId;
  if (!productId) {
    return false;
  }
  if (DELIVERY_IDS.has(productId)) {
    return true;
  }
  if (SERVICE_FEE_IDS.has(productId)) {
    return true;
  }
  return false;
};

const getObjectCodeForItem = (item) => (isServiceItem(item) ? 4 : 1);

// НДС 20% только на Сервисный сбор и Доставка; остальное 0
const getVatForItem = (item) => (isServiceItem(item) ? 20 : 0);

const buildReceiptItems = (items) => {
  const flatItems = [];
  items.forEach((item) => {
    // Базовая позиция
    const baseLine = {
      Label: item.product.name,
      Price: item.product.price,
      Quantity: item.quantity,
      Amount: item.product.price * item.quantity,
      Vat: getVatForItem(item),
      Method: 4,
      Object: getObjectCodeForItem(item),
    };
    flatItems.push(baseLine);

    // Модификаторы как отдельные позиции
    if (Array.isArray(item.modifiers) && item.modifiers.length > 0) {
      item.modifiers.forEach((mod) => {
        const modQuantity = (mod.amount || 0) * (item.quantity || 0);
        if (modQuantity <= 0) {
          return;
        }
        flatItems.push({
          Label: mod.name,
          Price: mod.price,
          Quantity: modQuantity,
          Amount: mod.price * modQuantity,
          Vat: 0,
          Method: 4,
          Object: 1,
        });
      });
    }
  });
  return flatItems;
};

const sumItemsAmount = (receiptItems) => receiptItems
  .reduce((acc, line) => acc + (Number(line.Amount) || 0), 0);

// Создаем Basic Auth заголовок
const createBasicAuthHeader = () => {
  const credentials = `${CLOUDKASSIR_CONFIG.publicId}:${CLOUDKASSIR_CONFIG.apiSecret}`;
  const base64Credentials = Buffer.from(credentials).toString('base64');
  return `Basic ${base64Credentials}`;
};

/**
 * Проверяет существование чека в CloudKassir
 * @param {string} orderId - ID заказа
 * @returns {Promise<boolean>} - Существует ли чек
 */
export async function checkReceiptExists(orderId) {
  try {
    logger.log(`Проверка существования чека для заказа ${orderId}`);

    // Проверяем через CloudKassir API согласно документации
    const response = await axios.get(`${CLOUDKASSIR_CONFIG.apiUrl}/kkt/receipt`, {
      headers: {
        Authorization: createBasicAuthHeader(),
        'Content-Type': 'application/json',
      },
      params: {
        Inn: CLOUDKASSIR_CONFIG.inn,
        Id: orderId,
      },
      timeout: CLOUDKASSIR_CONFIG.timeout,
    });

    return response.status === 200;
  } catch (error) {
    // Если чек не найден (404) или другая ошибка - считаем что чека нет
    logger.log(`Чек для заказа ${orderId} не найден:`, error.message);
    return false;
  }
}

/**
 * Создает новый чек в CloudKassir
 * @param {Object} orderData - Данные заказа
 * @returns {Promise<Object>} - Результат создания чека
 */
export async function createReceipt(orderData) {
  try {
    logger.log(`Создание чека для заказа ${orderData.orderId}`);

    // Формируем позиции с учетом модификаторов
    const receiptItems = buildReceiptItems(orderData.items || []);
    const electronicTotal = sumItemsAmount(receiptItems);

    // Формируем данные для CloudKassir согласно документации
    const receiptData = {
      Inn: CLOUDKASSIR_CONFIG.inn,
      Type: 'Income', // Тип операции - приход
      InvoiceId: orderData.iikoOrderId || orderData.orderId, // Уникальный ID чека
      CustomerReceipt: {
        Items: receiptItems,
        TaxationSystem: 0, // Система налогообложения: 1 - ОСНО
        // не нужно отправлять email и phone - требование фуджи
        // Email: orderData.user.email || '', // Email покупателя
        // Phone: orderData.user.phone || '', // Телефон покупателя
        Amounts: {
          Electronic: electronicTotal, // Сумма электронными = сумма позиций
        },
      },
    };

    const response = await axios.post(`${CLOUDKASSIR_CONFIG.apiUrl}/kkt/receipt`, receiptData, {
      headers: {
        Authorization: createBasicAuthHeader(),
        'Content-Type': 'application/json',
      },
      timeout: CLOUDKASSIR_CONFIG.timeout,
    });

    logger.log(response.data);
    logger.log(`Чек для заказа ${orderData.orderId} создан успешно`);

    // Обрабатываем ответ CloudKassir согласно реальной структуре
    if (response.data?.Success && response.data?.Model) {
      return {
        success: true,
        receiptId: response.data.Model.Id,
        url: response.data.Model.ReceiptLocalUrl,
      };
    }
    throw new Error(`CloudKassir вернул ошибку: ${response.data?.Message || 'Неизвестная ошибка'}`);
  } catch (error) {
    console.log(error);
    logger.log(`Ошибка создания чека для заказа ${orderData.orderId}:`, error.message);
    throw new Error(`Не удалось создать чек: ${error.message}`);
  }
}

/**
 * Создает чек с retry логикой
 * @param {Object} orderData - Данные заказа
 * @param {number} maxRetries - Максимальное количество попыток
 * @param {number} retryDelay - Задержка между попытками в мс
 * @returns {Promise<Object>} - Результат создания чека
 */
export async function createReceiptWithRetry(orderData, maxRetries = 3, retryDelay = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.log(`Попытка ${attempt}/${maxRetries} создания чека для заказа ${orderData.orderId}`);

      const result = await createReceipt(orderData);

      if (attempt > 1) {
        logger.log(`Чек создан успешно с ${attempt} попытки для заказа ${orderData.orderId}`);
      }

      return result;
    } catch (error) {
      lastError = error;
      logger.log(`Попытка ${attempt}/${maxRetries} создания чека для заказа ${orderData.orderId} не удалась: ${error.message}`);

      // Если это последняя попытка, прерываем цикл
      if (attempt === maxRetries) {
        break;
      }

      // Ждем перед следующей попыткой
      if (retryDelay > 0) {
        logger.log(`Ждем ${retryDelay}мс перед следующей попыткой...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  // Если все попытки неудачные, выбрасываем последнюю ошибку
  logger.log(`Все ${maxRetries} попытки создания чека для заказа ${orderData.orderId} неудачны`);
  throw lastError;
}
