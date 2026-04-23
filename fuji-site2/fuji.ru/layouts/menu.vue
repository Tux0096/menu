<template>
  <div class="ml">
    <!-- ── Header ──────────────────────────────────────────────────── -->
    <header class="ml__header">
      <div class="ml__hinner">
        <!-- Logo -->
        <nuxt-link :to="`/menu/${restaurantSlug}`" class="ml__logo">
          <img src="/assets/images/logo/logo.svg" alt="Фуджи" class="ml__logo-img" />
        </nuxt-link>

        <!-- Current restaurant -->
        <div v-if="restaurant" class="ml__rest">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
              fill="#993ca6"
            />
          </svg>
          <span class="ml__rest-name">{{ restaurant.address }}</span>
        </div>

        <!-- Actions: change restaurant + cart -->
        <div class="ml__actions">
          <nuxt-link to="/menu" class="ml__change-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 12h18M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="ml__change-label">Сменить</span>
          </nuxt-link>

          <button class="ml__cart-btn" @click="goToCart">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"
                stroke="#fff"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span v-if="cartCount > 0" class="ml__cart-badge">{{ cartCount }}</span>
            <span v-if="cartTotal > 0" class="ml__cart-sum">{{ cartTotal }}&nbsp;₽</span>
          </button>
        </div>
      </div>
    </header>

    <!-- ── Page ────────────────────────────────────────────────────── -->
    <main class="ml__main">
      <nuxt />
    </main>

    <!-- ── Mobile cart bar ─────────────────────────────────────────── -->
    <transition name="cartbar">
      <div
        v-if="cartCount > 0 && !isCartPage"
        class="ml__bar"
        @click="goToCart"
      >
        <div class="ml__bar-inner">
          <span class="ml__bar-count">{{ cartCount }} {{ plural(cartCount, 'товар','товара','товаров') }}</span>
          <span class="ml__bar-total">{{ cartTotal }}&nbsp;₽</span>
          <button class="ml__bar-btn">В корзину</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
export default {
  name: 'MenuLayout',

  computed: {
    restaurantSlug() { return this.$route.params.slug || ''; },
    restaurant()     { return this.$store.getters['menuApp/restaurant']; },
    cartCount()      { return this.$store.getters['menuApp/cartCount'] || 0; },
    cartTotal()      { return this.$store.getters['menuApp/cartTotal'] || 0; },
    isCartPage()     { return this.$route.path.endsWith('/cart'); },
    cartPath()       { return `/menu/${this.restaurantSlug}/cart`; },
  },

  methods: {
    goToCart() { this.$router.push(this.cartPath); },

    plural(n, one, two, many) {
      const mod10 = n % 10;
      const mod100 = n % 100;
      if (mod10 === 1 && mod100 !== 11) return one;
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return two;
      return many;
    },
  },
};
</script>

<style lang="scss" scoped>
.ml {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f9f9f9;

  // ── Header ─────────────────────────────────────────────────────────
  &__header {
    position: sticky;
    z-index: 100;
    top: 0;
    background: #fff;
    box-shadow: 0 2px 10px rgba(0,0,0,.08);
  }

  &__hinner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1440px;
    margin: 0 auto;
    padding: 10px 16px;
    gap: 10px;

    @media (min-width: 768px) { padding: 12px 24px; }
  }

  &__logo { flex-shrink: 0; text-decoration: none; }
  &__logo-img { height: 26px; @media (min-width: 768px) { height: 30px; } }

  // ── Restaurant name ─────────────────────────────────────────────────
  &__rest {
    display: flex;
    align-items: center;
    flex: 1;
    justify-content: center;
    gap: 5px;
    min-width: 0;
    padding: 0 8px;
  }

  &__rest-name {
    font-size: 13px;
    font-weight: 600;
    color: #292929;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    @media (min-width: 768px) { font-size: 14px; }
  }

  // ── Actions ─────────────────────────────────────────────────────────
  &__actions {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    gap: 8px;
  }

  &__change-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 13px;
    font-weight: 500;
    color: #993ca6;
    text-decoration: none;
    padding: 6px 12px;
    border: 1.5px solid #993ca6;
    border-radius: 100px;
    white-space: nowrap;
    transition: background 0.15s;

    &:hover { background: #f0e6f7; }
  }

  &__change-label {
    display: none;
    @media (min-width: 400px) { display: inline; }
  }

  &__cart-btn {
    position: relative;
    display: flex;
    align-items: center;
    height: 38px;
    padding: 0 12px;
    cursor: pointer;
    border-radius: 100px;
    background: #993ca6;
    border: none;
    gap: 6px;
    transition: background 0.15s;

    &:hover { background: #7d2e8a; }

    @media (min-width: 768px) { height: 42px; padding: 0 16px; }
  }

  &__cart-badge {
    min-width: 20px;
    height: 20px;
    padding: 0 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 100px;
    background: #fff;
    color: #993ca6;
    font-size: 11px;
    font-weight: 700;
  }

  &__cart-sum {
    font-size: 14px;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;

    @media (min-width: 768px) { font-size: 15px; }
  }

  // ── Main ─────────────────────────────────────────────────────────────
  &__main { flex: 1; padding-bottom: 80px; }

  // ── Bottom cart bar (mobile) ──────────────────────────────────────────
  &__bar {
    position: fixed;
    z-index: 90;
    right: 0;
    bottom: 0;
    left: 0;
    padding: 10px 16px;
    background: #fff;
    box-shadow: 0 -4px 16px rgba(0,0,0,.12);
    cursor: pointer;

    @media (min-width: 900px) { display: none; }
  }

  &__bar-inner {
    display: flex;
    align-items: center;
    gap: 12px;
    max-width: 1440px;
    margin: 0 auto;
  }

  &__bar-count {
    font-size: 14px;
    font-weight: 500;
    color: #292929;
  }

  &__bar-total {
    font-size: 20px;
    font-weight: 800;
    color: #993ca6;
    flex: 1;
  }

  &__bar-btn {
    height: 44px;
    padding: 0 20px;
    font-size: 15px;
    font-weight: 600;
    color: #fff;
    border: none;
    border-radius: 100px;
    background: #993ca6;
    pointer-events: none;
  }
}

// ── Animations ──────────────────────────────────────────────────────────────
.cartbar-enter-active,
.cartbar-leave-active {
  transition: transform 0.25s ease, opacity 0.2s;
}
.cartbar-enter,
.cartbar-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
