import slugify from 'slugify';
import CLogger from '../lib/CLogger.js';

const logger = new CLogger();

const SHOP_IMAGES_PATH = '/uploads/shop';

export const formatDateForSending = (date) => {
  const options = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
    timeZone: 'Europe/Samara',
  };
  return new Date(date).toLocaleString('ru-RU', options);
};

export const getCatalogImage = (entity) => {
  let imagePath = '/content/no-photo.svg';
  if (entity.image) {
    imagePath = `${SHOP_IMAGES_PATH}/full/${entity.image}`;
  }
  return imagePath;
};

export const getProductAdditionalInfo = (product) => {
  if (!product
    || typeof product.additionalInfo !== 'string'
    || product.additionalInfo.trim().length === 0) {
    return {};
  }

  try {
    return JSON.parse(product.additionalInfo);
  } catch (e) {
    if (e instanceof SyntaxError) {
      logger.log(`Failed to parse additionalInfo for product ${product.name} - ${product.id}: ${e.message}`);
    }
    return {};
  }
};

export const getProductTags = (product) => {
  try {
    return JSON.parse(product.tags);
  } catch (e) {
    return [];
  }
};

export const uniqModifiers = (mods) => Object.values(mods.reduce((acc, current) => {
  if (current.modifierId in acc) {
    return acc;
  }

  acc[current.modifierId] = current;
  return acc;
}, {}));

export const customSlugify = (str) => slugify(str, {
  replacement: '-',
  lower: true,
  trim: true,
  remove: /[^a-zA-Z\d\s]/,
  strict: false,
  locale: 'en',
});

export const getFilters = (product) => {
  const additionalInfo = getProductAdditionalInfo(product);
  return additionalInfo?.filters;
};
export const getOldPrice = (product) => {
  const additionalInfo = getProductAdditionalInfo(product);
  return additionalInfo?.oldPrice;
};
export const getCountInSet = (product) => {
  const additionalInfo = getProductAdditionalInfo(product);
  return additionalInfo?.countInSet;
};
export const getCount = (product) => {
  const additionalInfo = getProductAdditionalInfo(product);
  return additionalInfo?.count;
};
export const getAllergens = (product) => {
  const additionalInfo = getProductAdditionalInfo(product);
  return additionalInfo?.allergens;
};

export const getComposition = (product) => {
  const additionalInfo = getProductAdditionalInfo(product);
  return additionalInfo?.composition || [];
};

export const getIsSamaraHidden = (product) => {
  const additionalInfo = getProductAdditionalInfo(product);
  return additionalInfo?.isSamaraHidden;
};

export const getIsNovokujbyshevskHidden = (product) => {
  const additionalInfo = getProductAdditionalInfo(product);
  return additionalInfo?.isNovokujbyshevskHidden;
};

export const getIsTolyattiHidden = (product) => {
  const additionalInfo = getProductAdditionalInfo(product);
  return additionalInfo?.isTolyattiHidden;
};

export const getLocalFormatTime = (dateParam) => {
  const locales = 'ru-Ru';
  const options = {
    hour12: false,
    timeZone: 'Europe/Samara',
  };

  const date = new Date(dateParam);
  const year = date.toLocaleString(locales, { ...options, year: 'numeric' });
  const month = date.toLocaleString(locales, { ...options, month: '2-digit' });
  const day = date.toLocaleString(locales, { ...options, day: '2-digit' });
  const hour = date.toLocaleString(locales, { ...options, hour: '2-digit' });
  const minute = date.toLocaleString(locales, { ...options, minute: '2-digit' });
  const second = date.toLocaleString(locales, { ...options, second: '2-digit' });
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

export const getMaxPerPositionInOrder = (product) => {
  const additionalInfo = getProductAdditionalInfo(product);
  return additionalInfo?.maxPerPositionInOrder;
};

export const sortModifiers = (modifiers) => {
  // Фильтруем модификаторы, чтобы исключить элементы без имени
  const validModifiers = modifiers.filter(modifier => modifier && modifier.name);

  if (validModifiers.length !== modifiers.length) {
    logger.log(`Обнаружены модификаторы без имени: ${JSON.stringify(modifiers.filter(m => !m || !m.name))}`);
  }

  const sortOrder = ['пиццони', 'маленькая', 'средняя', 'большая']; // в нижнем регистре
  validModifiers.sort((a, b) => {
    const indexA = sortOrder.indexOf(a.name.toLowerCase());
    const indexB = sortOrder.indexOf(b.name.toLowerCase());

    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }

    if (indexA !== -1) {
      return -1;
    }

    if (indexB !== -1) {
      return 1;
    }

    return 0;
  });

  // Заменяем исходный массив отсортированными элементами
  modifiers.length = 0;
  modifiers.push(...validModifiers);
};

export const getRelatedProductIdForMod = (id) => {
  const mapper = new Map([
    ['1847b373-dff6-4228-b120-c2b9f314f998', 'c9f65878-0b09-4f8d-b153-0d881873d475'],
    ['f3691f6b-a4a3-4bf1-81fa-950c0bc29296', 'c9f65878-0b09-4f8d-b153-0d881873d475'],
    ['076fd059-eb6a-4d1a-9391-e0cefdfc718c', '996c5699-2678-4018-83ff-61ae95cffc62'],
    ['b41f6a06-c509-4f4d-a2a5-03c119809768', '996c5699-2678-4018-83ff-61ae95cffc62'],
    ['7116569a-d84a-4aab-a84e-0aa394769790', 'ceddd05d-e1e7-489b-ba60-e0056bb1aa76'],
    ['50ef5dae-3296-46b7-b694-e1c98ca7d0ba', 'ceddd05d-e1e7-489b-ba60-e0056bb1aa76'],
    ['ec902ef1-9459-4f76-a8c5-a954aa9cd1b2', '786d45d2-5f85-4497-a1fb-2b97d56cc3e2'],
    ['0b8be9a7-6569-4aa7-b881-42178cf362f2', '786d45d2-5f85-4497-a1fb-2b97d56cc3e2'],
    ['86e3356f-b6a1-469e-b704-1061b5b1b04c', 'f6f33cec-b50e-41cb-a3d3-534e00e4a3e7'],
    ['5b211d8e-d28d-4ba8-a488-7ddd8be27d88', 'f6f33cec-b50e-41cb-a3d3-534e00e4a3e7'],
    ['35c3cf18-42ef-42d9-ac32-5c784538f6a9', 'caf6f32a-1d3c-47ce-b0c4-8796733a25bc'],
    ['5c98f20a-ae3c-41a0-a5e4-10057391da02', 'caf6f32a-1d3c-47ce-b0c4-8796733a25bc'],
    ['54987031-bb81-4c80-a825-e4e1a8aeaa90', 'd049c99b-1444-4050-83a4-df6a66ffa610'],
    ['23169258-ed51-40e2-8da9-722b77a91b67', 'd049c99b-1444-4050-83a4-df6a66ffa610'],
    ['d8f4bf58-d499-4c7a-ba3e-764da33a8f96', 'd891622d-0812-4d86-9263-259c61744619'],
    ['b2e56050-0c04-4a20-af11-effa3aa4b1fa', 'd891622d-0812-4d86-9263-259c61744619'],
    ['ca8cafed-ba2a-4b4c-ad19-8b08cd746f8c', 'cd103549-6d24-4fd2-97e2-c07e31f88a98'],
    ['84d58ce9-a80e-46dd-9b24-f8810a05dd34', 'cd103549-6d24-4fd2-97e2-c07e31f88a98'],
    ['c653cf2d-0c1e-4988-88f7-a50e1d577c1e', 'cbd2f4f1-6535-42be-acd4-b5528bc84f1d'],
    ['e25147e8-64f0-4b17-8217-fe9a6e5f6dca', 'cbd2f4f1-6535-42be-acd4-b5528bc84f1d'],
    ['6fbe22fe-aedb-4950-9b94-73323d1f5fd6', '2bdc7d4f-9191-47e9-ba28-76ae29a5bf0e'],
    ['0b140b5c-9832-4a09-8a28-29dd60dc7268', '2bdc7d4f-9191-47e9-ba28-76ae29a5bf0e'],
    ['c4fffdd7-adae-4a89-b6a2-57e8031866a4', 'e293503e-3938-4175-83bb-3f483f3ab64c'],
    ['17944554-9df4-4433-a914-3caede9fb2cd', 'e293503e-3938-4175-83bb-3f483f3ab64c'],
    ['f211fc2a-b04f-4ad8-9ec6-eb221dabeebd', '20b9eb59-28e8-4663-b176-e2415dd2a613'],
    ['dfff5979-e240-4b9c-9f21-6edaa9125f65', '20b9eb59-28e8-4663-b176-e2415dd2a613'],
    ['6749cecd-5842-4411-90c9-fd185dde2d14', '62e55ef2-5351-47b3-823a-5fe8998f2560'],
    ['3d2e85cc-d692-4b06-ad65-abe5952d443b', '62e55ef2-5351-47b3-823a-5fe8998f2560'],
    ['7447d280-7458-48a0-8911-bf2aa63485d2', 'cdb2e49b-a627-4dca-9aa3-663a1ff91f16'],
    ['06b7f2ec-c056-4b40-a235-621aa8878862', 'cdb2e49b-a627-4dca-9aa3-663a1ff91f16'],
    ['e03acd4f-694e-4b9a-8828-aefa9b8d7cc5', '85360e54-d9ae-431b-8a8c-7c76add864a0'],
    ['0ea5e444-e57c-430b-a0a8-be2d7cfdffff', '85360e54-d9ae-431b-8a8c-7c76add864a0'],
    ['a51adbb3-609a-46ca-ba8a-bad802882905', 'f07eaca5-f559-4c0c-8e64-7fbbf63ccfba'],
    ['5e87a673-c940-4fc1-8ef0-14120b146beb', 'f07eaca5-f559-4c0c-8e64-7fbbf63ccfba'],
    ['68773aeb-5ce0-4fcc-8f42-0130aaadd9c1', '1a144b9c-7626-4cea-93cf-5e59f52fe4a8'],
    ['7c431a6c-06da-448e-bd5b-91977290c8ba', '1a144b9c-7626-4cea-93cf-5e59f52fe4a8'],
    ['9db8465f-3a6d-4ed4-991e-ebf60d9690f6', 'be92eb24-36b0-4f0e-ba10-87da4bd9cb13'],
    ['0f51c448-0a6d-4fbb-9b1b-223af1d17452', 'be92eb24-36b0-4f0e-ba10-87da4bd9cb13'],
    ['3185b4d2-f032-473d-9148-be4e480134a7', 'bc1b1550-323b-4187-b22f-3286993e998e'],
    ['101d9285-97f8-46ca-ae1c-d37ef0739a37', 'bc1b1550-323b-4187-b22f-3286993e998e'],
    ['025f1fc2-6669-4c6c-bceb-1cf8e4efa92f', '7c0c5017-2c77-4c58-a842-d0d83e80e11c'],
    ['0ddb3221-a8d8-4b81-99b8-ece79696e8ed', '7c0c5017-2c77-4c58-a842-d0d83e80e11c'],
    ['a7647fc4-e1cb-44b6-8dc4-d11e7c761106', 'a1a6073a-0ac9-468f-bc45-20572d600822'],
    ['00d06910-b54f-4cb6-b7ba-45ff15c3ca56', 'a1a6073a-0ac9-468f-bc45-20572d600822'],
    ['ae66a80a-471a-4296-9508-5de1687990a6', '083bb4df-0116-4d65-9712-902b23d69b0d'],
    ['5d9a3b9b-0670-4870-acce-4f1602d45c1d', '083bb4df-0116-4d65-9712-902b23d69b0d'],
    ['0ed04a7b-703b-489e-baf9-447a462538cd', '7b25d562-fd54-4ed8-b6ad-1c1df8f8caa2'],
    ['1afe1706-620e-4cbf-a9e9-d7485bc83cee', '7b25d562-fd54-4ed8-b6ad-1c1df8f8caa2'],
    ['ab4069f2-fb1a-421a-a7f7-780a2dfd729c', '1dff9bd0-aecd-4af9-8a17-933b69a9d01e'],
    ['a084bb81-5d73-4c3e-9277-122c276977aa', '1dff9bd0-aecd-4af9-8a17-933b69a9d01e'],
    ['1a0819b1-a3b7-4a97-b938-7c0688773a9a', 'dcc7ccaa-ea7a-43da-b114-9df0dd3b2b63'],
    ['4d33b9ac-de55-40f8-96a6-9587f7c170d0', 'dcc7ccaa-ea7a-43da-b114-9df0dd3b2b63'],
    ['1a0819b1-a3b7-4a97-b938-7c0688773a9a', 'dcc7ccaa-ea7a-43da-b114-9df0dd3b2b63'],
    ['4d33b9ac-de55-40f8-96a6-9587f7c170d0', 'dcc7ccaa-ea7a-43da-b114-9df0dd3b2b63'],
    ['be4ce3b8-485f-4f08-9760-1a4d83bb76ae', 'c0bce224-7cf7-4472-a18a-bb3d317357f6'],
    ['235c8c95-362e-46e4-a8ef-b429e6efef4b', 'c0bce224-7cf7-4472-a18a-bb3d317357f6'],
    ['e0bcb0ce-6571-4936-9f47-98576312b20f', '8fdff5ac-b24b-4a78-a5ca-4dfc05123451'],
    ['d90c1039-6c13-43d6-a877-1eeb25ceadd0', '8fdff5ac-b24b-4a78-a5ca-4dfc05123451'],
    ['aa3590f3-6e39-4c7d-bcc6-550d7c3f8373', '41d4929f-15ea-4b01-8e31-6e59b0fb5339'],
    ['c8faad0d-30f1-46b3-b251-feb729fee514', '9c030f70-2519-422e-a6d9-30aafa2ed3ce'],
    ['5193d576-ce11-4b1a-8137-9ca5b7131a3a', '19e56b7a-f7dd-485c-a0bd-eab6132a3c95'],
    ['644e6ff1-d833-4246-ab96-ffb21a3b3f24', 'c9a08a33-1bfa-4e23-af05-5510d2307cf8'],
    ['d08ce2f8-603e-40bc-baba-f67951f06a7a', '005c414e-4ba9-462d-a1b7-9c2140e8e529'],
    ['efb15983-ea22-496e-a63d-20d463b24027', 'c5065246-75d4-47e3-8b17-acd5a9fd6e89'],
    ['664afc1e-b5c6-4d1e-8dec-1c7693c73461', '1fd11f65-fa98-4ba5-81a3-4c33f7645ba0'],
    ['a8973425-ac61-4675-ae0c-78629f301aab', '63c1d8cd-2f80-498f-b395-beed239c41e0'],
    ['d330003e-c131-4df5-a124-5bc47d6ac8e9', 'feb4863a-2573-4bef-8e92-99f47763308f'],
    ['4b652469-3878-4e57-9297-2fc532d1fc4b', 'e712437d-36b6-4633-b20c-3476c0275207'],
    ['778bb831-7d0b-4986-8195-8407ffce14f6', '08202a35-d9c5-4a7f-b3f3-07ae7bf30b99'],
    ['cbcace8d-bfd8-4bce-9b7b-3f0111ebcbc4', 'a9f97443-f9b5-479f-b451-257f54bcba64'],
    ['eff56a91-78bb-47dd-9fb1-bdea234826d1', 'b079b697-c5cd-4707-b1be-1ef907b1ce81'],
    ['ef6010e5-03b6-44d4-8ca1-fddeaa827a4a', 'fb4aebb5-2592-4e80-9fe1-47f7354e60d1'],
    ['a353bb5b-37bf-426e-8df1-0d0bf27097a5', '34cd1b51-e62b-41ad-907e-f1dd25b40b8d'],
    ['5849bcf9-043b-40a6-8de0-bc4786c8a4ce', '992ca33c-4264-4638-a1b7-fee4a6777b39'],
    ['8fcfa978-69b8-4cfc-9d1c-b9a2d763c2c3', '7821353a-471c-4a5d-9348-2df1b91953cf'],
    ['cc702448-ac47-4f59-afca-c80f6577d673', '9151a6ca-431c-4a79-be2a-4ae0da3b0ec8'],
    ['fc20df50-ff92-4605-b4a9-55b8886a6187', '8e5493ed-bd08-4aa9-8664-34c3892a016a'],
    ['ab56a5cd-b7ee-4128-9591-dceccf7530f4', 'c73da596-08bc-480b-8451-6a2406c8748b'],
    ['f2206de2-2871-42d0-8e67-8586e0314cdb', '04db7900-ce83-43a1-9f67-3ec10a18744e'],
    ['293f2d03-f377-45e4-99bd-6967945410ba', '939bf01b-a045-4924-8031-2a7fa235e1c1'],
    ['052e1595-ebbe-41ea-8c80-c7167ac33416', 'ca26a137-50cc-4676-b874-1da2b2d3ff83'],
    ['86349dd7-05c0-4cdd-a86b-ecd6c1133432', 'f6e58cc0-ff8a-49f4-bbdb-a59e619726cb'],
    ['d17609f5-dcba-4b96-aa21-c60f945fa6b6', 'de870194-9b44-45a1-9fd0-cf37ae218a5f'],
    ['d7a2b415-778d-49af-8425-327d4d7d73df', 'fc8a00d5-a083-4dac-8087-c434f4725122'],
    ['bbb22e8e-8214-42cf-94ef-0e2eb1d012dd', 'ecac4627-84f1-47ca-a37e-835ecd5d4e81'],
    ['d60487af-c930-490b-8d8b-e62bded6b8ea', '7ac3c794-134e-4faa-9dbb-9a96108f2986'],
    ['f82a973a-2017-4471-b29d-d43bd7adc704', 'c3ec5c83-0fbc-471b-a5f3-5cfde9cc26fa'],
    ['40fb8559-913f-49f2-b35a-af1ce3e10ec2', 'ffb77d83-0439-46e0-8b05-1b61546eb8f3'],
    ['cd56ae97-6268-4b24-9680-53a97888fa82', 'f7bc64c3-aec2-481d-8469-1be6ca5b27bb'],
    ['c83231d4-b429-4f30-93e5-df6cb7f75497', '0892f9b8-2e0d-4317-8eb3-051d0b1be679'],
    ['75709fd7-9ffb-47d1-8186-0bc9de0619fb', '3be8808a-4dfb-48fe-8284-5fa185250979'],
    ['da2690a7-090f-4694-8fcd-569ba2cfb48a', 'ec71defd-1109-4017-955e-0adefacd30b4'],
    ['73cfc68d-5270-4293-b7a2-57588068265a', '8fdff5ac-b24b-4a78-a5ca-4dfc05123451'],
    ['eb5fafd8-b1fb-46fd-af9c-d39ef17ae20e', 'f18beae8-8fdb-4759-8a63-23d5b2c380e7'],
    ['a8319717-aa83-4e75-b3ff-8ade7893487e', '507eeb04-9713-481e-b9fb-7d1a4b5f33e7'],
    ['d1b43422-271d-47fb-89b0-aded500bf386', '9facee97-81f4-43ed-8d21-d3f45abbc26e'],
    ['7ff7b8b3-bfbc-47bf-b7c3-b885e7da6b8b', '411ef611-8856-42fc-a53f-475294c131db'],
    ['31bd1b6d-a493-4368-b33b-8f046a16ae54', '4922f785-3964-4f5c-ab33-60d51a7a7227'],
    ['7c1c6d66-2e2f-4c01-90a0-10a23aaeffb8', 'a8a7b8a6-fd3a-456f-bbbd-1e4974ba5b23'],
    ['88e4521f-9912-41f9-b13d-576837ed118f', '4468f4eb-701e-45ab-8e19-e7b0ec828545'],
    ['90775c84-c405-4cd9-a2d2-e1daf1e31c7f', '1ad9df3d-4e0a-4634-819e-3c76d09d8458'],
    ['811ec93a-d7fa-4c29-9105-742185f12d41', '3a5919a9-b5fa-4f75-aa95-38888cd16f73'],
    ['89b30395-c77e-4e59-8f71-248447ec0b5f', '658f3d24-17b9-4848-8826-10c9ab37924a'],
    ['b15bcd72-a44e-4758-9a49-9e1fd4b9d495', '01054e76-4aa1-4354-b4ad-31dcc6654f2d'],
    ['5b3fe3a0-cc6c-489b-b25f-84d85860cc47', '8e21f5c9-7179-45f4-ab9b-bd802ec07a5c'],
    ['49d34f26-8d8c-4baa-a9a1-42f34337596e', '50895d4c-d370-4db3-9c75-73421d347c47'],
    ['6c50944a-d3a5-4216-b5a8-b4141fd575c2', '1df57525-5df5-46f3-bcf5-1fd87c59225d'],
    ['fcd565d8-07b5-4c84-bc95-0b7df3183df0', 'e047e6f0-20b6-411f-97c8-c61ece1bbb0d'],
    ['f1d61b0d-897d-4861-acfa-c1825821c86a', '4e1ff827-930b-4a04-9bcf-820bbae27525'],
    ['d7260a89-c18d-456c-a78b-b45d949f5777', '1e945d45-9b7f-4f99-beeb-ef72f41b707a'],
    ['e75c7ab8-6664-47b9-b320-30e83c2c08cd', 'bb21b055-903b-4fc8-9d79-f1a832469063'],
    ['4c1b618c-8796-4a16-ba85-9bfe3e888f03', '91380804-7c87-4b20-bf72-291016b78bd8'],
    ['2b0a14db-5657-4466-b606-eb25ee93bd55', '74025a2c-76f3-4757-b3b1-04cc96e2e8e1'],
    ['958be196-4d86-468f-ab89-db232d4a03b0', '0e2c0935-ffba-49f8-912d-dc2e2c1901bd'],
    ['9d919946-c760-4666-b42d-ac5b338b723c', 'f29383c5-a14e-4472-b0dc-e4abe8f2bde8'],
    ['04faefb5-e4fa-455d-927b-bf6df8244bf5', '654f8eb7-fe38-4e13-a749-c9c026a41c3c'],
    ['cc050dab-ae17-4885-b08f-8cf7d53630ec', '6d07ea03-4192-4767-89e7-519af6131af7'],
    ['97942608-1f81-4aee-ba3a-358a5fd8f8e8', 'db3a8ac4-005b-47fa-aaac-0ecea7d69862'],
    ['d6dfdf25-559f-4f6a-af68-84838eaba54a', '50f05518-cde1-4f27-8059-6ee48cb32d2b'],
    ['266d2f28-2001-494c-a013-89354187d61a', 'd42143db-3cc4-45bb-b1c9-11a7da07b04f'],
    ['4cc8c3c2-a33e-4ffe-afbe-42f9497bd378', '44d178b4-cb7b-4e9b-8438-8f5726e108f1'],
    ['1386995e-b130-40d4-a88f-2cdf55a87b67', '72d124dd-b201-4447-b246-5d5c58c728b1'],
    ['391229c8-5eb5-4bec-b239-446f31d42e36', 'ceeaf147-828f-4073-9920-18922c439e34'],
    ['e869198e-bf15-4874-bf85-4937ee9e63e7', '94ead989-033d-4629-9ed6-1c0e30e9efbc'],
    ['7104e823-8e1d-44bc-b503-be5047efebbc', '2f64af45-4c8e-43b7-9e1b-7e89b99bfc11'],
    ['851216ff-4f5f-46a9-9b52-3a0b977e0c8a', '291a2d11-4d11-4350-b6e1-929c25c386ce'],
    ['a8466c87-e055-4a56-8825-761dbd372e92', '8fe53c7b-c5ab-4fe1-9030-f5951a6aef8c'],
    ['380603a3-0530-4c75-a6c0-6769ca0cb900', 'd7486578-e1d4-4fba-89c1-2935259ab9d6'],
    ['1e469fb6-9abd-4bc1-9cb4-6623a938c618', '51a26853-acc2-4f33-9cef-1a84ac2710bb'],
    ['d2c2356c-a8fd-4104-bee9-8cd1b9ae063f', '9117a818-f00b-4252-b04e-36760c6e0bba'],
    ['f9965ecc-d4bd-478a-85d1-a604af2a3715', '58fea0b5-46d3-4487-a3c1-8e8dd14dae2f'],
    ['4bafef2e-37cc-4249-b851-d3e332ed0149', 'b3d8fb8d-6c5c-4423-a91f-255defb42924'],
    ['445b2fe4-024a-44cd-85a0-dcac2d22658e', 'c2522413-0cb4-4b29-ab27-4464a8908898'],
    ['889994b4-0e43-4b8a-9cb3-3423ae9b8936', 'b1fe9f77-5d55-4342-bebd-3bef28a9ccfa'],
    ['3c32dab8-3f46-4987-9bd6-7192c8b416a3', 'ab49da4e-8f77-47df-b25f-8d6c7b24b282'],
    ['bf02cfbf-234c-4905-ac8d-9269960105b7', 'f8034886-7fdb-4d47-8d57-7b8363e9bf80'],
    ['ea551862-b633-4bb3-a118-2f33cc2b73a3', '8f3abf50-6429-428e-a415-113877cf741d'],
    ['60c44ba1-1d38-4d44-bea2-b62d0f0d026e', '92afaf68-6c85-4fb3-a7db-2a03f82934f8'],
    ['8fb6f247-0e76-4d55-9b90-e69a7c46c215', '1481d3f8-713d-4dbf-b073-6581a288f843'],
    ['55e55c9b-1e26-4f51-8179-2b1a205cdd0c', '32ad5d53-9f4f-4bbb-bb75-48d1fea23fe4'],
    ['55e55c9b-1e26-4f51-8179-2b1a205cdd0c', '32ad5d53-9f4f-4bbb-bb75-48d1fea23fe4'],
    ['25fdafa7-f6ac-4ee5-9c2f-5b40a9efd935', '3d8f941b-3e50-42ec-abde-ef862aef7c8b'],
    ['093a34e2-ff85-4c22-b96c-4411b5497679', '4a80c9d8-6db7-4ea1-996a-a85f7d82425e'],
    ['9e37d2d2-d1d0-4399-9a3c-95b714a62e52', 'ca736399-71d2-4637-9f95-8b1b199c7684'],
    ['eacf09bd-33f9-4ee5-a56b-576d1878bff2', 'd72f3245-c33f-4d48-a0e4-ed87513886a6'],
    ['172a6b57-9aa1-4090-89b5-836edf8663a8', '8ffe6a2b-aeef-4c5a-b61a-430b4f9e7e45'],
    ['7e0ab956-2091-4242-b664-19f7d1ed0afc', '96a477b8-8887-4687-8740-ae60bb850104'],
    ['197b34e7-b1ac-4c8a-a246-8cb1871009e8', '1bda3d25-6b0c-4c6c-b3bd-5d2c2ae52fec'],
    ['e86a780c-5358-4fcd-89b2-4d8b6b440797', '235ab0f6-c07d-4418-89a4-0ca5f4d7cc00'],
    ['32832f90-8146-45f6-8ba9-768d743ccdf4', '74414172-9d1c-4cc8-aef7-6a44fe6b3995'],
  ]);

  return mapper.get(id);
};

export const getRelatedProductImage = (products, id) => {
  let result = '';
  const relatedProductId = getRelatedProductIdForMod(id);
  const relatedProduct = products.find((p) => p.id === relatedProductId);
  if (relatedProduct) {
    result = relatedProduct.image ?? '';
  }

  if (id === 'ac88ff7f-551f-4ada-b8e7-54009d1521dd') {
    return '/content/shop/full/without-topping.png';
  }
  if (id === '516929fc-884d-48da-908b-9c331db33591') {
    return '/content/shop/full/strawberry.png';
  }
  if (id === 'cca60d93-e5fe-468d-90a3-edf561d2bd5d') {
    return '/content/shop/full/cherry.png';
  }
  if (id === 'adf087b7-364f-400f-9a30-1009a2fc2549') {
    return '/content/shop/full/honey.png';
  }

  return result;
};
