import { getImageURL, plural } from '../../lib/helpers.js';
import catalogMenu from './catalogMenu.js';
import * as terminalsService from '../../terminals/terminals.service.js';

import citiesData from './citiesData/index.js';
import * as mapService from '../../map/map.service.js';

// глобальный (для всего сайта, если не перезаписан у конкретной страницы) шаблон мета тегов
// в мобильном приложении не используется
export const GLOBAL_SEO_META_TAG = {
  titleTemplate: '%s',
  title: 'Доставка еды. Пицца, суши, роллы Фуджи Суши Friends',
  description: `Доставка еды. В Фуджи Суши Friends можно заказать блюда итальянской и
  японской кухни: пицца, суши, роллы и др. 8 800 2222-000`,
};

// iiko id категории которая выводится в корзине (сейчас это блок Наши хиты)
export const SECTION_ID_ADD_TO_ORDER = '9156ad82-bdbe-4dde-a0ec-3fe6fbff58bd';

// iiko id категории которая выводится в корзине (сейчас это блок Выбрать соус)
export const SECTION_ID_ADDITIONALLY = '430c2091-ce36-4ab8-9aff-51e8afa0b5c1';

// Терминалы. Формируют список самовывоза. Данные теперь берутся из базы данных
export const DELIVERY_TERMINALS = async () => {
  const terminals = await terminalsService.getAllTerminals();

  // Группируем терминалы по cityId, только активные (isDisabled !== true)
  const groupedTerminals = {};
  terminals.forEach((terminal) => {
    if (!terminal.isDisabled) {
      if (!groupedTerminals[terminal.cityId]) {
        groupedTerminals[terminal.cityId] = [];
      }
      groupedTerminals[terminal.cityId].push(terminal);
    }
  });

  return groupedTerminals;
};

// Статусы для заказов. В данный момент не используются
export const ADMIN_ORDER_STATUSES = {
  NEW: 'новый',
  WAIT_PAYMENT: 'ожидает оплату',
  PAYED: 'оплачен',
  COMPLETED: 'завершен',
  ERROR_PAYMENT: 'проблема с оплатой',
};

// список id категорий, в которых товары при клике на кнопку добавить
// в корзину переходят в карточку товара, чтобы можно было выбрать моды
// (типа пицца, вок и т.д.)
export const CUSTOM_ADD_TO_CART_GROUPS_ID = [
  '42c534bf-6aa3-4128-85e4-3a15195527c9', // pizza
  'fcfad280-8795-4940-8fd9-9654c55934fd', // wok-noodles
  '284d37ed-bc12-475c-ab48-e1fc2c872cef', // wok-rice
  '1fb068d0-5a7d-408f-99d5-3a3d63ccb552', // pizza two taste
  '6994a37b-f7ae-4c41-8ace-d424caa2211d', // big rolls
  'f4eefc21-f175-4cd0-a2e7-32a1948668b7', // backed rolls
  '4a72b94b-c664-4664-babf-5fc073f00b77', // warm rolls
  'baf5a5d6-16a6-45f4-af1e-5e80fae833f2', // soup
  // 'cd04f3a0-3a40-4529-abec-68b126dcb36a', // promo - for testing
  '493a8ce7-082c-4ef2-8915-334b1549cf2b', // akciya
  '77b5b79d-6beb-4507-b7ce-d603010d796d', // salaty
  '57db5db5-9be2-43ea-ab87-9d5a2a0bdb5a', // novogodnee
];

// id категорий с пиццами
// используется, чтобы указать мета теги у пицц
export const PIZZAS_GROUP_ID = [
  '42c534bf-6aa3-4128-85e4-3a15195527c9',
  '1fb068d0-5a7d-408f-99d5-3a3d63ccb552',
];

// id категории снеков
// используется для ПРИ ЗАКАЗЕ 3Х ЛЮБЫХ ЗАКУСОК - КАРТОФЕЛЬ ФРИ В ПОДАРОК
export const SNACKS_GROUP_ID = [
  'f42ab48f-30e0-43bd-9b2b-c6e35c5624b0',
];

// хз для чего, в коде нет
export const GIFT_IDS = {
  PIZZA: '0be71d02-ec86-430c-aa5c-0977a090e260',
  SNACK: 'dea6f077-c3ae-450b-871a-3ad0ca28769a',
};

// id 3 основных городов
export const SAMARA_ID = 'a85360f2-55a8-47cc-8a79-1eb88a40c4f0';
export const TOLYATTI_ID = '3f02eb06-e771-434c-ab73-2ec5bbde1265';
export const NOVOKUJBYSHEVSK_ID = 'e27dec5a-4447-4bcb-a124-0c1795618998';

// меню сайта
export const CATALOG_MENU = async (city = 'samara') => catalogMenu(city);

// Зоны доставки. Выводятся на карте и используются для проверки вхождения адреса в зону доставки
// сами зоны в базе
// настройки ./citiesData/deliveryTerminals.js
export const CITY_ZONES = async () => {
  try {
    // Сначала пытаемся получить зоны из БД
    const samaraId = 'a85360f2-55a8-47cc-8a79-1eb88a40c4f0';
    const tolyattiId = '3f02eb06-e771-434c-ab73-2ec5bbde1265';
    const novokujbyshevskId = 'e27dec5a-4447-4bcb-a124-0c1795618998';

    const samara = await mapService.getZonesForFrontend(samaraId, {
      mapCenter: {
        latitude: 53.183330,
        longitude: 50.116670,
      },
      mapZoom: 16,

    });
    const tolyatti = await mapService.getZonesForFrontend(tolyattiId, {
      mapCenter: {
        latitude: 53.497259794104586,
        longitude: 49.2617857044914,
      },
      mapZoom: 16,

    });
    // novokujbyshevsk используют такие же зоны, как и у Самары
    const novokujbyshevsk = await mapService.getZonesForFrontend(novokujbyshevskId, {
      mapCenter: {
        latitude: 53.0959,
        longitude: 49.9462,
      },
      mapZoom: 16,

    });

    return {
      [samaraId]: samara,
      [tolyattiId]: tolyatti,
      [novokujbyshevskId]: novokujbyshevsk,
    };
  } catch (error) {
    console.error('Ошибка получения зон из БД, используем файловые зоны:', error);
  }
};

// настройки для городов. Подробнее в ./citiesData/index.js
export const CITIES_DATA = citiesData;

export const ALLERGENS = [
  { name: 'Кунжут', code: 'sesame' },
  { name: 'Орехи', code: 'nuts' },
  { name: 'Мед', code: 'honey' },
  { name: 'Яйца', code: 'eggs' },
  { name: 'Рыба', code: 'fish' },
  { name: 'Икра красная', code: 'caviar' },
  { name: 'Икра масаго', code: 'masago' },
  { name: 'Креветки', code: 'shrimp' },
  { name: 'Моллюски', code: 'shellfish' },
  { name: 'Молоко', code: 'milk' },
  { name: 'Соя', code: 'soy' },
  { name: 'Горчица', code: 'mustard' },
  { name: 'Цитрусы', code: 'citrus' },
  { name: 'Глютен', code: 'gluten' },
  { name: 'Клубника', code: 'strawberries' },

];

// баннеры внутри групп блюд (например samara/catalog/sety)
const imageOptions = {
  mobile: {
    quality: 90,
    width: 1440,
  },
  desktop: {
    quality: 90,
    width: 768,
  },
};
export const SECTION_PROMO_IMAGES = {
  picca: {
    mobile: getImageURL('content/catalog-promo/catalog-pizza.png', imageOptions.mobile),
    desktop: getImageURL('content/catalog-promo/catalog-pizza.png', imageOptions.desktop),
  },
  sety: {
    mobile: getImageURL('content/catalog-promo/catalog-sets.png', imageOptions.mobile),
    desktop: getImageURL('content/catalog-promo/catalog-sets.png', imageOptions.desktop),
  },
  'zapechennye-rolly': {
    mobile: getImageURL('content/catalog-promo/catalog-baked-rolls.png', imageOptions.mobile),
    desktop: getImageURL('content/catalog-promo/catalog-baked-rolls.png', imageOptions.desktop),
  },
};

// акция на странице /personal
export const PERSONAL_PAGE_PROMO = {
  // ссылка на страницу каталога с акцией
  link: '/catalog/sety',
  // картинка акции
  image: getImageURL(
    'content/personal/action-3.png',
    {
      width: 680,
      format: 'webp',
    },
  ),
};

export const PHONES = {
  deliveryService: '8 800 2222-000',
};

// Динамическое формирование времени доставки на основе данных зон
export const CHECKOUT_DELIVERY_TEXT = async (zoneId) => {
  const DEFAULT_PREPARATION_TIME = 60;
  const DEFAULT_DELIVERY_TIME = 30;
  const SELF_TITLE = '30 минут приготовление и контроль качества';

  const getDefaultDeliveryText = (
    preparation = DEFAULT_PREPARATION_TIME,
    delivery = DEFAULT_DELIVERY_TIME,
  ) => ({
    delivery: {
      title: `${plural(preparation, ['минута', 'минуты', 'минут'])} приготовление и контроль качества`,
      text: `доставка ${plural(delivery, ['минута', 'минуты', 'минут'])} или быстрее`,
    },
    self: {
      title: SELF_TITLE,
    },
  });

  try {
    if (!zoneId) {
      return getDefaultDeliveryText();
    }

    const zone = await mapService.getZoneById(zoneId);

    if (!zone) {
      console.warn(`Зона с ID ${zoneId} не найдена, используем значения по умолчанию`);
      return getDefaultDeliveryText();
    }

    const preparationTime = zone.preparationTime || DEFAULT_PREPARATION_TIME;
    const deliveryTime = zone.deliveryTime || DEFAULT_DELIVERY_TIME;

    return getDefaultDeliveryText(preparationTime, deliveryTime);
  } catch (error) {
    console.error('Ошибка при получении времени доставки для зоны:', error);
    return getDefaultDeliveryText();
  }
};

export const IS_SHOW_8MARCH_MODAL = false;
