/**
 * Данный файл содержит конфигурацию ресторанов для зон доставки.
 *
 * Описание свойств ресторанов:
 * - isRestHide: boolean — если true, ресторан скрывается в списке самовывоза.
 * - isOnlinePaymentHide: object — настройки скрытия онлайн-оплаты:
 *   - delivery: boolean — скрыть онлайн-оплату при выборе доставки.
 *   - self: boolean — скрыть онлайн-оплату при выборе самовывоза.
 * - isDisable: boolean — если true, терминал полностью отключен и не отображается.
 * - address: string — адрес ресторана.
 * - deliveryGroupName: string — внутреннее название группы доставки.
 * - deliveryRestaurantName: string — внутреннее название ресторана.
 * - deliveryTerminalId: string — идентификатор терминала.
 * - name: string|null — отображаемое название ресторана.
 * - openingHours: array|null — часы работы ресторана (если есть).
 * - organizationId: string|null — ID организации в системе.
 * - technicalInformation: any — дополнительная техническая информация (пока null).
 * - sberbank: { login: string, password: string } — данные для работы через Сбербанк.
 * - cloudPayments: { publicId: string } — public ID для интеграции с CloudPayments.
 * - times?: array — расписание работы самовывоза (для некоторых точек).
 *
 * Экспортируемые сущности:
 * - RESTAURANT_LIST: список всех ресторанов для выпадающих меню (адрес + ID терминала).
 * - allTerminalsZoneIds: массив всех deliveryTerminalId доступных ресторанов.
 * - default (availableTerminals): объект с разбивкой ресторанов по ID зон доставки.
 *
 * Города:
 * - Самара (samara)
 * - Новокуйбышевск (novokujbyshevsk)
 * - Тольятти (tolyatti)
 */

// TODO: не используются, перенесены в базу

const samara = [
  {
    isDisable: false,
    address: 'Самара, Кошелев Бульвар Финютина, 41',
    deliveryGroupName: 'Крутые Ключи Панарин: Кошелев',
    deliveryRestaurantName: '123',
    deliveryTerminalId: 'e4398867-351e-a3cf-018b-99b59dc715c0',
    name: 'Фуджи Кошелев',
    openingHours: [],
    organizationId: '009162e5-4a54-11e9-80e8-d8d38565926f',
    technicalInformation: null,
    isRestHide: false,
    sberbank: { login: 'fujisushi_1-api', password: '' },
    isOnlinePaymentHide: {
      delivery: false,
      self: false,
    },
    cloudPayments: {
      // publicId: 'pk_796c5e427781dcfc1455bee81aae4',
      publicId: 'pk_f2fc2c5638e379776c13927c60893',
    },
  },
  {
    isDisable: false,
    address: 'Самара, Димитрова ул. 110Б',
    deliveryGroupName: 'Димитр. 110Б Люликова: Димитрова',
    deliveryRestaurantName: 'Димитр. 110Б Люликова: Димитрова',
    deliveryTerminalId: 'e4398867-351e-a3cf-018b-99ac15ff8891',
    name: 'Фуджи Димитрова',
    openingHours: [],
    organizationId: '740c9cdb-4a51-11e9-80e8-d8d38565926f',
    technicalInformation: null,
    sberbank: { login: 'fujisushi_7-api', password: '' },
    isRestHide: false,
    cloudPayments: {
      // publicId: 'pk_76974770d55b8cc7378bb3c22322a',
      publicId: 'pk_83384129046c3dc6bc85152ed2990',
    },
  },
  {
    isDisable: false,
    address: 'Самара ул. Физкультурная 98',
    deliveryGroupName: 'Физкультурная 98 Иконникова: Физкультурная 98',
    deliveryRestaurantName: 'Физкультурная 98 Иконникова: Физкультурная 98',
    deliveryTerminalId: 'e4398867-351e-a3cf-018b-9983526f1169',
    name: 'Фуджи Физкультурная',
    openingHours: [],
    organizationId: 'fe470000-906b-0025-6ca0-08d8c2998c14',
    technicalInformation: null,
    sberbank: { login: 'fujisushi-api', password: '' },
    cloudPayments: {
      // publicId: 'pk_f86108ff9fbc63a32da6affa38ee2',
      publicId: 'pk_71a9abb178d97844f1d9f5fa8cc4c',
    },
  },
  {
    isDisable: false,
    address: 'Самара, Стара Загора, 60',
    deliveryGroupName: 'Стара Загора 60 Сидоренко: Старо Загора 60',
    deliveryRestaurantName: 'Стара Загора 60 Сидоренко: Старо Загора 60',
    deliveryTerminalId: '03f01e01-26dc-73e6-018d-7ac47578bb26',
    name: 'Стара Загора 60 Сидоренко',
    openingHours: [],
    organizationId: '03650000-6bec-ac1f-a5f0-08dbbd96ebd5',
    technicalInformation: null,
    isRestHide: false,
    isOnlinePaymentHide: {
      delivery: false,
      self: false,
    },
    cloudPayments: {
      // publicId: 'pk_41f2195cf1df0c8f87a011d18f5d4',
      publicId: 'pk_41f2195cf1df0c8f87a011d18f5d4',
    },
  },

  {
    isDisable: false,
    address: 'Самара, Стара Загора, 124А',
    deliveryGroupName: 'Ст.Загора 124 Латухина: Ст. Загора 124',
    deliveryRestaurantName: 'Ст.Загора 124 Латухина: Ст. Загора 124',
    deliveryTerminalId: '04d22af9-0b31-947f-0195-b7921697b0f6',
    name: 'Ст.Загора 124 Латухина',
    openingHours: [],
    organizationId: '03650000-6bec-ac1f-bc84-08dc4cb6ee0f',
    technicalInformation: null,
    isRestHide: false,
    isOnlinePaymentHide: {
      delivery: false,
      self: false,
    },
    cloudPayments: {
      publicId: 'pk_802476c08c152527aa15a0146e0aa',
    },
  },

  {
    isDisable: false,
    address: 'Самара, Ново-Садовая 24',
    deliveryGroupName: 'Ново-Садов. 24 Головин: Ново-Садовая',
    deliveryRestaurantName: 'Ново-Садов. 24 Головин: Ново-Садовая',
    deliveryTerminalId: 'e4398867-351e-a3cf-018b-998cb7a874f2',
    name: 'Фуджи Ново-Садовая',
    openingHours: [],
    organizationId: 'fe470000-906b-0025-53e0-08d86b0a3bdc',
    technicalInformation: null,
    sberbank: { login: 'fujisushi_6-api', password: '' },
    cloudPayments: {
      // publicId: 'pk_74859d5be51665b14215fe35fd2d8',
      publicId: 'pk_b40548f20633cdf9917cbc14a2749',
    },
  },
  {
    isDisable: false,
    address: 'Самара, Коммунистическая, 27',
    deliveryGroupName: 'Коммунист.27 хлебушкин: Коммунистическая',
    deliveryRestaurantName: 'Коммунист.27 хлебушкин: Коммунистическая',
    deliveryTerminalId: 'e4398867-351e-a3cf-018b-99d17a6e1ae7',
    name: 'Фуджи Коммунистическая',
    openingHours: [],
    organizationId: '10698c7c-4a52-11e9-80e8-d8d38565926f',
    technicalInformation: null,
    sberbank: { login: 'fujisushi_8-api', password: '' },
    cloudPayments: {
      // publicId: 'pk_71d4f487e13e8fbb22e22c6593db5',
      publicId: 'pk_e40156e422703dd2c552c0f42b249',
    },
  },
  {
    isDisable: false,
    address: 'Самара, Молодогвардейская, 135',
    deliveryGroupName: 'Молодогв. 135 Лиховайда: Молодогвардейская',
    deliveryRestaurantName: 'Молодогв. 135 Лиховайда: Молодогвардейская',
    deliveryTerminalId: '02c55e58-bb32-cd42-0191-d75358a3d880',
    name: 'Фуджи Молодогвардейская',
    openingHours: [],
    organizationId: '412e16fe-4a7a-11e9-80e8-d8d38565926f',
    technicalInformation: null,
    isRestHide: false,
    sberbank: { login: 'fujisushi_9-api', password: '' },
    isOnlinePaymentHide: {
      delivery: false,
      self: false,
    },
    cloudPayments: {
      // publicId: 'pk_01d9ce7c572f8aecdd9af7bde2d92',
      publicId: 'pk_9e5f0c4d4abe438c867d395411e88',
    },
  },
  {
    isDisable: false,
    address: 'Самара, Георгия Димитрова, 131',
    deliveryGroupName: 'Димитр 131 Скворцов Михаил В: Димитр 131 Скворцов В.М.',
    deliveryRestaurantName: 'Димитр 131 Скворцов Михаил В: Димитр 131 Скворцов В.М.',
    deliveryTerminalId: 'e4398867-351e-a3cf-018b-999f0db7ba99',
    name: 'Фуджи Кирова',
    openingHours: [],
    organizationId: '68f55d57-4a7b-11e9-80e8-d8d38565926f',
    technicalInformation: null,
    isRestHide: false,
    sberbank: { login: 'fujisushi_12-api', password: '' },
    isOnlinePaymentHide: {
      delivery: false,
      self: false,
    },
    cloudPayments: {
      // publicId: 'pk_5a9c154adeb6ceb84bcd1c23e5553',
      publicId: 'pk_ba34f6fa6a03c56d67772d974de39',
    },
  },
  {
    isDisable: false,
    address: 'Самара, Долотный 9',
    deliveryGroupName: 'Долотный, 9(116) Панарин: Долотный',
    deliveryRestaurantName: 'Долотный, 9(116) Панарин: Долотный',
    deliveryTerminalId: 'e4398867-351e-a3cf-018b-9a1eddb684ff',
    name: 'Фуджи Долотный',
    openingHours: [],
    organizationId: 'fe470000-906b-0025-442b-08d864c0f662',
    technicalInformation: null,
    sberbank: { login: 'fujisushi_10-api', password: '' },
    cloudPayments: {
      // publicId: 'pk_543d15f2b00b5cc9a0c9b3ea7e625',
      publicId: 'pk_5aa9420943dc3208db33a818a921c',
    },
  },
  {
    isDisable: false,
    address: 'Самара, Николаевский пр., 38',
    deliveryGroupName: 'Николаевск 38 Кудряшов: Южный Город',
    deliveryRestaurantName: 'Николаевск 38 Кудряшов: Южный Город',
    deliveryTerminalId: 'e4398867-351e-a3cf-018b-9a46b91c9817',
    name: 'Фуджи Южный Город',
    openingHours: [],
    organizationId: 'fd554819-4a7a-11e9-80e8-d8d38565926f',
    technicalInformation: null,
    sberbank: { login: 'P631204876474-api', password: '' },
    cloudPayments: {
      // publicId: 'pk_101dbafe1a51f1f81c638ffd1c7c7',
      publicId: 'pk_3021c23a87832475ac88c3fa7ac59',
    },
  },
  {
    isDisable: false,
    address: 'Самара, Дмитрия Донского 12',
    deliveryGroupName: 'Д.Донского, 12 Герман: Дмитрия Донского',
    deliveryRestaurantName: 'Д.Донского, 12 Герман: Дмитрия Донского',
    deliveryTerminalId: '86cb7232-8e5f-b1e7-0194-0bdddcde2d8b',
    name: 'Фуджи Дмитрия Донского',
    openingHours: [],
    organizationId: 'fe470000-906b-0025-bc33-08d864c067ff',
    technicalInformation: null,
    sberbank: { login: 'fujisushi_4-api', password: '' },
    cloudPayments: {
      // publicId: 'pk_f068fbbc94f63f0c0f48fba6e6693',
      publicId: 'pk_6fe24790f38e6ea1abc0bdd8b9b21',
    },
  },
  {
    isDisable: false,
    address: 'Самара, Сергея Лазо 24',
    deliveryGroupName: 'Сергей Лазо 24 Крохмалев: Сергей Лазо',
    deliveryRestaurantName: 'Сергей Лазо 24 Крохмалев: Сергей Лазо',
    deliveryTerminalId: '286727a0-d3ce-ff71-017d-be261a029fef',
    name: 'Сергея Лазо 24 Крохмалев',
    openingHours: [],
    organizationId: '01330000-6bec-ac1f-2d70-08da1bb195c3',
    technicalInformation: null,
    sberbank: { login: 'P631819739264_1481-api', password: '' },
    cloudPayments: {
      // publicId: 'pk_3d415950224b75907b2b541c391ff',
      publicId: 'pk_f05eeabd7680549eb8076917691a4',
    },
  },
  {
    isDisable: false,
    address: 'Самара, Осетинская 12',
    deliveryGroupName: 'Осетинская 12: Осетинская',
    deliveryRestaurantName: 'Осетинская 12: Осетинская',
    deliveryTerminalId: 'af03ac3e-dee5-f415-0181-0524010d81aa',
    name: 'Осетинская 12',
    openingHours: [],
    organizationId: '03650000-6bec-ac1f-be32-08da664bbc90',
    technicalInformation: null,
    sberbank: { login: 'p634503145541-api', password: '' },
    cloudPayments: {
      // publicId: 'pk_38a584194f6bad205fea6e9aad298',
      publicId: 'pk_5f1392986b193f23c7b7fd82d0de8',
    },
  },
  {
    isDisable: false,
    address: 'Самара, Революционная 70а',
    deliveryGroupName: 'Революц. 70 Скворцов: Производство',
    deliveryRestaurantName: 'Революц. 70 Скворцов: Производство',
    deliveryTerminalId: 'e4398867-351e-a3cf-018b-998cb7a8c4af',
    name: 'Фуджи 3-й проезд',
    openingHours: [],
    organizationId: 'cd3a5fff-4a7a-11e9-80e8-d8d38565926f',
    technicalInformation: null,
    isOnlinePaymentHide: {
      delivery: false,
      self: false,
    },
    // isRestHide: true,
    sberbank: { login: 'fujisushi_5-api', password: '' },
    cloudPayments: {
      // publicId: 'pk_7163f340b07ce30d3b3da9983bdd5',
      publicId: 'pk_7915071af616a3ca26350d40dd756',
    },
  },
  {
    isDisable: false,
    address: 'Самара, Лукачева, 6',
    deliveryGroupName: 'Лукачева 6 Сафонов В А: Лукачева 6',
    deliveryRestaurantName: 'Лукачева 6',
    deliveryTerminalId: 'e4398867-351e-a3cf-018b-99c22b2eaa74',
    name: 'Лукачева 6 Сафонов В А',
    openingHours: [],
    organizationId: '03650000-6bec-ac1f-d740-08da842a1cec',
    technicalInformation: null,
    cloudPayments: {
      // publicId: 'pk_277a3d3b74fa8addc2f6cce64c1f4',
      publicId: 'pk_b6ca561acfdb9fae04fc9a81cb949',
    },
  },
  {
    isDisable: false,
    address: 'Самара, Ленинградская 60',
    deliveryGroupName: 'Ленинградск. 60 Рожков: Ленинградская',
    deliveryRestaurantName: 'Ленинградск. 60 Рожков: Ленинградская',
    deliveryTerminalId: 'e4398867-351e-a3cf-018b-99dea3d09c51',
    name: 'Фуджи Ленинградская',
    openingHours: [],
    organizationId: '626d1e1d-4a78-11e9-80e8-d8d38565926f',
    technicalInformation: null,
    sberbank: { login: 'fujisushi_2-api', password: '' },
    cloudPayments: {
      // publicId: 'pk_acf886f2c2837946f545f4490e45a',
      publicId: 'pk_d91775ccc4e03ccd6eeeb6d7f2c4f',
    },
  },
  {
    isDisable: false,
    address: 'Самара, 6-я Просека 163',
    deliveryGroupName: 'Просека 163 Кривотулова: 6-я Просека 163',
    deliveryRestaurantName: 'Просека 163 Кривотулова: 6-я Просека 163',
    deliveryTerminalId: 'e4398867-351e-a3cf-018b-9a039dc8d7a4',
    name: 'Фуджи 6-я Просека',
    openingHours: [],
    organizationId: '5f850000-90a3-0025-eae9-08d86b8d7a04',
    technicalInformation: null,
    cloudPayments: {
      // publicId: 'pk_a7677a3f65e85a6a9a82ecabb5a82',
      publicId: 'pk_70c5f1eb85bd4ebd350d6f8f4c045',
    },
  },
  {
    isDisable: false,
    address: 'Самара, ул. Дыбенко, 120А',
    deliveryGroupName: 'Дыбенко120.Кошкарова: Дыбенко120',
    deliveryRestaurantName: 'Дыбенко120.Кошкарова: Дыбенко120',
    deliveryTerminalId: '03b7bb78-8b54-309e-018c-6e559007c401',
    name: 'Дыбенко120.Кокшарова',
    openingHours: [],
    organizationId: '01330000-6bec-ac1f-58bb-08dbfa191bdc',
    technicalInformation: null,
    isRestHide: false,
    isOnlinePaymentHide: {
      delivery: false,
      self: false,
    },
    cloudPayments: {
      // publicId: 'pk_b1e5c76f4104719ae44177722ea4f',
      publicId: 'pk_b43a2e2eda21f4bac756a2c762203',
    },
  },

];

const novokujbyshevsk = [
  {
    isDisable: false,
    address: 'г. Новокуйбышевск, Дзержинского, 29',
    deliveryGroupName: 'Новокуйб. Ковалкин: Новокуйб.',
    deliveryRestaurantName: 'Новокуйб. Ковалкин: Новокуйб.',
    deliveryTerminalId: 'e4398867-351e-a3cf-018b-9a18976524b2',
    name: 'Фуджи Новокуйбышевск',
    openingHours: [],
    organizationId: '800bd20c-4a7a-11e9-80e8-d8d38565926f',
    technicalInformation: null,
    isRestHide: false,
    isOnlinePaymentHide: {
      delivery: false,
      self: false,
    },
    sberbank: { login: 'P631809614604-api', password: '' },
    cloudPayments: {
      // publicId: 'pk_bf8cb1776507f6c2b0357ee0b89fe',
      publicId: 'pk_e990baab4af85f75abc964e2ae960',
    },
  },
];

const tolyatti = [
  {
    isDisable: false,
    address: 'г. Тольятти, ул. Карла Маркса, д. 76',
    deliveryGroupName: 'Тольятти Карла Маркса 76  Сайгина: Тольятти Карла Маркса 76 Сайгина',
    deliveryRestaurantName: 'Тольятти Карла Маркса 76  Сайгина: Тольятти Карла Маркса 76 Сайгина',
    deliveryTerminalId: 'e4398867-351e-a3cf-018b-9a2782ec56bf',
    name: 'Тольятти Карла Маркса 76 Сайгина',
    openingHours: [],
    organizationId: 'fe470000-906b-0025-9903-08d96ba5919e',
    technicalInformation: null,
    isRestHide: false,
    sberbank: { login: 'P633011137706_2203-api', password: '' },
    cloudPayments: {
      // publicId: 'pk_1ed09ad5e6a4deaa1c54a99e8a279',
      publicId: 'pk_b2ec477daf686de09a1493ed19b9e',
    },
    times: [ // время работы точки самовывоза, выводится на странице доставка
      { time: 'с 10:00 до 00:00', days: 'Воскресенье - Четверг' },
      { time: 'с 10:00 до 00:00', days: 'Пятница - Суббота' },
    ],
  },
  {
    isDisable: false,
    address: 'г. Тольятти, ул. Автостроителей, д. 56А',
    deliveryGroupName: 'Тольятти Автостроителей 56 Сайгина: Тольятти Автостроителей 56 Сайгина',
    deliveryRestaurantName: 'Тольятти Автостроителей 56 Сайгина: Тольятти Автостроителей 56 Сайгина',
    deliveryTerminalId: 'e4398867-351e-a3cf-018b-991bff29d5bf',
    name: 'Фуджи Аврора (Аэродромная)',
    openingHours: [],
    organizationId: 'fe470000-906b-0025-f5f3-08d864bff2f0',
    technicalInformation: null,
    sberbank: { login: 'P633011137706_5923-api', password: '' },
    cloudPayments: {
      // publicId: 'pk_588de324c05e3d0ace06b4f009fc9',
      publicId: 'pk_11bde007c7f6ec302cf87890582c0',
    },
    times: [ // время работы точки самовывоза, выводится на странице доставка
      { time: 'с 10:00 до 00:00', days: 'Воскресенье - Четверг' },
      { time: 'с 10:00 до 00:00', days: 'Пятница - Суббота' },
    ],
  },
];

export const RESTAURANT_LIST = [
  ...samara.map((item) => ({ text: item.address, value: item.deliveryTerminalId })),
  ...tolyatti.map((item) => ({ text: item.address, value: item.deliveryTerminalId })),
  ...novokujbyshevsk.map((item) => ({ text: item.address, value: item.deliveryTerminalId })),
];

const availableTerminals = {
  'a85360f2-55a8-47cc-8a79-1eb88a40c4f0': samara.filter((el) => !el.isDisable),
  '3f02eb06-e771-434c-ab73-2ec5bbde1265': tolyatti.filter((el) => !el.isDisable),
  'e27dec5a-4447-4bcb-a124-0c1795618998': novokujbyshevsk.filter((el) => !el.isDisable),
};

export const allTerminalsZoneIds = Object.values(availableTerminals)
  .flatMap((el) => el)
  .map((el) => el.deliveryTerminalId);

export default availableTerminals;
