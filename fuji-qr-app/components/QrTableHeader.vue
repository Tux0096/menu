<template>
  <header
    :class="{ 'qr-header--categories-show': isCatalogMenuShow }"
    class="qr-header"
  >
    <div class="qr-header__inner">
      <div class="qr-header__spacer" />

      <div class="qr-header__actions">
        <div class="qr-header__meta">
          <span
            v-if="restaurantLabel"
            class="qr-header__restaurant"
          >{{ restaurantLabel }}</span>
          <span
            v-if="tableLabel"
            class="qr-header__table"
          >{{ tableLabel }}</span>
        </div>
        <button
          type="button"
          class="qr-header__waiter"
          aria-label="Позвать официанта"
          @click="callWaiter"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 3a1 1 0 011 1v1.07A7.002 7.002 0 0119 12v4l2 2v1H3v-1l2-2v-4a7.002 7.002 0 015-6.93V4a1 1 0 112 0v1.07"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
            <path
              d="M10 21h4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
    </div>

    <div
      :class="{ 'qr-header__categories--show': isCatalogMenuShow }"
      class="qr-header__categories"
    >
      <CatalogHeaderCategories disable-portal />
    </div>
  </header>
</template>

<script>
export default {
  name: 'QrTableHeader',

  computed: {
    isCatalogMenuShow() {
      const onMenu = this.$store.state.tableSession.activeTab === 'menu';
      return onMenu && this.$store.state.view.isCatalogCategoriesIntersecting;
    },
    tableLabel() {
      return this.$store.getters['tableSession/tableLabel'];
    },
    restaurantLabel() {
      return this.$store.getters['tableSession/restaurantLabel'];
    },
  },

  methods: {
    callWaiter() {
      this.$nuxt.$emit('qr-call-waiter');
    },
  },
};
</script>

<style lang="scss" scoped>
.qr-header {
  position: fixed;
  z-index: 150;
  top: 0;
  right: 0;
  left: 0;
  width: 100%;
  padding: calc(extClamp(12) + var(--safe-area-inset-top, 0)) extClamp(16) extClamp(10);
  background-color: #fff;
  box-shadow: 0 2px 12px rgba(41, 41, 41, 0.06);

  @media screen and (min-width: 768px) {
    padding: calc(20px + var(--safe-area-inset-top, 0)) 24px 14px;
  }

  &__inner {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    max-width: $page-content-width;
    margin: 0 auto;
  }

  &__spacer {
    flex: 1;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: extClamp(10);
  }

  &__meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    font-size: extClamp(10);
    line-height: 1.3;
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 13px;
    }
  }

  &__restaurant {
    opacity: 0.65;
  }

  &__table {
    font-weight: 600;
    color: var(---Main-Purple, #993ca6);
  }

  &__waiter {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: extClamp(36);
    height: extClamp(36);
    padding: 0;
    border: 1px solid var(---Primary-Gray, #969696);
    border-radius: 50%;
    background: var(---Primary-LightPurple, #f5ecf6);
    color: var(---Main-Purple, #993ca6);
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;

    &:active {
      transform: scale(0.94);
    }

    @media screen and (min-width: 768px) {
      width: 40px;
      height: 40px;
    }
  }

  &__categories {
    display: none;
    width: 100%;
    max-width: $page-content-width;
    margin: extClamp(10) auto 0;

    &--show {
      display: block;
    }
  }

  &--categories-show {
    padding-right: 0;
    padding-left: 0;
    padding-bottom: extClamp(10);
  }
}
</style>
