<template>
  <div class="terminal-cart-page">
    <div class="terminal-cart-page__inner">
      <div class="terminal-cart-page__items">
        <h1 class="terminal-cart-page__title">
          Ваш заказ
        </h1>

        <div
          v-if="cartItems.length === 0"
          class="terminal-cart-page__empty"
        >
          <lord-icon
            :src="`/assets/libs/icon-json/cart.json`"
            class="terminal-cart-page__empty-icon"
            trigger="loop"
          />
          <p class="terminal-cart-page__empty-text">
            Корзина пустая
          </p>
          <button
            class="terminal-cart-page__empty-btn"
            @click="goToMenu"
          >
            Перейти к меню
          </button>
        </div>

        <div
          v-else
          class="terminal-cart-page__list"
        >
          <CartItem
            v-for="(item, idx) in cartItems"
            :key="`${item.product.id}-${idx}`"
            :item="item"
            :idx="idx"
            class="terminal-cart-page__item"
          />
        </div>
      </div>

      <div
        v-if="cartItems.length > 0"
        class="terminal-cart-page__summary"
      >
        <div class="terminal-cart-summary">
          <h2 class="terminal-cart-summary__title">
            Итого
          </h2>

          <div class="terminal-cart-summary__restaurant">
            <svg class="terminal-cart-summary__location-icon">
              <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#location" />
            </svg>
            <span
              v-if="restaurant"
              class="terminal-cart-summary__restaurant-name"
            >{{ restaurant.address }}</span>
          </div>

          <div class="terminal-cart-summary__line" />

          <div class="terminal-cart-summary__row">
            <span>Товары ({{ totalCount }} шт.)</span>
            <span>{{ cartTotal }} ₽</span>
          </div>

          <div
            v-if="discountTotal > 0"
            class="terminal-cart-summary__row terminal-cart-summary__row--discount"
          >
            <span>Скидка</span>
            <span>-{{ discountTotal }} ₽</span>
          </div>

          <div class="terminal-cart-summary__line" />

          <div class="terminal-cart-summary__total">
            <span>Итого:</span>
            <span>{{ cartTotalAfterDiscounts }} ₽</span>
          </div>

          <div class="terminal-cart-summary__actions">
            <button
              class="terminal-cart-summary__back-btn"
              @click="goToMenu"
            >
              Добавить ещё
            </button>
            <button
              class="terminal-cart-summary__order-btn"
              @click="placeOrder"
            >
              Оформить заказ
            </button>
          </div>

          <button
            class="terminal-cart-summary__clear-btn"
            @click="clearCart"
          >
            Очистить корзину
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import CartItem from '~/components/Cart/CartItem.vue';

export default {
  name: 'TerminalCart',

  layout: 'terminal',

  components: {
    CartItem,
  },

  computed: {
    cartItems() {
      return this.$store.getters['cart/cartItems'].filter(
        (item) => !item.isHidden && item.product.id !== this.$store.getters['city/deliveryId'],
      );
    },

    cartTotal() {
      return this.$store.getters['cart/cartTotal'];
    },

    cartTotalAfterDiscounts() {
      return this.$store.getters['cart/cartTotalAfterDiscounts'];
    },

    discountTotal() {
      return this.$store.getters['cart/discountTotal'];
    },

    totalCount() {
      return this.$store.getters['cart/countItems'];
    },

    restaurant() {
      return this.$store.getters['cart/selectedRestaurant'];
    },

    menuPath() {
      const citySlug = this.$store.getters['city/city']?.slug;
      return citySlug ? `/${citySlug}/terminal` : '/terminal';
    },

    completePath() {
      const citySlug = this.$store.getters['city/city']?.slug;
      return citySlug ? `/${citySlug}/terminal/complete` : '/terminal/complete';
    },
  },

  methods: {
    goToMenu() {
      this.$router.push(this.menuPath);
    },

    clearCart() {
      this.$store.dispatch('cart/setItems', []);
    },

    async placeOrder() {
      if (this.cartItems.length === 0) return;

      try {
        const terminalId = this.$store.getters['terminal/terminalId'];
        const restaurant = this.restaurant;

        const orderPayload = {
          terminalId,
          deliveryTerminalId: terminalId,
          restaurantId: restaurant?.id,
          orderType: 'dineIn',
          items: this.$store.getters['cart/cartItems'].map((item) => ({
            id: item.product.id,
            name: item.product.name,
            amount: item.quantity,
            sum: item.product.price * item.quantity,
            code: item.product.code,
            modifiers: item.mods.map((mod) => ({
              id: mod.id,
              name: mod.name,
              amount: mod.amount,
              sum: mod.price * mod.amount,
              code: mod.code,
              groupId: mod.groupId,
              groupName: mod.groupName,
            })),
          })),
        };

        const { data } = await this.$axios.post(
          `${this.$config.FRONT_API_URL}/api/v1/order/terminal`,
          orderPayload,
        );

        this.$store.dispatch('cart/setItems', []);
        this.$router.push({
          path: this.completePath,
          query: { orderId: data?.orderId || '' },
        });
      } catch (error) {
        console.error('Order error:', error);
        this.$notify({
          group: 'messages',
          type: 'error',
          text: 'Ошибка при оформлении заказа. Пожалуйста, попробуйте ещё раз.',
        });
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.terminal-cart-page {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 24px 24px 120px;

  &__inner {
    display: flex;
    align-items: flex-start;
    gap: 40px;

    @media screen and (min-width: 1024px) {
      flex-direction: row;
    }

    @media screen and (max-width: 1023px) {
      flex-direction: column;
    }
  }

  &__items {
    flex: 1;
    min-width: 0;
  }

  &__title {
    margin-bottom: 24px;
    font-size: 32px;
    font-weight: 700;
    color: #993ca6;
  }

  &__empty {
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    min-height: 40vh;
    gap: 16px;
  }

  &__empty-icon {
    width: 120px;
    height: 120px;
  }

  &__empty-text {
    font-size: 24px;
    color: #969696;
  }

  &__empty-btn {
    height: 52px;
    padding: 0 32px;
    font-size: 18px;
    font-weight: 600;
    cursor: pointer;
    color: #993ca6;
    border: 2px solid #993ca6;
    border-radius: 100px;
    background: transparent;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  &__item {
    padding: 16px 0;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }
  }

  &__summary {
    flex-shrink: 0;
    width: 100%;
    max-width: 400px;
    position: sticky;
    top: 100px;
  }
}

.terminal-cart-summary {
  padding: 24px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);

  &__title {
    margin-bottom: 16px;
    font-size: 24px;
    font-weight: 700;
    color: #292929;
  }

  &__restaurant {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
  }

  &__location-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    color: #993ca6;
  }

  &__restaurant-name {
    font-size: 14px;
    font-weight: 500;
    color: #969696;
  }

  &__line {
    width: 100%;
    height: 1px;
    margin: 16px 0;
    background-color: #f0f0f0;
  }

  &__row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 16px;
    color: #292929;

    &--discount {
      color: #27ae60;
    }
  }

  &__total {
    display: flex;
    justify-content: space-between;
    font-size: 24px;
    font-weight: 700;
    color: #292929;
  }

  &__actions {
    display: flex;
    flex-direction: column;
    margin-top: 24px;
    gap: 12px;
  }

  &__order-btn {
    height: 56px;
    padding: 0 24px;
    font-size: 18px;
    font-weight: 700;
    cursor: pointer;
    color: #fff;
    border-radius: 100px;
    background: #993ca6;
  }

  &__back-btn {
    height: 52px;
    padding: 0 24px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    color: #993ca6;
    border: 2px solid #993ca6;
    border-radius: 100px;
    background: transparent;
  }

  &__clear-btn {
    width: 100%;
    margin-top: 12px;
    padding: 12px;
    font-size: 14px;
    cursor: pointer;
    color: #969696;
    border: none;
    background: transparent;
    text-decoration: underline;
  }
}
</style>
