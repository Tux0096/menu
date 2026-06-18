import { QR_RESTAURANT_SLUG } from '~/lib/qr-config';

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
  workflowStatus: 'browsing',
  guestCount: 1,
  orderTotal: 0,
  orderItems: [],
  canGuestRemoveItems: true,
  canGuestPay: false,
  aiSuggestions: [],
  aiLoading: false,
  aiLastQuery: '',
  orderSubmitting: false,
  showPaymentModal: false,
  showFeedbackModal: false,
  welcomeShown: false,
  activeTab: 'welcome',
  pollTimerId: null,
  cartSaveTimerId: null,
});

export const mutations = {
  setQrParams(state, { tableNumber }) {
    state.isActive = true;
    state.restaurantSlug = QR_RESTAURANT_SLUG;
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
    state.workflowStatus = payload.workflowStatus || 'browsing';
    state.guestCount = payload.guestCount || 1;
    state.orderTotal = payload.total || 0;
    state.orderItems = payload.items || [];
    state.canGuestRemoveItems = payload.canGuestRemoveItems !== false;
    state.canGuestPay = Boolean(payload.canGuestPay);
  },
  setAiSuggestions(state, items) { state.aiSuggestions = items; },
  setAiLoading(state, v) { state.aiLoading = v; },
  setAiLastQuery(state, query) { state.aiLastQuery = query; },
  setOrderSubmitting(state, v) { state.orderSubmitting = v; },
  setShowPaymentModal(state, v) { state.showPaymentModal = v; },
  setShowFeedbackModal(state, v) { state.showFeedbackModal = v; },
  setWelcomeShown(state, v) { state.welcomeShown = v; },
  setActiveTab(state, tab) { state.activeTab = tab; },
  setPollTimerId(state, id) { state.pollTimerId = id; },
  setCartSaveTimerId(state, id) { state.cartSaveTimerId = id; },
  reset(state) {
    if (state.pollTimerId) clearInterval(state.pollTimerId);
    if (state.cartSaveTimerId) clearTimeout(state.cartSaveTimerId);
    Object.assign(state, {
      isActive: false, sessionId: null, restaurantSlug: null, restaurantName: null,
      restaurantAddress: null, tableNumber: null, iikoOrderId: null, status: null,
      paymentStatus: 'unpaid', workflowStatus: 'browsing', guestCount: 1, orderTotal: 0,
      orderItems: [], canGuestRemoveItems: true, canGuestPay: false, aiSuggestions: [],
      aiLoading: false, aiLastQuery: '', orderSubmitting: false, showPaymentModal: false,
      showFeedbackModal: false, welcomeShown: false, activeTab: 'welcome',
      pollTimerId: null, cartSaveTimerId: null,
    });
  },
};

function cartPayload(rootGetters) {
  return (rootGetters['cart/cartItems'] || []).map(({ product, quantity }) => ({
    productId: product.id,
    iikoProductId: product.iikoId || product.id,
    name: product.name,
    price: product.price,
    quantity,
  }));
}

export const actions = {
  async enterTable({ state, commit, dispatch, rootGetters }) {
    if (!state.restaurantSlug || !state.tableNumber) return;
    const { data } = await this.$axios.post(
      `${this.$config.FRONT_API_URL}/api/v1/table/enter`,
      { restaurantSlug: state.restaurantSlug, tableNumber: state.tableNumber },
    );
    commit('setSession', data);
    const restaurants = rootGetters['setting/RESTAURANT_LIST'] || [];
    const rest = restaurants.find((r) => r.slug === QR_RESTAURANT_SLUG);
    if (rest) {
      commit('cart/setSelectedRestaurant', rest, { root: true });
      commit('user/setIsAlreadySelectedCity', true, { root: true });
    }
    await dispatch('catalog/initCatalogForRestaurant', QR_RESTAURANT_SLUG, { root: true });
    await dispatch('hydrateCartFromSession', null, { root: false });
    dispatch('startSessionPolling');
  },

  async hydrateCartFromSession({ state, rootGetters, dispatch }) {
    if (!state.orderItems?.length) return;
    const products = rootGetters['catalog/products'] || [];
    const items = state.orderItems.map((line) => {
      const product = products.find(
        (p) => p.id === line.productId || p.iikoId === line.iikoProductId,
      );
      if (!product) {
        return {
          product: {
            id: line.productId || line.iikoProductId,
            iikoId: line.iikoProductId,
            name: line.name,
            price: line.price,
          },
          quantity: line.quantity,
          mods: [], isGift: false, isServiceFee: false, isHidden: false, fromPromocode: false,
          isLocked: line.isLocked,
        };
      }
      return {
        product, quantity: line.quantity,
        mods: [], isGift: false, isServiceFee: false, isHidden: false, fromPromocode: false,
        isLocked: line.isLocked,
      };
    }).filter(Boolean);
    if (items.length) await dispatch('cart/setItems', items, { root: true });
  },

  async trackActivity({ state, commit }) {
    if (!state.sessionId) return;
    try {
      const { data } = await this.$axios.post(
        `${this.$config.FRONT_API_URL}/api/v1/table/activity`,
        { sessionId: state.sessionId },
      );
      commit('setSession', data);
    } catch (e) { /* ignore */ }
  },

  scheduleCartSave({ state, commit, dispatch }) {
    if (!state.sessionId) return;
    if (state.cartSaveTimerId) clearTimeout(state.cartSaveTimerId);
    const id = setTimeout(() => dispatch('saveGuestCart'), 800);
    commit('setCartSaveTimerId', id);
  },

  async saveGuestCart({ state, commit, rootGetters }) {
    if (!state.sessionId) return;
    try {
      const { data } = await this.$axios.post(
        `${this.$config.FRONT_API_URL}/api/v1/table-order/cart`,
        { sessionId: state.sessionId, items: cartPayload(rootGetters) },
      );
      commit('setSession', data);
    } catch (e) {
      if (e.response?.status === 403) {
        this._vm?.$notify?.({ group: 'messages', type: 'error', text: e.response.data.error });
      }
    }
  },

  async submitToWaiter({ state, commit, rootGetters }) {
    if (!state.sessionId) return null;
    commit('setOrderSubmitting', true);
    try {
      const { data } = await this.$axios.post(
        `${this.$config.FRONT_API_URL}/api/v1/table/submit-to-waiter`,
        { sessionId: state.sessionId, items: cartPayload(rootGetters) },
      );
      commit('setSession', data);
      return data;
    } finally {
      commit('setOrderSubmitting', false);
    }
  },

  async fetchWelcomeSuggestions({ commit }) {
    commit('setAiLoading', true);
    try {
      const { data } = await this.$axios.get(
        `${this.$config.FRONT_API_URL}/api/v1/ai/welcome`,
        { timeout: 10000 },
      );
      commit('setAiSuggestions', data.suggestions || []);
    } catch (e) {
      commit('setAiSuggestions', []);
    } finally {
      commit('setAiLoading', false);
    }
  },

  async fetchAiSuggestions({ state, commit }, query) {
    if (!state.restaurantSlug || !query?.trim()) return;
    commit('setAiLoading', true);
    commit('setAiLastQuery', query.trim());
    try {
      const { data } = await this.$axios.post(
        `${this.$config.FRONT_API_URL}/api/v1/ai/suggest`,
        { restaurantSlug: state.restaurantSlug, query: query.trim() },
        { timeout: 12000 },
      );
      commit('setAiSuggestions', data.suggestions || []);
    } catch (e) {
      commit('setAiSuggestions', []);
      this._vm?.$notify?.({
        group: 'messages',
        type: 'error',
        text: 'Не удалось подобрать блюда — попробуйте другой запрос',
      });
    } finally {
      commit('setAiLoading', false);
    }
  },

  async logAiFeedback({ state }, { productId, action = 'add' }) {
    if (!state.aiLastQuery || !productId) return;
    try {
      await this.$axios.post(`${this.$config.FRONT_API_URL}/api/v1/ai/feedback`, {
        query: state.aiLastQuery, productId, action,
      });
    } catch (e) { /* ignore */ }
  },

  async callWaiter({ state }, reason = 'general') {
    if (!state.sessionId) return null;
    const { data } = await this.$axios.post(
      `${this.$config.FRONT_API_URL}/api/v1/table/call-waiter`,
      { sessionId: state.sessionId, reason },
    );
    return data;
  },

  async guestPay({ state, commit }, { method, tipAmount }) {
    const { data } = await this.$axios.post(
      `${this.$config.FRONT_API_URL}/api/v1/table/guest-pay`,
      { sessionId: state.sessionId, method, tipAmount },
    );
    commit('setSession', data);
    commit('setShowPaymentModal', false);
    commit('setShowFeedbackModal', true);
    return data;
  },

  async submitFeedback({ state, commit }, { rating, comment }) {
    await this.$axios.post(`${this.$config.FRONT_API_URL}/api/v1/table/feedback`, {
      sessionId: state.sessionId, rating, comment,
    });
    commit('setShowFeedbackModal', false);
  },

  async refreshSession({ state, commit, dispatch }) {
    if (!state.sessionId) return;
    const { data } = await this.$axios.get(
      `${this.$config.FRONT_API_URL}/api/v1/table/session/${state.sessionId}`,
    );
    commit('setSession', data);
    await dispatch('syncCartLocks');
    return data;
  },

  async syncCartLocks({ state, rootGetters, dispatch }) {
    if (!state.orderItems?.length) return;
    const cartItems = rootGetters['cart/cartItems'] || [];
    if (!cartItems.length) return;
    const lockMap = new Map(
      state.orderItems.map((i) => [String(i.iikoProductId || i.productId), i.isLocked]),
    );
    let changed = false;
    const next = cartItems.map((item) => {
      const key = String(item.product?.iikoId || item.product?.id);
      const isLocked = lockMap.get(key);
      if (isLocked != null && item.isLocked !== isLocked) {
        changed = true;
        return { ...item, isLocked };
      }
      return item;
    });
    if (changed) await dispatch('cart/setItems', next, { root: true });
  },

  startSessionPolling({ state, commit, dispatch }) {
    if (state.pollTimerId || !state.sessionId) return;
    const id = setInterval(() => {
      if (state.sessionId) dispatch('refreshSession');
    }, 20000);
    commit('setPollTimerId', id);
  },

  stopSessionPolling({ state, commit }) {
    if (state.pollTimerId) {
      clearInterval(state.pollTimerId);
      commit('setPollTimerId', null);
    }
  },
};

export const getters = {
  isActive: (s) => s.isActive,
  isPaid: (s) => s.paymentStatus === 'paid' || s.workflowStatus === 'paid',
  isOrderClosed: (s) => s.status === 'closed' || s.workflowStatus === 'paid',
  hasIikoOrder: (s) => Boolean(s.iikoOrderId),
  isInProduction: (s) => ['in_production', 'reorder_pending'].includes(s.workflowStatus),
  isCartReady: (s) => ['cart_ready', 'waiter_review'].includes(s.workflowStatus),
  isAwaitingWaiter: (s) => s.workflowStatus === 'cart_ready',
  canGuestRemoveItems: (s) => s.canGuestRemoveItems,
  canGuestPay: (s) => s.canGuestPay,
  tableLabel: (s) => (s.tableNumber ? `Стол ${s.tableNumber}` : ''),
  restaurantLabel: (s) => s.restaurantName || s.restaurantAddress || '',
  workflowLabel: (s) => {
    const map = {
      browsing: 'Изучает меню',
      building_cart: 'Выбирает блюда',
      cart_ready: 'Ждёт официанта',
      waiter_review: 'Официант уточняет заказ',
      in_production: 'На кухне',
      reorder_pending: 'Дозаказ — ждёт официанта',
      paid: 'Оплачено',
    };
    return map[s.workflowStatus] || s.workflowStatus;
  },
};
