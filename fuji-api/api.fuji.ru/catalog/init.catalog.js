import crypto from 'crypto';
import EventEmitter from 'events';
import { getCatalog } from './catalog.service.js';
import { setRevision } from '../storage/storage.service.js';

/**
 * Класс мониторинга каталога.
 * Наследует от EventEmitter для событийной модели.
 */
class CatalogMonitor extends EventEmitter {
  /**
   * Создаёт экземпляр CatalogMonitor.
   * @param {Object} options - Конфигурационные параметры.
   * @param {number} [options.checkInterval=60000] - Интервал проверки в миллисекундах.
   * @param {number} [options.retryAttempts=3] - Количество попыток при ошибке.
   * @param {number} [options.retryDelay=5000] - Задержка между попытками в миллисекундах.
   */
  constructor({ checkInterval = 1000 * 60, retryAttempts = 3, retryDelay = 1000 * 5 } = {}) {
    super();
    this.checkInterval = checkInterval;
    this.retryAttempts = retryAttempts;
    this.retryDelay = retryDelay;
    this.catalogHash = null;
    this.intervalId = null;
    this.isStopping = false;
  }

  /**
   * Генерирует хеш каталога.
   * @param {Object} catalog - Объект каталога.
   * @returns {string} - Хеш каталога.
   */
  getCatalogHash(catalog) {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(catalog));
    return hash.digest('hex');
  }

  /**
   * Проверяет обновления каталога.
   * @returns {Promise<void>}
   */
  async checkCatalogUpdate() {
    let attempts = 0;

    while (attempts < this.retryAttempts && !this.isStopping) {
      try {
        const catalog = await getCatalog();
        const currentCatalogHash = this.getCatalogHash(catalog);

        if (currentCatalogHash !== this.catalogHash) {
          this.catalogHash = currentCatalogHash;
          const newCatalogRevision = Date.now();
          await setRevision(newCatalogRevision);

          // Генерируем событие только при реальном изменении
          this.emit('update', this.catalogHash);
        }

        // Успешная проверка, выходим из цикла попыток
        break;
      } catch (error) {
        attempts += 1;
        this.emit('error', `Попытка ${attempts} не удалась: ${error.message}`);

        if (attempts < this.retryAttempts) {
          await this.delay(this.retryDelay);
        } else {
          this.emit('error', 'Достигнуто максимальное количество попыток.');
        }
      }
    }
  }

  /**
   * Запускает мониторинг каталога.
   * @returns {void}
   */
  async start() {
    if (this.intervalId) {
      console.log('[CatalogMonitor] Мониторинг уже запущен.');
      return;
    }

    this.isStopping = false;

    try {
      const initialCatalog = await getCatalog();
      this.catalogHash = this.getCatalogHash(initialCatalog);
      console.log('[CatalogMonitor] ✅ Инициализация каталога завершена.');
    } catch (error) {
      console.error('[CatalogMonitor] ❌ Ошибка при инициализации:', error);
      this.emit('error', `Ошибка при инициализации каталога: ${error.message}`);
    }

    this.intervalId = setInterval(() => {
      this.checkCatalogUpdate();
    }, this.checkInterval);

    console.log(`[CatalogMonitor] 🚀 Мониторинг запущен (интервал: ${this.checkInterval / 1000}с)`);
  }

  /**
   * Останавливает мониторинг каталога.
   * @returns {void}
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isStopping = true;
      console.log('[CatalogMonitor] Мониторинг каталога остановлен.');
    }
  }

  /**
   * Полная очистка ресурсов монитора
   * @returns {void}
   */
  destroy() {
    this.stop();
    this.removeAllListeners();
    this.catalogHash = null;
    console.log('[CatalogMonitor] Ресурсы монитора очищены.');
  }

  /**
   * Утилита для задержки выполнения.
   * @param {number} ms - Задержка в миллисекундах.
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Экспортирует функцию для создания и запуска монитора каталога.
 * @param {Object} options - Конфигурационные параметры для CatalogMonitor.
 * @returns {CatalogMonitor} - Экземпляр монитора каталога.
 */
export default function createCatalogMonitor(options) {
  const monitor = new CatalogMonitor(options);

  // Устанавливаем лимит listeners для предотвращения предупреждений
  monitor.setMaxListeners(5);

  // Только обработчик ошибок, остальное добавляет вызывающий код
  monitor.on('error', (error) => {
    console.error(`[CatalogMonitor] ${error}`);
  });

  // Запускаем мониторинг
  monitor.start();

  return monitor;
}
