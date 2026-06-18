import { formatPhoneNumber, normalizePhone, validatePhone } from '@/lib/common';

const errorMessage = (text) => {
  $nuxt.$notify({
    group: 'messages',
    type: 'error',
    text,
  });
};
const getDefaultState = () => ({
  user: {},
  lastOrder: null,
  userHistory: [],
  FCMToken: null,
  //
  isShowGetMobileApp: true,
});

export const state = () => ({
  ...getDefaultState(),
  isAlreadySelectedCity: false,
  userAllergens: [],

});

export const mutations = {
  resetState(state) {
    Object.assign(state, getDefaultState());
  },
  setUser(state, user) {
    state.user = user;
  },
  setLastOrder(state, lastOrder) {
    state.lastOrder = lastOrder;
  },
  setUserHistory(state, userHistory) {
    state.userHistory = userHistory;
  },

  //
  setIsAlreadySelectedCity(state, isAlreadySelectedCity) {
    state.isAlreadySelectedCity = isAlreadySelectedCity;
  },

  setIsShowGetMobileApp(state, payload) {
    state.isShowGetMobileApp = payload;
  },

  setUserAllergens(state, payload) {
    state.userAllergens = payload;

    // for the rendering directory on the server, otherwise there are problems with hydration
    this.$cookies.set('userAllergens', JSON.stringify(payload), {
      path: '/', maxAge: 60 * 60 * 24 * 365,
    });
  },

};

export const actions = {
  async initUser({
    commit, getters, rootGetters, dispatch, rootState,
  }) {
    const user = rootGetters['user/user'];
    if (!user.phone) { return; }

    if (user.id) {
      dispatch('address/fetchAddressesForUser', user.id, { root: true });
    }

    let userFromBack = {};

    try {
      if (user.phone?.length) {
        userFromBack = await this.$axios.$get(`${this.$config.FRONT_API_URL}/api/v1/user/${user.phone}`);
      }
    } catch (e) {
      console.log(e);
    }
    const resultUser = { ...user, ...userFromBack };

    dispatch('setUser', resultUser);

    if (user.id && rootGetters['notification/FCMToken']) {
      const deviceData = {
        FCMToken: rootGetters['notification/FCMToken'],
        customerId: user.id,
      };
      this.$axios.$post(`${this.$config.FRONT_API_URL}/api/v1/notification/device`, deviceData)
        .then(() => {
          console.log('Token registered successfully');
        })
        .catch((error) => {
          console.error('Error registering token', error);
        });
    }

    const likesByUserId = await this.$axios.$get(`${this.$config.FRONT_API_URL}/api/v1/user/${user.id}/like`);
    if (likesByUserId) {
      const { products } = rootState.catalog;
      likesByUserId.forEach((like) => {
        const product = products.find((p) => p.id === like.productId);

        if (product) {
          commit('catalog/setIsLiked', product, { root: true });
        }
      });
    }
    dispatch('fetchUserHistory');
  },

  async updateUser({ dispatch, getters }, updateDate) {
    const { user } = getters;
    this.$axios
      .patch(`${this.$config.FRONT_API_URL}/api/v1/user/${user.phone}`, updateDate)
      .then();
    dispatch('initUser');
  },

  async deleteUser({ dispatch, getters }) {
    const { user } = getters;
    await this.$axios.delete(`${this.$config.FRONT_API_URL}/api/v1/user/${user.phone}`);
    dispatch('logoutUser');
  },

  async setUser({ commit, dispatch }, user) {
    commit('setUser', user);
    if (user.id) {
      dispatch('address/fetchAddressesForUser', user.id, { root: true });
    }
    dispatch('initLastOrder');
  },

  async logoutUser({ commit }) {
    await this.$router.push('/');

    commit('resetState');
    commit('address/resetState', null, { root: true });
    commit('cart/resetState', null, { root: true });
    commit('auth/resetState', null, { root: true });
  },

  async auth({ commit, dispatch }, {
    phone,
    name = '',
    personalData,
    PUSHNotifications,
    receiveAdvertisingInformation,
  }) {
    if (!phone?.trim().length) {
      errorMessage('Введите номер телефона');
      return;
    }

    const normalizedPhone = normalizePhone(phone);

    if (!validatePhone(normalizedPhone)) {
      errorMessage('Неверный формат телефона');
      return;
    }

    let user = null;
    try {
      user = await this.$axios.$get(`${this.$config.FRONT_API_URL}/api/v1/user/${normalizedPhone}`);
    } catch (e) {
      if (e.response && e.response.status === 404) {
        user = await this.$axios.$post(`${this.$config.FRONT_API_URL}/api/v1/user`, {
          phone: normalizedPhone,
          name,
          personalData,
          PUSHNotifications,
          receiveAdvertisingInformation,
        });
      }

      console.log(e);
    }

    if (!user) {
      errorMessage('Произошла ошибка. Попробуйте позже.');
      return;
    }

    try {
      await this.$axios.$patch(`${this.$config.FRONT_API_URL}/api/v1/user/${user.phone}`, {
        name,
        personalData,
        PUSHNotifications,
        receiveAdvertisingInformation,
      });
    } catch (e) {
      console.log();
    }

    commit('resetState');
    commit('address/resetState', null, { root: true });
    await dispatch('setUser', user);
    dispatch('initUser');
  },

  async initLastOrder({ commit, getters }) {
    if (!getters.isAuth) { return; }
    const userId = getters.user.id;
    const lastOrder = await this.$axios.$get(`${this.$config.FRONT_API_URL}/api/v1/user/${userId}/last-order`);
    commit('setLastOrder', lastOrder);
  },
  async addLike({ commit, getters }, { product }) {
    if (!getters.isAuth) {
      return;
    }
    const userId = getters.user.id;

    try {
      await this.$axios.$post(`${this.$config.FRONT_API_URL}/api/v1/like`, {
        userId,
        productId: product.id,
      });

      commit('catalog/incrementLikes', product, { root: true });
    } catch (e) {
      if (e.response && e.response.status === 409) {
        errorMessage('Нельзя поставить лайк этому товару повторно');
      } else {
        console.log(e);
      }
    }
  },

  async removeLike({ commit, getters }, { product }) {
    if (!getters.isAuth) {
      return;
    }
    const userId = getters.user.id;

    try {
      await this.$axios.$delete(`${this.$config.FRONT_API_URL}/api/v1/like/${userId}/${product.id}`);

      commit('catalog/decrementLikes', product, { root: true });
    } catch (e) {
      errorMessage('Ошибка сервера. Попробуйте позже');
      console.log(e);
    }
  },
  async fetchUserHistory({ commit, getters, rootGetters }) {
    const phone = getters.userPhone;
    if (!phone) { return; }
    const userHistory = await this.$axios.$get(`${this.$config.FRONT_API_URL}/api/v1/user/${phone}/history`);
    if (!userHistory) { return; }

    userHistory.forEach((userHistoryItem) => {
      userHistoryItem.items.forEach((item) => {
        if (item.modifiers) {
          item.modifiers.forEach((mod) => {
            const product = rootGetters['catalog/productById'](mod.id);
            if (!product) { return; }
            if (product.price) {
              mod.sum = product.price * mod.amount;
            }
          });
        }
      });
    });

    commit('setUserHistory', userHistory);
  },

};
export const getters = {
  user: ({ user }) => user,
  id: ({ user }) => user.id,

  userPhone: ({ user }) => user.phone,
  userFormatPhone: ({ user }) => formatPhoneNumber(user.phone),
  zoneId: ({ user }) => user?.zoneId || 0,
  lastOrder: ({ lastOrder }) => lastOrder,
  hasLastOrder: ({ lastOrder }) => Object.keys(lastOrder || {}).length > 0,
  userHistory: ({ userHistory }) => userHistory,

  userName: ({ user }) => user.name || user.phone,
  isAuth: ({ user }) => !!user.phone,
  balance: ({ user }) => parseInt(user.balance, 10) || 0,
};
