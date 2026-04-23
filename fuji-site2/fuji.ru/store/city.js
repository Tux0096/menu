import { Geolocation } from '@capacitor/geolocation';

import GeolocationService from '~/modules/geolocation/geolocation.service';
import deliveryZoneService from '~/services/deliveryZone.service';

export const state = () => ({
  cities: [],
  city: null,
  cityData: null,
  cladr: [],
  zoneDeliveryId: null, // ID товара доставки для текущей зоны
});

export const mutations = {
  setCities(state, cities) {
    state.cities = cities;
  },

  setCity(state, city) {
    state.city = city;
  },

  setCityData(state, cityData) {
    state.cityData = cityData;
  },

  setCladr(state, cladr) {
    state.cladr = cladr;
  },

  setZoneDeliveryId(state, deliveryId) {
    state.zoneDeliveryId = deliveryId;
  },

};

export const actions = {
  async initCity({ getters, dispatch }, route) {
    await dispatch('getCities');

    if (route.params?.city) {
      const { city: citySlug } = route.params;
      const { cities } = getters;

      if (cities?.length) {
        const city = cities.find((c) => c.slug === citySlug);

        if (city) {
          dispatch('setCity', city.iikoId);
        }
      }
    } else {
      dispatch('setCity', null);
    }
  },

  async initCitySelection({
    commit, dispatch, rootState, state: cityState, rootGetters,
  }) {
    if (rootGetters['terminal/isKioskMode']) {
      return;
    }

    // Skip city selection on electronic menu pages
    if (process.client && window.location.pathname.startsWith('/menu')) {
      return;
    }

    if (!rootState.user.isAlreadySelectedCity) {
      commit('modal/showCityModal', true, { root: true });
    }

    //  много запросов на апи яндекса идет, отключим функционал определения города по геолокации
    // try {
    //   const CurrentPosition = await Geolocation.getCurrentPosition();
    //
    //   const coordinates = CurrentPosition.coords;
    //
    //   if (coordinates.latitude || coordinates.longitude) {
    //     const YANDEX_MAPS_API_KEY = rootGetters['setting/YANDEX_MAPS_API_KEY'];
    //     const geoLocationInstance = await GeolocationService.create(
    //       coordinates,
    //       YANDEX_MAPS_API_KEY,
    //     );
    //     const definedCityName = geoLocationInstance.getCity();
    //
    //     if (!definedCityName) {
    //       if (!rootState.user.isAlreadySelectedCity) {
    //         commit('modal/showCityModal', true, { root: true });
    //       }
    //       return;
    //     }
    //
    //     const { cities } = cityState;
    //     const city = cities.find((c) => c.name === definedCityName);
    //
    //     if (!city) {
    //       if (!rootState.user.isAlreadySelectedCity) {
    //         commit('modal/showCityModal', true, { root: true });
    //       }
    //       return;
    //     }
    //
    //     dispatch('setCity', city.iikoId);
    //   }
    // } catch (error) {
    //   console.error('Failed to initialize city selection:', error);
    //   if (!rootState.user.isAlreadySelectedCity) {
    //     commit('modal/showCityModal', true, { root: true });
    //   }
    // }
  },

  async getCities({ commit, dispatch }) {
    const res = await this.$axios.get(`${this.$config.FRONT_API_URL}/api/v1/city/`);
    const cities = res.data;
    commit('setCities', cities);
    await dispatch('setCity');
  },

  async setCity({
    commit, getters, dispatch, rootGetters,
  }, cityIdParam) {
    let city;
    const { cities } = getters;

    if (!cityIdParam) {
      const cityId = this.$cookies.get('cityId');
      if (cityId) {
        city = cities.find((c) => c.iikoId === cityId);
      }
    } else {
      city = cities.find((c) => c.iikoId === cityIdParam);
    }

    if (!city) {
      if (cities?.length) {
        city = cities.find((c) => c.iikoId
          === rootGetters['setting/SAMARA_ID']);
      }
    }

    if (city?.iikoId) {
      this.$cookies.set('cityId', city?.iikoId, {
        path: '/', maxAge: 60 * 60 * 24 * 365,
      });
    }
    if (city?.slug) {
      this.$cookies.set('citySlug', city?.slug, {
        path: '/', maxAge: 60 * 60 * 24 * 365,
      });
    }

    commit('setCity', city);
    commit('modal/showDeliveryModal', null, { root: true });

    try {
      await dispatch('initCladr', city.iikoId);
      await dispatch('setting/initSettings', null, { root: true });
    } catch (e) {
      // console.log(e);
    }

    if (process.client) {
      // Do not redirect on electronic menu pages
      if ($nuxt.$route.fullPath.startsWith('/menu')) {
        return;
      }
      dispatch('cart/setAppliedCoupon', '', { root: true });
      const newPathName = `/${city.slug}${$nuxt.$route.fullPath}`;
      window.location.replace(newPathName);
    }

    const cityData = rootGetters['setting/CITY_DATA'];
    commit('setCityData', cityData);
  },

  async initCladr({ commit }, cityIikoId) {
    const res = await this.$axios.get(`${this.$config.FRONT_API_URL}/api/v1/cladr/city/${cityIikoId}`);
    commit('setCladr', res.data);
  },

  // Action для получения deliveryId из зоны
  async updateZoneDeliveryId({ commit }, zoneId) {
    if (!zoneId) {
      // Если зона не выбрана, сбрасываем zoneDeliveryId
      commit('setZoneDeliveryId', null);
      return;
    }

    try {
      // Получаем deliveryId из зоны через сервис
      const zoneDeliveryId = await deliveryZoneService.getZoneDeliveryId(zoneId);
      commit('setZoneDeliveryId', zoneDeliveryId);
    } catch (error) {
      console.error('Error getting zone delivery ID:', error);
      // При ошибке сбрасываем zoneDeliveryId
      commit('setZoneDeliveryId', null);
    }
  },
};

export const getters = {
  city: ({ city }) => city,
  cities: ({ cities }) => cities || [],
  cityData: ({ cityData }) => cityData,
  cladr: ({ cladr }) => cladr,
  cityId: ({ city }) => city?.id || null,
  cityName: ({ city }) => city?.name || '',
  cityIn: ({ city }) => city?.cityIn || '',
  cityIikoId: ({ city }) => city?.iikoId || null,
  isPromocodeHide: ({ cityData }) => cityData.isPromocodeHide,
  isSelectOrderTimeHide: ({ cityData }) => cityData.isSelectOrderTimeHide,
  isTolyatti: ({ cityData }, _getters, _rootState, rootGetters) => cityData?.iikoId
    === rootGetters['setting/TOLYATTI_ID'],
  isSamara: ({ cityData }, _getters, _rootState, rootGetters) => cityData?.iikoId
    === rootGetters['setting/SAMARA_ID'],
  isNovokujbyshevsk: ({ cityData }, _getters, _rootState, rootGetters) => cityData?.iikoId
    === rootGetters['setting/NOVOKUJBYSHEVSK_ID'],

  freeDeliveryId: ({ cityData }) => cityData?.freeDeliveryId,
  deliveryId: ({ cityData, zoneDeliveryId }) => {
    if (zoneDeliveryId) {
      return zoneDeliveryId;
    }
    return cityData?.deliveryId;
  },

  zoneDeliveryId: ({ zoneDeliveryId }, getters) => getters.deliveryId,

  deliveryCost: (state, getters, rootState, rootGetters) => {
    const { deliveryId } = getters;
    const delivery = rootGetters['catalog/productById'](deliveryId);
    return delivery?.price ?? 0;
  },

  serviceFeeId: ({ cityData }) => cityData?.serviceFeeId,
  serviceFeeCost: (state, getters, rootState, rootGetters) => {
    const { serviceFeeId } = getters;
    const serviceFee = rootGetters['catalog/productById'](serviceFeeId);
    return serviceFee?.price || 0;
  },

};
