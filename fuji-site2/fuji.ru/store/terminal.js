export const state = () => ({
  terminalId: null,
  isKioskMode: false,
});

export const mutations = {
  setTerminalId(state, terminalId) {
    state.terminalId = terminalId;
    if (process.client && this.$cookies) {
      if (terminalId) {
        this.$cookies.set('terminalId', terminalId, {
          maxAge: 60 * 60 * 24 * 30,
          sameSite: 'lax',
        });
      } else {
        this.$cookies.remove('terminalId');
      }
    }
  },

  setKioskMode(state, value) {
    state.isKioskMode = value;
    if (process.client && this.$cookies) {
      if (value) {
        this.$cookies.set('isKioskMode', '1', {
          maxAge: 60 * 60 * 24 * 30,
          sameSite: 'lax',
        });
      } else {
        this.$cookies.remove('isKioskMode');
      }
    }
  },
};

export const actions = {
  async initTerminalId({ commit, getters, rootGetters, dispatch }) {
    if (process.client) {
      const isKioskMode = this.$cookies.get('isKioskMode');
      if (isKioskMode) {
        commit('setKioskMode', true);
      }

      const savedTerminalId = this.$cookies.get('terminalId');
      if (savedTerminalId) {
        commit('setTerminalId', savedTerminalId);

        if (isKioskMode) {
          const restaurants = rootGetters['setting/RESTAURANT_LIST'];
          if (restaurants && restaurants.length) {
            const restaurant = restaurants.find((r) => r.terminalId === savedTerminalId);
            if (restaurant) {
              const currentRestaurant = rootGetters['cart/selectedRestaurant'];
              if (!currentRestaurant || currentRestaurant.terminalId !== savedTerminalId) {
                await dispatch('cart/setDeliveryMethod', 'self', { root: true });
                await dispatch('cart/setSelectedRestaurant', restaurant, { root: true });
              }
            }
          }
          await dispatch('catalog/initCatalog', null, { root: true });
        }
        return;
      }
    }

    dispatch('updateTerminalId');
  },

  async updateTerminalId({ commit, rootGetters, dispatch }) {
    const deliveryMethod = rootGetters['cart/deliveryMethod'];
    let newTerminalId = null;

    if (deliveryMethod === 'self') {
      const selectedRestaurant = rootGetters['cart/selectedRestaurant'];
      newTerminalId = selectedRestaurant?.terminalId || null;
    } else {
      const selectedAddress = rootGetters['address/selectedAddress'];
      if (selectedAddress?.zoneId) {
        const zones = rootGetters['setting/ZONES_BY_CITY_ID'];
        const zone = zones.mapZones.find((z) => z.zoneId === selectedAddress.zoneId);
        newTerminalId = zone?.terminalId || null;
      }
    }

    commit('setTerminalId', newTerminalId);

    await dispatch('catalog/initCatalog', null, { root: true });
    await dispatch('cart/initCart', null, { root: true });
  },

  async initKioskMode({ commit, dispatch, rootGetters }, terminalId) {
    commit('setKioskMode', true);
    commit('setTerminalId', terminalId);

    const restaurants = rootGetters['setting/RESTAURANT_LIST'];
    if (restaurants) {
      const restaurant = restaurants.find((r) => r.terminalId === terminalId);
      if (restaurant) {
        await dispatch('cart/setDeliveryMethod', 'self', { root: true });
        await dispatch('cart/setSelectedRestaurant', restaurant, { root: true });
      }
    }

    await dispatch('catalog/initCatalog', null, { root: true });
  },

  exitKioskMode({ commit, dispatch }) {
    commit('setKioskMode', false);
    commit('setTerminalId', null);
    if (process.client && this.$cookies) {
      this.$cookies.remove('terminalId');
      this.$cookies.remove('isKioskMode');
    }
  },
};

export const getters = {
  terminalId: ({ terminalId }) => terminalId,
  isKioskMode: ({ isKioskMode }) => isKioskMode,
};
