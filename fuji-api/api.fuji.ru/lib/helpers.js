import axios from 'axios';
import parsePhoneNumber from 'libphonenumber-js';
import jwt from 'jsonwebtoken';
import {
  parse, isAfter, isBefore, format,
} from 'date-fns';
import * as dateFnsTz from 'date-fns-tz';
import env from '../env.js';
import { ValidationError } from '../errors/ValidationError.js';
import CLogger from './CLogger.js';

const logger = new CLogger();

const { toZonedTime } = dateFnsTz;

export const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

/**
 * rename name key in object
 * @param {object} obj
 * @param {string} oldKey
 * @param {string} newKey
 */
export const renameObjectKey = (obj, oldKey, newKey) => {
  Object.defineProperty(obj, newKey, Object.getOwnPropertyDescriptor(obj, oldKey));
  delete obj[oldKey];
};

export const generateAccessToken = (payload, roles = ['user']) => jwt
  .sign({ ...payload, roles }, env.API_JWT_SECRET_KEY, {});

export const formatCurrency = (number) => new Intl.NumberFormat(
  'ru-RU',
  { style: 'currency', currency: 'RUB' },
).format(number);

export const formatDate = (date, { hasTime = null } = {}) => {
  const options = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour12: false,
  };

  if (hasTime) {
    options.hour = 'numeric';
    options.minute = 'numeric';
    options.second = 'numeric';
  }

  return new Date(date).toLocaleString('ru-RU', options);
};

export const formatPhoneNumber = (phone) => {
  const phoneNumber = parsePhoneNumber(phone);
  return phoneNumber.format('INTERNATIONAL');
};

export const renderAddress = (address) => {
  if (!address) {
    return 'не указан';
  }

  const result = [];

  result.push(`г. ${address.city}`);
  result.push(address.street);
  result.push(address.home);
  if (address.apartment) {
    result.push(`кв. ${address.apartment}`);
  }

  if (address.entrance) {
    result.push(`подъезд: ${address.entrance}`);
  }

  if (address.floor) {
    result.push(`этаж: ${address.floor}`);
  }

  return result.join(', ');
};

export const checkReCaptcha = async (token) => {
  const response = await axios
    .post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: env.RECAPTCHA_SECRET_KEY,
          response: token,
        },
      },
    );

  if (!response.data?.success) {
    throw new Error('Invalid captcha');
  }
  return true;
};

export const checkYandexCaptcha = async (token) => {
  const response = await axios
    .get(
      'https://smartcaptcha.yandexcloud.net/validate',
      {
        params: {
          secret: env.SMARTCAPTCHA_SERVER_KEY,
          token,

        },
      },
    );

  if (response.data?.status !== 'ok') {
    throw new Error('Invalid captcha');
  }
  return true;
};

export const checkCaptcha = async (token, type = 'google', IS_WITHOUT_RECAPTCHA = false) => {
  if (IS_WITHOUT_RECAPTCHA) { return true; }

  switch (type) {
    case 'google':
      return checkReCaptcha(token);
    case 'yandex':
      return checkYandexCaptcha(token);
    default:
      throw new Error('Invalid captcha type');
  }
};

export function getImageURL(path, options = {}) {
  const params = [];

  if (options.width) params.push(`width_${options.width}`);
  if (options.height) params.push(`height_${options.height}`);
  if (options.resize) params.push(`s_${options.resize}`);
  if (options.fit) params.push(`fit_${options.fit}`);
  if (options.format) params.push(`format_${options.format}`);
  options.quality ? params.push(`quality_${options.quality}`) : params.push('quality_100');

  return `${env.API_FULL_URL}/_ipx/${params.join(',')}/${path}`;
}

export function getVideoURL(path) {
  return `${env.API_FULL_URL}/${path}`;
}

export function isValidEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  return emailRegex.test(email);
}

export function validateBirthdayFormat(birthday) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;

  if (!regex.test(birthday)) {
    throw new ValidationError('Неверный формат даты рождения. Ожидается формат yyyy-MM-dd');
  }

  const date = new Date(birthday);
  const dateParts = birthday.split('-');

  if (date.getFullYear() !== parseInt(dateParts[0], 10)
    || date.getMonth() + 1 !== parseInt(dateParts[1], 10)
    || date.getDate() !== parseInt(dateParts[2], 10)) {
    throw new ValidationError('Неверный формат даты рождения');
  }

  const minDate = new Date('1900-01-01');
  const today = new Date();

  if (date < minDate || date > today) {
    throw new ValidationError('Дата рождения должна быть между 1900-01-01 и сегодняшним днём');
  }
}

export const isActionProduct = async (id, categoryProduct) => {
  const ACTION_CATEGORIES = [
    'cd04f3a0-3a40-4529-abec-68b126dcb36a',
    '493a8ce7-082c-4ef2-8915-334b1549cf2b',
  ];

  // если категории нет у товара, то будет считать, что он аукционный или уже удален с сайта
  if (!categoryProduct) { return true; }

  return ACTION_CATEGORIES.includes(categoryProduct);
};

export const processingQueryData = (queryData) => {
  const {
    page = 1,
    filter = '{}',
    order = '[["id", "DESC"]]',
    limit = 50,
  } = queryData;

  const offset = (page - 1) * limit;

  let parsedFilter;
  let parsedOrder;

  try {
    parsedFilter = JSON.parse(filter);
    parsedOrder = JSON.parse(order);
  } catch (error) {
    parsedFilter = {};
    parsedOrder = [];
  }

  const cleanObject = (obj) => {
    Object.keys(obj)
      .forEach((key) => {
        if (!obj[key]) {
          delete obj[key];
        }
      });
  };

  cleanObject(parsedFilter);

  return {
    page: Number(page),
    filter: parsedFilter,
    order: parsedOrder,
    limit: Number(limit),
    offset,
  };
};
/**
 * Проверяет, доступна ли категория в текущий момент времени с учетом города.
 * @param {Object} additionalInfo - Объект additionalInfo, содержащий информацию о доступности.
 * @param {string} [city='samara'] - Город (samara, tolyatti, novokujbyshevsk)
 * @returns {Boolean} - Возвращает true, если категория доступна, иначе false.
 */
export function isCategoryAvailable(additionalInfo, city = 'samara') {
  if (!additionalInfo?.['available-time']) {
    return true;
  }
  const cityTime = additionalInfo['available-time'][city.toLowerCase()];

  if (!cityTime) {
    return true;
  }

  try {
    const timeZone = 'Europe/Samara';
    const nowUtc = new Date();
    const nowSamara = toZonedTime(nowUtc, timeZone);
    const [startStr, endStr] = cityTime.split('-');

    if (!startStr || !endStr) {
      logger.log('Некорректный формат available-time для города:', city);
      return false;
    }

    const todayStr = format(nowSamara, 'yyyy-MM-dd');
    const startTime = parse(`${todayStr} ${startStr}`, 'yyyy-MM-dd HH:mm', new Date());
    let endTime = parse(`${todayStr} ${endStr}`, 'yyyy-MM-dd HH:mm', new Date());

    if (isAfter(startTime, endTime)) {
      endTime = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
    }

    return isAfter(nowSamara, startTime) && isBefore(nowSamara, endTime);
  } catch (error) {
    logger.log('Ошибка при проверке доступности категории:', error);
    return false;
  }
}

/**
 * Рекурсивно фильтрует каталог на основе доступности категорий.
 * @param {Array} menu - Массив каталога.
 * @param {string} [city='samara'] - Город (samara, tolyatti, novokujbyshevsk)
 * @returns {Array} - Отфильтрованный массив каталога.
 */
export function filterCatalogByAvailableWork(menu, city = 'samara') {
  return menu
    .map((category) => {
      const { children, additionalInfo, ...rest } = category;

      const available = isCategoryAvailable(additionalInfo, city);

      if (!available) {
        return null;
      }

      if (children && Array.isArray(children)) {
        const filteredChildren = filterCatalogByAvailableWork(children, city);

        if (filteredChildren.length === 0) {
          return null;
        }
        return { ...rest, children: filteredChildren, additionalInfo };
      }

      return { ...rest, additionalInfo };
    })
    .filter(Boolean);
}

/**
 * Склоняет слово по числу на русском языке.
 * @param n - число
 * @param forms - массив из трёх форм: ['минута', 'минуты', 'минут']
 * @returns строка, например: "5 минут"
 */
export const plural = (n, forms) => {
  const mod10 = n % 10;
  const mod100 = n % 100;

  const form = mod10 === 1 && mod100 !== 11 ? forms[0]
    : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? forms[1]
      : forms[2];

  return `${n} ${form}`;
};
