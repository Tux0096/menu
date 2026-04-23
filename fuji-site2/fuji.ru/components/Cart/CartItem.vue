<template>
  <div
    v-if="product.id !== $store.getters['city/deliveryId'] && !item.isHidden"
    class="cart__item cart-item"
  >
    <div
      class="cart-item__image-wrapper"
      @click="openProduct(product)"
    >
      <nuxt-img
        :alt="item.name"
        :src="imagePath"
        format="webp"
        loading="lazy"
        quality="90"
        width="300"
      />
    </div>
    <div class="cart-item__inner">
      <div class="cart-item__header">
        <div class="cart-item__title">
          {{ product.name }}
        </div>
        <div
          v-if="mods.length"
          class="cart-item__description"
        >
          {{ mods }}
        </div>
      </div>

      <div
        v-if="!item.isGift"
        class="cart-item__footer"
      >
        <div class="cart-item__price">
          {{ totalItemPrice }}₽
        </div>
        <AppQty
          v-if="!item.isGift"
          :qty="item.quantity"
          class="cart-item__qty"
          @decrease="decrease(product)"
          @increase="onBuyButtonClick(product)"
        />
      </div>
    </div>
  </div>
</template>

<script>

import { mapGetters } from 'vuex';
import AppQty from '~/components/AppQty.vue';

export default {
  components: { AppQty },

  props: {
    item: {
      type: Object,
      required: true,
    },
    idx: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {};
  },
  computed: {
    ...mapGetters({
      CUSTOM_ADD_TO_CART_GROUPS_ID: 'setting/CUSTOM_ADD_TO_CART_GROUPS_ID',
    }),
    imagePath() {
      return this.product.image;
    },
    mods() {
      return this.item.mods.map((mod) => mod.name)
        .join(', ');
    },
    product() {
      const catalogProduct = this.$store.getters['catalog/productById'](this.item?.product?.id);
      if (catalogProduct) {
        return catalogProduct;
      }
      return this.item.product;
    },
    totalItemPrice() {
      const modSumPrice = this.item.mods.reduce((acc, el) => acc + el.price, 0);
      return ((this.product?.price || 0) + modSumPrice) * this.item.quantity;
    },

  },
  methods: {
    decrease() {
      this.$store.dispatch('cart/decreaseQtyByIndex', this.idx);
    },
    increase({ id: productId }) {
      this.$store.dispatch('cart/addItem', { productId });
    },
    openProduct(item) {
      if (this.item.isGift) { return; }
      const currentProductData = this.$store.getters['catalog/productById'](item.id);
      this.$store.commit('modal/showCatalogDetailItem', { product: currentProductData });
    },
    onBuyButtonClick(item) {
      if (this.CUSTOM_ADD_TO_CART_GROUPS_ID.includes(item.parentGroup) && item.groupModifiers.length > 0) {
        this.openProduct(item);
      } else {
        this.$store.dispatch('cart/addItem', { productId: item.id });
      }
    },
  },
};
</script>

<style lang="scss"
       scoped
>

.cart-item {
  display: flex;
  align-items: center;
  gap: extClamp(16);

  @media screen and (min-width: 768px) {
    gap: 16px;
  }

  @media screen and (min-width: 1280px) {
    gap: 10px;
  }

  // .cart-item__image-wrapper
  &__image-wrapper {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    justify-content: center;
    width: extClamp(124);
    height: extClamp(124);

    @media screen and (min-width: 768px) {
      width: 134px;
      height: 134px;
    }

    @media screen and (min-width: 1280px) {
      width: 250px;
      height: 250px;
    }
  }

  // .cart-item__image
  &__image {

  }

  // .cart-item__inner
  &__inner {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    flex-grow: 1;
    gap: extClamp(12);

    @media screen and (min-width: 768px) {
      gap: 16px;
    }

    @media screen and (min-width: 1280px) {
      gap: 36px;
    }
  }

  // .cart-item__header
  &__header {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    gap: extClamp(8);

    @media screen and (min-width: 768px) {
      gap: 8px;
    }

    @media screen and (min-width: 1280px) {
      gap: 16px;
    }
  }

  // .cart-item__title
  &__title {
    font-size: extClamp(14);
    font-weight: 600;
    font-style: normal;
    line-height: 100%;
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 24px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 20px;
      font-weight: 600;
      line-height: 100%;
    }
  }

  // .cart-item__description
  &__description {
    font-size: extClamp(8);
    font-weight: 400;
    font-style: normal;
    line-height: 120%;
    text-overflow: ellipsis;
    opacity: 0.6;
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 14px;
      font-weight: 500;;
    }

    @media screen and (min-width: 1280px) {
      font-size: 20px;
      font-weight: 600;
      line-height: 100%;

      color: var(---Main-Black, #292929);
    }
  }

  // .cart-item__footer
  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: extClamp(39);

    @media screen and (min-width: 768px) {
      min-height: 0;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .cart-item__price
  &__price {
    font-size: extClamp(12);
    font-weight: 600;
    font-style: normal;
    line-height: 120%;
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 20px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 24px;
    }
  }

  // .cart-item__qty
  &__qty {

  }
}
</style>
