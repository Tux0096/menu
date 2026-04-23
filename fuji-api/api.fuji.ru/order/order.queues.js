import amqp from 'amqplib';
import CLogger from '../lib/CLogger.js';
import env from '../env.js';

const logger = new CLogger();
const ORDER_STATUS_QUEUE = 'order_status_updates';
const ORDER_STATUS_DLQ = 'order_status_updates_dlq';

// Singleton соединение с RabbitMQ
let rabbitConnection = null;
let rabbitChannel = null;
let isConnecting = false;
let reconnectTimeout = null;

// Получение или создание соединения с RabbitMQ (connection pool)
const getRabbitConnection = async () => {
  // Если соединение уже есть и активно, возвращаем его
  if (rabbitConnection && rabbitChannel) {
    return { connection: rabbitConnection, channel: rabbitChannel };
  }

  // Ждём, если соединение уже устанавливается
  if (isConnecting) {
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!isConnecting && rabbitConnection && rabbitChannel) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
    return { connection: rabbitConnection, channel: rabbitChannel };
  }

  // Устанавливаем соединение
  isConnecting = true;

  try {
    logger.log('Подключение к RabbitMQ...');
    const connection = await amqp.connect(env.RABBITMQ_URL);
    const channel = await connection.createChannel();

    // Создаем очереди
    await channel.assertQueue(ORDER_STATUS_QUEUE, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': ORDER_STATUS_DLQ,
      },
    });

    await channel.assertQueue(ORDER_STATUS_DLQ, {
      durable: true,
    });

    // Обработка разрыва соединения
    connection.on('close', () => {
      logger.log('RabbitMQ соединение закрыто. Попытка переподключения через 5 секунд...');
      rabbitConnection = null;
      rabbitChannel = null;

      // Автоматическое переподключение через 5 секунд
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      reconnectTimeout = setTimeout(() => {
        getRabbitConnection().catch((error) => {
          logger.log(`Ошибка переподключения к RabbitMQ: ${error.message}`);
        });
      }, 5000);
    });

    connection.on('error', (error) => {
      logger.log(`Ошибка RabbitMQ соединения: ${error.message}`);
    });

    rabbitConnection = connection;
    rabbitChannel = channel;

    logger.log('✅ Успешное подключение к RabbitMQ');
    return { connection, channel };
  } catch (error) {
    logger.log(`❌ Ошибка подключения к RabbitMQ: ${error.message}`);
    throw error;
  } finally {
    isConnecting = false;
  }
};

// Отправка обновления статуса в очередь (БЕЗ создания нового соединения!)
export const sendStatusUpdate = async (statusData) => {
  try {
    const { channel } = await getRabbitConnection();

    const message = JSON.stringify(statusData);
    const result = channel.sendToQueue(ORDER_STATUS_QUEUE, Buffer.from(message), {
      persistent: true,
      messageId: statusData.id || Date.now().toString(),
    });

    logger.log(`Сообщение отправлено в очередь ${ORDER_STATUS_QUEUE}: ${message}`);

    return result;
  } catch (error) {
    logger.log(`Ошибка отправки сообщения в RabbitMQ: ${error.message}`);
    throw error;
  }
};

// Обработчик сообщений из очереди
export const processStatusUpdates = async (callback) => {
  try {
    const { connection, channel } = await getRabbitConnection();

    // Настраиваем обработку сообщений
    channel.prefetch(8);

    channel.consume(ORDER_STATUS_QUEUE, async (msg) => {
      if (!msg) return;

      try {
        const statusData = JSON.parse(msg.content.toString());
        await callback(statusData);

        // Подтверждаем успешную обработку сообщения
        channel.ack(msg);
      } catch (error) {
        logger.log(`Ошибка обработки сообщения: ${error.message}`);

        // Проверяем, сколько раз сообщение уже пытались обработать
        const retryCount = parseInt(msg.properties.headers?.['x-retry-count'] || 0);

        if (retryCount < 3) {
          // Возвращаем сообщение в очередь с увеличенным счетчиком попыток
          channel.nack(msg, false, false);
          await channel.sendToQueue(ORDER_STATUS_QUEUE, msg.content, {
            persistent: true,
            headers: {
              'x-retry-count': retryCount + 1,
            },
          });
        } else {
          // Если попытки исчерпаны, подтверждаем сообщение (оно будет направлено в DLQ)
          channel.ack(msg);
        }
      }
    });

    logger.log(`Запущен обработчик сообщений из очереди ${ORDER_STATUS_QUEUE}`);

    return { connection, channel };
  } catch (error) {
    logger.log(`Ошибка запуска обработчика сообщений: ${error.message}`);
    throw error;
  }
};

// Graceful shutdown для корректного закрытия соединения
export const closeRabbitConnection = async () => {
  try {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    if (rabbitChannel) {
      await rabbitChannel.close();
      rabbitChannel = null;
      logger.log('RabbitMQ канал закрыт');
    }

    if (rabbitConnection) {
      await rabbitConnection.close();
      rabbitConnection = null;
      logger.log('RabbitMQ соединение закрыто');
    }
  } catch (error) {
    logger.log(`Ошибка при закрытии RabbitMQ соединения: ${error.message}`);
  }
};

// Обработка сигналов завершения процесса
process.on('SIGINT', async () => {
  logger.log('Получен сигнал SIGINT, закрываем RabbitMQ соединение...');
  await closeRabbitConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.log('Получен сигнал SIGTERM, закрываем RabbitMQ соединение...');
  await closeRabbitConnection();
  process.exit(0);
});
