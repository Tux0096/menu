import { yaInit } from '@/lib/yandexService';

export const state = () => ({
  timeAppLoad: null,
  backVersion: null,
  storeVersion: null,
  settingVersion: null, // используется пока настройки на беке в текстовых файлах, надо будет переделать на веб сокеты

  // eslint-disable-next-line max-len
  mobileAppVersion: 9, // должна биться с беком, если они разные то юзеру будет сообщение о необходимости обновить приложение
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

  async nuxtClientInit({ state, dispatch, commit }, ctx) {
    yaInit();

    if (!state.timeAppLoad) {
      commit('setTimeAppLoad', Date.now());
    }
    if (!state.backVersion) {
      try {
        const { data: backVersion } = await this.$axios.get(
          `${this.$config.FRONT_API_URL}/api/v1/storage/version`,
        );
        commit('setBackVersion', backVersion);
      } catch (e) {
        console.log(e);
      }
    }

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

    const PAGE_RELOAD_CHECK_INTERVAL = 1000 * 60; // 1 minute
    const MAX_TIME_BEFORE_RELOAD = 1000 * 60 * 60 * 24; // 24 hours

    setInterval(() => {
      if (Date.now() - state.timeAppLoad > MAX_TIME_BEFORE_RELOAD) {
        window.location.reload();
      }
    }, PAGE_RELOAD_CHECK_INTERVAL);

    setInterval(async () => {
      const currentBackVersion = state.backVersion;
      try {
        const { data: backVersion } = await this.$axios.get(
          `${this.$config.FRONT_API_URL}/api/v1/storage/version`,
        );
        if (currentBackVersion !== backVersion) {
          dispatch('catalog/initCatalog')
            .then(() => dispatch('cart/setDeliveryMethod', 'self'))
            .then(() => {
              dispatch('cart/initCart');
            });
        }
      } catch (e) {
        console.log(e);
      }
    }, PAGE_RELOAD_CHECK_INTERVAL);

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

    const CHECK_STORE_VERSION_INTERVAL = 1000 * 60; // 1 minute
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
          // commit('setIsAppNeedUpdate', true);
          commit('modal/showAppUpdate', { root: true });
        } else {
          // commit('setIsAppNeedUpdate', false);
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

    await dispatch('setting/initSettings');
    await dispatch('city/initCity', ctx.route);
    const tableApplied = await dispatch('tableDeepLink/tryApplyFromQuery', ctx);
    if (!tableApplied?.applied) {
      await dispatch('pickupDeepLink/tryApplyFromQuery', ctx);
      dispatch('city/initCitySelection');
      dispatch('pickupDeepLink/consumePendingPickupModal');
    }
    dispatch('catalog/initCatalog')
      .then(() => dispatch('cart/setDeliveryMethod', 'self'))
      .then(() => {
        dispatch('cart/initCart');
        dispatch('user/initUser');
        dispatch('cart/setAppliedCoupon', '', { root: true });
      });
  },

};
export const getters = {
  isAppNeedUpdate({ isAppNeedUpdate }) {
    return isAppNeedUpdate;
  },
};
