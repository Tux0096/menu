<template>
  <article
    class="additional-item"
  >
    <div
      class="additional-item__image-wrapper"
      @click="openProduct()"
    >
      <nuxt-img
        :alt="item.name"
        :src="item.image"
        :title="item.name"
        class="additional-item__image"
        format="webp"
        loading="lazy"
        quality="90"
        width="180"
      />
    </div>
    <div class="additional-item__content">
      <h3
        class="additional-item__title"
      >
        {{ item.name }}
      </h3>

      <footer class="additional-item__footer">
        <div class="additional-item__price">
          {{ price }}<span class="rub">р</span>
        </div>
        <div class="additional-item__actions">
          <AddToCartButton
            :is-added="!!countInCart"
            class="additional-item__add-button add-button"
            @click="onBuyButtonClick(item)"
          />
        </div>
      </footer>
    </div>
  </article>
</template>

<script>
import { mapGetters } from 'vuex';
import AddToCartButton from '~/components/Catalog/AddToCartButton.vue';
import { getPrice } from '~/lib/common';

export default {
  name: 'AdditionalItem',
  components: { AddToCartButton },
  props: {
    item: {
      type: Object,
      required: true,
    },
    currentSectionDataSlug: {
      type: String,
      default: '',
    },

  },
  data() {
    return {
      isDescShow: false,
    };
  },
  computed: {
    ...mapGetters({
      CUSTOM_ADD_TO_CART_GROUPS_ID: 'setting/CUSTOM_ADD_TO_CART_GROUPS_ID',
    }),
    hasMods() {
      return this.item.groupModifiers.length > 0;
    },

    countInCart() {
      const p = this.$store.getters['cart/cartItems'].find((el) => el.product.id === this.item.id);
      return p?.quantity || 0;
    },

    price() {
      const { price, from } = getPrice(this.item);
      return from ? `от ${price}` : price;
    },
  },
  methods: {
    addToCart() {
      const { id: productId } = this.item;
      this.$store.dispatch('cart/addItem', { productId });
    },

    decreaseQtyById() {
      this.$store.dispatch('cart/decreaseQtyById', this.item.id);
    },

    onBuyButtonClick(item) {
      if (this.CUSTOM_ADD_TO_CART_GROUPS_ID.includes(item.parentGroup) && this.hasMods) {
        this.openProduct();
      } else {
        this.addToCart();
      }
    },
    openProduct() {
      const currentProductData = this.$store.getters['catalog/productById'](this.item.id);
      this.$store.commit('modal/showCatalogDetailItem', { product: currentProductData });
    },

  },
};
</script>

<style lang="scss"
       scoped
>
.additional-item {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: extClamp(2) extClamp(10) extClamp(10) extClamp(10);
  border: 1px solid #993ca6;
  border-radius: extClamp(10);
  gap: extClamp(5);

  @media screen and (min-width: 768px) {
    padding: 10px 20px 20px 20px;
    border-radius: 20px;
    gap: 10px;
  }

  @media screen and (min-width: 1280px) {

  }

  > * {
    width: 100%;
  }

  // .additional-item__image-wrapper
  &__image-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: extClamp(114);
    height: auto;
    max-height: extClamp(124);

    @media screen and (min-width: 768px) {
      height: 200px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .additional-item__image
  &__image {

  }

  // .additional-item__content
  &__content {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    flex-grow: 1;
    gap: extClamp(10);

    @media screen and (min-width: 768px) {
      gap: 20px;
      padding-inline: 0;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .additional-item__title
  &__title {
    font-size: extClamp(10);
    font-weight: 400;
    font-style: normal;
    line-height: 120%;
    margin-bottom: 5px;
    color: #292929;

    @media screen and (min-width: 768px) {
      font-size: 20px;
      line-height: normal;
    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .additional-item__footer
  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    margin-top: auto;
  }

  // .additional-item__actions
  &__actions {

  }

  // .additional-item__price
  &__price {
    font-size: extClamp(12);
    font-weight: 400;
    font-style: normal;
    line-height: normal;
    color: #993ca6;

    @media screen and (min-width: 768px) {
      font-size: 20px;
      line-height: normal;
    }
  }

  // .additional-item__add-button
  &__add-button {

  }

}

</style>
