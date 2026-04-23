import appRoot from 'app-root-path';
import winston from 'winston';

const environment = process.env.NODE_ENV || 'development';
const isDevelopment = environment === 'development';

// Общие настройки форматов
const timestampFormat = 'YYYY-MM-DDTHH:mm:ss.SSSZ';
const commonFormats = winston.format.combine(
  winston.format.timestamp({ format: timestampFormat }),
  winston.format.errors({ stack: true }),
);

// Функция для создания транспортов для логгера
const createTransports = (logFileName) => {
  const fileOptions = {
    level: 'info',
    filename: `${appRoot.path}/logs/${logFileName}`,
    handleExceptions: true,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    format: winston.format.combine(commonFormats, winston.format.json()),
  };

  const consoleOptions = {
    level: 'debug',
    handleExceptions: true,
    format: winston.format.combine(
      winston.format.colorize(),
      commonFormats,
      winston.format.printf(({
        level, message, timestamp, stack, ...metadata
      }) => {
        let log = `${timestamp} [${level.toUpperCase()}] [${process.pid}] "${message}"`;
        if (stack) {
          log += `\n${stack}`;
        }
        if (Object.keys(metadata).length) {
          log += ` ${JSON.stringify(metadata)}`;
        }
        return log;
      }),
    ),
  };

  const transportsArray = [];

  if (environment === 'production') {
    transportsArray.push(new winston.transports.File(fileOptions));
  }

  if (isDevelopment) {
    transportsArray.push(new winston.transports.Console(consoleOptions));
  }

  return transportsArray;
};

// Основной логгер приложения
const logger = winston.createLogger({
  level: 'info',
  transports: createTransports('app.log'),
  exceptionHandlers: [
    new winston.transports.File({
      filename: `${appRoot.path}/logs/exceptions.log`,
      format: winston.format.combine(commonFormats, winston.format.json()),
    }),
    ...(isDevelopment ? [new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        commonFormats,
        winston.format.printf(({
          level, message, timestamp, stack, ...metadata
        }) => {
          let log = `${timestamp} [${level.toUpperCase()}] [${process.pid}] "${message}"`;
          if (stack) {
            log += `\n${stack}`;
          }
          if (Object.keys(metadata).length) {
            log += ` ${JSON.stringify(metadata)}`;
          }
          return log;
        }),
      ),
    })] : []),
  ],
  exitOnError: false,
});

// Логгер для создания заказов
const orderLogger = winston.createLogger({
  level: 'info',
  transports: createTransports('orders.log'),
  exitOnError: false,
});

logger.stream = {
  write(message) {
    logger.info(message.trim());
  },
};

export { logger, orderLogger };
