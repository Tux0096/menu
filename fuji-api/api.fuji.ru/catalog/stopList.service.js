import initModels from '../models/init-models.js';
import CLogger from '../lib/CLogger.js';
import { sequelize } from '../db.js';

const models = initModels(sequelize);
const {
  StopList,
} = models;

const logger = new CLogger();

/**
 * Получить стоп-лист для конкретного терминала доставки
 * @param {string} deliveryTerminalId - ID терминала доставки
 * @returns {Promise<Array>} Массив товаров в стоп-листе (balance = 0)
 */
export const getStopListByTerminal = async (deliveryTerminalId) => {
  try {
    const stopListItems = await StopList.findAll({
      where: {
        deliveryTerminalId,
        balance: 0,
      },
      attributes: ['productId', 'balance'],
      raw: true,
    });

    return stopListItems.map((item) => item.productId);
  } catch (error) {
    logger.error('Error getting stop list by terminal', {
      deliveryTerminalId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Проверить, находится ли товар в стоп-листе для терминала
 * @param {string} productId - ID товара
 * @param {string} deliveryTerminalId - ID терминала доставки
 * @returns {Promise<boolean>} true если товар в стоп-листе
 */
export const isProductInStopList = async (productId, deliveryTerminalId) => {
  try {
    const stopListItem = await StopList.findOne({
      where: {
        productId,
        deliveryTerminalId,
        balance: 0,
      },
      raw: true,
    });

    return !!stopListItem;
  } catch (error) {
    logger.error('Error checking product in stop list', {
      productId,
      deliveryTerminalId,
      error: error.message,
    });
    return false;
  }
};

/**
 * Получить все стоп-листы для всех терминалов
 * @returns {Promise<Object>} Объект с ключами deliveryTerminalId и значениями - массивы productId
 */
export const getAllStopLists = async () => {
  try {
    const allStopLists = await StopList.findAll({
      where: {
        balance: 0,
      },
      attributes: ['productId', 'deliveryTerminalId'],
      raw: true,
    });

    // Группируем по терминалам
    const stopListsByTerminal = allStopLists.reduce((acc, item) => {
      if (!acc[item.deliveryTerminalId]) {
        acc[item.deliveryTerminalId] = [];
      }
      acc[item.deliveryTerminalId].push(item.productId);
      return acc;
    }, {});

    logger.info('All stop lists retrieved', {
      terminalsCount: Object.keys(stopListsByTerminal).length,
      totalItems: allStopLists.length,
    });

    return stopListsByTerminal;
  } catch (error) {
    logger.error('Error getting all stop lists', {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Фильтровать товары, исключая те что в стоп-листе для терминала
 * @param {Array} products - Массив товаров
 * @param {string} deliveryTerminalId - ID терминала доставки
 * @returns {Promise<Array>} Отфильтрованный массив товаров
 */
export const filterProductsByStopList = async (products, deliveryTerminalId) => {
  try {
    if (!deliveryTerminalId) {
      // Если терминал не указан, возвращаем все товары
      return products;
    }

    const stopListProductIds = await getStopListByTerminal(deliveryTerminalId);

    const filteredProducts = products.filter((product) => !stopListProductIds.includes(product.id));

    return filteredProducts;
  } catch (error) {
    logger.error('Error filtering products by stop list', {
      deliveryTerminalId,
      error: error.message,
    });

    return products;
  }
};
