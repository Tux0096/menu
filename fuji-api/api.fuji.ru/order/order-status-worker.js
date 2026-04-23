import CLogger from '../lib/CLogger.js';
import * as orderService from './order.service.js';
import * as orderQueues from './order.queues.js';

const logger = new CLogger();

const startWorker = async () => {
  try {
    logger.log('Запуск обработчика обновлений статусов заказов');

    // Запускаем обработчик сообщений из очереди
    await orderQueues.processStatusUpdates(async (statusData) => {
      try {
        logger.log(`Обработка обновления статуса доставки для заказа: ${statusData.id}`);
        await orderService.processDeliveryStatusUpdate(statusData);
        logger.log(`Обновление статуса доставки для заказа ${statusData.id} успешно обработано`);
      } catch (error) {
        logger.log(`Ошибка обработки обновления статуса доставки: ${error.message}`);
        throw error; // Пробрасываем ошибку для механизма повторных попыток
      }
    });

    logger.log('Обработчик обновлений статусов заказов запущен');
  } catch (error) {
    logger.log(`Ошибка запуска обработчика: ${error.message}`);
    process.exit(1);
  }
};

// Запускаем обработчик
startWorker().catch((error) => {
  logger.log(`Необработанная ошибка: ${error.message}`);
  process.exit(1);
});
