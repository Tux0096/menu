import { logger, orderLogger } from './winston.js';

export default class CLogger {
  constructor() {
    this.logger = logger;
    this.orderLogger = orderLogger;
  }

  log(msg, error = null) {
    const context = {
      message: msg,
      stack: error ? error.stack : null,
    };
    this.logger.log('info', context);
  }

  orderLog(msg, error = null) {
    const context = {
      message: msg,
      stack: error ? error.stack : null,
    };
    this.orderLogger.log('info', context);
  }
}
