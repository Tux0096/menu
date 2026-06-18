<template>
  <div class="page-content">
    <div class="cart-page">
      <template v-if="cartItems.length">
        <CheckoutHeader
          :is-close-button-fixed="true"
          class="cart-page__header"
          @click="$router.push('/')"
        >
          <template #title>
            {{ notGiftsAndNotDelivery.length }} {{ goodPlural }} на {{
              notGiftsAndNotDeliveryTotalDisplayed
            }}₽
          </template>
        </CheckoutHeader>
        <div class="cart-page__inner">
          <div class="cart-page__panel">
            <Cart
              :items="cartItemsForDisplay"
              class="cart-page__cart"
            />

            <div class="cart-page__additional-items">
              <AdditionalItems
                v-if="recommendedProducts.length"
                :items="recommendedProducts"
                class="cart-page__additional"
                title="Наши хиты:"
                version="1"
              />
              <AdditionalItems
                v-if="additionallyProducts.length"
                :items="additionallyProducts"
                class="cart-page__sauce"
                title="Добавить к заказу:"
                version="1"
              />
            </div>
          </div>

          <footer class="cart-page__footer cart-footer">
            <div class="cart-footer__inner">
              <div class="cart-footer__cost cart-cost">
                <div class="cart-cost__title">
                  Итого
                </div>
                <div class="cart-cost__cost">
                  {{ notGiftsAndNotDeliveryTotalDisplayed }}₽
                </div>
              </div>
              <div
                v-if="showLocalPromoDiscountRow"
                class="cart-footer__cost cart-cost"
              >
                Скидка: <span>{{ discountTotal }}₽</span>
              </div>

              <div
                v-if="deliveryCost"
                class="cart-footer__delivery cart-delivery"
              >
                <NuxtLink
                  class="cart-delivery__title"
                  to="/delivery"
                >
                  Включая платную доставку
                </NuxtLink>
                <div class="cart-delivery__cost">
                  {{ deliveryCost }}₽
                </div>
              </div>
            </div>
          </footer>
        </div>
      </template>

      <div
        v-else
        class="cart-page__empty"
      >
        <CartEmpty />
      </div>
    </div>
  </div>
</template>

<script>

import AdditionalItems from '@/components/Cart/AdditionalItems.vue';
import CartEmpty from '~/components/Cart/CartEmpty.vue';
import { pluralize } from '~/lib/common';

export default {
  name: 'PageCart',
  components: { CartEmpty, AdditionalItems },
  middleware: ['cart-empty'],

  data() {
    return {
      cartProcessCartTimerID: null,
    };
  },
  computed: {
    goodPlural() {
      return pluralize(this.notGiftsAndNotDelivery.length, 'товар', 'товара', 'товаров');
    },
    userPhone() {
      return this.$store.getters['user/userPhone'];
    },
    additionallyProducts() {
      return this.$store.getters['catalog/additionallyProducts'];
    },
    recommendedProducts() {
      return this.$store.getters['catalog/recommendedProducts'];
    },
    notGiftsAndNotDeliveryTotalDisplayed() {
      return this.$store.getters['cart/notGiftsAndNotDeliveryTotalDisplayed'];
    },
    discountTotal() {
      return this.$store.getters['cart/discountTotal'];
    },
    remarkedLoyaltyHasValidPricing() {
      return this.$store.getters['cart/remarkedLoyaltyHasValidPricing'];
    },
    remarkedLoyaltyItemsEnriched() {
      return this.$store.getters['cart/remarkedLoyaltyItemsEnriched'];
    },
    showRemarkedCatalogTestBlock() {
      const on = this.$config.FEATURE_REMARKED_LOYALTY === true
        || this.$config.FEATURE_REMARKED_LOYALTY === 'true';
      return on && this.remarkedLoyaltyItemsEnriched.length > 0;
    },
    /** Не дублировать строку «Скидка» с iiko, если итог уже из Remarked. */
    showLocalPromoDiscountRow() {
      return !this.remarkedLoyaltyHasValidPricing && this.discountTotal > 0;
    },

    cartItems() {
      return this.$store.getters['cart/cartItems'];
    },
    cartItemsForDisplay() {
      return this.$store.getters['cart/cartItemsForDisplay'];
    },
    notGiftsAndNotDelivery() {
      return this.$store.getters['cart/notGiftsAndNotDelivery'];
    },
    deliveryCost() {
      const deliveryId = this.$store.getters['city/deliveryId'];
      const deliveryInCart = this.$store.getters['cart/cartItems'].find((el) => el.product.id === deliveryId);

      return deliveryInCart?.product?.price ?? 0;
    },

  },
  watch: {
    cartItems(value) {
      if (value.length === 0) {
        this.$router.push('/').then(() => {
          this.$store.commit('modal/showCatalogModal');
        });
      }
    },
  },

  async created() {
    await this.$store.dispatch('cart/processCart');
    this.cartProcessCartTimerID = setInterval(async () => {
      await this.$store.dispatch('cart/processCart');
    }, 60000);

    const serviceFeeId = this.$store.getters['city/serviceFeeId'];

    if (serviceFeeId && !this.cartItems.find((i) => i.product.id === serviceFeeId)) {
      this.$store.dispatch('cart/addItem', {
        productId: serviceFeeId,
        quantity: 1,
        isServiceFee: true,
        isHidden: true,
      });
    }

    if (!serviceFeeId) {
      const serviceFees = this.cartItems.filter((i) => i.isServiceFee);

      serviceFees
        .forEach((serviceFee) => this.$store.dispatch('cart/removeItemById', serviceFee.product.id));
    }
  },
  beforeDestroy() {
    clearInterval(this.cartProcessCartTimerID);
  },
  mounted() {
    if (!this.cartItems.length) {
      this.$router.push('/').then(() => {
        this.$store.commit('modal/showCatalogModal');
      });
      return;
    }
    if (this.$store.state.view.needShowDeliveryAfterReload) {
      this.$store.dispatch('modal/showDeliveryModal');
      this.$store.commit('view/setNeedShowDeliveryAfterReload', false);
    }
  },
};
</script>

<style lang="scss"
       scoped
>

.cart-page {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  width: 100%;
  gap: extClamp(16);

  @media screen and (min-width: 768px) {
    gap: 36px;
  }

  @media screen and (min-width: 1280px) {
    gap: 24px;
  }

  // .cart-page__header
  &__header {

    @media screen and (min-width: 768px) {
      padding-top: 40px;
      padding-bottom: 0;
    }

    @media screen and (min-width: 1280px) {
      padding-top: 0;
    }

    &::v-deep .cart-page-header__close {

    }

  }

  // .cart-page__inner
  &__inner {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    gap: extClamp(16);

    @media screen and (min-width: 768px) {
      gap: 40px;
    }

    @media screen and (min-width: 1280px) {
      align-items: flex-start;
      flex-direction: row;
      gap: 24px;
    }
  }

  // .cart-page__panel
  &__panel {
    display: flex;
    flex-direction: column;
    gap: extClamp(30);

    @media screen and (min-width: 768px) {
      gap: 36px;
    }

    @media screen and (min-width: 1280px) {
      flex-shrink: 0;
      width: 100%;
      max-width: calc(50% - 12px);
      gap: 36px;
    }

    > * {
      width: 100%;
    }
  }

  // .cart-page__additional-items
  &__additional-items {
    display: flex;
    flex-direction: column;
    gap: extClamp(16);

    @media screen and (min-width: 768px) {
      gap: 36px;
    }

    @media screen and (min-width: 1280px) {
      gap: 36px;
    }

    > * {
      width: 100%;
    }
  }

  // .cart-page__additional
  &__additional {

  }

  // .cart-page__sauce
  &__sauce {

  }

  // .cart-page__line
  &__line {
    background: var(---Extra-LightGray, #e8e8e8);
  }

  // .cart-page__footer
  &__footer {

  }

  // .cart-page__empty
  &__empty {

  }
}

.cart-footer {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  margin-top: auto;
  margin-right: extClampNegative(16);
  margin-left: extClampNegative(16);
  padding: extClamp(16) extClamp(16) max(var(--safe-area-inset-bottom), extClamp(24)) extClamp(16);
  border-radius: extClamp(16) extClamp(16) 0 0;
  background: var(---Primary-LightGray, #f5f5f5);
  gap: extClamp(16);

  @media screen and (min-width: 768px) {
    margin-right: -24px;
    margin-left: -24px;
    padding: 20px 16px max(var(--safe-area-inset-bottom), 30px) 16px;
    border-radius: 20px 20px 0 0;
    gap: 20px;
  }

  @media screen and (min-width: 1280px) {
    position: sticky;
    top: 220px;
    width: 100%;
    margin-top: 0;
    margin-right: 0;
    margin-left: 0;
    padding: 20px 16px 30px;
    border-radius: 8px;
    gap: 20px;
  }

  > * {
    width: 100%;
  }

  // .cart-footer__inner
  &__inner {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    gap: extClamp(16);

    @media screen and (min-width: 768px) {
      gap: 20px;
    }

    @media screen and (min-width: 1280px) {
      gap: 20px;
    }

    > * {
      width: 100%;
    }
  }

  // .cart-footer__cost
  &__cost {
  }

  // .cart-footer__delivery
  &__delivery {

  }
}

.cart-cost {
  font-size: extClamp(16);
  font-weight: 600;
  font-style: normal;
  line-height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(---Main-Black, #292929);
  font-feature-settings: 'liga' off, 'clig' off;

  @media screen and (min-width: 768px) {
    font-size: 20px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .cart-cost__title
  &__title {
    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      font-size: 20px;
      font-weight: 600;
      line-height: 100%;
    }
  }

  // .cart-cost__cost
  &__cost {
    font-size: extClamp(16);
    color: var(---Main-Purple, #993ca6);

    @media screen and (min-width: 768px) {
      font-size: 20px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 24px;
    }

  }
}

.cart-delivery {
  display: flex;
  align-items: center;
  justify-content: space-between;

  // .cart-delivery__title
  &__title {
    font-size: extClamp(10);
    font-weight: 500;
    font-style: normal;
    line-height: 100%;
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 16px;
      font-weight: 600;
      line-height: 120%;
      color: var(---Main-Black, #292929);
    }

    @media screen and (min-width: 1280px) {
      font-size: 14px;
      font-weight: 500;
      font-style: normal;
      line-height: 100%;

    }

  }

  // .cart-delivery__cost
  &__cost {
    font-weight: 600;

    @media screen and (min-width: 768px) {
      font-size: 20px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}

.remarked-test {
  width: 100%;
  margin-top: 16px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(153, 60, 166, 0.08);
  font-size: 12px;

  &__title {
    margin-bottom: 8px;
    font-weight: 600;
  }

  &__list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  &__img {
    flex-shrink: 0;
    border-radius: 4px;
    object-fit: cover;
  }

  &__name {
    flex: 1;
    min-width: 0;
  }

  &__price {
    flex-shrink: 0;
    font-weight: 600;
  }
}

</style>
