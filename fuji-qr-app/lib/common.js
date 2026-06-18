import { gsap } from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { nuxtInstance } from '../plugins/nuxt-instance';

gsap.registerPlugin(ScrollToPlugin);

export const getDeliveryIds = () => {
  const citiesData = nuxtInstance.store.getters['setting/CITIES_DATA'];
  return Object.values(citiesData)
    .map((c) => c.deliveryId);
};

export const getFreeDeliveryIds = () => {
  const citiesData = nuxtInstance.store.getters['setting/CITIES_DATA'];
  return Object.values(citiesData)
    .map((c) => c.freeDeliveryId);
};

const parseTime = (timeString) => {
  const [hours, minutes] = timeString.split(':')
    .map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date;
};

export const checkWorkTime = (TIME, currentDate = new Date()) => {
  const day = currentDate.getDay();
  const previousDay = day === 0 ? 6 : day - 1;
  const { close: prevClose, isNextDay: prevIsNextDay } = TIME[previousDay];
  const { open, close, isNextDay } = TIME[day];

  if (open === close) {
    return false;
  }

  const prevEndDate = parseTime(prevClose);
  if (prevIsNextDay && currentDate <= prevEndDate) {
    return true;
  }

  const startDate = parseTime(open);
  const endDate = parseTime(close);

  if (isNextDay && endDate < startDate) {
    endDate.setHours(endDate.getHours() + 24);
  }

  return (currentDate >= startDate && currentDate <= endDate)
    ? true
    : TIME[day];
};

export const validatePhone = (phone) => (/^((\+7)+([0-9]){10})$/.test(phone));

export const normalizePhone = (phone) => {
  let normalizedPhone = `${phone.replace(/\D/g, '')}`;
  if (normalizedPhone[0] === '8') {
    normalizedPhone = `7${normalizedPhone.slice(1)}`;
  }
  return `+${normalizedPhone}`;
};

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

export const formatCurrency = (number) => new Intl.NumberFormat(
  'ru-RU',
  { style: 'currency', currency: 'RUB' },
).format(number);

export const renderAddress = (address) => {
  if (!address) {
    return 'не указан';
  }

  const result = [];

  if (!address.street?.includes(address.city)) {
    result.push(address.city);
  }

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

export function formatPhoneNumber(phoneNumber) {
  const cleaned = `${phoneNumber}`.replace(/\D/g, '');
  const match = cleaned.match(/^(\d)(\d{3})(\d{3})(\d{2})(\d{2})$/);

  if (match) {
    const countryCode = match[1] ? `+${match[1]} ` : '';
    const areaCode = match[2] ? `(${match[2]}) ` : '';
    const firstPart = match[3] ? `${match[3]}-` : '';
    const secondPart = match[4] ? `${match[4]}-` : '';
    const lastPart = match[5] ? match[5] : '';

    return countryCode + areaCode + firstPart + secondPart + lastPart;
  }

  return phoneNumber;
}

export const downloadFile = (data, filename, mime) => {
  const blob = new Blob([data], { type: mime || 'application/octet-stream' });
  if (typeof window.navigator.msSaveBlob !== 'undefined') {
    window.navigator.msSaveBlob(blob, filename);
    return;
  }
  const blobURL = window.URL.createObjectURL(blob);
  const tempLink = document.createElement('a');
  tempLink.style.display = 'none';
  tempLink.href = blobURL;
  tempLink.setAttribute('download', filename);
  if (typeof tempLink.download === 'undefined') {
    tempLink.setAttribute('target', '_blank');
  }
  document.body.appendChild(tempLink);
  tempLink.click();
  document.body.removeChild(tempLink);
  setTimeout(() => {
    window.URL.revokeObjectURL(blobURL);
  }, 100);
};

export const getPrice = (product) => {
  const initialPrice = Number(product.price ?? 0);
  let minPrice = initialPrice;
  let maxPrice = initialPrice;
  let from = false;

  const groupsWithMods = (product.groupModifiers || []).filter((g) => g.modifiers?.length);
  /** При нулевой базе цена задаётся модификаторами — учитываем минимум/максимум по всем группам. */
  const pricingGroups = initialPrice === 0
    ? groupsWithMods
    : groupsWithMods.filter((g) => g.required);

  pricingGroups.forEach((g) => {
    const prices = g.modifiers.map((m) => Number(m.price ?? 0));
    minPrice += Math.min(...prices);
    maxPrice += Math.max(...prices);
  });

  if (minPrice < maxPrice) {
    from = true;
  }

  return { price: minPrice, from };
};

export const sliceDate = (date) => {
  const d = new Date(date);
  let month = `${d.getMonth() + 1}`;
  let day = `${d.getDate()}`;
  const year = `${d.getFullYear()}`;
  let hour = `${d.getHours()}`;
  let minute = `${d.getMinutes()}`;

  if (month.length < 2) {
    month = `0${month}`;
  }
  if (day.length < 2) {
    day = `0${day}`;
  }
  if (hour.length < 2) {
    hour = `0${hour}`;
  }
  if (minute.length < 2) {
    minute = `0${minute}`;
  }
  return {
    hour, minute, day, month, year,
  };
};

export const isProductInCartById = (id, cartItems) => cartItems
  .find(({ product }) => product.id === id);

export const checkDeliveryInCart = (cartItems, deliveryId) => {
  if (!cartItems?.length) {
    return false;
  }

  return cartItems.some(
    (item) => item.product.id === deliveryId,
  );
};

export function removeDeliveries(cartItems, deliveryIds) {
  return cartItems
    .filter((item) => !deliveryIds.includes(item.product.id));
}

export function processDelivery({
  cartItems,
  isSelfDelivery,
  deliveryId,
  hasFreeDelivery,
  delivery,
}) {
  if (!cartItems.length) return [];

  const deliveryIds = new Set(getDeliveryIds());
  const freeDeliveryIds = new Set(getFreeDeliveryIds());
  const combinedDeliveryIds = [...deliveryIds, ...freeDeliveryIds];

  let cartItemsCopy = removeDeliveries(cartItems, combinedDeliveryIds);

  if (isSelfDelivery) {
    return removeDeliveries(cartItemsCopy, combinedDeliveryIds);
  }

  if (hasFreeDelivery) {
    return removeDeliveries(cartItemsCopy, [...deliveryIds]);
  }

  if (!checkDeliveryInCart(cartItemsCopy, deliveryId) && deliveryId) {
    const deliveryData = {
      mods: [],
      product: delivery,
      quantity: 1,
      isServiceFee: false,
      isHidden: true,
      isGift: false,
    };
    cartItemsCopy = [...cartItemsCopy, deliveryData];
  }

  return cartItemsCopy;
}

export const getScrollDirection = (() => {
  let lastScrollTop = 0;
  return () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    const direction = scrollTop > lastScrollTop ? 'down' : 'up';
    lastScrollTop = scrollTop;
    return direction;
  };
})();

export const normalizeRouteName = (routeName) => routeName?.replace('city-', '');

export function pluralize(n, formOne, formTwo, formFive) {
  n = Math.abs(n) % 100;
  const n1 = n % 10;

  if (n > 10 && n < 20) {
    return formFive;
  }
  if (n1 > 1 && n1 < 5) {
    return formTwo;
  }
  if (n1 === 1) {
    return formOne;
  }
  return formFive;
}

export const hasPageSlider = (routeName) => {
  const pages = [
    'index',
    'restaurant',
    'about',
    'vacancies',
  ];
  const normalizedRouteName = normalizeRouteName(routeName);
  return pages.includes(normalizedRouteName);
};

export function scrollToCatalogCategory(sectionElement) {
  const scrollTo = (headerHeight) => {
    const topPosition = sectionElement.getBoundingClientRect().top
      + window.scrollY;

    gsap.to(window, {
      duration: 0,
      scrollTo: { y: topPosition - headerHeight },
    });
  };

  if (!sectionElement) {
    return;
  }
  const theHeader = document.getElementById('the-header');
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target.id === 'the-header') {
        const headerHeight = entry.target.getBoundingClientRect().height;
        scrollTo(headerHeight);
        setTimeout(() => {
          resizeObserver.unobserve(theHeader);
        }, 600);
      }
    }
  });

  const theHeaderHeight = theHeader.getBoundingClientRect().height;
  resizeObserver.observe(theHeader);

  scrollTo(theHeaderHeight);
}

export function preloadImage(url) {
  const img = new Image();
  img.src = url;
}

export const handleNotification = (notification, app) => {
  const route = notification.data?.route;
  if (route) {
    app.router.push(route);
  }
};

export function preloadImages(imageUrls, params = {}, delayTime = 3000, batchSize = 5) {
  const delay = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

  async function loadBatch(batch) {
    batch.forEach((url) => {
      if (url) {
        const img = new Image();
        img.src = nuxtInstance.$img(url, params);
      }
    });
    await delay(1000);
  }

  async function loadImagesInBatches() {
    await delay(delayTime);
    for (let i = 0; i < imageUrls.length; i += batchSize) {
      const batch = imageUrls.slice(i, i + batchSize);
      await loadBatch(batch);
    }
  }

  loadImagesInBatches()
    .then();
}

export async function copyTextToClipboard(text) {
  if (!navigator.clipboard) {
    return false;
  }
  await navigator.clipboard.writeText(text);
  return true;
}

export function getModImagePath(name) {
  const modName = name?.toLocaleLowerCase()
    .trim();
  return null;
}

/**
 * Получает настройки пресета изображений из store
 * @param {string} presetType - Тип пресета ('list' или 'detail')
 * @returns {Object} - Настройки пресета
 */
export const getImagePreset = (presetType = 'list') => {
  if (!nuxtInstance || !nuxtInstance.$store) {
    // Возвращаем дефолтные значения, если store недоступен
    return {
      height: 248,
      width: 248,
      quality: 60,
    };
  }

  const presetName = presetType === 'detail'
    ? 'IMAGE_PRESET_CATALOG_DETAIL'
    : 'IMAGE_PRESET_CATALOG_LIST';

  return nuxtInstance.$store.getters[`setting/${presetName}`];
};
