<template>
  <div class="qr-bottom-nav">
    <button
      type="button"
      class="qr-bottom-nav__item"
      :class="{ 'qr-bottom-nav__item--active': activeTab === 'welcome' }"
      @click="go('welcome')"
    >
      <span class="qr-bottom-nav__icon">✨</span>
      <span class="qr-bottom-nav__label">Приветствие</span>
    </button>
    <button
      type="button"
      class="qr-bottom-nav__item"
      :class="{ 'qr-bottom-nav__item--active': activeTab === 'menu' }"
      @click="go('menu')"
    >
      <span class="qr-bottom-nav__icon">📋</span>
      <span class="qr-bottom-nav__label">Меню</span>
    </button>
    <button
      type="button"
      class="qr-bottom-nav__item"
      :class="{ 'qr-bottom-nav__item--active': activeTab === 'order' }"
      @click="go('order')"
    >
      <span class="qr-bottom-nav__icon">🛎</span>
      <span class="qr-bottom-nav__label">Заказ</span>
      <span
        v-if="cartCount > 0"
        class="qr-bottom-nav__badge"
      >{{ cartCount }}</span>
    </button>
  </div>
</template>

<script>
export default {
  name: 'QrBottomNav',

  computed: {
    activeTab() {
      return this.$store.state.tableSession.activeTab;
    },
    cartCount() {
      return this.$store.getters['cart/cartItems']?.length || 0;
    },
  },

  methods: {
    go(tab) {
      this.$store.commit('tableSession/setActiveTab', tab);
      const routes = {
        welcome: '/welcome',
        menu: '/',
        order: '/order',
      };
      if (this.$route.path !== routes[tab]) {
        this.$router.push(routes[tab]);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.qr-bottom-nav {
  position: fixed;
  z-index: 200;
  right: 16px;
  bottom: max(16px, env(safe-area-inset-bottom));
  left: 16px;
  display: flex;
  justify-content: space-around;
  gap: 8px;
  max-width: 480px;
  margin: 0 auto;
  padding: 10px 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, #1a1f24 0%, #2d1b3d 100%);
  box-shadow: 0 8px 32px rgba(153, 60, 166, 0.35);

  &__item {
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 6px 4px;
    border: none;
    border-radius: 12px;
    background: transparent;
    color: rgba(255, 255, 255, 0.55);
    cursor: pointer;
    transition: all 0.25s ease;

    &--active {
      color: #fff;
      background: rgba(153, 60, 166, 0.35);
    }
  }

  &__icon {
    font-size: 20px;
    line-height: 1;
  }

  &__label {
    font-size: 11px;
    font-weight: 500;
    line-height: 1.2;
  }

  &__badge {
    position: absolute;
    top: 0;
    right: 8px;
    min-width: 18px;
    padding: 2px 5px;
    border-radius: 9px;
    background: #993ca6;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    text-align: center;
  }
}
</style>
