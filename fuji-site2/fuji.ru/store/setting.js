import { preloadImages } from '~/lib/common';

export const state = () => ({
  settings: {},
  deliveryTimeByZone: null,
});

export const mutations = {
  setSettings(state, setting) {
    state.settings = setting;
  },
  setDeliveryTimeByZone(state, deliveryTime) {
    state.deliveryTimeByZone = deliveryTime;
  },
};

export const actions = {

  async initSettings({ commit }) {
    const settings = await this.$axios.$get(`${this.$config.FRONT_API_URL}/api/v1/setting`);
    commit('setSettings', settings);
  },

  async getDeliveryTimeByZone({ commit }, zoneId) {
    try {
      const deliveryTime = await this.$axios.$get(
        `${this.$config.FRONT_API_URL}/api/v1/setting/CHECKOUT_DELIVERY_TEXT`,
      );
      commit('setDeliveryTimeByZone', deliveryTime);
      return deliveryTime;
    } catch (error) {
      console.error('Ошибка получения времени доставки для зоны:', error);
      // Возвращаем значения по умолчанию в случае ошибки
      const defaultTime = {
        delivery: {
          title: '60 минут приготовление и контроль качества',
          text: 'доставка 30 минут или быстрее',
        },
        self: {
          title: '30 минут приготовление и контроль качества',
        },
      };
      commit('setDeliveryTimeByZone', defaultTime);
      return defaultTime;
    }
  },

};
export const getters = {
  IS_SITE_NOT_WORKING({ settings }) {
    return settings.IS_SITE_NOT_WORKING;
  },
  TEXT_SITE_NOT_WORKING({ settings }) {
    return settings.TEXT_SITE_NOT_WORKING;
  },
  STORE_VERSION({ settings }) {
    return settings.STORE_VERSION;
  },
  CUSTOM_ADD_TO_CART_GROUPS_ID({ settings }) {
    return settings.CUSTOM_ADD_TO_CART_GROUPS_ID;
  },
  SAMARA_ID({ settings }) {
    return settings.SAMARA_ID;
  },
  TOLYATTI_ID({ settings }) {
    return settings.TOLYATTI_ID;
  },
  NOVOKUJBYSHEVSK_ID({ settings }) {
    return settings.NOVOKUJBYSHEVSK_ID;
  },
  WORK_TIME({ settings }, { SAMARA_ID }, _rootState, rootGetters) {
    const cityId = rootGetters['city/cityIikoId'] || SAMARA_ID;
    return settings.WORK_TIME[cityId];
  },
  SECTION_ID_ADD_TO_ORDER({ settings }) {
    return settings.SECTION_ID_ADD_TO_ORDER;
  },
  SECTION_ID_ADDITIONALLY({ settings }) {
    return settings.SECTION_ID_ADDITIONALLY;
  },
  PIZZAS_GROUP_ID({ settings }) {
    return settings.PIZZAS_GROUP_ID;
  },
  SNACKS_GROUP_ID({ settings }) {
    return settings.SNACKS_GROUP_ID;
  },
  SNACK_GIFT_ID({ settings }) {
    return settings.GIFT_IDS.SNACK;
  },
  PIZZA_GIFT_ID({ settings }) {
    return settings.GIFT_IDS.PIZZA;
  },
  RESTAURANT_LIST({ settings }, { SAMARA_ID }, _rootState, rootGetters) {
    const cityId = rootGetters['city/cityIikoId'] || SAMARA_ID;
    return settings.DELIVERY_TERMINALS[cityId];
  },
  CATALOG_MENU({ settings }) {
    const catalogMenu = settings.CATALOG_MENU;

    if (process.client) {
      const imagesSrc = catalogMenu
        .filter(((item) => !!item.image))
        .map((item) => item.image);

      // Используем настройки пресета списка для меню
      preloadImages(imagesSrc, {}, 3000, 5, 'list');
    }
    return catalogMenu;
  },

  ZONES_BY_CITY_ID({ settings }, { SAMARA_ID }, _rootState, rootGetters) {
    const cityId = rootGetters['city/cityIikoId'] || SAMARA_ID;
    return settings.CITY_ZONES[cityId];
  },
  YANDEX_MAPS_API_KEY({ settings }) {
    return settings.YANDEX_MAPS_API_KEY;
  },
  CITIES_DATA({ settings }) {
    return settings.CITIES_DATA;
  },
  CITY_DATA(_store, { SAMARA_ID, CITIES_DATA }, _rootState, rootGetters) {
    const cityId = rootGetters['city/cityIikoId'] || SAMARA_ID;
    return CITIES_DATA[cityId];
  },
  IS_DELIVERY_ONLINE_PAYMENT_DISABLE({ settings }) {
    return settings.IS_ONLINE_PAYMENT_DISABLE.delivery;
  },
  IS_SELF_ONLINE_PAYMENT_DISABLE({ settings }) {
    return settings.IS_ONLINE_PAYMENT_DISABLE.self;
  },
  SECTION_PROMO_IMAGES({ settings }) {
    return settings.SECTION_PROMO_IMAGES;
  },
  STORIES({ settings }) {
    return settings.STORIES;
  },
  ALLERGENS({ settings }) {
    return settings.ALLERGENS;
  },
  PHONES({ settings }) {
    return settings.PHONES;
  },
  phoneDeliveryService(state, { PHONES }) {
    return PHONES.deliveryService || '8 800 2222-000';
  },
  SMARTCAPTCHA_SITE_KEY({ settings }) {
    return settings.SMARTCAPTCHA_SITE_KEY;
  },
  IS_WITHOUT_CAPTCHA({ settings }) {
    return settings.IS_WITHOUT_RECAPTCHA;
  },
  CHECKOUT_DELIVERY_TEXT({ settings, deliveryTimeByZone }) {
    if (deliveryTimeByZone) {
      return deliveryTimeByZone;
    }

    return settings.CHECKOUT_DELIVERY_TEXT;
  },
  IS_SITE_INFORMATION({ settings }) {
    return settings.IS_SITE_INFORMATION;
  },
  TEXT_SITE_INFORMATION({ settings }) {
    return settings.TEXT_SITE_INFORMATION;
  },
  IS_SHOW_8MARCH_MODAL({ settings }) {
    return settings.IS_SHOW_8MARCH_MODAL;
  },
  IMAGE_PRESET_CATALOG_LIST({ settings }) {
    return settings.IMAGE_PRESET_CATALOG_LIST || {
      height: 248,
      width: 248,
      quality: 60,
    };
  },
  IMAGE_PRESET_CATALOG_DETAIL({ settings }) {
    return settings.IMAGE_PRESET_CATALOG_DETAIL || {
      height: 500,
      width: 500,
      quality: 60,
    };
  },
};
