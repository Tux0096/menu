## run
pm2 start ./ecosystem.config.cjs

```
{
  "status": "success",
  "data": {
    "token": "your_generated_token",
    "user": {
      "id": 123,
      "name": "John Doe"
    }
  },
  "message": "Operation completed successfully"
}

{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid phone number",
    "details": [
      {
        "field": "phone",
        "issue": "Phone number is required"
      }
    ]
  }
}

```

## Настройки

```
INSERT INTO settings ( name, title, type, widget, description, value) VALUES ('IS_SITE_NOT_WORKING', 'Выключить продажи на сайте', 'boolean', 'switcher', 'Выключает возможность добавить в корзину и сделать заказ', '0');
INSERT INTO settings ( name, title, type, widget, description, value) VALUES ('TEXT_SITE_NOT_WORKING', 'Текст если выключены продажи', 'string', 'textarea', 'Если продажи на сайте выключены, то указанный текст будет выводиться в модалке', 'Наши производства сейчас временно перегружены. Но мы очень быстро приготовим накопившиеся заказы и снова начнём их принимать. <br> Приносим свои извинения за неудобства.');
INSERT INTO settings ( name, title, type, widget, description, value) VALUES ('SETTINGS_VERSION', 'Версия настроек', 'number', 'text', 'Если поменялись настройки нужно сменить версию чтобы у пользователя обновились настройки', '4');
INSERT INTO settings ( name, title, type, widget, description, value) VALUES ('STORE_VERSION', 'Версия стора на фронте', 'number', 'text', '!!!Сбросит авторизацию всех пользователей.
Меняем, когда нужно сбросить стор на фронте (например когда изменилась структура данных)', '6');
INSERT INTO settings ( name, title, type, widget, description, value) VALUES ('IS_AUTH_WITHOUT_SMS', 'Выключить авторизацию по СМС', 'boolean', 'switcher', 'Если выключить пользователь сможет войти на сайт просто введя номер телефона.
Можно выключить если есть проблемы с smsc.ru (например если нет денег на sms.ru)', '0');
INSERT INTO settings ( name, title, type, widget, description, value) VALUES ('IS_WITHOUT_RECAPTCHA', 'Выключить капчу на сайте', 'boolean', 'switcher', 'Если выключить пользователь не будет проверяться на бота с использованием капчи', '0');
INSERT INTO settings ( name, title, type, widget, description, value) VALUES ('MOBILE_APP_VERSION', 'Версия мобильного приложения', 'number', 'text', 'Используется только в мобильном приложении.
Если нужно обновить приложение на мобильном устройстве нужно заменить версию здесь и в билде для мобилок,
если они разные, то юзеру будет сообщение о необходимости обновить приложение
!!! Изменять только после публикации ОБОИХ приложений в сторах
приложения опубликовывать желательно в не рабочее время
(чтобы не было такой ситуации, что у пользователя будет сообщение о необходимости обновить приложение, а самого приложения в сторах еще не будет)', '5');
INSERT INTO settings ( name, title, type, widget, description, value) VALUES ('YANDEX_MAPS_API_KEY', 'Ключ для API Яндекс карт', 'string', 'text', null, '30c1d34f-9ebd-4459-a3cd-e4af952a7074');
INSERT INTO settings ( name, title, type, widget, description, value) VALUES ('SMARTCAPTCHA_SITE_KEY', 'Ключ для API Яндекс smartcaptcha ', 'string', 'text', null, 'ysc1_2QCgbp4WzugrZeJCFpAPnoHRNXfpOIs5Z8zA6Dm2c6854b0a');
INSERT INTO settings ( name, title, type, widget, description, value) VALUES ('YANDEX_COUNTER_ID', 'ID счетчика Яндекс метрики', 'string', 'text', null, '57379729');
INSERT INTO settings ( name, title, type, widget, description, value) VALUES ('GOOGLE_COUNTER_ID', 'ID счетчика google analytics', 'string', 'text', null, 'AW-759998552');
INSERT INTO settings ( name, title, type, widget, description, value) VALUES ('IS_ONLINE_PAYMENT_DISABLE', 'отключить онлайн оплату (для всех зон)', 'json', 'multi-switcher', ' delivery - отключить онлайн оплату (для всех зон) на доставку
 self - отключить онлайн оплату (для всех ресторанов) на самовывоз', '{"delivery":false,"self":false}');

```

```
import { getImageURL } from '../../lib/helpers.js';
import deliveryTerminals from './citiesData/deliveryTerminals.js';
import catalogMenu from './catalogMenu.js';
import citiesData from './citiesData/index.js';

// нужно менять всегда, когда что-то поменялось в настройках пока не перенесем настройки в базу
export const SETTINGS_VERSION = 61;

// STORE_VERSION меняем, когда нужно сбросить стор на фронте
// (например когда изменилась структура данных)
export const STORE_VERSION = 5;

// чтобы отключить авторизацию по sms
// выставить в true (например если нет денег на sms.ru)
export const IS_AUTH_WITHOUT_SMS = false;

// если что-то случилось с google recaptcha, то ее можно выключить выставив true
export const IS_WITHOUT_RECAPTCHA = false;

// MOBILE_APP_VERSION если нужно обновить приложение на мобильном устройстве
// нужно заменить версию здесь и в билде для мобилок
// если они разные то юзеру будет сообщение о необходимости обновить приложение
// !!! Изменять только после публикации ОБОИХ приложений в сторах
// приложения опубликовывать желательно в не рабочее время
export const MOBILE_APP_VERSION = 4;

// выключает возможность добавить в корзину и сделать заказ
export const IS_SITE_NOT_WORKING = false;

// если IS_SITE_NOT_WORKING = true, то указанный текст будет выводиться в модалке
export const TEXT_SITE_NOT_WORKING = 'Наши производства сейчас временно перегружены. Но мы очень быстро приготовим накопившиеся заказы и снова начнём их принимать. <br> Приносим свои извинения за неудобства.';

// время работы по городам, если нужно указать время которое переходит на следующий день,
// то добавляем свойство isNextDay: true
export const WORK_TIME = {
  'a85360f2-55a8-47cc-8a79-1eb88a40c4f0': [ // samara
    { open: '10:00', close: '23:59' }, // Sunday
    { open: '10:00', close: '23:59' }, // Monday
    { open: '10:00', close: '23:59' },
    { open: '10:00', close: '23:59' }, // Wednesday
    { open: '10:00', close: '23:59' },
    { open: '10:00', close: '02:00', isNextDay: true }, // Friday
    { open: '10:00', close: '02:00', isNextDay: true }, // Saturday
  ],
  'e27dec5a-4447-4bcb-a124-0c1795618998': [ // novokujbyshevsk
    { open: '10:00', close: '23:59' }, // Sunday
    { open: '10:00', close: '23:59' }, // Monday
    { open: '10:00', close: '23:59' },
    { open: '10:00', close: '23:59' }, // Wednesday
    { open: '10:00', close: '23:59' },
    { open: '10:00', close: '02:00', isNextDay: true }, // Friday
    { open: '10:00', close: '02:00', isNextDay: true }, // Saturday
  ],

  '3f02eb06-e771-434c-ab73-2ec5bbde1265': [ // tolyatti
    { open: '10:00', close: '23:59' }, // Sunday
    { open: '10:00', close: '23:59' }, // Monday
    { open: '10:00', close: '23:59' },
    { open: '10:00', close: '23:59' }, // Wednesday
    { open: '10:00', close: '23:59' },
    { open: '10:00', close: '23:59' }, // Friday
    { open: '10:00', close: '23:59' }, // Saturday
  ],
};

// глобальный (для всего сайта, если не перезаписан у конкретной страницы) шаблон мета тегов
// в мобильном приложении не используется
export const GLOBAL_SEO_META_TAG = {
  titleTemplate: '%s',
  title: 'Доставка еды. Пицца, суши, роллы Фуджи Суши Friends',
  description: `Доставка еды. В Фуджи Суши Friends можно заказать блюда итальянской и
  японской кухни: пицца, суши, роллы и др. 8 800 2222-000`,
};

// iiko id категории которая выводится в корзине (сейчас это блок Дополнить десертом)
export const SECTION_ID_ADD_TO_ORDER = '9156ad82-bdbe-4dde-a0ec-3fe6fbff58bd';

// iiko id категории которая выводится в корзине (сейчас это блок Выбрать соус)
export const SECTION_ID_ADDITIONALLY = '430c2091-ce36-4ab8-9aff-51e8afa0b5c1';

// id счетчика яндекс метрики
export const YANDEX_COUNTER_ID = 57379729;

// id счетчика google analytics
export const GOOGLE_COUNTER_ID = 'AW-759998552';

// Терминалы. Формируют список самовывоза. Настроить можно в файле ./citiesData/deliveryTerminals.js
export const DELIVERY_TERMINALS = deliveryTerminals;

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
export const CATALOG_MENU = catalogMenu;

// Зоны доставки. Выводятся на карте и используются для проверки вхождения адреса в зону доставки
// сами зоны в ./map/zones
// настройки ./citiesData/deliveryTerminals.js
export const CITY_ZONES = cityZones;
export const YANDEX_MAPS_API_KEY = '30c1d34f-9ebd-4459-a3cd-e4af952a7074';

// настройки для городов. Подробнее в ./citiesData/index.js
export const CITIES_DATA = citiesData;

export const IS_ONLINE_PAYMENT_DISABLE = {
  delivery: false, // отключить онлайн оплату (для всех зон) на доставку
  self: false, // отключить онлайн оплату (для всех ресторанов) на самовывоз
};

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
    'content/personal/action-2.png',
    {
      width: 640,
      format: 'webp',
    },
  ),
};

export const PHONES = {
  deliveryService: '8 800 2222-000',
};

export const SMARTCAPTCHA_SITE_KEY = 'ysc1_2QCgbp4WzugrZeJCFpAPnoHRNXfpOIs5Z8zA6Dm2c6854b0a';

export const CHECKOUT_DELIVERY_TEXT = {
  delivery: {
    title: '60 минут приготовление и контроль качества',
    text: 'доставка 30 минут или быстрее',
  },
  self: {
    title: '30 минут приготовление и контроль качества',
  },
};

```
