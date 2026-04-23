import { yaInit } from '@/lib/yandexService';
import axios from 'axios';

const PAGE_RELOAD_CHECK_INTERVAL = 1000 * 60; // 1 minute
const MAX_TIME_BEFORE_RELOAD = 1000 * 60 * 60 * 24; // 24 hours
const CHECK_STORE_VERSION_INTERVAL = 1000 * 60; // 1 minute

async function fetchCatalogVersion() {
  try {
    const { data: catalogVersion } = await axios.get(`${this.$config.FRONT_API_URL}/api/v1/storage/version`);
    return catalogVersion;
  } catch (error) {
    console.error('Ошибка при получении версии каталога:', error);
  }
  return null;
}

export const state = () => ({
  timeAppLoad: null,
  backVersion: null,
  storeVersion: null,
  // используется пока настройки на беке в текстовых файлах, надо будет переделать на веб сокеты
  settingVersion: null,

  // должна биться с беком, если они разные то юзеру будет сообщение о необходимости обновить приложение
  mobileAppVersion: 1,
  isAppNeedUpdate: false,
});

export const mutations = {
  setTimeAppLoad(state, time) {
    state.timeAppLoad = time;
  },
  setBackVersion(state, version) {
    state.backVersion = version;
  },

  setSettingVersion(state, version) {
    state.settingVersion = version;
  },

  setStoreVersion(state, version) {
    state.storeVersion = version;
  },
  setIsAppNeedUpdate(state, payload) {
    state.isAppNeedUpdate = payload;
  },

};

export const actions = {
  async nuxtServerInit({ dispatch, commit }, ctx) {
    await dispatch('setting/initSettings');
    await dispatch('city/initCity', ctx.route);
    try {
      const allergens = this.$cookies.get('userAllergens');
      if (allergens?.length) {
        commit('user/setUserAllergens', allergens);
      }
    } catch (e) {
      console.log(e);
    }
    await dispatch('catalog/initCatalog');
  },
  async nuxtClientInit({ state, dispatch, commit }, ctx) {
    yaInit();

    if (!state.timeAppLoad) {
      commit('setTimeAppLoad', Date.now());
    }
    setInterval(() => {
      if (Date.now() - state.timeAppLoad > MAX_TIME_BEFORE_RELOAD) {
        window.location.reload();
      }
    }, PAGE_RELOAD_CHECK_INTERVAL);

    const catalogVersion = await fetchCatalogVersion.call(this);
    commit('setBackVersion', catalogVersion);
    setInterval(async () => {
      const currentBackVersion = state.backVersion;
      const backVersion = await fetchCatalogVersion.call(this);
      if (currentBackVersion !== backVersion) {
        await dispatch('catalog/initCatalog');
      }
    }, PAGE_RELOAD_CHECK_INTERVAL);

    if (!state.settingVersion) {
      try {
        const { data: settingVersion } = await this.$axios.get(
          `${this.$config.FRONT_API_URL}/api/v1/setting/version`,
        );
        commit('setSettingVersion', settingVersion);
      } catch (e) {
        console.log(e);
      }
    }

    const CHECK_SETTINGS_INTERVAL = 1000 * 60; // 1 minute
    setInterval(async () => {
      const currentSettingVersion = state.settingVersion;

      try {
        const { data: settingVersion } = await this.$axios.get(
          `${this.$config.FRONT_API_URL}/api/v1/setting/SETTINGS_VERSION`,
        );

        if (currentSettingVersion !== settingVersion) {
          dispatch('setting/initSettings');
          commit('setSettingVersion', settingVersion);
        }
      } catch (e) {
        console.log(e);
      }
    }, CHECK_SETTINGS_INTERVAL);

    setInterval(async () => {
      const currentStoreVersion = state.storeVersion;
      try {
        const { data: storeVersion } = await this.$axios.get(
          `${this.$config.FRONT_API_URL}/api/v1/setting/STORE_VERSION`,
        );
        if (currentStoreVersion !== storeVersion) {
          window.location.reload();
        }
      } catch (e) {
        console.log(e);
      }
    }, CHECK_STORE_VERSION_INTERVAL);

    const checkMobileAppVersion = async () => {
      const currentVersion = state.mobileAppVersion;
      try {
        const { data: version } = await this.$axios.get(
          `${this.$config.FRONT_API_URL}/api/v1/setting/MOBILE_APP_VERSION`,
        );
        if (currentVersion !== version) {
          commit('setIsAppNeedUpdate', true);
        }
      } catch (e) {
        console.log(e);
      }
    };
    await checkMobileAppVersion();
    const CHECK_MOBILE_APP_VERSION_INTERVAL = 1000 * 60; // 1 minute
    setInterval(async () => {
      await checkMobileAppVersion();
    }, CHECK_MOBILE_APP_VERSION_INTERVAL);

    await dispatch('city/initCitySelection');

    await dispatch('catalog/initCatalog', null, { root: true });
    await dispatch('cart/initCart');
    await dispatch('user/initUser');
  },

};
export const getters = {
  isAppNeedUpdate(state) {
    return state.isAppNeedUpdate;
  },
};
