import { nuxtInstance } from '~/plugins/nuxt-instance';

export const state = () => ({
  promocodes: [],
  currentPromocode: null,
  loading: false,
  error: null,
});

export const mutations = {
  setPromocodes(state, promocodes) {
    state.promocodes = promocodes;
  },
  setCurrentPromocode(state, promocode) {
    state.currentPromocode = promocode;
  },
  setLoading(state, loading) {
    state.loading = loading;
  },
  setError(state, error) {
    state.error = error;
  },
};

export const actions = {
  async fetchPromocodes({ commit, rootState, rootGetters }) {
    try {
      commit('setLoading', true);
      commit('setError', null);

      const userId = rootGetters['user/id'];

      let promocodes = [];

      if (userId) {
        console.log('User ID для запроса промокодов:', userId);

        // Получаем промокоды, доступные для сегмента пользователя
        promocodes = await nuxtInstance.$axios.$get(
          `${nuxtInstance.$config.FRONT_API_URL}/api/v1/promo`,
          { params: { userId } },
        );

      } else {
        console.log('Пользователь не авторизован, промокоды не запрашиваются');
        // Для неавторизованных пользователей пустой список
        promocodes = [];
      }

      commit('setPromocodes', promocodes);
      return promocodes;
    } catch (error) {
      commit('setError', error.message || 'Ошибка при загрузке промокодов');
      return [];
    } finally {
      commit('setLoading', false);
    }
  },

  async fetchPromocode({ commit }, id) {
    try {
      commit('setLoading', true);
      commit('setError', null);

      const promocode = await nuxtInstance.$axios.$get(
        `${nuxtInstance.$config.FRONT_API_URL}/api/v1/promo/${id}`,
      );

      commit('setCurrentPromocode', promocode);
      return promocode;
    } catch (error) {
      commit('setError', error.message || 'Ошибка при загрузке промокода');
      return null;
    } finally {
      commit('setLoading', false);
    }
  },

  async applyPromocode({ commit, dispatch }, code) {
    try {
      await dispatch('cart/setAppliedCoupon', code, { root: true });
      return true;
    } catch (error) {
      commit('setError', error.message || 'Ошибка при применении промокода');
      return false;
    }
  },
};

export const getters = {
  getPromocodes: (state) => state.promocodes,
  activePromocodesCount: (state) => state.promocodes.length,
  getCurrentPromocode: (state) => state.currentPromocode,
  isLoading: (state) => state.loading,
  getError: (state) => state.error,
};
