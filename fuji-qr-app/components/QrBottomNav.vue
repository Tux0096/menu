<template>
  <div class="qr-bottom-nav">
    <div class="qr-bottom-nav__inner">
      <button
        type="button"
        class="qr-bottom-nav__item"
        :class="{ 'qr-bottom-nav__item--active': activeTab === 'welcome' }"
        @click="go('welcome')"
      >
        <span class="qr-bottom-nav__icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 3l1.2 3.6L17 8l-3.6 1.2L12 13l-1.2-3.8L7 8l3.8-1.4L12 3z" fill="currentColor" />
          </svg>
        </span>
        <span class="qr-bottom-nav__label">Приветствие</span>
      </button>
      <button
        type="button"
        class="qr-bottom-nav__item"
        :class="{ 'qr-bottom-nav__item--active': activeTab === 'menu' }"
        @click="go('menu')"
      >
        <span class="qr-bottom-nav__icon">
          <svg width="24" height="24" aria-hidden="true">
            <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#menu" />
          </svg>
        </span>
        <span class="qr-bottom-nav__label">Меню</span>
      </button>
      <button
        type="button"
        class="qr-bottom-nav__item"
        :class="{ 'qr-bottom-nav__item--active': activeTab === 'order' }"
        @click="go('order')"
      >
        <span class="qr-bottom-nav__icon">
          <svg width="24" height="24" aria-hidden="true">
            <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#empty-cart" />
          </svg>
        </span>
        <span class="qr-bottom-nav__label">Заказ</span>
        <span
          v-if="cartCount > 0"
          class="qr-bottom-nav__badge"
        >{{ cartCount }}</span>
      </button>
    </div>
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
  z-index: 100;
  right: extClamp(16);
  bottom: max(var(--safe-area-inset-bottom), var(--mobile-bottom-menu-bottom));
  left: extClamp(16);
  max-width: $mobileBottomMenuWidth;
  margin-right: auto;
  margin-left: auto;
  padding: extClamp(6) extClamp(18);
  border-radius: extClamp(6);
  background: var(---Secondary-MenuBackground, #171b1e);
  box-shadow: 0 extClamp(10) extClamp(60) 0 #fff;

  @media screen and (min-width: 768px) {
    right: 24px;
    left: 24px;
    max-width: 720px;
    padding: 8px 24px;
    border-radius: 8px;
  }

  &__inner {
    display: flex;
    align-items: center;
    justify-content: space-around;
    gap: extClamp(18);
  }

  &__item {
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 4px;
    border: none;
    background: transparent;
    color: #fff;
    cursor: pointer;

    &--active .qr-bottom-nav__label {
      opacity: 1;
      color: #fff;
    }

    &--active .qr-bottom-nav__icon {
      color: var(---Main-Purple, #993ca6);
      background: #fff;
      border-radius: 8px;
    }
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: extClamp(30);
    height: extClamp(30);
    color: #fff;

    svg {
      width: extClamp(22);
      height: extClamp(22);
    }
  }

  &__label {
    font-size: extClamp(8);
    font-weight: 400;
    line-height: normal;
    text-align: center;
    text-transform: uppercase;
    opacity: 0.5;
    color: #fff;

    @media screen and (min-width: 768px) {
      font-size: 11px;
    }
  }

  &__badge {
    position: absolute;
    top: 0;
    right: 4px;
    min-width: 16px;
    padding: 1px 4px;
    border-radius: 8px;
    background: var(---Main-Purple, #993ca6);
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    text-align: center;
  }
}
</style>
