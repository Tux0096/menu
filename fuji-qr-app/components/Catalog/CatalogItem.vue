<template>
  <article class="catalog-item">
    <div
      class="catalog-item__image-wrapper"
      @click="openProduct"
    >
      <nuxt-img
        :height="imagePreset.height"
        :priority="true"
        :quality="imagePreset.quality"
        :src="item.image"
        :title="item.name"
        :width="imagePreset.width"
        class="catalog-item__image"
        format="webp"
      />
    </div>
    <div class="catalog-item__content">
      <div class="catalog-item__header">
        <component
          :is="itemTitleTag"
          class="catalog-item__title"
          @click="openProduct"
        >
          {{ item.name }}
          <AppLike
            v-if="!isLikeHidden"
            :is-liked="isLiked"
            class="catalog-item__like"
            @click="onLikeClick"
          />
        </component>
        <div class="catalog-item__desc">
          {{ item.description }}
        </div>
      </div>

      <footer class="catalog-item__footer">
        <div
          v-if="item.oldPrice"
          class="catalog-item__old-price"
        >
          {{ item.oldPrice }}<span class="rub">р</span>
        </div>
        <div class="catalog-item__price">
          <template v-if="item.count > 0">
            {{ item.count }}шт |
          </template>
          {{ price }}₽
        </div>

        <div class="catalog-item__actions">
          <AddToCartButton
            v-if="!countInCart"
            @click="onBuyButtonClick(item)"
          />
          <AppQty
            v-else
            :qty="countInCart"
            class="catalog-item__qty"
            type="medium"
            @decrease="decreaseQtyById"
            @increase="onBuyButtonClick(item)"
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
  components: { AddToCartButton },
  props: {
    item: {
      type: Object,
      required: true,
    },
    itemTitleTag: {
      type: String,
      default: 'h2',
    },
    isLikeHidden: {
      type: Boolean,
      default: true,
    },
    isLiked: {
      type: Boolean,
      default: true,
    },

  },
  data() {
    return {
      imageLoaded: false,
      imagePreloaded: false,
    };
  },
  computed: {
    ...mapGetters({
      CUSTOM_ADD_TO_CART_GROUPS_ID: 'setting/CUSTOM_ADD_TO_CART_GROUPS_ID',
      imagePreset: 'setting/IMAGE_PRESET_CATALOG_LIST',
    }),

    hasMods() {
      return this.item.groupModifiers.length > 0;
    },

    countInCart() {
      const products = this.$store.getters['cart/cartItems'].filter((el) => el.product.id === this.item.id);
      if (products.length > 0) {
        return products.reduce((acc, p) => acc + p.quantity, 0);
      }
      return 0;
    },

    price() {
      const { price, from } = getPrice(this.item);
      return from ? `от ${price}` : price;
    },

  },
  mounted() {
  },
  beforeDestroy() {
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
      const currentProductData = this.$store.getters['catalog/productById'](this.item.id);

      this.$store.commit('modal/showCatalogDetailItem', { product: currentProductData });
    },

    onBuyButtonClick(item) {
      if (this.CUSTOM_ADD_TO_CART_GROUPS_ID.includes(item.parentGroup) && this.hasMods) {
        this.openProduct();
      } else {
        this.addToCart();
      }
    },

    async onLikeClick() {
      if (this.isLiked) {
        await this.$store.dispatch('user/removeLike', { product: this.item });
        this.$emit('delete-like');
      } else {
        await this.$store.dispatch('user/addLike', { product: this.item });
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.catalog-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: extClamp(6) 0;
  gap: extClamp(16);

  @media screen and (min-width: 768px) {
    align-items: flex-start;
    flex-direction: column;
    width: calc(100% / 3 - 24px);
    padding: 0;
    gap: 10px;
  }

  @media screen and (min-width: 1280px) {
    width: calc(100% / 4 - 27px);
  }

  // .catalog-item__image-wrapper
  &__image-wrapper {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    justify-content: center;
    width: extClamp(124px);
    height: extClamp(124px);
    cursor: pointer;

    @media screen and (min-width: 768px) {
      width: 216px;
      height: 216px;
    }

    @media screen and (min-width: 1280px) {
      width: 100%;
      height: 303px;
    }

  }

  // .catalog-item__image
  &__image {
    display: block;
    width: auto;
    max-width: 100%;
    height: auto;
    max-height: 100%;
  }

  // .catalog-item__content
  &__content {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    width: 100%;
    gap: extClamp(12);

    @media screen and (min-width: 768px) {
      gap: 20px;
      gap: 16px;
    }

    @media screen and (min-width: 1280px) {
      gap: 16px;
    }

  }

  // .catalog-item__header
  &__header {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    width: 100%;
    gap: extClamp(8);

    @media screen and (min-width: 768px) {
      gap: 8px;
    }

    @media screen and (min-width: 1280px) {
      gap: 8px;
    }
  }

  // .catalog-item__title
  &__title {
    font-family: "Wix Madefor Display", sans-serif;
    font-size: extClamp(14);
    font-weight: 600;
    font-style: normal;
    line-height: 100%;
    display: flex;
    align-items: center;
    width: 100%;
    cursor: pointer;
    color: var(---Main-Black, #292929);
    gap: extClamp(8);

    @media screen and (min-width: 768px) {
      font-size: 16px;
      gap: 10px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 20px;
      font-weight: 600;
      line-height: 100%;
    }
  }

  // .catalog-item__like
  &__like {
    flex-shrink: 0;
    margin-left: auto;

    @media screen and (min-width: 768px) {
      width: 32px;
      height: 32px;
      padding: 5px;

      &::v-deep > svg {
        width: 14px;
        height: 100%;
      }
    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .catalog-item__desc
  &__desc {
    font-size: extClamp(8);
    font-weight: 400;
    line-height: 120%;
    display: -webkit-box;
    overflow: hidden;
    text-overflow: ellipsis;
    opacity: 0.6;
    color: var(---Main-Black, #292929);
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;

    @media screen and (min-width: 768px) {
      font-size: 12px;
      height: 41px;

    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      font-weight: 500;
      line-height: 120%;
      height: 41px;
      -webkit-line-clamp: 2;
    }
  }

  // .catalog-item__footer
  &__footer {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: space-between;
    width: 100%;
    height: extClamp(39);

    @media screen and (min-width: 768px) {
      height: auto;
      margin-top: auto;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .catalog-item__old-price
  &__old-price {
    font-size: extClamp(12);
    font-weight: 400;
    font-style: normal;
    line-height: normal;
    flex-grow: 1;
    width: 100%;
    white-space: nowrap;
    color: #d0d0d0;

    @media screen and (min-width: 768px) {
      font-size: 16px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .catalog-item__price
  &__price {
    font-family: "Wix Madefor Display", sans-serif;
    font-size: extClamp(12);
    font-weight: 600;
    font-style: normal;
    line-height: 120%;
    white-space: nowrap;
    color: #292929;

    @media screen and (min-width: 768px) {
      font-size: 16px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 20px;
      font-weight: 600;
      line-height: 100%;
    }
  }

  // .catalog-item__actions
  &__actions {
    display: flex;
    justify-content: space-between;

    @media screen and (min-width: 768px) {
      margin-right: 0;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .catalog-item__add-button
  &__add-button {

    // .catalog-item__add-button--full-width
    &--full-width {
      width: 100% !important;
    }
  }

  // .catalog-item__qty
  &__qty {
  }
}

</style>
