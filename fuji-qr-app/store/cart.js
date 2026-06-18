import {
  // checkWorkTime, // временно: модалка рабочего времени
  getDeliveryIds,
  getFreeDeliveryIds,
} from '@/lib/common';
import { getPromoData, processCart } from '~/modules/cart/cart.service';
import {
  alignRemarkedLineTotalsToCart,
  enrichRemarkedItemsWithCatalog,
} from '~/modules/cart/remarked-pricing.js';
import {
  buildRemarkedOrderUpdatePayload,
  createRemarkedCartGuid,
  isRemarkedLoyaltyFeatureEnabled,
  postRemarkedOrderUpdate,
} from '~/modules/cart/remarked-loyalty.service';
import { nuxtInstance } from '~/plugins/nuxt-instance';

function stringifyMods(mods) {
  return JSON.stringify(mods.map((mod) => JSON.stringify(mod, Object.keys(mod)
    .sort()))
    .sort());
}

const SAUCE_SET_ID = '14aaf504-d43d-426e-a2e6-10afcff71212';
const NO_SAUCE_SET_ID = 'ae5ad3fd-6f01-4765-8fa0-ff1a9cfe1854';

/** Порций для блока соусов: одна позиция может давать несколько «роллов» (additionalInfo.countInSet). */
function rollPortionsForSauceLine(item) {
  const qty = Number(item.quantity || 0);
  const countInSetRaw = item.product?.additionalInfo?.countInSet;
  const countInSet = Number(countInSetRaw);
  const coeffRaw = item.product?.additionalInfo?.sauceBundleRollCoefficient;
  const sauceBundleRollCoefficient = Number(coeffRaw);
  const multiplier = Number.isFinite(sauceBundleRollCoefficient) && sauceBundleRollCoefficient > 0
    ? sauceBundleRollCoefficient
    : 1;
  if (countInSetRaw != null && countInSetRaw !== '' && Number.isFinite(countInSet) && countInSet > 0) {
    return qty * countInSet * multiplier;
  }
  return qty * multiplier;
}

const getDefaultState = () => ({
  items: [],

  spendBonus: 0,

  discountTotal: 0,

  deliveryTime: null,
  deliveryMethod: 'self',
  selectedRestaurant: null,
  isDeliveryTimeFetching: false,
  appliedCoupon: '',

  workTimeShownToday: null,

  lostGift: [],
  freeProducts: [],
  loyaltyProgramErrors: [],

  lastAddedProduct: null,

  /** Стабильный GUID «корзины» для Remarked Loyalty (order.update). */
  remarkedCartOrderGuid: null,
  /** Последний ответ POST .../remarked-loyalty/order/update */
  remarkedLoyaltyLastResponse: null,
  remarkedLoyaltyLastError: null,
});

export const state = () => ({
  ...getDefaultState(),

});

export const mutations = {
  resetState(state) {
    Object.assign(state, getDefaultState());
  },
  setItems(state, items) {
    state.items = items;
  },
  setSpendBonus(state, bonus) {
    state.spendBonus = bonus;
  },
  setDiscountTotal(state, discountTotal) {
    state.discountTotal = discountTotal;
  },
  setDeliveryTime(state, minutes) {
    state.deliveryTime = minutes;
  },
  setIsDeliveryTimeFetching(state, payload) {
    state.isDeliveryTimeFetching = payload;
  },
  setAppliedCoupon(state, coupon) {
    state.appliedCoupon = coupon;
  },
  setWorkTimeShownToday(state, payload) {
    state.workTimeShownToday = payload;
  },
  setLostGift(state, payload) {
    state.lostGift = payload;
  },
  setFreeProducts(state, payload) {
    state.freeProducts = payload;
  },
  setLoyaltyProgramErrors(state, payload) {
    state.loyaltyProgramErrors = payload;
  },
  setDeliveryMethod(state, payload) {
    state.deliveryMethod = payload;
  },
  setSelectedRestaurant(state, payload) {
    state.selectedRestaurant = payload;
  },

  setLastAddedProduct(state, payload) {
    state.lastAddedProduct = payload;
  },

  setRemarkedCartOrderGuid(state, guid) {
    state.remarkedCartOrderGuid = guid;
  },
  setRemarkedLoyaltyLastResponse(state, payload) {
    state.remarkedLoyaltyLastResponse = payload;
  },
  setRemarkedLoyaltyLastError(state, payload) {
    state.remarkedLoyaltyLastError = payload;
  },
  resetRemarkedLoyaltyState(state) {
    state.remarkedCartOrderGuid = null;
    state.remarkedLoyaltyLastResponse = null;
    state.remarkedLoyaltyLastError = null;
  },

};

export const actions = {

  async processCart({
    commit, getters, state, dispatch, rootGetters,
  }) {
    const isAuth = rootGetters['user/isAuth'];
    if (!isAuth) return;

    const { cartItems, orderIiko } = getters;
    if (cartItems.length === 0 || !orderIiko) return;

    let processedCartItems = [...cartItems];
    const deliveryIds = new Set(getDeliveryIds());
    const freeDeliveryIds = new Set(getFreeDeliveryIds());

    const promoData = await getPromoData(orderIiko);
    const freeDeliveryId = nuxtInstance.store.getters['city/freeDeliveryId'];
    const freeDelivery = nuxtInstance.store.getters['catalog/productById'](freeDeliveryId);
    const hasFreeDelivery = promoData.freeProducts.includes(freeDelivery?.code);

    processedCartItems = processedCartItems.filter(
      (cartItem) => {
        const { product } = cartItem;
        if (cartItem.fromPromocode) {
          return false;
        }
        return true;
      },
    );

    processedCartItems = processCart(processedCartItems, hasFreeDelivery);

    commit('setItems', processedCartItems);
    dispatch('setDiscountTotal', 0);
    dispatch('setLostGift', []);
    dispatch('setFreeProducts', promoData.freeProducts || []);

    await dispatch('syncRemarkedLoyaltyOrder');

    const promoStatusMessage = state.remarkedLoyaltyLastResponse?.order?.promocode_status?.message;
    const promoErrorMessage = state.remarkedLoyaltyLastError?.data?.message;
    const promoMessages = [promoStatusMessage, promoErrorMessage]
      .map((message) => (message == null ? '' : String(message).trim()))
      .filter(Boolean);
    dispatch('setLoyaltyProgramErrors', promoMessages);
  },

  /**
   * Синхронизация корзины с Remarked Loyalty (order/update на бэке).
   * Включается только при FEATURE_REMARKED_LOYALTY=true в runtime config.
   */
  async syncRemarkedLoyaltyOrder({
    commit, getters, state, rootGetters,
  }) {
    if (!isRemarkedLoyaltyFeatureEnabled()) {
      return;
    }
    if (!rootGetters['user/isAuth']) {
      return;
    }
    const { cartItems } = getters;
    if (!cartItems.length) {
      commit('resetRemarkedLoyaltyState');
      return;
    }

    let guid = state.remarkedCartOrderGuid;
    if (!guid) {
      guid = createRemarkedCartGuid();
      commit('setRemarkedCartOrderGuid', guid);
    }

    try {
      const payload = buildRemarkedOrderUpdatePayload({
        basket: cartItems,
        coupon: getters.appliedCoupon || '',
        remarkedCartOrderGuid: guid,
        cartTotal: getters.cartTotal,
      });
      const data = await postRemarkedOrderUpdate(payload);
      // eslint-disable-next-line no-console
      console.log('[Remarked Loyalty] order/update response:', data);
      const remarkedItems = data?.order?.items || [];
      const productById = rootGetters['catalog/productById'];
      remarkedItems.forEach((item, idx) => {
        const product = item?.product_guid ? productById(item.product_guid) : null;
        // eslint-disable-next-line no-console
        console.log(`[Remarked Loyalty] item #${idx + 1}`, {
          product_guid: item?.product_guid || null,
          price: item?.price ?? null,
          count: item?.count ?? null,
          gift: item?.gift ?? null,
          inCatalog: Boolean(product),
          catalogName: product?.name || null,
        });
      });
      commit('setRemarkedLoyaltyLastResponse', data);
      commit('setRemarkedLoyaltyLastError', null);

      // Синхронизация подарков из ответа Remarked с корзиной
      const remarkedGifts = remarkedItems.filter(
        (ri) => ri.gift === true && ri.product_guid,
      );
      const remarkedGiftGuids = new Set(remarkedGifts.map((g) => g.product_guid));
      const currentItems = [...getters.cartItems];

      let updated = currentItems.filter(
        (ci) => !ci.isGift || remarkedGiftGuids.has(ci.product.id),
      );

      for (const gift of remarkedGifts) {
        const alreadyInCart = updated.some(
          (ci) => ci.isGift && ci.product.id === gift.product_guid,
        );
        if (alreadyInCart) continue;

        const product = productById(gift.product_guid);
        if (!product) continue;

        updated.push({
          product: { ...product, isGift: true },
          quantity: gift.count || 1,
          mods: [],
          isGift: true,
          isServiceFee: false,
          isHidden: false,
          fromPromocode: false,
        });
      }

      if (
        updated.length !== currentItems.length
        || updated.some((item, i) => item !== currentItems[i])
      ) {
        commit('setItems', updated);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[Remarked Loyalty] order/update error:', e?.response?.data || e?.message || e);
      commit('setRemarkedLoyaltyLastError', {
        message: e?.message || 'Remarked Loyalty order/update error',
        status: e?.response?.status,
        data: e?.response?.data,
      });
    }
  },

  async setDeliveryMethod({ commit, dispatch }, payload) {
    commit('setDeliveryMethod', payload);
    await dispatch('processCart');
  },

  async setItems({
    commit, dispatch, rootGetters,
  }, payload) {
    let items = payload;

    // clear cart if in cart only gifts
    const notGiftsAndNotDelivery = items.filter(
      (i) => !i.isGift
        && i.product.id !== rootGetters['city/deliveryId']
        && i.product.id !== SAUCE_SET_ID
        && i.product.id !== NO_SAUCE_SET_ID,
    );
    if (notGiftsAndNotDelivery.length === 0) {
      items = [];
    }

    if (items.length === 0) {
      dispatch('setDiscountTotal', 0);
      commit('setItems', []);
      commit('resetRemarkedLoyaltyState');
      return;
    }

    commit('setItems', items);
    await dispatch('ensureSauceChoice');

    await dispatch('processCart');
  },

  async setSauceChoice({ dispatch, getters, rootGetters }, isSauceSetSelected) {
    const sauceSetQty = 1;
    const hadSauceSet = getters.isProductInCart(SAUCE_SET_ID);
    const baseItems = getters.cartItems.filter(
      (item) => item.product.id !== SAUCE_SET_ID && item.product.id !== NO_SAUCE_SET_ID,
    );
    const hasSauceSet = getters.isProductInCart(SAUCE_SET_ID);
    const hasNoSauceSet = getters.isProductInCart(NO_SAUCE_SET_ID);
    const currentSauceSetQty = getters.cartItems.find((item) => item.product.id === SAUCE_SET_ID)?.quantity || 0;
    const currentNoSauceSetQty = getters.cartItems.find((item) => item.product.id === NO_SAUCE_SET_ID)?.quantity || 0;

    if (!getters.hasRollItemsInCart) {
      if (baseItems.length !== getters.cartItems.length) {
        await dispatch('setItems', baseItems);
      }
      return;
    }

    if (
      isSauceSetSelected
      && hasSauceSet
      && !hasNoSauceSet
      && currentSauceSetQty === sauceSetQty
    ) {
      return;
    }

    if (
      !isSauceSetSelected
      && hasNoSauceSet
      && !hasSauceSet
      && currentNoSauceSetQty === sauceSetQty
    ) {
      return;
    }

    const productId = isSauceSetSelected ? SAUCE_SET_ID : NO_SAUCE_SET_ID;
    const product = rootGetters['catalog/productById'](productId);
    if (!product) {
      return;
    }

    await dispatch('setItems', [
      ...baseItems,
      {
        mods: [],
        product,
        quantity: sauceSetQty,
        isServiceFee: false,
        isHidden: false,
        fromPromocode: false,
        isGift: false,
      },
    ]);

    if (!isSauceSetSelected && hadSauceSet) {
      $nuxt.$notify({
        group: 'messages',
        type: 'info',
        title: 'ЭТО ВАЖНО!',
        text: 'Вы отказались от набора с соевым соусом, имбирем и васаби.',
      });
    }
  },

  async ensureSauceChoice({ getters, dispatch, rootGetters }) {
    const sauceSetQty = 1;
    const baseItems = getters.cartItems.filter(
      (item) => item.product.id !== SAUCE_SET_ID && item.product.id !== NO_SAUCE_SET_ID,
    );
    const hasSauceSet = getters.isProductInCart(SAUCE_SET_ID);
    const hasNoSauceSet = getters.isProductInCart(NO_SAUCE_SET_ID);

    if (!getters.hasRollItemsInCart) {
      if (baseItems.length !== getters.cartItems.length) {
        await dispatch('setItems', baseItems);
      }
      return;
    }

    const productById = rootGetters['catalog/productById'];
    if (!productById(SAUCE_SET_ID) || !productById(NO_SAUCE_SET_ID)) {
      return;
    }

    const currentSauceSetQty = getters.cartItems.find((item) => item.product.id === SAUCE_SET_ID)?.quantity || 0;
    const currentNoSauceSetQty = getters.cartItems.find((item) => item.product.id === NO_SAUCE_SET_ID)?.quantity || 0;
    const selectedSauceProductId = hasSauceSet || !hasNoSauceSet
      ? SAUCE_SET_ID
      : NO_SAUCE_SET_ID;

    if (
      !hasSauceSet
      && hasNoSauceSet
      && currentNoSauceSetQty === sauceSetQty
    ) {
      return;
    }

    if (
      hasSauceSet
      && !hasNoSauceSet
      && currentSauceSetQty === sauceSetQty
    ) {
      return;
    }

    await dispatch('setItems', [
      ...baseItems,
      {
        mods: [],
        product: productById(selectedSauceProductId),
        quantity: sauceSetQty,
        isServiceFee: false,
        isHidden: false,
        fromPromocode: false,
        isGift: false,
      },
    ]);
  },

  async setAppliedCoupon({ commit, dispatch }, coupon) {
    await dispatch('catalog/initCatalog', {}, { root: true });
    commit('setAppliedCoupon', coupon);
    await dispatch('processCart');
  },

  setDiscountTotal({ commit }, discountTotal) {
    const total = Number(discountTotal);
    commit('setDiscountTotal', Number.isNaN(total) ? 0 : total);
  },

  async validateCart({
    dispatch, rootGetters, commit, state,
  }) {
    await dispatch('catalog/initCatalog', {}, { root: true });
    const items = rootGetters['cart/cartItems'];

    const errorMessages = [];

    // remove items if product is not found in catalog
    const validateItems = items.filter((item) => {
      if (!item.product) { return false; }
      const { product: { id: productId, price }, mods } = item;
      const product = rootGetters['catalog/productById'](productId);
      if (!product) {
        errorMessages.push(`Товар "${item.product.name}" в данный момент отсутствует в каталоге и будет удален из корзины`);
        return false;
      }

      if (price !== product.price) {
        errorMessages.push(`Цена товара "${item.product.name}" изменилась и будет удален из корзины`);
        return false;
      }

      for (const mod of mods) {
        const foundMod = product.groupModifiers.find(
          (gm) => {
            const foundModInner = gm.modifiers
              .find((m) => mod.id === m.modifierId);
            // если цена мода поменялась, то удаляем его из корзины вместе с товаров
            return foundModInner && foundModInner.price === mod.price;
          },
        );

        if (!foundMod) {
          return false;
        }
      }
      return true;
    });
    if (errorMessages.length > 0) {
      const formattedErrorMessages = `<div class="modal-cart-items-error">${errorMessages
        .map((message) => `<p>${message}</p>`)
        .join('')}</div>`;

      const modalConfirmPayload = {
        title: '',
        cancelCallback: () => {
          nuxtInstance.store.commit('modal/hideModal');
        },
        cancelBtnTitle: 'Ок',
        content: formattedErrorMessages,
      };
      commit('modal/showConfirm', modalConfirmPayload, { root: true });
    }
    dispatch('setItems', validateItems);
  },

  initCart({
    dispatch, rootGetters, commit, state,
  }) {
    commit('setLastAddedProduct', null);

    dispatch('validateCart');

    const restaurants = rootGetters['setting/RESTAURANT_LIST'];
    const { selectedRestaurant } = state;
    const updatedRest = restaurants.find(
      (r) => r.deliveryTerminalId === selectedRestaurant?.deliveryTerminalId,
    );
    commit('setSelectedRestaurant', updatedRest || null);
  },

  async addItem({
    commit,
    dispatch,
    state,
    rootGetters,
    getters,
  }, payload) {
    const {
      productId,
      quantity = 1,
      mods = [],
      isGift,
      isServiceFee,
      fromPromocode,
      isHidden,
    } = payload;

    if (rootGetters['setting/IS_SITE_NOT_WORKING']) {
      commit(
        'modal/showNotWorkModal',
        { TEXT_SITE_NOT_WORKING: rootGetters['setting/TEXT_SITE_NOT_WORKING'] },
        { root: true },
      );
      return;
    }

    // Временно отключено: модалка рабочего времени и блокировка добавления в корзину
    // const workTime = checkWorkTime(rootGetters['setting/WORK_TIME']);
    // if (workTime !== true) {
    //   commit('modal/showWorkTimeModal', { workTime }, { root: true });
    //   return;
    // }

    let product = rootGetters['catalog/products'].find((el) => el.id
      === productId);

    if (!product) {
      return;
    }

    if (isGift) {
      product = { ...product };
      product.isGift = isGift;
    }

    if (product.groupModifiers.length && !mods.length) {
      commit('modal/showModsModal', { callback: () => product }, { root: true });
      return;
    }

    if (isGift) {
      product = { ...product };
    }

    const items = [...state.items];
    const idx = getters.indexProductInCart(productId, mods);

    const productData = {
      mods,
      product,
      quantity,
      isServiceFee,
      isHidden,
      fromPromocode,
      isGift: isGift || product.isGift || false,
    };

    if (idx === -1) {
      items.push(productData);
    } else if (productData.product?.maxPerPositionInOrder > 0) {
      // TODO: сейчас товары которые должны быть в разных позиция идут по одному
      // если в будущем товаров в позиции будет больше, то нужно доделать
      items.push(productData);
    } else {
      const needItem = { ...items[idx] };

      needItem.quantity += quantity;
      items[idx] = needItem;
    }
    dispatch('setItems', items);

    if (productData.product.id !== rootGetters['city/deliveryId']) {
      commit('setLastAddedProduct', productData);
      setTimeout(() => {
        commit('setLastAddedProduct', null);
      }, 1000);
    }

    if (!productData.isGift) {
      await dispatch('processCart');
    }

    if (rootGetters['tableSession/isActive']) {
      try {
        const session = await dispatch('tableSession/syncToIiko', null, { root: true });
        if (session) {
          commit('tableSession/setSession', session, { root: true });
        }
      } catch (e) {
        console.error('table sync:', e);
      }
    }

    // commit('modal/hideModal', null, { root: true });

    //
    // if (rootGetters['setting/PIZZAS_GROUP_ID'].includes(product.parentGroup)) {
    //   commit('modal/setIsModalPizzaSaleActive', true, { root: true });
    // }

    if (rootGetters['setting/SNACKS_GROUP_ID'].includes(product.parentGroup)
      && product.additionalInfo?.sale !== false) {
      commit('modal/showSnackGiftModal', true, { root: true });
    }
  },

  decreaseQtyByIndex({ state, dispatch }, idx) {
    const items = [...state.items];
    const needItem = { ...items[idx] };
    if (needItem.quantity <= 1) {
      dispatch('removeItemByIndex', idx);
      return;
    }
    needItem.quantity -= 1;
    items[idx] = needItem;
    dispatch('setItems', items);
  },

  removeItemByIndex({ state, dispatch }, idx) {
    const items = [...state.items];
    items.splice(idx, 1);
    dispatch('setItems', items);
  },

  decreaseQtyById({ state, dispatch }, productId) {
    const items = [...state.items];
    const idx = items
      .findIndex((el) => el.product.id === productId);
    const needItem = { ...items[idx] };
    if (needItem.quantity <= 1) {
      dispatch('removeItemById', productId);
      return;
    }
    needItem.quantity -= 1;
    items[idx] = needItem;
    dispatch('setItems', items);
  },

  removeItemById({ state, dispatch }, productId) {
    const items = [...state.items];
    const idx = items.findIndex((el) => el.product.id === productId);
    if (idx < 0) {
      return;
    }
    items.splice(idx, 1);
    dispatch('setItems', items);
  },

  setLostGift({ commit }, payload) {
    commit('setLostGift', payload);
  },

  setFreeProducts({ commit }, payload) {
    commit('setFreeProducts', payload);
  },

  setLoyaltyProgramErrors({ commit }, payload) {
    commit('setLoyaltyProgramErrors', payload);
  },

  async repeatOrder({ rootGetters, dispatch, commit }) {
    const lastOrder = rootGetters['user/lastOrder'];
    lastOrder.products.forEach((lastOrderProduct) => {
      const {
        productId, isGift, mods: modsLastOrder, amount, name: productName,
      } = lastOrderProduct;
      const product = rootGetters['catalog/productById'](productId);

      if (!product) {
        $nuxt.$notify({
          group: 'messages',
          type: 'error',
          text: 'Блюдо в данный момент отсутствует на сайте. Попробуйте добавить блюдо из каталога',
        });
        return;
      }

      const mods = [];
      for (const modLastOrder of modsLastOrder) {
        const mod = product.groupModifiers.find(
          (gm) => gm.modifiers.find((m) => modLastOrder.iikoId
            === m.modifierId),
        );
        if (!mod) {
          $nuxt.$notify({
            group: 'messages',
            type: 'error',
            text: 'Модификатор для блюда в данный момент отсутствует на сайте. Попробуйте добавить блюдо из каталога',
          });
          return;
        }
        mods.push({
          ...modLastOrder,
          ...mod,
          id: modLastOrder.iikoId,
        });
      }

      dispatch('addItem', {
        productId, isGift, mods, quantity: amount,
      });
    });
    commit('modal/hideModal', false, { root: true });
    await this.$router.push('cart');
  },

};
export const getters = {
  cartItems: ({ items }) => items,
  /**
   * Модель для отображения: оставляем структуру cart item,
   * но добавляем цену строки, рассчитанную по ответу Remarked (если есть).
   */
  cartItemsForDisplay: (state, getters) => {
    const aligned = getters.remarkedLoyaltyLineTotalsAlignedToCartItems;
    return getters.cartItems.map((item, idx) => {
      const price = aligned[idx];
      return {
        ...item,
        displayLinePrice: price != null ? price : null,
      };
    });
  },

  productsInCartIds: ({ items }) => items.map((i) => i.product.id),

  countItems: ({ items }, getters, rootState, rootGetters) => items.reduce((acc, item) => {
    if (item.product.id === rootGetters['city/deliveryId']) {
      return acc;
    }
    if (item.isHidden) {
      return acc;
    }
    return acc + item.quantity;
  }, 0),

  cartTotalMinusBonus: (state, getters) => getters.cartTotal
    - getters.spendBonus,

  cartTotalAfterDiscounts: (state, getters) => getters.cartTotal
    - getters.spendBonus
    - getters.discountTotal,

  cartTotal: ({ items }) => items.reduce((acc, el) => {
    const modsTotal = el.mods.reduce((acc, current) => acc + current.price
      * current.amount, 0);
    return acc + ((el.product.price + modsTotal) * el.quantity);
  }, 0),

  isDeliveryTimeFetching: ({ isDeliveryTimeFetching }) => isDeliveryTimeFetching,

  appliedCoupon: ({ appliedCoupon }) => appliedCoupon,

  isProductInCart: ({ items }) => (id, mods = []) => {
    const modsString = stringifyMods(mods);
    return items.findIndex(
      (el) => el.product.id === id && stringifyMods(el.mods) === modsString,
    ) !== -1;
  },

  indexProductInCart: ({ items }) => (id, mods = []) => {
    const modsString = stringifyMods(mods);
    return items.findIndex((el) => el.product.id === id
      && stringifyMods(el.mods) === modsString);
  },

  spendBonus: ({ spendBonus }) => spendBonus,

  discountTotal: ({ discountTotal }) => discountTotal,

  lostGift: ({ lostGift }) => lostGift,

  loyaltyProgramErrors: ({ loyaltyProgramErrors }) => loyaltyProgramErrors,

  remarkedCartOrderGuid: ({ remarkedCartOrderGuid }) => remarkedCartOrderGuid,

  remarkedLoyaltyLastResponse: ({ remarkedLoyaltyLastResponse }) => remarkedLoyaltyLastResponse,

  remarkedLoyaltyLastError: ({ remarkedLoyaltyLastError }) => remarkedLoyaltyLastError,

  /** Есть валидный ответ order/update с числовым order.sum (без ошибки синка). */
  remarkedLoyaltyHasValidPricing: (state) => {
    if (!isRemarkedLoyaltyFeatureEnabled()) {
      return false;
    }
    if (state.remarkedLoyaltyLastError) {
      return false;
    }
    const sum = state.remarkedLoyaltyLastResponse?.order?.sum;
    const n = Number(sum);
    return sum != null && sum !== '' && !Number.isNaN(n);
  },

  /**
   * Тест / отладка: позиции из последнего ответа Remarked + name/image из каталога по product_guid.
   */
  remarkedLoyaltyItemsEnriched: (state, getters, rootState, rootGetters) => {
    const items = state.remarkedLoyaltyLastResponse?.order?.items;
    return enrichRemarkedItemsWithCatalog(items, rootGetters['catalog/productById']);
  },

  /** Для каждого индекса cartItems — сумма строки из Remarked или null, если не сопоставилось. */
  remarkedLoyaltyLineTotalsAlignedToCartItems: (state, getters) => {
    if (!getters.remarkedLoyaltyHasValidPricing) {
      return [];
    }
    const remarkedItems = state.remarkedLoyaltyLastResponse?.order?.items;
    return alignRemarkedLineTotalsToCart(getters.cartItems, remarkedItems);
  },

  /** Итог заказа по Remarked минус выбранные к списанию бонусы (как в cartTotalAfterDiscounts без локальной discountTotal). */
  remarkedLoyaltyOrderSumForDisplay: (state, getters) => {
    if (!getters.remarkedLoyaltyHasValidPricing) {
      return null;
    }
    const sum = Number(state.remarkedLoyaltyLastResponse.order.sum);
    const afterBonus = sum - Number(getters.spendBonus || 0);
    return Math.max(0, afterBonus);
  },

  /** Итого к оплате: при активной цене Remarked — order.sum − бонусы, иначе прежняя формула. */
  cartTotalAfterDiscountsDisplayed: (state, getters) => {
    if (getters.remarkedLoyaltyHasValidPricing && getters.remarkedLoyaltyOrderSumForDisplay != null) {
      return Math.round(getters.remarkedLoyaltyOrderSumForDisplay);
    }
    return getters.cartTotalAfterDiscounts;
  },

  /** Сумма «товаров без подарков/доставки» для шапки: из строк Remarked, если доступно. */
  notGiftsAndNotDeliveryTotalDisplayed: (state, getters, rootState, rootGetters) => {
    if (!getters.remarkedLoyaltyHasValidPricing) {
      return getters.notGiftsAndNotDeliveryTotal;
    }
    const deliveryId = rootGetters['city/deliveryId'];
    const aligned = getters.remarkedLoyaltyLineTotalsAlignedToCartItems;
    let sum = 0;
    getters.cartItems.forEach((item, idx) => {
      if (
        item.isHidden
        || item.isGift
        || item.product.id === deliveryId
        || item.product.id === NO_SAUCE_SET_ID
      ) {
        return;
      }
      const t = aligned[idx];
      if (t != null) {
        sum += t;
      }
    });
    const rounded = Math.round(sum * 100) / 100;
    return rounded || getters.notGiftsAndNotDeliveryTotal;
  },

  notGiftsAndNotDelivery: ({ items }, getters, rootState, rootGetters) => items.filter(
    (i) => !i.isHidden && !i.isGift && i.product.id
      !== rootGetters['city/deliveryId']
      && i.product.id !== NO_SAUCE_SET_ID,
  ),

  hasRegularItemsInCart: ({ items }, getters, rootState, rootGetters) => items.some(
    (i) => !i.isHidden
      && !i.isGift
      && i.product.id !== rootGetters['city/deliveryId']
      && i.product.id !== SAUCE_SET_ID
      && i.product.id !== NO_SAUCE_SET_ID,
  ),

  rollGroupIds: (_state, _getters, _rootState, rootGetters) => {
    const catalogMenu = rootGetters['setting/CATALOG_MENU'] || [];
    const rollsCategory = catalogMenu.find((item) => item.name === 'Роллы');
    if (!rollsCategory) {
      return [];
    }
    const rollGroups = rollsCategory.children || [];
    return rollGroups.map((group) => group.id).filter(Boolean);
  },

  rollPortionsCount: ({ items }, getters, rootState, rootGetters) => {
    const deliveryId = rootGetters['city/deliveryId'];
    const rollGroupIdsSet = new Set(getters.rollGroupIds);

    return items.reduce((acc, item) => {
      if (item.isHidden || item.isGift || item.product.id === deliveryId) {
        return acc;
      }
      if (item.product.id === SAUCE_SET_ID || item.product.id === NO_SAUCE_SET_ID) {
        return acc;
      }
      const countInSetRaw = item.product?.additionalInfo?.countInSet;
      const countInSet = Number(countInSetRaw);
      const hasCountInSet = countInSetRaw != null
        && countInSetRaw !== ''
        && Number.isFinite(countInSet)
        && countInSet > 0;
      const isRollGroupItem = rollGroupIdsSet.has(item.product.parentGroup);

      if (!isRollGroupItem && !hasCountInSet) {
        return acc;
      }
      return acc + rollPortionsForSauceLine(item);
    }, 0);
  },

  hasRollItemsInCart: (_state, getters) => getters.rollPortionsCount > 0,

  isSauceSetSelected: ({ items }) => items.some((item) => item.product.id === SAUCE_SET_ID),

  notGiftsAndNotDeliveryTotal: (state, { notGiftsAndNotDelivery }) => notGiftsAndNotDelivery.reduce((acc, el) => {
    const modsTotal = el.mods.reduce((acc, current) => acc + current.price
      * current.amount, 0);
    return acc + ((el.product.price + modsTotal) * el.quantity);
  }, 0),

  orderIiko: (state, getters, rootState, rootGetters) => {
    const { cartItems } = getters;
    if (!cartItems.length) {
      return false;
    }

    const selectedAddress = rootGetters['address/selectedAddress'];

    return {
      coupon: getters.appliedCoupon,
      fullPrice: getters.cartTotal,
      notGiftsAndNotDeliveryTotal: getters.notGiftsAndNotDeliveryTotal,
      customer: {
        phone: rootGetters['user/userPhone'],
        name: rootGetters['user/userName'],
      },
      order: {
        phone: rootGetters['user/userPhone'],
        date: null,
        items: cartItems.map((item) => {
          const modifiers = item.mods.map((mod) => ({
            id: mod.id,
            name: mod.name,
            amount: mod.amount,
            sum: mod.price * mod.amount,
            code: mod.code,
            groupId: mod.groupId,
            groupName: mod.groupName,
          }));

          return {
            id: item.product.id,
            name: item.product.name,
            amount: item.quantity,
            sum: item.product.price * item.quantity,
            code: item.product.code,
            modifiers,
          };
        }),
        address: selectedAddress,
      },
    };
  },
};
