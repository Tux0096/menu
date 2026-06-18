export const state = () => ({
  isActive: false,
  sessionId: null,
  restaurantSlug: null,
  restaurantName: null,
  restaurantAddress: null,
  tableNumber: null,
  iikoOrderId: null,
  status: null,
  paymentStatus: 'unpaid',
  orderTotal: 0,
  orderItems: [],
  aiSuggestions: [],
  aiLoading: false,
  welcomeShown: false,
  activeTab: 'welcome',
});

export const mutations = {
  setQrParams(state, { restaurantSlug, tableNumber }) {
    state.isActive = true;
    state.restaurantSlug = restaurantSlug;
    state.tableNumber = tableNumber;
  },
  setSession(state, payload) {
    state.isActive = true;
    state.sessionId = payload.sessionId;
    state.restaurantSlug = payload.restaurantSlug;
    state.restaurantName = payload.restaurantName;
    state.restaurantAddress = payload.restaurantAddress;
    state.tableNumber = payload.tableNumber;
    state.iikoOrderId = payload.iikoOrderId;
    state.status = payload.status;
    state.paymentStatus = payload.paymentStatus || 'unpaid';
    state.orderTotal = payload.total || 0;
    state.orderItems = payload.items || [];
  },
  setAiSuggestions(state, items) {
    state.aiSuggestions = items;
  },
  setAiLoading(state, v) {
    state.aiLoading = v;
  },
  setWelcomeShown(state, v) {
    state.welcomeShown = v;
  },
  setActiveTab(state, tab) {
    state.activeTab = tab;
  },
  reset(state) {
    Object.assign(state, {
      isActive: false,
      sessionId: null,
      restaurantSlug: null,
      restaurantName: null,
      restaurantAddress: null,
      tableNumber: null,
      iikoOrderId: null,
      status: null,
      paymentStatus: 'unpaid',
      orderTotal: 0,
      orderItems: [],
      aiSuggestions: [],
      aiLoading: false,
      welcomeShown: false,
      activeTab: 'welcome',
    });
  },
};

export const actions = {
  async enterTable({ state, commit, dispatch, rootGetters }) {
    if (!state.restaurantSlug || !state.tableNumber) return;

    const { data } = await this.$axios.post(
      `${this.$config.FRONT_API_URL}/api/v1/table/enter`,
      {
        restaurantSlug: state.restaurantSlug,
        tableNumber: state.tableNumber,
      },
    );
    commit('setSession', data);

    const restaurants = rootGetters['setting/RESTAURANT_LIST'] || [];
    const rest = restaurants.find((r) => r.slug === state.restaurantSlug);
    if (rest) {
      commit('cart/setSelectedRestaurant', rest, { root: true });
      commit('user/setIsAlreadySelectedCity', true, { root: true });
    }

    await dispatch('catalog/initCatalogForRestaurant', state.restaurantSlug, { root: true });
    await dispatch('hydrateCartFromSession', null, { root: false });
  },

  async hydrateCartFromSession({ state, rootGetters, dispatch }) {
    if (!state.orderItems?.length) return;
    const products = rootGetters['catalog/products'] || [];
    const items = state.orderItems.map((line) => {
      const product = products.find(
        (p) => p.id === line.productId || p.iikoId === line.iikoProductId,
      );
      if (!product) return null;
      return {
        product,
        quantity: line.quantity,
        mods: [],
        isGift: false,
        isServiceFee: false,
        isHidden: false,
        fromPromocode: false,
      };
    }).filter(Boolean);

    if (items.length) {
      await dispatch('cart/setItems', items, { root: true });
    }
  },

  async syncToIiko({ state, rootGetters }) {
    if (!state.sessionId) return null;

    const cartItems = rootGetters['cart/cartItems'] || [];
    const payload = cartItems.map(({ product, quantity }) => ({
      productId: product.id,
      iikoProductId: product.iikoId || product.id,
      name: product.name,
      price: product.price,
      quantity,
    }));

    const { data } = await this.$axios.post(
      `${this.$config.FRONT_API_URL}/api/v1/table-order/sync`,
      { sessionId: state.sessionId, items: payload },
    );
    commit('setSession', data);
    return data;
  },

  async fetchAiSuggestions({ state, commit }, query) {
    if (!state.restaurantSlug || !query?.trim()) return;
    commit('setAiLoading', true);
    try {
      const { data } = await this.$axios.post(
        `${this.$config.FRONT_API_URL}/api/v1/ai/suggest`,
        { restaurantSlug: state.restaurantSlug, query },
      );
      commit('setAiSuggestions', data.suggestions || []);
    } catch (e) {
      commit('setAiSuggestions', []);
    } finally {
      commit('setAiLoading', false);
    }
  },

  async payOrder({ state, commit }) {
    const { data } = await this.$axios.post(
      `${this.$config.FRONT_API_URL}/api/v1/table-order/pay`,
      { sessionId: state.sessionId },
    );
    commit('setSession', data);
    return data;
  },

  async reopenForMore({ state, commit }) {
    const { data } = await this.$axios.post(
      `${this.$config.FRONT_API_URL}/api/v1/table-order/reopen`,
      { sessionId: state.sessionId },
    );
    commit('setSession', data);
    return data;
  },

  async refreshSession({ state, commit }) {
    if (!state.sessionId) return;
    const { data } = await this.$axios.get(
      `${this.$config.FRONT_API_URL}/api/v1/table/session/${state.sessionId}`,
    );
    commit('setSession', data);
  },
};

export const getters = {
  isActive: (s) => s.isActive,
  isPaid: (s) => s.paymentStatus === 'paid',
  tableLabel: (s) => (s.tableNumber ? `Стол ${s.tableNumber}` : ''),
  restaurantLabel: (s) => s.restaurantName || s.restaurantAddress || '',
};
