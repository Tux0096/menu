import * as catalogService from '../../catalog/catalog.service.js';
import * as storageService from '../../storage/storage.service.js';
import { FEED_CONFIG } from './feed.config.js';
import {
  generateHeader,
  generateCategories,
  generateOffers,
  generateFooter,
} from './feed.helper.js';
import CLogger from '../../lib/CLogger.js';

const logger = new CLogger('YandexFeedService');

// Кеш для фидов (по городам)
const feedCache = new Map();
const feedStatsCache = new Map();

/**
 * Получить ID товаров, которые используются как модификаторы
 */
function getModifierProductIds(products) {
  const modifierIds = new Set();

  products.forEach((product) => {
    // Простые модификаторы
    if (product.modifiers && Array.isArray(product.modifiers)) {
      product.modifiers.forEach((modifier) => {
        if (modifier.modifierId) {
          modifierIds.add(modifier.modifierId);
        }
      });
    }

    // Группы модификаторов
    if (product.groupModifiers && Array.isArray(product.groupModifiers)) {
      product.groupModifiers.forEach((group) => {
        if (group.modifiers && Array.isArray(group.modifiers)) {
          group.modifiers.forEach((modifier) => {
            if (modifier.modifierId) {
              modifierIds.add(modifier.modifierId);
            }
          });
        }
      });
    }
  });

  return modifierIds;
}

/**
 * Получить ID категорий, которые являются служебными или не включены в меню
 */
function getServiceCategoryIds(groups) {
  const serviceCategoryIds = new Set();

  groups.forEach((group) => {
    // Проверяем isServiceGroup в additionalInfo
    let isServiceGroup = false;
    if (group.additionalInfo) {
      try {
        const additionalInfo = typeof group.additionalInfo === 'string'
          ? JSON.parse(group.additionalInfo)
          : group.additionalInfo;
        isServiceGroup = additionalInfo?.isServiceGroup === true;
      } catch (e) {
        // Игнорируем ошибки парсинга
      }
    }

    // Исключаем служебные группы и не включенные в меню
    if (isServiceGroup || group.isIncludedInMenu === false || group.isIncludedInMenu === 0) {
      serviceCategoryIds.add(group.id);
    }
  });

  return serviceCategoryIds;
}

/**
 * Фильтрация товаров для фида
 */
function filterProductsForFeed(productsFromCatalog, serviceCategoryIds, modifiersProductIds) {
  let modifiersCount = 0;
  let serviceCategoriesCount = 0;

  const filtered = productsFromCatalog.filter((product) => {
    // Исключаем товары-модификаторы
    if (FEED_CONFIG.filters.excludeModifiers && modifiersProductIds.has(product.id)) {
      modifiersCount++;
      return false;
    }

    // Проверяем isIncludedInMenu
    if (product.isIncludedInMenu === false || product.isIncludedInMenu === 0) {
      return false;
    }

    // Исключаем товары из служебных категорий
    if (product.parentGroup && serviceCategoryIds.has(product.parentGroup)) {
      serviceCategoriesCount++;
      return false;
    }

    // Только опубликованные товары
    if (FEED_CONFIG.filters.onlyPublished && !product.isPublished) {
      return false;
    }

    // Проверяем наличие обязательных полей для фида
    // Для price проверяем !== undefined, так как price может быть 0 (цена из модификаторов)
    if (!product.id || !product.name || product.price === undefined || product.price === null || !product.parentGroup) {
      return false;
    }

    return true;
  });

  logger.log(`Filtered products for feed: ${filtered.length} of ${productsFromCatalog.length}. Excluded modifiers: ${modifiersCount}, service categories: ${serviceCategoriesCount}`);

  return filtered;
}

/**
 * Фильтрация категорий для фида
 */
function filterGroupsForFeed(groupsFromCatalog) {
  const serviceCategoryIds = getServiceCategoryIds(groupsFromCatalog);

  const filtered = groupsFromCatalog.filter((group) => {
    // Исключаем группы модификаторов
    if (group.isGroupModifier) {
      return false;
    }

    // Проверяем isIncludedInMenu
    if (group.isIncludedInMenu === false || group.isIncludedInMenu === 0) {
      return false;
    }

    // Исключаем служебные группы
    if (serviceCategoryIds.has(group.id)) {
      return false;
    }

    return true;
  });

  logger.log(`Filtered groups for feed: ${filtered.length} of ${groupsFromCatalog.length}. Excluded service categories: ${serviceCategoryIds.size}`);

  return filtered;
}

/**
 * Генерация YML фида для города
 */
export async function generateFeed(city = 'samara') {
  try {
    logger.log(`Generating Yandex feed for city: ${city}`);

    // Получаем данные каталога с фильтрацией по городу
    const productsFromCatalog = await catalogService.getProductsFilterByAvailableWork(city);
    const groupsFromCatalog = await catalogService.getGroupsFilterByAvailableWork(city);

    // Получаем текущую ревизию каталога для кеширования
    const revision = await storageService.getRevision();

    // Проверяем кеш
    const cacheKey = `${city}-${revision}`;
    if (feedCache.has(cacheKey)) {
      logger.log(`Returning cached feed for ${city}, revision: ${revision}`);
      return feedCache.get(cacheKey);
    }

    // Получаем ID модификаторов и служебных категорий
    const modifiersProductIds = getModifierProductIds(productsFromCatalog);
    const serviceCategoryIds = getServiceCategoryIds(groupsFromCatalog);

    // Фильтруем товары и категории
    const products = filterProductsForFeed(productsFromCatalog, serviceCategoryIds, modifiersProductIds);
    const groups = filterGroupsForFeed(groupsFromCatalog);

    // Генерируем XML
    let xml = generateHeader();
    xml += generateCategories(groups);
    xml += generateOffers(products, groups, city);
    xml += generateFooter();

    // Сохраняем в кеш
    feedCache.set(cacheKey, xml);

    // Сохраняем статистику
    feedStatsCache.set(cacheKey, {
      city,
      revision,
      totalProducts: products.length,
      totalCategories: groups.length,
      totalProductsInCatalog: productsFromCatalog.length,
      totalCategoriesInCatalog: groupsFromCatalog.length,
      excludedModifiers: modifiersProductIds.size,
      excludedServiceCategories: serviceCategoryIds.size,
      generatedAt: new Date().toISOString(),
    });

    logger.log(`Feed generated successfully for ${city}. Products: ${products.length}, categories: ${groups.length}, revision: ${revision}`);

    return xml;
  } catch (error) {
    logger.log('Error generating Yandex feed', error);
    throw error;
  }
}

/**
 * Получить статистику по фиду
 */
export async function getFeedStats(city = 'samara') {
  const revision = await storageService.getRevision();
  const cacheKey = `${city}-${revision}`;

  return feedStatsCache.get(cacheKey) || {
    city,
    revision,
    cached: false,
    message: 'Feed not generated yet',
  };
}

/**
 * Очистить кеш фидов
 */
export function clearFeedCache() {
  const size = feedCache.size;
  feedCache.clear();
  feedStatsCache.clear();
  logger.log(`Feed cache cleared, removed ${size} entries`);
  return { cleared: size };
}
