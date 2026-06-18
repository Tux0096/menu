<template>
  <div
    v-if="displayProduct"
    class="cart-item cart-sauce-toggle"
  >
    <div
      :class="{ 'cart-sauce-toggle__image-wrapper--active': isSauceSetSelected }"
      class="cart-item__image-wrapper cart-sauce-toggle__image-wrapper"
    >
      <nuxt-img
        :alt="displayProduct.name"
        :src="displayProduct.image"
        class="cart-sauce-toggle__image"
        format="webp"
        loading="lazy"
        quality="90"
        width="300"
      />
    </div>
    <div class="cart-item__inner">
      <div class="cart-item__header">
        <div class="cart-item__title">
          {{ displayProduct.name }}
        </div>
        <div class="cart-item__description">
          Соевый соус - {{ soySauceQty }} шт.<br>
          Васаби - {{ wasabiGrams }} гр.<br>
          Имбирь - {{ gingerGrams }} гр.
        </div>
      </div>
      <div class="cart-item__footer">
        <div class="cart-item__price">
          {{ displayProduct.price }}₽
        </div>
        <BaseSwitch
          :value="isSauceSetSelected"
          class="cart-item__qty"
          @input="onToggle"
        />
      </div>
    </div>
  </div>
</template>

<script>
const SAUCE_SET_ID = '14aaf504-d43d-426e-a2e6-10afcff71212';

export default {
  name: 'CartSauceToggleBlock',
  computed: {
    displayProduct() {
      return this.$store.getters['catalog/productById'](SAUCE_SET_ID);
    },
    rollPortionsCount() {
      return this.$store.getters['cart/rollPortionsCount'];
    },
    soySauceQty() {
      return Math.ceil(this.rollPortionsCount * 0.76);
    },
    wasabiGrams() {
      return this.rollPortionsCount * 7;
    },
    gingerGrams() {
      return this.rollPortionsCount * 10;
    },
    isSauceSetSelected() {
      return this.$store.getters['cart/isSauceSetSelected'];
    },
  },
  methods: {
    onToggle(value) {
      this.$store.dispatch('cart/setSauceChoice', value);
    },
  },
};
</script>

<style lang="scss"
       scoped
>
.cart-sauce-toggle {
  display: flex;
  align-items: center;
  gap: extClamp(16);

  @media screen and (min-width: 768px) {
    gap: 16px;
  }

  @media screen and (min-width: 1280px) {
    gap: 10px;
  }

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

  &__image {
    display: block;
  }

  &__image-wrapper::v-deep img {
    opacity: 0.25;
    transition: opacity 0.2s ease;
  }

  &__image-wrapper--active::v-deep img {
    opacity: 1;
  }

  .cart-item__inner {
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

  .cart-item__header {
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

  .cart-item__title {
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

  .cart-item__description {
    font-size: extClamp(8);
    font-weight: 400;
    font-style: normal;
    line-height: 120%;
    text-overflow: ellipsis;
    opacity: 0.6;
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 14px;
      font-weight: 500;
    }

    @media screen and (min-width: 1280px) {
      font-size: 20px;
      font-weight: 600;
      line-height: 100%;
      color: var(---Main-Black, #292929);
    }
  }

  .cart-item__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: extClamp(39);

    @media screen and (min-width: 768px) {
      min-height: 0;
    }
  }

  .cart-item__price {
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
}
</style>
