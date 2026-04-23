<template>
  <div class="cart-page-header">
    <div class="cart-page-header__inner">
      <div
        v-show="!isBackButtonHide"
        class="cart-page-header__close"
        @click="$emit('click')"
      >
        <svg class="cart-page-header__icon">
          <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#return-back" />
        </svg>
      </div>
      <div class="cart-page-header__title">
        <slot name="title" />
      </div>
      <div
        v-show="!isCloseButtonHide"
        :class="{'cart-page-close--fixed': isCloseButtonFixed}"
        class="cart-page-header__close-btn cart-page-close"
        @click="$emit('click')"
      >
        <div class="cart-page-close__text">
          Закрыть
        </div>
        <svg class="cart-page-close__icon">
          <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#delete" />
        </svg>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CheckoutHeader',
  props: {
    isCloseButtonFixed: {
      type: Boolean,
      default: false,
    },
    isCloseButtonHide: {
      type: Boolean,
      default: false,
    },
    isBackButtonHide: {
      type: Boolean,
      default: false,
    },
  },

};
</script>

<style lang="scss"
       scoped
>

.cart-page-header {
  position: relative;
  min-height: extClamp(50);
  padding-top: extClamp(16);
  padding-bottom: extClamp(16);

  @media screen and (min-width: 768px) {
    min-height: 0;
    padding-bottom: 0;
  }

  @media screen and (min-width: 1280px) {

  }

  &::after {
    position: absolute;
    right: extClampNegative(16);
    bottom: 0;
    left: extClampNegative(16);
    height: 1px;
    content: '';
    background-color: var(---Extra-LightGray, #e8e8e8);

    @media screen and (min-width: 768px) {
      display: none;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .cart-page-header__inner
  &__inner {
    display: flex;
    align-items: center;
    justify-content: center;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      justify-content: flex-start;
    }
  }

  // .cart-page-header__title
  &__title {
    font-size: extClamp(16);
    font-weight: 600;
    font-style: normal;
    line-height: 100%;
    text-align: center;
    color: var(---Main-Black, #292929);
    font-feature-settings: 'liga' off, 'clig' off;

    @media screen and (min-width: 768px) {
      font-size: 24px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 36px;
      font-weight: 600;
      line-height: 100%;
      font-feature-settings: 'liga' off, 'clig' off;
    }
  }

  // .cart-page-header__close-btn
  &__close-btn {
    display: flex;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      display: none;
    }
  }

  // .checkout-page__close
  &__close {
    position: absolute;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: extClamp(24);
    height: extClamp(24);

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      display: none;
    }

  }

  // .cart-page-header__icon
  &__icon {
    width: extClamp(18);
    height: extClamp(18);
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      width: 24px;
      height: 24px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}

.cart-page-close {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 50%;

  @media screen and (min-width: 768px) {

  }

  @media screen and (min-width: 1280px) {
    display: none;
  }

  // .cart-page-close--fixed
  &--fixed {
    position: fixed;
    z-index: 10;
    top: calc(var(--safe-area-inset-top, 0) + extClamp(16));
    right: 16px;
    transform: none;

    @media screen and (min-width: 768px) {
      top: 40px;
      right: 24px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .cart-page-close__text
  &__text {
    @include WebCaptionBold;
    display: none;

  }

  // .cart-page-close__icon
  &__icon {
    width: extClamp(18);
    height: extClamp(18);
    border-radius: 50%;

    @media screen and (min-width: 768px) {
      width: 24px;
      height: 24px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}

</style>
