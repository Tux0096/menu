export const yaInit = () => {
  window.dataLayer = window.dataLayer || [];
};

export const yaSendOrderData = (data) => {
  const yBasket = [];

  data.basket.forEach((basketItem) => {
    let finalProductPrice = basketItem.product.price * basketItem.quantity;

    if (basketItem.mods.length > 0) {
      basketItem.mods.forEach((mod) => {
        finalProductPrice += mod.price * mod.amount * basketItem.quantity;
      });
    }

    yBasket.push({
      name: basketItem.product.name,
      price: finalProductPrice,
      quantity: basketItem.quantity,
    });
  });
  window.dataLayer.push({
    ecommerce: {
      purchase: {
        actionField: {
          id: Math.floor(Date.now() / 1000),
          goal_id: 66800437,
        },
        products: yBasket,
      },
    },
  });
};
