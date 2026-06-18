import { processDelivery } from '~/lib/common';
import { nuxtInstance } from '~/plugins/nuxt-instance';

export const processCart = (cartItems, hasFreeDelivery: boolean) => {
  // delivery
  const isSelfDelivery = nuxtInstance.store.state.cart.deliveryMethod === 'self';
  const deliveryId = nuxtInstance.store.getters['city/deliveryId'];
  const delivery = nuxtInstance.store.getters['catalog/productById'](deliveryId);

  const processedCartItems = processDelivery({
    cartItems,
    isSelfDelivery,
    deliveryId,
    hasFreeDelivery,
    delivery,
  });

  return processedCartItems;
};

export const getPromoData = async (orderRequest) => nuxtInstance.$axios
  .$post(
    `${nuxtInstance.$config.FRONT_API_URL}/api/v1/promo`,
    orderRequest,
  );
