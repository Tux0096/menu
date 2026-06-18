<template>
  <div class="layout-qr safe-top safe-left safe-right safe-bottom">
    <notifications
      group="messages"
      position="top center"
    />
    <header
      v-if="isTableMode"
      class="layout-qr__header"
    >
      <div class="layout-qr__brand">
        Фуджи
      </div>
      <div class="layout-qr__meta">
        <span>{{ restaurantLabel }}</span>
        <span class="layout-qr__table">{{ tableLabel }}</span>
      </div>
    </header>

    <main class="layout-qr__main">
      <nuxt />
    </main>

    <client-only>
      <TheModals />
      <QrBottomNav v-if="isTableMode" />
    </client-only>
  </div>
</template>

<script>
import QrBottomNav from '~/components/QrBottomNav.vue';

export default {
  components: { QrBottomNav },

  computed: {
    isTableMode() {
      return this.$store.getters['tableSession/isActive'];
    },
    tableLabel() {
      return this.$store.getters['tableSession/tableLabel'];
    },
    restaurantLabel() {
      return this.$store.getters['tableSession/restaurantLabel'];
    },
  },
};
</script>

<style lang="scss" scoped>
.layout-qr {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #0f1114;
  color: #fff;

  &__header {
    position: sticky;
    z-index: 50;
    top: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    padding-top: calc(12px + env(safe-area-inset-top));
    background: rgba(15, 17, 20, 0.92);
    backdrop-filter: blur(12px);
  }

  &__brand {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  &__meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-size: 12px;
    opacity: 0.85;
  }

  &__table {
    font-weight: 600;
    color: #db9dee;
  }

  &__main {
    flex: 1;
    padding-bottom: 100px;
  }
}
</style>
