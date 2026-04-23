import {
  checkWorkTime,
  getDeliveryIds,
  getFreeDeliveryIds,
} from '@/lib/common';
import { getPromoData, processCart } from '~/modules/cart/cart.service';
import { nuxtInstance } from '~/plugins/nuxt-instance';

function stringifyMods(mods) {
  return JSON.stringify(mods.map((mod) => JSON.stringify(mod, Object.keys(mod)
    .sort()))
    .sort());
}

const getDefaultState = () => ({
  items: [],

  spendBonus: 0,

  discountTotal: 0,

  deliveryTime: null,
  deliveryMethod: 'delivery',
  selectedRestaurant: null,
  isDeliveryTimeFetching: false,
  appliedCoupon: '',

  workTimeShownToday: null,

  lostGift: [],
  freeProducts: [],
  loyaltyProgramErrors: [],

  lastAddedProduct: null,
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

    const isDelivery = (id) => deliveryIds.has(id) || freeDeliveryIds.has(id);

    const promoData = await getPromoData(orderIiko);

    const freeDeliveryId = nuxtInstance.store.getters['city/freeDeliveryId'];
    const freeDelivery = nuxtInstance.store.getters['catalog/productById'](freeDeliveryId);
    const hasFreeDelivery = promoData.freeProducts.includes(freeDelivery?.code);

    processedCartItems = processedCartItems.filter(
      (cartItem) => {
        const { product } = cartItem;
        if (cartItem.fromPromocode) {
          return promoData.freeProducts.includes(product.code);
        }
        return true;
      },
    );

    const isProductInCart = (items, id) => items.some(
      (el) => el.product.id === id,
    );

    if (promoData.freeProducts.length) {
      const products = rootGetters['catalog/products']
        .filter((p) => promoData.freeProducts.includes(p.code));

      products.forEach((product) => {
        if (!isProductInCart(processedCartItems, product.id)) {
          const productData = {
            mods: [],
            product,
            quantity: 1,
            isServiceFee: false,
            isHidden: isDelivery(product.id),
            isGift: true,
            fromPromocode: true,
          };

          if (product.groupModifiers.length) {
            const productDataToModsModal = { ...product };
            productDataToModsModal.isGift = true;
            productDataToModsModal.fromPromocode = true;

            // Проверяем, относится ли продукт к группе, требующей выбора модификаторов в карточке
            if (rootGetters['setting/CUSTOM_ADD_TO_CART_GROUPS_ID'].includes(product.parentGroup)) {
              commit('modal/showCatalogDetailItem', { product: productDataToModsModal }, { root: true });
            } else {
              commit('modal/showModsModal', { callback: () => productDataToModsModal }, { root: true });
            }
          } else {
            processedCartItems = [...processedCartItems, productData];
          }
        }
      });
    }

    processedCartItems = processCart(processedCartItems, hasFreeDelivery);

    commit('setItems', processedCartItems);
    dispatch('setDiscountTotal', promoData.discountTotal);
    dispatch('setLostGift', promoData.lostGift);
    dispatch('setFreeProducts', promoData.freeProducts);
    dispatch('setLoyaltyProgramErrors', promoData.loyaltyProgramErrors);
  },

  async setDeliveryMethod({ commit, dispatch }, payload) {
    commit('setDeliveryMethod', payload);
    await dispatch('terminal/updateTerminalId', null, { root: true });
    await dispatch('processCart');
  },

  async setSelectedRestaurant({ commit, dispatch }, payload) {
    commit('setSelectedRestaurant', payload);
    await dispatch('terminal/updateTerminalId', null, { root: true });
    await dispatch('processCart');
  },

  async setItems({
    commit, dispatch, rootGetters,
  }, payload) {
    let items = payload;

    // clear cart if in cart only gifts
    const notGiftsAndNotDelivery = items.filter(
      (i) => !i.isGift && i.product.id !== rootGetters['city/deliveryId'],
    );
    if (notGiftsAndNotDelivery.length === 0) {
      items = [];
    }

    if (items.length === 0) {
      dispatch('setDiscountTotal', 0);
      commit('setItems', []);
      return;
    }

    commit('setItems', items);

    await dispatch('processCart');
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
    const updatedRest = restaurants?.find(
      (r) => r.terminalId === selectedRestaurant?.terminalId,
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

    const workTime = checkWorkTime(rootGetters['setting/WORK_TIME']);
    if (workTime !== true) {
      commit('modal/showWorkTimeModal', { workTime }, { root: true });
      return;
    }

    if (!rootGetters['user/isAuth'] && !rootGetters['terminal/isKioskMode']) {
      commit('modal/showAuthModal', null, { root: true });
    }

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
  selectedRestaurant: ({ selectedRestaurant }) => selectedRestaurant,
  deliveryMethod: ({ deliveryMethod }) => deliveryMethod,
  cartItems: ({ items }) => items,

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

  notGiftsAndNotDelivery: ({ items }, getters, rootState, rootGetters) => items.filter(
    (i) => !i.isHidden && !i.isGift && i.product.id
      !== rootGetters['city/deliveryId'],
  ),

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
