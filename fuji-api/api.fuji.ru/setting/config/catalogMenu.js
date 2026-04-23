import { getGroupsAll } from '../../catalog/catalog.service.js';
import CLogger from '../../lib/CLogger.js';
import { filterCatalogByAvailableWork } from '../../lib/helpers.js';

const logger = new CLogger();

const catalogMenu = [
  { slug: 'kombo', name: 'Комбо', id: '8d2d0a59-1518-465e-b241-10c425f57a99' },
  {
    slug: '',
    name: 'Роллы',
    // id не от Роллов (там где еть подкатегории будет брать id первой подкатегории)
    // чтобы была картинка для группы возьмем ее из сетов (илю любой другой категории)
    id: '7d003f20-bacd-4aee-8c61-c395f3811bb2',
    isParent: true,
    children: [
      { slug: 'na-kazhdyj-den', name: 'На каждый день', id: '7d2df019-f771-47d7-bfbb-9131d4f6322f' },
      { slug: 'sety', name: 'Сеты', id: '7d003f20-bacd-4aee-8c61-c395f3811bb2' },
      {
        slug: 'kollekciya-brend-shefa',
        name: 'Коллекция бренд-шефа',
        id: '0cfa6ce0-72c8-4194-9a46-dd441dc09d3d',
      },
      { slug: 'tartar-rolly', name: 'Тартар', id: 'da837308-7d79-4d50-8bc1-d2db23d8820a' },
      { slug: 'bolshie-rolly', name: 'Большие', id: 'eafbcc67-fa8e-4ea1-9ac4-bc7b92a3814c' },
      { slug: 'rolly-razmer-max', name: 'Размер MAX', id: 'a304c8ee-fe56-4ace-a07a-e8619792d696' },
      {
        slug: 'rolly-ogon-and-gril',
        name: 'Огонь & Гриль',
        id: '2ee52996-7dc5-4ccf-b072-5e365b904b4e',
      },
      { slug: 'zapechennye-rolly', name: 'Запеченные', id: 'f4eefc21-f175-4cd0-a2e7-32a1948668b7' },
      { slug: 'teplye-rolly', name: 'Теплые', id: '4a72b94b-c664-4664-babf-5fc073f00b77' },
      { slug: 'klassicheskie-rolly', name: 'Классические', id: '7f3040b6-7b68-46d9-82f0-a890160ec53c' },
      { slug: 'sladkie-rolly', name: 'Сладкие', id: '3510aae9-ca26-4d02-95ed-90ffde6b5456' },
      { slug: 'sushi', name: 'Суши', id: 'e658fd39-577d-46ec-a2d3-5df8995184b2' },
      { slug: 'gunkany', name: 'Гунканы', id: 'f536371d-2801-4c3b-809a-d5c6fb3d1307' },
    ],
  },
  {
    slug: '',
    name: 'Пицца',
    id: '42c534bf-6aa3-4128-85e4-3a15195527c9', // от 42c534bf-6aa3-4128-85e4-3a15195527c9
    isParent: true,
    children: [
      { slug: 'picca', name: 'Пицца', id: '42c534bf-6aa3-4128-85e4-3a15195527c9' },
      { slug: 'picca-dva-vkusa', name: 'Пицца 2 вкуса', id: '1fb068d0-5a7d-408f-99d5-3a3d63ccb552' },
    ],
  },
  {
    slug: 'bao',
    name: 'Бао',
    id: '62fe6060-264a-4bef-9940-0fff074136a0',
  },
  {
    slug: 'burgery',
    name: 'Бургеры',
    id: '34a918c1-489d-421e-aa6d-2e36420e1365',
  },
  {
    slug: 'pasta',
    name: 'Паста',
    id: 'b13590f7-9846-40f1-aeb1-f0cb14db4995',
  },
  {
    slug: 'lepeshki-roti',
    name: 'Лепешки роти',
    id: '1c4a35c1-1689-4ed2-8d0a-a96e072b80d9',
  },
  {
    slug: '',
    name: 'Wok',
    id: 'fcfad280-8795-4940-8fd9-9654c55934fd',
    isParent: true,
    children: [
      { slug: 'wok-lapsha', name: 'Wok лапша', id: 'fcfad280-8795-4940-8fd9-9654c55934fd' },
      { slug: 'wok-ris', name: 'Wok рис', id: '284d37ed-bc12-475c-ab48-e1fc2c872cef' },

    ],
  },

  { slug: 'poke', name: 'Поке', id: 'd570a52f-6156-4af2-97fb-48aada4637cd' },
  { slug: 'zakuski', name: 'Закуски', id: 'f42ab48f-30e0-43bd-9b2b-c6e35c5624b0' },
  { slug: 'fudster', name: 'Фудстер', id: '23cd9f08-6a8c-4041-a7f1-3f362c879e54' },
  { slug: 'supy', name: 'Супы', id: 'baf5a5d6-16a6-45f4-af1e-5e80fae833f2' },
  { slug: 'salaty', name: 'Салаты', id: '77b5b79d-6beb-4507-b7ce-d603010d796d' },
  { slug: 'midii', name: 'Мидии', id: '85eabe9a-40d9-4a26-babc-1634a768fd85' },
  { slug: 'deserty', name: 'Десерты', id: '3ccd102f-7af9-4b12-b0a3-e26f1131e6f3' },
  { slug: 'sousy', name: 'Соусы', id: 'dc8d3d03-d59c-4958-ad99-c8d6ca3c319d' },
  { slug: 'napitki', name: 'Напитки', id: '67ed0d32-e712-45c8-902e-87e8c84c9a57' },
  { slug: 'pribory', name: 'Приборы', id: 'b1016517-1875-457a-b824-c36d85fdb615' },
];

const processCatalogMenu = async (city = 'samara') => {
  try {
    const catalogGroups = await getGroupsAll();
    const catalogMenuProcessed = catalogMenu.map((g) => {
      const group = catalogGroups.find((el) => el.id === g.id);
      if (g.children) {
        g.children = g.children.map((child) => {
          const childGroup = catalogGroups.find((el) => el.id === child.id);
          return {
            ...child,
            ...childGroup,
          };
        });
      }

      return {
        ...group,
        ...g,
      };
    });

    return filterCatalogByAvailableWork(catalogMenuProcessed, city);
  } catch (error) {
    logger.log('Ошибка при обработке каталога меню:', error);
    return [];
  }
};

export default processCatalogMenu;
