import { cityTo } from 'lvovich';
import { EXCLUDE_MODS } from '../config/common.js';
import * as storageService from '../storage/storage.service.js';
import CLogger from '../lib/CLogger.js';
import * as fileService from '../file/file.service.js';

import {
  getAllergens,
  getCatalogImage,
  getComposition,
  getCount,
  getCountInSet,
  getFilters,
  getIsNovokujbyshevskHidden,
  getIsSamaraHidden,
  getIsTolyattiHidden,
  getMaxPerPositionInOrder,
  getOldPrice,
  getProductAdditionalInfo,
  getRelatedProductImage,
  sortModifiers,
  uniqModifiers,
} from './catalog.helper.js';
import * as catalogRepo from './catalog.repository.js';
import { filterCatalogByAvailableWork } from '../lib/helpers.js';

const logger = new CLogger();

// Управление кешем каталога с автоматической очисткой
const cache = new Map(); // Кеш данных (объекты)
const jsonCache = new Map(); // Кеш сериализованного JSON (строки)
let currentRevision = null;
const MAX_CACHE_SIZE = 50; // Максимум записей в кеше (защита от утечки)

// Защита от thundering herd - храним промисы загрузки
const loadingPromises = new Map();

// Очистка устаревшего кеша при смене ревизии
function clearCacheIfNeeded(revision) {
  if (currentRevision !== revision) {
    const oldSize = cache.size;
    cache.clear();
    jsonCache.clear();
    currentRevision = revision;

    if (oldSize > 0) {
      logger.log(`🗑️ Кеш каталога очищен (ревизия изменилась: ${currentRevision}). Удалено записей: ${oldSize}`);
    }
  }

  // Защита от переполнения: если кеш превышает лимит, очищаем старые записи
  if (cache.size >= MAX_CACHE_SIZE) {
    const keysToDelete = Array.from(cache.keys()).slice(0, Math.floor(MAX_CACHE_SIZE / 2));
    keysToDelete.forEach((key) => {
      cache.delete(key);
      jsonCache.delete(key);
    });
    logger.log(`⚠️ Кеш каталога достиг лимита. Удалено старых записей: ${keysToDelete.length}`);
  }
}

async function getProductImageWithCustom(product) {
  if (product.customImageId) {
    try {
      const customImage = await fileService.getFile(product.customImageId);
      if (customImage) {
        return customImage.url;
      }
    } catch (error) {
      logger.log(`Ошибка при загрузке кастомного изображения для продукта ${product.id}: ${error.message}`);
    }
  }

  return getCatalogImage(product);
}

export const getModifiersAll = async () => catalogRepo.getModifiersAll();

export const getGroupModifiers = async () => catalogRepo.getGroupModifiers(EXCLUDE_MODS);

export const getGroupModifiersChildren = async () => catalogRepo.getGroupModifiersChildren();

export async function getGroupsAll() {
  function getNameTo(group) {
    if (group.id === '1fb068d0-5a7d-408f-99d5-3a3d63ccb552') { // пицца два вкуса
      return 'пиццу два вкуса';
    }
    return cityTo(group.name);
  }

  const groupsAll = await catalogRepo.getGroupsAll();

  const groups = groupsAll.map((g) => {
    let additionalInfo = {};
    try {
      additionalInfo = JSON.parse(g.additionalInfo);
    } catch (e) {
      additionalInfo = {};
    }

    return {
      ...g,
      nameTo: getNameTo(g),
      id: g.id,
      additionalInfo,
      image: getCatalogImage(g),
      parentGroup: g.parentGroup || null, // Явно добавляем parentGroup
    };
  });
  groups.sort((a, b) => a.order - b.order);

  return groups;
}

export const getGroupsFilterByAvailableWork = async (city = 'samara') => {
  const groups = await getGroupsAll();
  return filterCatalogByAvailableWork(groups, city);
};

export const getProductImage = async (productId) => {
  if (typeof productId !== 'string' || productId.trim().length === 0) {
    throw new Error('Invalid product id');
  }

  try {
    return await catalogRepo.getProductImage(productId);
  } catch (e) {
    const error = new Error(`Failed to get product image by id ${productId}: ${e.message}`);
    logger.log(error);
    return Promise.reject(error);
  }
};

export async function getProductByCode(code) {
  if (typeof code !== 'string' || code.trim().length === 0) {
    throw new Error('Invalid product code');
  }

  try {
    const product = await catalogRepo.getProductByCode(code);
    product.image = await getProductImage(product.id);

    return product;
  } catch (e) {
    const error = new Error(`Failed to get product by code ${code}: ${e.message}`);
    logger.log(error);
    return Promise.reject(error);
  }
}

export const getProductsAll = async (isAdmin = false) => {
  const [
    groups,
    modifiers,
    groupModifiers,
    groupModifiersChildren,
  ] = await Promise.all([
    getGroupsAll(),
    getModifiersAll(),
    getGroupModifiers(),
    getGroupModifiersChildren(),
  ]);
  const productsAll = await catalogRepo.getProductsAll(isAdmin);
  const productPromises = productsAll.map(async (p) => {
    const compositionProductCodes = getComposition(p);
    const compositionProductPromises = compositionProductCodes
      .map((code) => getProductByCode(code).catch(() => null));
    const compositionProducts = (await Promise.all(compositionProductPromises)).filter(Boolean);

    const composition = compositionProducts.map((product) => ({
      name: product.name,
      description: product.description,
      image: getCatalogImage(product),
    }));

    const parentGroup = groups.find((g) => g.id === p.parentGroup);
    const parentGroupName = parentGroup ? parentGroup.name : null;

    return ({
      id: p.id,
      name: p.name,
      nameTo: cityTo(p.name),
      code: p.code,
      parentGroup: p.parentGroup,
      parentGroupName,
      price: p.price,
      oldPrice: getOldPrice(p),
      composition,
      weight: p.weight,
      countInSet: getCountInSet(p),
      count: getCount(p),
      isSamaraHidden: getIsSamaraHidden(p),
      isNovokujbyshevskHidden: getIsNovokujbyshevskHidden(p),
      isTolyattiHidden: getIsTolyattiHidden(p),
      maxPerPositionInOrder: getMaxPerPositionInOrder(p),
      order: p.order,
      energyAmount: p.energyAmount,
      fiberAmount: p.fiberAmount,
      fatAmount: p.fatAmount,
      carbohydrateAmount: p.carbohydrateAmount,
      additionalInfo: getProductAdditionalInfo(p),
      groupModifiers: [],
      slug: p.slug,
      likesCount: p.likesCount,
      isLiked: false,
      description: p.description,
      image: await getProductImageWithCustom(p),
      createdAt: p.createdAt,
      filters: getFilters(p),
      allergens: getAllergens(p),
      customImageId: p.customImageId,
      isPublished: !!p.isPublished,
    });
  });

  const products = await Promise.all(productPromises);

  const filteredProducts = products.filter((p) => {
    const { additionalInfo } = p;

    if (additionalInfo?.deliveryMobile?.isSticker) {
      return false;
    }

    if (additionalInfo?.deliveryMobile?.isHide) {
      return false;
    }

    return true;
  });

  filteredProducts.sort((a, b) => a.order - b.order);

  modifiers.forEach((m) => {
    const p = products.find((el) => el.id === m.modifierId);
    if (p) {
      m.name = p.name;
      m.code = p.code;
      m.price = p.price;
      m.weight = p.weight;
      m.fiberAmount = p.fiberAmount;
      m.fatAmount = p.fatAmount;
      m.carbohydrateAmount = p.carbohydrateAmount;
      m.energyAmount = p.energyAmount;
    }
  });

  groupModifiers.forEach((groupModifier) => {
    const referringGroup = groups.find((g) => g.id === groupModifier.modifierId);

    if (!referringGroup) {
      logger.log(`Не найдена группа с id ${groupModifier.modifierId}`);
      groupModifier.name = `Неизвестная группа (${groupModifier.modifierId})`;
    } else {
      groupModifier.name = referringGroup.name;
    }

    const children = groupModifiersChildren
      .filter((groupModifiersChild) => groupModifiersChild.parentId === groupModifier.modifierId)
      .map((child) => {
        const product = products.find((p) => p.id === child.modifierId);

        if (!product) {
          logger.log(`Не найден продукт с id ${child.modifierId}`);
          return child;
        }

        const relatedProductImage = getRelatedProductImage(products, product.id);

        const cloneChild = { ...child };
        if (product) {
          cloneChild.name = (function (productName) {
            let resultName = productName.trim();
            if (resultName.startsWith('-')) {
              resultName = resultName.slice(1);
            }
            return resultName.trim();
          }(product.name));

          cloneChild.code = product.code;
          cloneChild.price = product.price;
          cloneChild.description = product.description;
          cloneChild.image = relatedProductImage;

          cloneChild.weight = product.weight;
          cloneChild.fiberAmount = product.fiberAmount;
          cloneChild.fatAmount = product.fatAmount;
          cloneChild.carbohydrateAmount = product.carbohydrateAmount;
          cloneChild.energyAmount = product.energyAmount;

          cloneChild.groupId = child.parentId;
          cloneChild.groupName = groupModifier.name;
          cloneChild.maxAmount = groupModifier.maxAmount;
          cloneChild.minAmount = groupModifier.minAmount;
        }
        return cloneChild;
      });

    groupModifier.modifiers = uniqModifiers(children);

    sortModifiers(groupModifier.modifiers);
  });

  products.forEach((p) => {
    p.groupModifiers = [];

    const groupModifiersForProduct = groupModifiers
      .filter((groupModifier) => groupModifier.parentId === p.id);

    p.requiredGroupModifier = groupModifiersForProduct.find((el) => el.required);
    p.minGroupMod = 0;
    if (p.requiredGroupModifier) {
      p.minGroupMod = Math.min(...p.requiredGroupModifier.modifiers.map((el) => el.price));
    }

    p.groupModifiers.push(...groupModifiersForProduct);

    const modifiersForProduct = modifiers
      .filter((modifier) => modifier.productId === p.id);

    if (modifiersForProduct.length) {
      p.modifiers = modifiersForProduct;
    }
  });

  return filteredProducts;
};

export const getProductsFilterByAvailableWork = async (city = 'samara') => {
  const products = await getProductsAll();
  const groups = await getGroupsFilterByAvailableWork(city);
  return products
    .filter(
      (product) => groups.some((group) => group.id === product.parentGroup),
    );
};

export const getImagesAll = async () => catalogRepo.getImagesAll();

export const getStopList = async () => catalogRepo.getStopList();

export const getCatalog = async (city = 'samara', deliveryTerminalId = null) => {
  const [
    productsAll,
    groups,
    stopList,
  ] = await Promise.all([
    getProductsFilterByAvailableWork(city),
    getGroupsFilterByAvailableWork(city),
    getStopList(),
  ]);

  return { products: productsAll, groups, stopList };
};

export const getCatalogByTerminal = async (city = 'samara', deliveryTerminalId = null) => {
  const [
    productsAll,
    groups,
  ] = await Promise.all([
    getProductsFilterByAvailableWork(city),
    getGroupsFilterByAvailableWork(city),
  ]);

  let filteredProducts = productsAll;
  let stopList = [];

  // Если указан терминал, фильтруем по стоп-листу
  if (deliveryTerminalId) {
    const { filterProductsByStopList, getStopListByTerminal } = await import('./stopList.service.js');

    filteredProducts = await filterProductsByStopList(productsAll, deliveryTerminalId);

    stopList = await getStopListByTerminal(deliveryTerminalId);
  }

  return { products: filteredProducts, groups, stopList };
};

export const getCatalogCache = async (city = 'samara', deliveryTerminalId = null) => {
  const revision = await storageService.getRevision();

  // Очищаем кеш при смене ревизии
  clearCacheIfNeeded(revision);

  const cacheKey = deliveryTerminalId
    ? `${revision}-${city}-${deliveryTerminalId}`
    : `${revision}-${city}`;

  // Проверяем кеш JSON (быстрый путь)
  if (jsonCache.has(cacheKey)) {
    return { json: jsonCache.get(cacheKey), isPreSerialized: true };
  }

  // Проверяем кеш объектов
  if (cache.has(cacheKey)) {
    return { data: cache.get(cacheKey), isPreSerialized: false };
  }

  // Защита от thundering herd: если уже идет загрузка - ждем её
  if (loadingPromises.has(cacheKey)) {
    return await loadingPromises.get(cacheKey);
  }

  // Создаем промис загрузки
  const loadingPromise = (async () => {
    try {
      const result = deliveryTerminalId
        ? await getCatalogByTerminal(city, deliveryTerminalId)
        : await getCatalog(city);

      // Сериализуем в JSON один раз
      const jsonString = JSON.stringify(result);

      cache.set(cacheKey, result);
      jsonCache.set(cacheKey, jsonString);

      return { json: jsonString, isPreSerialized: true };
    } finally {
      loadingPromises.delete(cacheKey);
    }
  })();

  loadingPromises.set(cacheKey, loadingPromise);
  return await loadingPromise;
};

export const getProductBySlug = async (slug) => catalogRepo.getProductBySlug(slug);

export const getProductById = async (id) => {
  const product = await catalogRepo.getProductById(id);

  if (!product) {
    return null;
  }

  try {
    product.image = await getProductImageWithCustom(product);

    // Добавляем название категории товара
    if (product.parentGroup) {
      const group = await catalogRepo.getGroupById(product.parentGroup);
      if (group) {
        product.parentGroupName = group.name;
      }
    }

    product.additionalInfo = getProductAdditionalInfo(product);
    product.allergens = getAllergens(product);
    product.filters = getFilters(product);
    product.nameTo = cityTo(product.name);
    product.oldPrice = getOldPrice(product);

    return product;
  } catch (e) {
    const error = new Error(`Failed to get complete product data by id ${id}: ${e.message}`);
    logger.log(error);
    return product;
  }
};

/**
 * Получение модели продукта без дополнительной обработки для внутренних нужд
 */
export const getProductModelById = async (id) => catalogRepo.getProductById(id);

export async function getCategoryIdByProductId(id) {
  return catalogRepo.getCategoryIdByProductId(id);
}

/**
 * Обновляет информацию о товаре
 */
export const updateProduct = async (productId, updateData) => {
  try {
    // Получаем текущий товар для проверки
    const product = await getProductModelById(productId);

    if (!product) {
      throw new Error('Product not found');
    }

    const updateFields = {};

    if (updateData.isPublished !== undefined) {
      updateFields.isPublished = updateData.isPublished;
    }

    if (updateData.imageId) {
      const fileExists = await fileService.getFile(updateData.imageId);
      if (!fileExists) {
        throw new Error('File not found');
      }
      updateFields.customImageId = updateData.imageId;
    } else if (updateData.imageId === null) {
      updateFields.customImageId = null;
    }

    // Обновляем товар
    return await catalogRepo.updateProduct(productId, updateFields);
  } catch (error) {
    console.error(`Error updating product ${productId}:`, error);
    throw error;
  }
};

export const getDeliveryProducts = async () => {
  try {
    const deliveryProducts = await catalogRepo.getDeliveryProducts();

    return deliveryProducts.map((product) => ({
      id: product.id,
      name: product.name,
      code: product.code,
      price: product.price,
    }));
  } catch (e) {
    logger.log(`Failed to get delivery products: ${e.message}`);
    return [];
  }
};
