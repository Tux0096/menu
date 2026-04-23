<template>
  <div class="cart">
    <div
      v-if="items.length"
      class="cart__items"
    >
      <CartItem
        v-for="(item, idx) in items"
        :key="item.product.id + idx"
        :idx="idx"
        :item="item"
        class="cart__item"
      />

      <AppPromoCode
        v-if="!isPromocodeHide"
        class="cart__promo-code"
      />
    </div>
  </div>
</template>

<script>
export default {
  name: 'CartIndex',
  props: {
    items: {
      type: Array,
      default: () => ([]),
    },
  },
  computed: {
    isPromocodeHide() {
      return this.$store.getters['city/isPromocodeHide'];
    },

  },
};
</script>

<style lang="scss"
       scoped
>
.cart {

  // .cart__items
  &__items {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    gap: extClamp(8);

    @media screen and (min-width: 768px) {
      gap: 20px;
    }

    @media screen and (min-width: 1280px) {
      gap: 10px;
    }

  }

  // .cart__item
  &__item {
    width: 100%;
  }

  // .cart__promo-code
  &__promo-code {
    width: 100%;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      margin-top: 36px;
    }
  }
}
</style>
