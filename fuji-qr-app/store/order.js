const getDefaultState = () => ({
  activeOrder: null,
  orderHistory: [],
  isLoadingActiveOrder: false,
  lastStatusUpdate: null,
});

export const state = getDefaultState;

export const mutations = {
  setActiveOrder(state, order) {
    state.activeOrder = order;
  },

  clearActiveOrder(state) {
    state.activeOrder = null;
  },

  setLoadingActiveOrder(state, isLoading) {
    state.isLoadingActiveOrder = isLoading;
  },

  updateOrderStatus(state, { status, courierInfo }) {
    if (state.activeOrder?.delivery) {
      state.activeOrder.delivery.status = status;
      if (courierInfo) {
        state.activeOrder.delivery.courierInfo = courierInfo;
      }
      state.lastStatusUpdate = new Date().toISOString();
    }
  },

  setOrderHistory(state, history) {
    state.orderHistory = history;
  },

  resetState(state) {
    Object.assign(state, getDefaultState());
  },
};

export const actions = {
  async loadActiveOrder({ commit, rootGetters }) {
    if (!rootGetters['user/isAuth']) {
      commit('clearActiveOrder');
      return;
    }

    commit('setLoadingActiveOrder', true);

    try {
      const userId = rootGetters['user/id'];
      const response = await this.$axios.get(`${this.$config.FRONT_API_URL}/api/v1/user/${userId}/active-order`);
      commit('setActiveOrder', response.data);
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Ошибка загрузки активного заказа:', error);
      }
      commit('clearActiveOrder');
    } finally {
      commit('setLoadingActiveOrder', false);
    }
  },

  async refreshActiveOrder({ dispatch }) {
    await dispatch('loadActiveOrder');
  },

  async handleStatusUpdate({ commit, state, dispatch }, { status, courierInfo }) {
    await dispatch('refreshActiveOrder');
    if (state.activeOrder) {
      commit('updateOrderStatus', { status, courierInfo });
      // Если заказ завершен, очищаем через 10 секунд
      if (['Closed', 'Cancelled'].includes(status)) {
        setTimeout(() => {
          commit('clearActiveOrder');
        }, 10000);
      }
    }
  },

  clearOrder({ commit }) {
    commit('clearActiveOrder');
  },
};

export const getters = {
  activeOrder: (state) => state.activeOrder,
  hasActiveOrder: (state) => !!state.activeOrder,
  isLoadingActiveOrder: (state) => state.isLoadingActiveOrder,
  orderHistory: (state) => state.orderHistory,
  lastStatusUpdate: (state) => state.lastStatusUpdate,

  currentDeliveryStatus: (state) => state.activeOrder?.delivery?.status || null,

  isOrderCompleted: (state) => {
    const status = state.activeOrder?.delivery?.status;
    return status && ['Closed', 'Cancelled'].includes(status);
  },

  courierInfo: (state) => state.activeOrder?.delivery?.courierInfo || null,

  estimatedDeliveryTime: (state) => state.activeOrder?.delivery?.estimatedDeliveryTime
    || null,
};
