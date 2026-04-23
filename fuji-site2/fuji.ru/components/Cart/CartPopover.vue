<template>
  <div class="cart-block-popover">
    <div class="cart-block-popover__image-wrapper">
      <nuxt-img
        v-if="popoverImage"
        :src="popoverImage"
        alt=""
        class="cart-block-popover__image"
        format="webp"

        quality="90"
        width="120"
      />
    </div>

    <div class="cart-block-popover__name">
      {{ popoverProduct.name }}
    </div>
    <div class="cart-block-popover__qty">
      +1
    </div>
  </div>
</template>

<script>
export default {
  name: 'CartPopover',
  props: {
    popoverProduct: {
      type: Object,
      default: () => ({}),
    },
  },
  data() {
    return {};
  },
  computed: {
    popoverImage() {
      return this.popoverProduct?.image;
    },

  },
};
</script>

<style lang="scss"
       scoped
>

.cart-block-popover {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: extClamp(223);
  padding: extClamp(4) extClamp(10) extClamp(4) extClamp(4);
  border: 2px solid #993ca6;
  border-radius: extClamp(10);
  background: #fff;
  gap: 5px;

  @media screen and (min-width: 768px) {
    max-width: 400px;
    padding: 10px 4px 4px 4px;
    border-radius: 20px;
  }

  @media screen and (min-width: 1280px) {
    max-width: 300px;
    padding: 6px 10px 6px 0;
  }

  &::after {
    position: absolute;
    right: extClamp(8);
    bottom: extClampNegative(10);
    display: block;
    width: extClamp(23);
    height: extClamp(10);
    content: '';
    background-image: url(~assets/images/icons/svg/dropdown-arrow.svg);
    background-repeat: no-repeat;
    background-size: contain;

    @media screen and (min-width: 768px) {
      right: 15px;
      bottom: -18px;
      width: 41px;
      height: 18px;
    }

    @media screen and (min-width: 1280px) {
      top: -10px;
      right: 21px;
      bottom: initial;
      width: 22px;
      height: 9px;
      transform: rotate(180deg);
    }

  }

  // .cart-block-popover__image-wrapper
  &__image-wrapper {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    justify-content: center;
    width: extClamp(43);
    max-height: extClamp(43);

    @media screen and (min-width: 768px) {
      width: 80px;
      height: 80px;
    }

    @media screen and (min-width: 1280px) {
      width: 42px;
      height: 42px;
    }

  }

  // .cart-block-popover__image
  &__image {

  }

  // .cart-block-popover__name
  &__name {
    font-size: extClamp(12);
    font-weight: 400;
    line-height: 120%;
    color: #993ca6;

    @media screen and (min-width: 768px) {
      font-size: 16px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 12px;
      line-height: 100%;
    }
  }

  // .cart-block-popover__qty
  &__qty {
    font-size: extClamp(12);
    font-weight: 400;
    font-style: normal;
    line-height: 140%;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    justify-content: center;
    width: extClamp(24);
    height: extClamp(24);
    margin-left: auto;
    text-align: center;
    color: #fff;
    border-radius: 50%;
    background-color: #993ca6;

    @media screen and (min-width: 768px) {
      font-size: 16px;
      width: 40px;
      height: 40px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 12px;
      width: 24px;
      height: 24px;
    }
  }
}
</style>
