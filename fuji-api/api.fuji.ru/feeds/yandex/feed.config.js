import env from '../../env.js';

/**
 * Конфигурация для генерации товарного фида Яндекс.Карт
 */

export const FEED_CONFIG = {
  shopName: 'Fuji - доставка суши и пиццы',
  company: 'ООО «Фуджи»',
  url: env.FRONTEND_URL || 'https://fuji.ru',
  // API домен для изображений (используется IPX для оптимизации)
  apiUrl: env.API_FULL_URL || 'https://api-v3.fuji.ru',

  currency: {
    id: 'RUB',
    rate: 1,
  },

  cities: {
    samara: {
      id: 'a85360f2-55a8-47cc-8a79-1eb88a40c4f0',
      name: 'Самара',
      url: env.FRONTEND_URL || 'https://fuji.ru',
    },
    tolyatti: {
      id: '3f02eb06-e771-434c-ab73-2ec5bbde1265',
      name: 'Тольятти',
      url: env.FRONTEND_URL || 'https://fuji.ru',
    },
    novokujbyshevsk: {
      id: 'e27dec5a-4447-4bcb-a124-0c1795618998',
      name: 'Новокуйбышевск',
      url: env.FRONTEND_URL || 'https://fuji.ru',
    },
  },

  // Настройки доставки по умолчанию
  delivery: {
    enabled: true,
    cost: 0, // Бесплатная доставка
    days: '0', // Доставка в день заказа
  },

  // Настройки самовывоза
  pickup: {
    enabled: true,
    cost: 0,
    days: '0',
  },

  // Vendor (производитель) для всех товаров
  vendor: 'Fuji',

  // Фильтрация товаров
  filters: {
    // Исключаем товары-модификаторы и служебные позиции
    excludeModifiers: true,
    // Только опубликованные товары
    onlyPublished: true,
  },
};

/**
 * Получить конфигурацию для конкретного города
 */
export function getCityConfig(city = 'samara') {
  const cityKey = city.toLowerCase();

  if (!FEED_CONFIG.cities[cityKey]) {
    throw new Error(`Unknown city: ${city}. Available cities: ${Object.keys(FEED_CONFIG.cities).join(', ')}`);
  }

  return FEED_CONFIG.cities[cityKey];
}

/**
 * Валидация названия города
 */
export function isValidCity(city) {
  return city && FEED_CONFIG.cities[city.toLowerCase()] !== undefined;
}

/**
 * Список всех доступных городов
 */
export function getAvailableCities() {
  return Object.keys(FEED_CONFIG.cities);
}
