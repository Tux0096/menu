import { nuxtInstance } from '~/plugins/nuxt-instance';

const processCart = (needGifts, qtyGiftInCart, giftId) => {
  if (needGifts > qtyGiftInCart) {
    const payload = { productId: giftId, mods: [], isGift: true };

    nuxtInstance.store.dispatch(
      'cart/addItem',
      payload,
    );
  }
  if (needGifts < qtyGiftInCart) {
    nuxtInstance.store.dispatch(
      'cart/removeItemById',
      giftId,
    );
  }
};

export const getProductQtyInCart = (cartItems, findItemId) => cartItems
  .filter((item) => item.product.id === findItemId)
  .reduce((acc, item) => acc + item.quantity, 0);

export const processPizzaGift = (cartItems) => {
  const qtyGiftInCart = getProductQtyInCart(
    cartItems,
    nuxtInstance.store.getters['setting/PIZZA_GIFT_ID'],
  );
  const pizzaSize40 = cartItems.filter((item) => item.mods.find((mod) => mod.name.includes('40')));
  const pizzaSize40Sale = pizzaSize40.filter((item) => item.product?.additionalInfo?.sale);
  const qtyPizzaSize40Sale = pizzaSize40Sale.length;
  const needGifts = Math.floor(qtyPizzaSize40Sale / 2);
  processCart(needGifts, qtyGiftInCart, nuxtInstance.store.getters['setting/PIZZA_GIFT_ID']);
};

export const processSnackGift = (cartItems) => {
  const qtyGiftInCart = getProductQtyInCart(
    cartItems,
    nuxtInstance.store.getters['setting/SNACK_GIFT_ID'],
  );

  const allSnacksCount = cartItems
    .filter(
      (item) => nuxtInstance.store.getters['setting/SNACKS_GROUP_ID'].includes(item.product.parentGroup)
        && item.product.additionalInfo?.sale !== false,
    )
    .reduce((acc, item) => acc + item.quantity, 0);
  const needGifts = Math.floor(allSnacksCount / 3);
  processCart(needGifts, qtyGiftInCart, nuxtInstance.store.getters['setting/SNACK_GIFT_ID']);
};

export const checkGifts = (cartItems) => {
  // clear cart if in cart only gifts
  const notGifts = cartItems.filter((i) => !i.isGift);
  const gifts = cartItems.filter((i) => i.isGift);
  if (!notGifts.length && gifts.length) {
    nuxtInstance.store.commit('cart/setItems', []);
  }

  // processPizzaGift(cartItems);
  processSnackGift(cartItems);
};
