import { FEED_CONFIG } from './feed.config.js';

/**
 * Экранирование специальных символов для XML
 */
function escapeXml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Генерация XML заголовка фида
 */
export function generateHeader() {
  const {
    shopName, company, url, currency,
  } = FEED_CONFIG;

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<yml_catalog date="${new Date().toISOString()}">\n`;
  xml += '  <shop>\n';
  xml += `    <name>${escapeXml(shopName)}</name>\n`;
  xml += `    <company>${escapeXml(company)}</company>\n`;
  xml += `    <url>${escapeXml(url)}</url>\n`;
  xml += '    <currencies>\n';
  xml += `      <currency id="${currency.id}" rate="${currency.rate}"/>\n`;
  xml += '    </currencies>\n';

  return xml;
}

/**
 * Генерация списка категорий
 */
export function generateCategories(groups) {
  if (!groups || groups.length === 0) {
    return '    <categories/>\n';
  }

  let xml = '    <categories>\n';

  groups.forEach((group) => {
    if (group.isGroupModifier) return;

    const parentId = group.parentGroup || group.parent_group || group.parentId;
    const parentIdAttr = parentId
      ? ` parentId="${escapeXml(parentId)}"`
      : '';

    xml += `      <category id="${escapeXml(group.id)}"${parentIdAttr}>${escapeXml(group.name)}</category>\n`;
  });

  xml += '    </categories>\n';
  return xml;
}

/**
 * Генерация настроек доставки
 */
export function generateDeliveryOptions() {
  const { delivery, pickup } = FEED_CONFIG;

  let xml = '    <delivery-options>\n';

  if (delivery.enabled) {
    xml += `      <option days="${delivery.days}"/>\n`;
  }

  xml += '    </delivery-options>\n';

  if (pickup.enabled) {
    xml += '    <pickup-options>\n';
    xml += `      <option days="${pickup.days}"/>\n`;
    xml += '    </pickup-options>\n';
  }

  return xml;
}

/**
 * Вычисление минимальной цены товара с учетом обязательных модификаторов
 */
export function calculateProductPrice(product) {
  let minPrice = product.price || 0;

  if (product.groupModifiers && Array.isArray(product.groupModifiers)) {
    const requiredModGroups = product.groupModifiers.filter((g) => g.required);

    if (requiredModGroups.length > 0) {
      requiredModGroups.forEach((group) => {
        if (group.modifiers && Array.isArray(group.modifiers) && group.modifiers.length > 0) {
          const minModPrice = Math.min(...group.modifiers.map((m) => m.price || 0));
          minPrice += minModPrice;
        }
      });
    }
  }

  return minPrice;
}

/**
 * Получение полного URL изображения с IPX оптимизацией
 * Использует IPX для конвертации в WebP и оптимизации размера
 */
function getFullImageUrl(imageUrl, apiUrl) {
  if (!imageUrl) return null;

  // Если URL уже абсолютный
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // Базовый домен API из конфигурации
  const baseUrl = apiUrl || 'https://api-v3.fuji.ru';
  const cleanUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;

  // Применяем IPX оптимизацию: WebP формат, качество 100%, размер 500x500
  // Пример: /_ipx/f_webp,q_100,s_500x500/uploads/shop/full/image.png
  const ipxParams = 'f_webp,q_100,s_500x500';

  return `${baseUrl}/_ipx/${ipxParams}${cleanUrl}`;
}

/**
 * Построение иерархии категорий для URL
 * Возвращает массив slug'ов от корневой категории до текущей
 */
function buildCategoryPath(categoryId, groups) {
  const path = [];
  let currentId = categoryId;
  const maxDepth = 10; // Защита от циклических ссылок
  let depth = 0;

  while (currentId && depth < maxDepth) {
    const category = groups.find((g) => g.id === currentId);
    if (!category) break;

    if (category.slug) {
      path.unshift(category.slug);
    }

    currentId = category.parentGroup || category.parent_group || category.parentId;
    depth++;
  }

  return path;
}

/**
 * Генерация описания одного товара (offer)
 */
export function generateOffer(product, groups, city) {
  const {
    url: siteUrl, vendor, delivery, pickup, apiUrl,
  } = FEED_CONFIG;

  // Строим иерархический URL товара с учетом категорий и города
  let productUrl = siteUrl;

  if (city && city !== 'samara') {
    // Добавляем город в URL (кроме Самары, там город не указывается)
    productUrl += `/${city}`;
  }

  productUrl += '/catalog';

  // Добавляем иерархию категорий
  if (product.parentGroup && groups) {
    const categoryPath = buildCategoryPath(product.parentGroup, groups);
    if (categoryPath.length > 0) {
      productUrl += `/${categoryPath.join('/')}`;
    }
  }

  // Добавляем slug товара
  if (product.slug) {
    productUrl += `/${product.slug}`;
  }

  // Изображение
  const imageUrl = getFullImageUrl(product.image, apiUrl);

  // Описание (очищаем от HTML тегов если есть)
  const description = product.description
    ? product.description.replace(/<[^>]*>/g, '').trim()
    : product.name;

  // Вычисляем финальную цену с учетом обязательных модификаторов
  const finalPrice = calculateProductPrice(product);

  let xml = `      <offer id="${escapeXml(product.id)}" available="true">\n`;
  xml += `        <name>${escapeXml(product.name)}</name>\n`;
  xml += `        <vendor>${escapeXml(vendor)}</vendor>\n`;
  xml += `        <url>${escapeXml(productUrl)}</url>\n`;
  xml += `        <price>${finalPrice}</price>\n`;

  // Старая цена (если есть скидка)
  if (product.oldPrice && product.oldPrice > finalPrice) {
    xml += `        <oldprice>${product.oldPrice}</oldprice>\n`;
  }

  xml += `        <currencyId>${FEED_CONFIG.currency.id}</currencyId>\n`;
  xml += `        <categoryId>${escapeXml(product.parentGroup)}</categoryId>\n`;

  if (imageUrl) {
    xml += `        <picture>${escapeXml(imageUrl)}</picture>\n`;
  }

  if (delivery.enabled) {
    xml += '        <delivery>true</delivery>\n';
  }

  if (pickup.enabled) {
    xml += '        <pickup>true</pickup>\n';
  }

  xml += `        <description>${escapeXml(description)}</description>\n`;

  // Дополнительные характеристики
  if (product.weight) {
    const weightInGrams = Math.round(product.weight * 1000);
    xml += `        <param name="Вес">${weightInGrams} г</param>\n`;
  }

  if (product.energyAmount) {
    xml += `        <param name="Энергетическая ценность">${product.energyAmount} ккал</param>\n`;
  }

  if (product.fiberAmount) {
    xml += `        <param name="Белки">${product.fiberAmount.toFixed(1)} г</param>\n`;
  }

  if (product.fatAmount) {
    xml += `        <param name="Жиры">${product.fatAmount.toFixed(1)} г</param>\n`;
  }

  if (product.carbohydrateAmount) {
    xml += `        <param name="Углеводы">${product.carbohydrateAmount.toFixed(1)} г</param>\n`;
  }

  xml += '      </offer>\n';

  return xml;
}

/**
 * Генерация списка товаров (offers)
 */
export function generateOffers(products, groups, city) {
  if (!products || products.length === 0) {
    return '    <offers/>\n';
  }

  let xml = '    <offers>\n';

  products.forEach((product) => {
    xml += generateOffer(product, groups, city);
  });

  xml += '    </offers>\n';

  return xml;
}

/**
 * Генерация XML footer
 */
export function generateFooter() {
  let xml = '  </shop>\n';
  xml += '</yml_catalog>\n';
  return xml;
}
