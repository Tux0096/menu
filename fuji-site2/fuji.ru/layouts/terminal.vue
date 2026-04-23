<template>
  <div class="terminal-layout">
    <notifications
      class="terminal-layout__notifications"
      group="messages"
      position="top center"
    >
      <template #body="props">
        <div
          :class="[props.item.type]"
          class="custom-vue-notification"
          @click="props.close"
        >
          <div class="notification-content">
            <svg-icon
              v-if="props.item.type === 'error'"
              class="notification-content__icon"
              name="i-notification-error"
            />
            <svg-icon
              v-if="props.item.type === 'success'"
              class="notification-content__icon"
              name="i-notification-success"
            />
            <div
              class="notification-content__text"
              v-html="props.item.text"
            />
          </div>
        </div>
      </template>
    </notifications>

    <header class="terminal-header">
      <div class="terminal-header__inner">
        <NuxtLink
          :to="menuPath"
          class="terminal-header__logo"
          aria-label="Меню"
        >
          <svg class="terminal-header__logo-icon">
            <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#logo" />
          </svg>
        </NuxtLink>

        <div
          v-if="restaurant"
          class="terminal-header__restaurant"
        >
          <svg class="terminal-header__location-icon">
            <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#location" />
          </svg>
          <span class="terminal-header__restaurant-name">{{ restaurant.address }}</span>
        </div>

        <div class="terminal-header__cart-wrapper">
          <button
            class="terminal-cart-btn"
            @click="goToCart"
          >
            <svg class="terminal-cart-btn__icon">
              <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#bag" />
            </svg>
            <span class="terminal-cart-btn__label">Корзина</span>
            <span
              v-if="cartCount > 0"
              class="terminal-cart-btn__count"
            >{{ cartCount }}</span>
            <span
              v-if="cartTotal > 0"
              class="terminal-cart-btn__total"
            >{{ cartTotal }} ₽</span>
          </button>
        </div>
      </div>
    </header>

    <main class="terminal-main">
      <client-only>
        <TheModals />
      </client-only>
      <nuxt class="terminal-main__slot" />
    </main>

    <div
      v-if="cartCount > 0 && !isCartPage"
      class="terminal-footer-cart"
      @click="goToCart"
    >
      <div class="terminal-footer-cart__inner">
        <div class="terminal-footer-cart__info">
          <span class="terminal-footer-cart__count">{{ cartCount }} товара</span>
          <span class="terminal-footer-cart__total">{{ cartTotal }} ₽</span>
        </div>
        <button class="terminal-footer-cart__btn">
          Перейти в корзину
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { normalizeRouteName } from '~/lib/common';
import TheModals from '~/components/TheModals.vue';

export default {
  name: 'TerminalLayout',
  components: { TheModals },

  computed: {
    restaurant() {
      return this.$store.getters['cart/selectedRestaurant'];
    },

    cartCount() {
      return this.$store.getters['cart/countItems'] || 0;
    },

    cartTotal() {
      return this.$store.getters['cart/cartTotal'] || 0;
    },

    menuPath() {
      const citySlug = this.$store.getters['city/city']?.slug;
      return citySlug ? `/${citySlug}/terminal` : '/terminal';
    },

    cartPath() {
      const citySlug = this.$store.getters['city/city']?.slug;
      return citySlug ? `/${citySlug}/terminal/cart` : '/terminal/cart';
    },

    isCartPage() {
      const routeName = normalizeRouteName(this.$route.name);
      return routeName === 'terminal-cart' || routeName === 'terminal-city-cart';
    },
  },

  methods: {
    goToCart() {
      this.$router.push(this.cartPath);
    },
  },
};
</script>

<style lang="scss" scoped>
.terminal-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f9f9f9;
}

.terminal-header {
  position: sticky;
  z-index: 100;
  top: 0;
  width: 100%;
  padding: 16px 0;
  background-color: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);

  &__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1440px;
    margin: 0 auto;
    padding: 0 24px;
    gap: 20px;
  }

  &__logo {
    flex-shrink: 0;
  }

  &__logo-icon {
    width: 120px;
    height: 25px;
    color: #292929;
  }

  &__restaurant {
    display: flex;
    align-items: center;
    flex-grow: 1;
    justify-content: center;
    gap: 8px;
    color: #292929;
  }

  &__location-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    color: #993ca6;
  }

  &__restaurant-name {
    font-size: 16px;
    font-weight: 600;
    line-height: 1.2;
  }

  &__cart-wrapper {
    flex-shrink: 0;
  }
}

.terminal-cart-btn {
  display: flex;
  align-items: center;
  height: 48px;
  padding: 0 20px;
  cursor: pointer;
  border-radius: 100px;
  background: #993ca6;
  gap: 8px;

  &__icon {
    width: 22px;
    height: 22px;
    color: #fff;
  }

  &__label {
    font-size: 16px;
    font-weight: 600;
    color: #fff;
  }

  &__count {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    font-size: 12px;
    font-weight: 700;
    border-radius: 50%;
    background: #fff;
    color: #993ca6;
  }

  &__total {
    font-size: 16px;
    font-weight: 700;
    color: #fff;
  }
}

.terminal-main {
  flex-grow: 1;
  padding-bottom: 100px;

  &__slot {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-height: 100%;
  }
}

.terminal-footer-cart {
  position: fixed;
  z-index: 90;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 16px 24px;
  background: #fff;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  cursor: pointer;

  &__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1440px;
    margin: 0 auto;
  }

  &__info {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  &__count {
    font-size: 18px;
    font-weight: 500;
    color: #292929;
  }

  &__total {
    font-size: 24px;
    font-weight: 700;
    color: #993ca6;
  }

  &__btn {
    height: 52px;
    padding: 0 32px;
    font-size: 18px;
    font-weight: 600;
    cursor: pointer;
    color: #fff;
    border-radius: 100px;
    background: #993ca6;
  }
}
</style>
