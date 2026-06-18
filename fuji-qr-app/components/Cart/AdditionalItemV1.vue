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
        width="260"
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
          {{ price }}₽
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
  align-items: flex-start;
  flex: 1 0 0;
  flex-direction: column;
  justify-content: center;
  padding: extClamp(4) extClamp(12) extClamp(8);
  border: 1px solid var(---Main-Purple, #993ca6);
  border-radius: extClamp(8);
  gap: extClamp(4);

  @media screen and (min-width: 768px) {
    align-items: center;
    padding: 0 16px 16px 16px;
    border-radius: 8px;
    gap: 8px;
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
    width: extClamp(104);
    height: extClamp(96);

    @media screen and (min-width: 768px) {
      width: 132px;
      height: 123px;
    }

    @media screen and (min-width: 1280px) {
      width: 152px;
      height: 152px;
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
    gap: extClamp(6);

    @media screen and (min-width: 768px) {
      gap: 12px;
      padding-inline: 0;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .additional-item__title
  &__title {
    font-size: extClamp(12);
    font-weight: 600;
    font-style: normal;
    line-height: 120%;
    display: -webkit-box;
    overflow: hidden;
    min-height: extClamp(29);
    text-overflow: ellipsis;
    color: var(---Main-Black, #292929);
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;

    @media screen and (min-width: 768px) {
      font-size: 16px;
      overflow: hidden;
      min-height: 38px;
      color: var(---Main-Black, #292929);
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
    font-weight: 600;
    font-style: normal;
    line-height: 120%;
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 20px;
      line-height: normal;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .additional-item__add-button
  &__add-button.add-button {
    height: 30px;
    padding: 6px 20px;
  }

}

</style>
