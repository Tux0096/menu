import moment from 'moment';
import * as dateFnsTz from 'date-fns-tz';
import { getOrdersCountByCoupon } from '../order/order.service.js';
import * as promoRepo from './promo.repository.js';
import * as fileService from '../file/file.service.js';
import CustomError from '../errors/CustomError.js';
import env from '../env.js';
import { sequelize } from '../db.js';
import { processingQueryData } from '../lib/helpers.js';
import {
  formatBirthday,
  formatLastMessageSentAt,
  formatLastOrderDate,
} from './promo.helper.js';
import * as orderService from '../order/order.service.js';

export const getPromocodes = async () => promoRepo.getPromocodes();

export const getPromocode = async (id) => {
  const promocodeResult = await promoRepo.getPromocode(id);
  const promocode = promocodeResult.get({ plain: true });
  if (!promocode) {
    throw new CustomError({
      message: `Промокод с ID ${id} не найден`,
      code: 'PROMO_NOT_FOUND',
      statusCode: 404,
    });
  }

  const { listBanner, cardBanner } = promocode;

  if (listBanner?.path) {
    promocode.listBanner.path = `${env.API_FULL_URL}/${listBanner.path}`;
  }

  if (cardBanner?.path) {
    promocode.cardBanner.path = `${env.API_FULL_URL}/${cardBanner.path}`;
  }

  return promocode;
};

export const getPromoData = async (data) => {
  const gifts = await getPromocodes();

  const result = {
    discountTotal: 0, // Total discount amount
    discounts: 0, // Number of discounts applied
    loyaltyProgramErrors: [], // List of errors related to the loyalty program
    freeProducts: [], // List of free product codes granted
    lostGift: [], // Unused, but can store potential gifts that were not qualified for
  };

  let {
    coupon,
    notGiftsAndNotDeliveryTotal = 0,
    order,
    customer,
  } = data;

  if (!coupon) {
    return result;
  }

  const customerPhone = customer.phone;

  // Normalize the coupon code
  coupon = coupon.trim().toLowerCase();

  // Find the first gift that matches the coupon code
  const gift = gifts.find((g) => g.coupon.toLowerCase() === coupon && g.active);

  if (gift) {
    const currentDate = Date.now();

    if (gift.dateFrom && gift.dateTo
      && (currentDate < gift.dateFrom || currentDate > gift.dateTo)) {
      result.loyaltyProgramErrors.push('Промокод не активен на текущую дату.');
      return result;
    }

    if (gift.hasTimeRestriction && gift.timeFrom && gift.timeTo) {
      const timeZone = 'Europe/Samara';
      const nowUtc = new Date();
      const nowSamara = dateFnsTz.toZonedTime(nowUtc, timeZone);

      const currentTime = `${String(nowSamara.getHours()).padStart(2, '0')}:${String(nowSamara.getMinutes()).padStart(2, '0')}`;

      if (currentTime < gift.timeFrom || currentTime > gift.timeTo) {
        result.loyaltyProgramErrors.push(`Промокод доступен только с ${gift.timeFrom} до ${gift.timeTo}.`);
        return result;
      }
    }

    if (gift.hasProduct) {
      // If a specific product is required for the promo, check if it is in the order
      const hasNeededProduct = order.items.some((item) => item.code === gift.hasProduct);
      if (!hasNeededProduct) {
        result.loyaltyProgramErrors.push('Не выполнены условия для промокода. Добавьте в корзину Сет Осенний Бум.');
        return result;
      }
    }

    if (notGiftsAndNotDeliveryTotal < gift.fullPrice) {
      result.loyaltyProgramErrors.push(`Активируйте промокод при сумме заказа ${gift.fullPrice} рублей`);
      return result;
    }

    if (gift.times) {
      // Check if the coupon has been used before
      const ordersCountByCoupon = await getOrdersCountByCoupon(customerPhone, coupon);
      if (ordersCountByCoupon >= gift.times) {
        result.loyaltyProgramErrors.push(`Данный промокод можно использовать <br> только ${gift.times} раз(а)!`);
        return result;
      }
    }

    // Если промокод для сегмента, проверяем вхождение пользователя в сегмент
    if (gift.isForSegment) {
      try {
        // Находим пользователя по номеру телефона
        const userByPhone = await findUserByPhone(customerPhone);

        if (!userByPhone) {
          result.loyaltyProgramErrors.push('Данный промокод не доступен для вашего аккаунта.');
          return result;
        }

        // Проверяем вхождение пользователя в сегмент
        const isInSegment = await promoRepo.checkUserInSegment(gift.id, userByPhone.id);

        if (!isInSegment) {
          result.loyaltyProgramErrors.push('Данный промокод не доступен для вашего аккаунта.');
          return result;
        }
      } catch (error) {
        console.error(`Ошибка при проверке сегмента промокода ${gift.id}:`, error);
        result.loyaltyProgramErrors.push('Ошибка при проверке доступности промокода.');
        return result;
      }
    }

    result.freeProducts.push(gift.code);
    result.loyaltyProgramErrors.push('Промокод применен');
  } else {
    result.loyaltyProgramErrors.push('Промокод не найден!');
  }

  return result;
};

export const addPromocode = async (data) => {
  const promocode = await promoRepo.addPromocode(data);

  // Если промокод для сегмента, запускаем расчет сегмента
  if (data.isForSegment && data.segmentFilter) {
    calculateSegmentForPromocode(promocode.id, JSON.stringify(data.segmentFilter)).catch((err) => {
      console.error(`Ошибка при расчете сегмента для промокода ${promocode.id}:`, err);
    });
  }

  return promocode;
};

export const updatePromocode = async (id, data) => {
  const updatedPromocode = await promoRepo.updatePromocode(id, data);

  // Если промокод для сегмента, запускаем расчет сегмента
  if (data.isForSegment && data.segmentFilter) {
    // Сначала удаляем старые данные сегмента
    await promoRepo.removePromocodeUserSegments(id);

    // Затем запускаем новый расчет
    calculateSegmentForPromocode(id, data.segmentFilter).catch((err) => {
      console.error(`Ошибка при расчете сегмента для промокода ${id}:`, err);
    });
  } else if (!data.isForSegment) {
    // Если промокод больше не для сегмента, удаляем данные сегмента
    await promoRepo.removePromocodeUserSegments(id);
  }

  return updatedPromocode;
};

export const deletePromocode = async (id) => {
  const promocode = await promoRepo.getPromocode(id);
  if (!promocode) {
    throw new CustomError({
      message: `Промокод с ID ${id} не найден`,
      code: 'PROMO_NOT_FOUND',
      statusCode: 404,
    });
  }

  // Удаляем связанные файлы баннеров
  if (promocode.listBannerId) {
    await fileService.deleteFile(promocode.listBannerId);
  }

  if (promocode.cardBannerId) {
    await fileService.deleteFile(promocode.cardBannerId);
  }

  // Удаляем данные сегмента
  await promoRepo.removePromocodeUserSegments(id);

  return promoRepo.deletePromocode(id);
};

// Функции для работы с баннерами

export const uploadPromoBanner = async (id, type, fileData) => {
  // Проверяем существование промокода
  const promocode = await promoRepo.getPromocode(id);
  if (!promocode) {
    throw new CustomError({
      message: `Промокод с ID ${id} не найден`,
      code: 'PROMO_NOT_FOUND',
      statusCode: 404,
    });
  }

  // Загружаем файл
  const uploadedFile = await fileService.saveFileData(fileData);

  // Если ранее был загружен файл для этого типа баннера, удаляем его
  let oldFileId = null;
  if (type === 'list' && promocode.listBannerId) {
    oldFileId = promocode.listBannerId;
  } else if (type === 'card' && promocode.cardBannerId) {
    oldFileId = promocode.cardBannerId;
  }

  // Обновляем ссылку на баннер в промокоде
  const updatedPromocode = await promoRepo.updatePromoBanner(id, type, uploadedFile.id);

  // Удаляем старый файл, если он был
  if (oldFileId) {
    try {
      await fileService.deleteFile(oldFileId);
    } catch (error) {
      console.error(`Ошибка при удалении старого файла баннера (ID: ${oldFileId}):`, error);
      // Не выбрасываем ошибку, так как основная операция уже выполнена
    }
  }

  return {
    id,
    type,
    bannerId: uploadedFile.id,
    file: uploadedFile,
  };
};

export const deletePromoBanner = async (id, type) => {
  // Проверяем существование промокода
  const promocode = await promoRepo.getPromocode(id);
  if (!promocode) {
    throw new CustomError({
      message: `Промокод с ID ${id} не найден`,
      code: 'PROMO_NOT_FOUND',
      statusCode: 404,
    });
  }

  // Определяем ID файла баннера
  let fileId = null;
  if (type === 'list' && promocode.listBannerId) {
    fileId = promocode.listBannerId;
  } else if (type === 'card' && promocode.cardBannerId) {
    fileId = promocode.cardBannerId;
  }

  if (!fileId) {
    throw new CustomError({
      message: `Баннер типа ${type} не найден для промокода с ID ${id}`,
      code: 'BANNER_NOT_FOUND',
      statusCode: 404,
    });
  }

  // Удаляем файл
  const fileDeleted = await fileService.deleteFile(fileId);

  if (!fileDeleted) {
    throw new CustomError({
      message: `Ошибка при удалении файла баннера (ID: ${fileId})`,
      code: 'FILE_DELETE_ERROR',
      statusCode: 500,
    });
  }

  // Обновляем ссылку на баннер в промокоде
  await promoRepo.removePromoBanner(id, type);

  return {
    id,
    type,
    success: true,
    message: `Баннер типа ${type} успешно удален для промокода с ID ${id}`,
  };
};

// Получение информации о баннерах промокода
export const getPromocodeBanners = async (id) => {
  // Проверяем существование промокода
  const promocode = await promoRepo.getPromocode(id);
  if (!promocode) {
    throw new CustomError({
      message: `Промокод с ID ${id} не найден`,
      code: 'PROMO_NOT_FOUND',
      statusCode: 404,
    });
  }

  return {
    id,
    listBanner: promocode.listBanner || null,
    cardBanner: promocode.cardBanner || null,
  };
};

export const getCustomers = async (queryData, noLimit = false) => {
  const processedQueryData = processingQueryData(queryData);

  let filteredData = await promoRepo.getCustomers(processedQueryData);

  const { filter } = processedQueryData;
  const { page = 1, limit = 50 } = processedQueryData;
  const offset = (page - 1) * limit;

  if (filter?.birthday?.from !== undefined && filter?.birthday?.to
    !== undefined && filter?.birthday?.to > 0) {
    const today = moment();

    filteredData = filteredData.filter((item) => {
      // Приводим дату рождения пользователя к текущему году
      const birthdayThisYear = moment(item.birthday)
        .year(today.year());

      // Если день рождения уже прошел в этом году, рассматриваем следующий год
      if (birthdayThisYear.isBefore(today, 'day')) {
        birthdayThisYear.add(1, 'year');
      }

      // Рассчитываем количество дней до следующего дня рождения
      const daysUntilBirthday = birthdayThisYear.diff(today, 'days');

      // Возвращаем true, если день рождения в заданном диапазоне
      return daysUntilBirthday >= filter.birthday.from && daysUntilBirthday
        <= filter.birthday.to;
    });
  }

  // Фильтр по количеству заказов (orderCount)
  if (filter?.orderCount?.from !== undefined && filter?.orderCount?.to
    !== undefined && filter?.orderCount?.to > 0) {
    filteredData = filteredData.filter((item) => {
      const orderCount = item.orderCount || 0;
      return orderCount >= filter.orderCount.from && orderCount
        <= filter.orderCount.to;
    });
  }

  // Фильтр по дате последнего заказа (lastOrderDate)
  if (filter?.lastOrderDate?.from !== undefined && filter?.lastOrderDate?.to
    !== undefined && filter?.lastOrderDate?.to > 0) {
    const today = moment();

    filteredData = filteredData.filter((item) => {
      if (!item.lastOrderDate) {
        return false; // Если lastOrderDate отсутствует, исключаем элемент
      }

      // Рассчитываем количество дней с последнего заказа
      const lastOrderDate = moment(item.lastOrderDate);
      const daysSinceLastOrder = today.diff(lastOrderDate, 'days');

      // Возвращаем true, если количество дней с последнего заказа в заданном диапазоне
      return daysSinceLastOrder >= filter.lastOrderDate.from
        && daysSinceLastOrder <= filter.lastOrderDate.to;
    });
  }
  // Фильтр по среднему чеку (averageCheck)
  if (filter?.averageCheck?.from !== undefined && filter?.averageCheck?.to
    !== undefined && filter?.averageCheck?.to > 0) {
    filteredData = filteredData.filter((item) => {
      const averageCheck = item.averageCheck || 0;
      return averageCheck >= filter.averageCheck.from && averageCheck
        <= filter.averageCheck.to;
    });
  }
  // Фильтр по самовывозу (isSelfService)
  if (filter?.isSelfService !== undefined && filter?.isSelfService !== 'none') {
    filteredData = filteredData.filter((item) => item.isSelfService
      === Number(filter.isSelfService));
  }
  // Фильтр по ресторану (lastOrderTerminalId)
  if (filter?.lastOrderTerminalId !== undefined
    && filter?.lastOrderTerminalId !== 'none') {
    filteredData = filteredData.filter((item) => item.lastOrderTerminalId
      === filter.lastOrderTerminalId);
  }

  // Фильтр по заказанным продуктам (orderedProducts)
  if (filter?.orderedProducts !== undefined && filter?.orderedProducts !== 'none' && filter?.orderedProducts.trim() !== '') {
    filteredData = filteredData.filter((item) => {
      const itemOrderedProductIds = item.orderedProducts ? item.orderedProducts.split(',') : [];
      return itemOrderedProductIds.includes(filter.orderedProducts);
    });
  }

  const rests = await orderService.getOrdersRest();

  filteredData = filteredData.map((item) => {
    const rest = rests.find((r) => r.value === item.lastOrderTerminalId);

    return {
      ...item,
      lastOrderTerminal: rest?.text || 'Не определен',
      lastMessageSentAtFormat: formatLastMessageSentAt(item.lastMessageSentAt),
      birthdayFormat: formatBirthday(item.birthday),
      lastOrderDateFormat: formatLastOrderDate(item.lastOrderDate),
    };
  });

  if (noLimit) {
    return filteredData;
  }

  // Пагинация данных
  const paginatedData = filteredData.slice(offset, offset + limit);

  return {
    items: paginatedData,
    pagination: {
      currentPage: page,
      pageSize: limit,
      totalPages: Math.ceil(filteredData.length / limit),
      totalItems: filteredData.length,
    },
  };
};

// Новые методы для работы с сегментами пользователей

// Расчет сегмента для промокода на основе фильтра
export const calculateSegmentForPromocode = async (promocodeId, segmentFilter) => {
  const promocode = await getPromocode(promocodeId);
  if (!promocode) {
    throw new CustomError({
      message: `Промокод с ID ${promocodeId} не найден`,
      code: 'PROMO_NOT_FOUND',
      statusCode: 404,
    });
  }

  // Проверяем, что промокод активен
  if (!promocode.active) {
    throw new CustomError({
      message: `Промокод с ID ${promocodeId} не активен`,
      code: 'PROMO_NOT_ACTIVE',
      statusCode: 400,
    });
  }

  const filteredUsers = await getCustomers({ filter: segmentFilter }, true);

  // Очищаем старые данные сегмента
  await promoRepo.removePromocodeUserSegments(promocodeId);

  // Сохраняем новый сегмент
  const segmentPromises = filteredUsers.map((user) => promoRepo.savePromocodeUserSegment(promocodeId, user.customerId));

  await Promise.all(segmentPromises);

  // Обновляем промокод с информацией о фильтре
  await promoRepo.updatePromocode(promocodeId, { segmentFilter });

  return {
    promocodeId,
    usersCount: filteredUsers.length,
    message: `Сегмент для промокода ${promocodeId} успешно обновлен. Количество пользователей: ${filteredUsers.length}`,
  };
};

// Получение сегмента для промокода
export const getPromocodeSegment = async (promocodeId) => {
  // Получаем промокод
  const promocode = await promoRepo.getPromocode(promocodeId);
  if (!promocode) {
    throw new CustomError({
      message: `Промокод с ID ${promocodeId} не найден`,
      code: 'PROMO_NOT_FOUND',
      statusCode: 404,
    });
  }

  // Получаем пользователей в сегменте
  const users = await promoRepo.getPromocodeUserSegments(promocodeId);

  return {
    promocodeId,
    usersCount: users.length,
    users: users.map((user) => ({
      id: user.customer.id,
      name: user.customer.name,
      phone: user.customer.phone,
      birthday: user.customer.birthday,
    })),
    filter: promocode.segmentFilter,
  };
};

// Получение промокодов, доступных конкретному пользователю
export const getUserAvailablePromocodes = async (userId) => {
  console.log('getUserAvailablePromocodes вызван с userId:', userId);

  // Проверяем, что userId не пустой
  if (!userId) {
    console.log('userId пустой или undefined, возвращаем пустой массив');
    return [];
  }

  const promocodes = await promoRepo.getUserAvailablePromocodes(userId);
  console.log(`Найдено ${promocodes.length} промокодов для пользователя ${userId}`);

  // Форматируем URL для баннеров
  return promocodes.map((promocode) => {
    // Обрабатываем полные объекты баннеров
    if (promocode.listBanner && promocode.listBanner.path) {
      promocode.listBanner.path = `${env.API_FULL_URL}/${promocode.listBanner.path}`;
    }

    if (promocode.cardBanner && promocode.cardBanner.path) {
      promocode.cardBanner.path = `${env.API_FULL_URL}/${promocode.cardBanner.path}`;
    }

    return promocode;
  });
};

// Вспомогательная функция для поиска пользователя по номеру телефона
const findUserByPhone = async (phone) => {
  if (!phone) {
    console.log('Пустой номер телефона, не можем найти пользователя');
    return null;
  }

  // Нормализуем номер телефона
  let normalizedPhone = phone.replace(/\D/g, '');

  // Обеспечиваем правильный формат номера
  // Если номер начинается с 8, заменяем на 7
  if (normalizedPhone.startsWith('8') && normalizedPhone.length === 11) {
    normalizedPhone = `7${normalizedPhone.substring(1)}`;
  }
  // Если номер без префикса страны, добавляем 7
  else if (normalizedPhone.length === 10) {
    normalizedPhone = `7${normalizedPhone}`;
  }

  console.log(`Ищем пользователя по телефону: исходный ${phone}, нормализованный ${normalizedPhone}`);

  // Ищем с разными форматами номера
  const query = `
    SELECT id, name, phone 
    FROM customers 
    WHERE phone = :phone 
       OR phone = :phone2
       OR phone = :phone3
       OR phone = :phone4
       OR phone LIKE :phoneLike
    LIMIT 1
  `;

  // Несколько вариантов формата номера (с 7, с 8, без префикса и т.д.)
  const phone2 = normalizedPhone.startsWith('7') ? `8${normalizedPhone.substring(1)}` : normalizedPhone;
  const phone3 = normalizedPhone.startsWith('7') ? normalizedPhone.substring(1) : normalizedPhone;
  const phone4 = normalizedPhone.startsWith('8') ? normalizedPhone.substring(1) : normalizedPhone;
  // Для поиска номеров с разными форматами записи
  const phoneLike = `%${normalizedPhone.slice(-10)}`;

  const [user] = await sequelize.query(query, {
    replacements: {
      phone: normalizedPhone,
      phone2,
      phone3,
      phone4,
      phoneLike,
    },
    type: sequelize.QueryTypes.SELECT,
    raw: true,
  });

  if (user) {
    console.log(`Пользователь найден: ${user.id}, ${user.name}, ${user.phone}`);
  } else {
    console.log(`Пользователь не найден по номеру телефона: ${normalizedPhone}`);
  }

  return user;
};

// Тестовая функция для проверки промокода для сегмента
export const testPromocodeSegment = async (phone, couponCode) => {
  if (!phone || !couponCode) {
    return {
      success: false,
      message: 'Необходимо указать номер телефона и промокод',
    };
  }

  console.log(`Тестирование промокода ${couponCode} для пользователя с телефоном ${phone}`);

  try {
    // Шаг 1: Поиск промокода
    const promocodes = await getPromocodes();
    const coupon = couponCode.trim().toLowerCase();
    const promocode = promocodes.find((p) => p.coupon.toLowerCase() === coupon && p.active);

    if (!promocode) {
      return {
        success: false,
        message: 'Промокод не найден или не активен',
      };
    }

    // Шаг 2: Проверка времени действия промокода
    const currentDate = Date.now();
    if (promocode.dateFrom && promocode.dateTo && (currentDate < promocode.dateFrom || currentDate > promocode.dateTo)) {
      return {
        success: false,
        message: 'Промокод не активен на текущую дату',
        promocode: {
          id: promocode.id,
          coupon: promocode.coupon,
          dateFrom: promocode.dateFrom,
          dateTo: promocode.dateTo,
          isForSegment: promocode.isForSegment,
        },
      };
    }

    // Шаг 3: Если промокод не для сегмента, то он доступен всем
    if (!promocode.isForSegment) {
      return {
        success: true,
        message: 'Промокод доступен (не для сегмента)',
        promocode: {
          id: promocode.id,
          coupon: promocode.coupon,
          isForSegment: false,
        },
      };
    }

    // Шаг 4: Поиск пользователя по телефону
    const user = await findUserByPhone(phone);
    if (!user) {
      return {
        success: false,
        message: 'Пользователь с указанным телефоном не найден',
        promocode: {
          id: promocode.id,
          coupon: promocode.coupon,
          isForSegment: true,
        },
        normalized_phone: phone.replace(/\D/g, ''),
      };
    }

    // Шаг 5: Проверка пользователя в сегменте
    const isInSegment = await promoRepo.checkUserInSegment(promocode.id, user.id);

    return {
      success: isInSegment,
      message: isInSegment
        ? 'Промокод доступен пользователю (входит в сегмент)'
        : 'Промокод не доступен пользователю (не входит в сегмент)',
      promocode: {
        id: promocode.id,
        coupon: promocode.coupon,
        isForSegment: true,
      },
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
      },
      isInSegment,
    };
  } catch (error) {
    console.error('Ошибка при тестировании промокода:', error);
    return {
      success: false,
      message: 'Произошла ошибка при проверке промокода',
      error: error.message,
    };
  }
};
