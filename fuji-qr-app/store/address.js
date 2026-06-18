const getDefaultState = () => ({
  addresses: [], selectedAddress: null,
});

export const state = () => ({
  ...getDefaultState(),

});

export const mutations = {
  resetState(state) {
    Object.assign(state, getDefaultState());
  },

  setAddresses(state, data) {
    state.addresses = data;
  },

  setSelectedAddress(state, selectedAddress) {
    state.selectedAddress = selectedAddress;
  },
};

export const actions = {
  async fetchAddressesForUser({ commit, getters, dispatch }, userId) {
    const { data: addresses } = await this.$axios(
      `${this.$config.FRONT_API_URL}/api/v1/address/by-user-id/${userId}`,
    );
    if (!addresses.length) { return; }
    commit('setAddresses', addresses);
    const firstAddress = addresses[0] || null;

    const { selectedAddress: savedSelectedAddress } = getters;

    if (!savedSelectedAddress) {
      dispatch('setSelectedAddress', firstAddress);
      return;
    }

    const selectedAddress = addresses.find((address) => address.id
      === savedSelectedAddress.id);
    if (!selectedAddress) {
      dispatch('setSelectedAddress', firstAddress);
      return;
    }

    dispatch('setSelectedAddress', selectedAddress);
  },

  async deleteAddress({ commit, dispatch, getters }, id) {
    try {
      await this.$axios.delete(`${this.$config.FRONT_API_URL}/api/v1/address/${id}`);
      const addresses = getters.addresses.filter((address) => address.id
        !== id);
      commit('setAddresses', addresses);

      const firstAddress = addresses[0];

      if (firstAddress) {
        dispatch('setSelectedAddress', firstAddress);
      } else {
        dispatch('setSelectedAddress', null);
      }
    } catch (e) {
      console.log(e);
    }
  },

  async createAddress({
    commit, getters, rootGetters, dispatch,
  }, address) {
    address.userId = rootGetters['user/id'];

    const { data: createdAddress } = await this.$axios.post(
      `${this.$config.FRONT_API_URL}/api/v1/address/`,
      address,
    );

    dispatch('setSelectedAddress', createdAddress);

    await dispatch('fetchAddressesForUser', rootGetters['user/id']);
  },

  async setSelectedAddress({ commit }, address) {
    commit('setSelectedAddress', address);
  },

};
export const getters = {
  addresses: ({ addresses }) => addresses,
  selectedAddress: ({ selectedAddress }) => selectedAddress,
  addressesByCity: ({ addresses }, getters, rootState) => addresses.filter(
    (item) => item.city === rootState.city.city.name,
  ),
};
