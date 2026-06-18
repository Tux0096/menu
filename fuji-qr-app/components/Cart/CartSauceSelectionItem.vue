<template>
  <article
    class="cart-sauce-selection-item"
  >
    <div
      class="cart-sauce-selection-item__image-wrapper"
      @click="openProduct"
    >
      <nuxt-img
        :alt="item.name"
        :src="item.image"
        :title="item.name"
        class="cart-sauce-selection-item__image"
        format="webp"
        loading="lazy"
        quality="70"
        sizes="xs:145px,sm:242px"
      />
    </div>
    <div class="cart-sauce-selection-item__content">
      <h3
        class="cart-sauce-selection-item__title"
        @click="openProduct"
      >
        {{ item.name }}
      </h3>
      <client-only>
        <footer class="cart-sauce-selection-item__footer">
          <div class="cart-sauce-selection-item__actions">
            <div class="cart-sauce-selection-item__price">
              {{ price }} р
            </div>
            <AppQty
              :qty="countInCart"
              class="cart-sauce-selection-item__qty"
              type="medium"
              @decrease="decreaseQtyById"
              @increase="addToCart"
            />
          </div>
        </footer>
      </client-only>
    </div>
  </article>
</template>

<script>
import { mapGetters } from 'vuex';
import { getPrice } from '~/lib/common';

export default {
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

    openProduct() {
      const productLink = `/catalog/${this.currentSectionDataSlug}/${this.item.slug}`;
      this.$router.push(productLink);
    },
    onBuyButtonClick(item) {
      if (this.CUSTOM_ADD_TO_CART_GROUPS_ID.includes(item.parentGroup) && this.hasMods) {
        this.openProduct();
      } else {
        this.addToCart();
      }
    },

  },
};
</script>

<style lang="scss"
       scoped
>
.cart-sauce-selection-item {
  position:         relative;
  display:          flex;
  flex-direction:   column;
  width:            100%;
  padding:          extClamp(8);
  border-radius:    extClamp(20);

  background-color: #fff;
  gap:              extClamp(14) extClamp(8);

  // .cart-sauce-selection-item__image-wrapper
  &__image-wrapper {
    display:         flex;
    align-items:     center;
    flex-shrink:     0;
    justify-content: center;
    width:           100%;
    height:          extClamp(100);
    cursor:          pointer;

  }

  // .cart-sauce-selection-item__image
  &__image {
    display:    block;
    width:      auto;
    max-width:  100%;
    height:     auto;
    max-height: 100%;
  }

  // .cart-sauce-selection-item__content
  &__content {
    display:         flex;
    flex-direction:  column;
    flex-grow:       1;
    justify-content: space-between;
    padding-top:     extClamp(16);
    gap:             extClamp(16);
  }

  // .cart-sauce-selection-item__title
  &__title {
    @include MobCaptionBold;
    cursor:     pointer;
    text-align: center;
  }

  // .cart-sauce-selection-item__footer
  &__footer {
    display:         flex;
    align-items:     center;
    justify-content: space-between;
    gap:             extClamp(8);
  }

  // .cart-sauce-selection-item__actions
  &__actions {
    display:         flex;
    align-items:     center;
    justify-content: space-between;
    width:           100%;

  }

  // .cart-sauce-selection-item__price
  &__price {
    @include MobCaptionBold;
  }

  // .cart-sauce-selection-item__qty
  &__qty {
  }
}

</style>
