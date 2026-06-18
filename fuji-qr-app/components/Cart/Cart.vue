<template>
  <div class="cart">
    <div
      v-if="items.length"
      class="cart__items"
    >
      <CartItem
        v-for="(item, idx) in itemsWithoutSauceChoice"
        :key="item.product.id + idx"
        :idx="idx"
        :item="item"
        class="cart__item"
      />
      <CartSauceToggleBlock
        v-if="showSauceToggleBlock"
        class="cart__item"
      />
    </div>
  </div>
</template>

<script>
import CartSauceToggleBlock from '~/components/Cart/CartSauceToggleBlock.vue';

const SAUCE_SET_ID = '14aaf504-d43d-426e-a2e6-10afcff71212';
const NO_SAUCE_SET_ID = 'ae5ad3fd-6f01-4765-8fa0-ff1a9cfe1854';

export default {
  name: 'CartIndex',
  components: { CartSauceToggleBlock },
  props: {
    items: {
      type: Array,
      default: () => ([]),
    },
  },
  computed: {
    itemsWithoutSauceChoice() {
      return this.items.filter((item) => item.product.id !== SAUCE_SET_ID
        && item.product.id !== NO_SAUCE_SET_ID);
    },
    showSauceToggleBlock() {
      return this.$store.getters['cart/hasRollItemsInCart'];
    },
  },
  watch: {
    items: {
      handler() {
        this.ensureSauceChoice();
      },
      immediate: true,
    },
  },
  methods: {
    ensureSauceChoice() {
      this.$store.dispatch('cart/ensureSauceChoice');
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
}
</style>
