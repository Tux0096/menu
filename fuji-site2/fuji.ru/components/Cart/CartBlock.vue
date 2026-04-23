<template>
  <div
    class="cart-block"
    @click="onHeaderCartClick"
  >
    <div
      v-if="popoverProduct"
      class="cart-block__popover"
    >
      <CartPopover :popover-product="popoverProduct" />
    </div>
    <div class="cart-block__icon-wrapper">
      <svg
        class="cart-block__icon"
      >
        <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#bag" />
      </svg>
      <ClientOnly>
        <div
          v-if="countItems"
          class="cart-block__qty"
        >
          {{ countItems }}
        </div>
      </ClientOnly>
    </div>

    <div class="cart-block__title">
      Корзина
    </div>
  </div>
</template>

<script>

export default {

  computed: {
    countItems() {
      return this.$store.getters['cart/countItems'] || 0;
    },
    cartItems() {
      return this.$store.getters['cart/cartItems'];
    },
    popoverProduct() {
      if (this.$store.state.cart.lastAddedProduct?.isHidden) {
        return false;
      }
      return this.$store.state.cart.lastAddedProduct?.product;
    },
  },
  methods: {
    onHeaderCartClick() {
      this.$router.push('/cart');
    },
  },
};
</script>

<style lang="scss"
       scoped
>
.cart-block {
  position: relative;
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  cursor: pointer;

  @media screen and (min-width: 768px) {
    flex-direction: row;
  }

  @media screen and (min-width: 1280px) {
    height: 42px;
    padding: 10px 20px;
    border-radius: 2000px;
    background: var(---Main-Purple, #993ca6);
    gap: 5px;
  }

  // .cart-block__icon-wrapper
  &__icon-wrapper {
    position: relative;

    @media screen and (min-width: 768px) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 54px;
      height: 40px;
    }

    @media screen and (min-width: 1280px) {
      order: 10;
      width: auto;
      height: auto;
    }

  }

  // .cart-block__icon
  &__icon {
    width: extClamp(30);
    height: extClamp(30);
    color: #fff;

    @media screen and (min-width: 768px) {
      width: 38px;
      height: 38px;
    }

    @media screen and (min-width: 1280px) {
      width: 24px;
      height: 24px;
      color: #fff;
    }
  }

  // .cart-block__qty
  &__qty {
    font-size: extClamp(9);
    font-weight: 400;
    font-style: normal;
    line-height: 120%;
    position: absolute;
    top: 0;
    right: extClampNegative(1);
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    width: extClamp(18);
    height: extClamp(18);
    margin-left: extClamp(3);
    text-align: center;
    color: var(---Main-White, #fff);
    border-radius: 50%;
    background-color: #993ca6;

    @media screen and (min-width: 768px) {
      font-size: 12px;
      line-height: 1;
      top: 0;
      right: -1px;
      bottom: auto;
      width: 24px;
      height: 24px;
      margin-left: 0;
      padding: 0;
      border-radius: 50%;

    }

    @media screen and (min-width: 1280px) {

      font-size: 9px;
      font-weight: 400;
      font-style: normal;
      line-height: 120%;
      position: absolute;
      top: initial;
      right: -6px;
      bottom: -2px;
      left: initial;
      display: flex;
      align-items: center;
      flex-direction: column;
      justify-content: center;
      width: 18px;
      height: 18px;
      padding: 0;
      text-align: center;
      color: var(---Main-Purple, #993ca6);
      border-radius: 50%;
      background: var(---Main-White, #fff);
    }
  }

  // .cart-block__title
  &__title {
    font-size: extClamp(8);
    font-weight: 400;
    line-height: normal;
    text-align: center;
    text-transform: uppercase;
    opacity: 0.5;
    color: var(---Main-White, #fff);

    @media screen and (min-width: 768px) {
      font-size: 11px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      font-weight: 600;
      line-height: 100%;
      text-align: center;
      text-transform: initial;
      opacity: 1;
      font-feature-settings: 'liga' off, 'clig' off;
    }

  }

  // .cart-block__popover
  &__popover {
    position: absolute;
    z-index: 10;
    right: -4px;
    bottom: calc(100% + extClamp(10));
    width: extClamp(223);

    @media screen and (min-width: 768px) {
      bottom: calc(100% + 10px);
    }

    @media screen and (min-width: 1280px) {
      top: calc(100% + extClamp(10));
      bottom: initial;
      width: max-content;
    }
  }

}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>
