import {
  samaraRestList,
  tolyattiRestList,
  novokujbyshevskRestList,
} from './restaurants.js';

/*
  iikoId: id города в айке,
  name: наименование,
  mapIframe: iframe с картой для страницы доставки,
  isPromocodeHide: для города используется промокод,
  restList: список ресторанов для страницы Рестораны,
  social: {
    vk: 'ссылка на станицу в вк,
  },
  deliveryId: id доставки для города, используется для добавления в корзину,
  freeDeliveryId: id бесплатной доставки для города, используется для добавления в корзину,
  workTime1: 'Вс-Чт с <b>10:00</b> до <b>24:00</b>' workTime1, workTime1 - для указания времени
  workTime2: 'Пт-Сб с <b>10:00</b> до <b>02:00</b>' работы в шапке сайта и на странице Доставка,
  region: 'Самарская область' - используется для правильного определения адреса на карта,
  isSelectOrderTimeHide: true | false - если false не будет выбора времени в корзине
*/

export default {
  'a85360f2-55a8-47cc-8a79-1eb88a40c4f0': {
    iikoId: 'a85360f2-55a8-47cc-8a79-1eb88a40c4f0',
    name: 'Самара',
    mapIframe: '<iframe src="https://yandex.ru/map-widget/v1/?um=constructor%3A4ddf14a45a39ca42234a6c9cb851683cf1722e607778edbbe2fe0ff716317921&amp;source=constructor"></iframe>',
    isPromocodeHide: false,
    restList: samaraRestList,
    social: {
      vk: 'https://vk.com/fujisamara',
    },
    deliveryId: 'd0d9087d-84a3-44ed-9d6a-252570aceaa6',
    freeDeliveryId: '064808a6-c8ce-4703-b320-e2ba0a44a276',
    freeDeliveryFrom: Infinity, // Infinity for disable free delivery
    workTime1: 'Вс-Чт с <b>10:00</b> до <b>23:55</b>',
    workTime2: 'Пт-Сб с <b>10:00</b> до <b>01:45</b>',
    serviceFeeId: '5d91794b-06b0-4e1f-b728-b7c4d5566b23', // сервисный сбор
    isSelectOrderTimeHide: false,
  },
  '3f02eb06-e771-434c-ab73-2ec5bbde1265': {
    iikoId: '3f02eb06-e771-434c-ab73-2ec5bbde1265',
    name: 'Тольятти',
    mapIframe: '<iframe src="https://yandex.ru/map-widget/v1/?um=constructor%3A532acbc61933d4c4e9c90b822fe42f2ea20b9767afa4df29256ef2907ccb83e5&amp;source=constructor"></iframe>',
    isPromocodeHide: false,
    restList: tolyattiRestList,
    social: {
      vk: 'https://vk.com/fujitlt',
    },
    deliveryId: '93f4227d-bd38-4bd9-9354-fe6d9215ad6e',
    freeDeliveryId: '064808a6-c8ce-4703-b320-e2ba0a44a276',
    freeDeliveryFrom: Infinity,
    workTime1: 'Пн-Вс с <b>10:00</b> до <b>23:55</b>',
    serviceFeeId: '5d91794b-06b0-4e1f-b728-b7c4d5566b23', // сервисный сбор
    isSelectOrderTimeHide: false,
  },
  'e27dec5a-4447-4bcb-a124-0c1795618998': {
    iikoId: 'e27dec5a-4447-4bcb-a124-0c1795618998',
    name: 'Новокуйбышевск',
    mapIframe: '<iframe src="https://yandex.ru/map-widget/v1/?um=constructor%3A0b8a92218168282d592fee3a4d0aab5c470982f25a30139436a09ed064059721&amp;source=constructor"></iframe>',
    isPromocodeHide: false,
    restList: novokujbyshevskRestList,
    social: {
      vk: 'https://vk.com/fujisamara',
    },
    deliveryId: 'd0d9087d-84a3-44ed-9d6a-252570aceaa6',
    freeDeliveryId: '064808a6-c8ce-4703-b320-e2ba0a44a276',
    freeDeliveryFrom: Infinity,
    workTime1: 'Пн-Вс с <b>10:00</b> до <b>23:55</b>',
    serviceFeeId: '5d91794b-06b0-4e1f-b728-b7c4d5566b23', // сервисный сбор
    isSelectOrderTimeHide: false,
  },
};
