<template>
  <div
    class="mobile-bottom-menu-btn"
    @click="onBtnClick"
  >
    <div
      v-if="$store.getters['modal/isMenuActive']"
      class="mobile-bottom-menu-btn__icon-wrapper"
    >
      <svg

        class="mobile-bottom-menu-btn__icon"
      >
        <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#close" />
      </svg>
    </div>
    <div
      v-else
      class="mobile-bottom-menu-btn__icon-wrapper"
    >
      <svg

        class="mobile-bottom-menu-btn__icon"
      >
        <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#menu" />
      </svg>
    </div>

    <div class="mobile-bottom-menu-btn__title">
      Меню
    </div>
  </div>
</template>
<script>

export default {
  name: 'MobileBottomMenuBtn',
  methods: {
    onBtnClick() {
      if (this.$store.getters['modal/isMenuActive']) {
        this.hideCatalogModal();
      } else {
        this.showCatalogModal();
      }
    },
    showCatalogModal() {
      this.$store.commit('modal/showCatalogModal');
    },

    hideCatalogModal() {
      this.$store.commit('modal/hideModal');
    },

  },

};
</script>
<style lang="scss"
       scoped
>
.mobile-bottom-menu-btn {
  position: relative;
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  cursor: pointer;

  @media screen and (min-width: 768px) {
    flex-direction: row;
    gap: 0;
  }

  @media screen and (min-width: 1280px) {

  }

  // .mobile-bottom-menu-btn__icon-wrapper
  &__icon-wrapper {

    @media screen and (min-width: 768px) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 54px;
      height: 40px;
    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .mobile-bottom-menu-btn__icon
  &__icon {
    width: extClamp(30);
    height: extClamp(30);
    color: #fff;

    @media screen and (min-width: 768px) {
      width: 38px;
      height: 38px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .mobile-bottom-menu-btn__title
  &__title {
    font-size: extClamp(8);
    font-weight: 400;
    font-style: normal;
    line-height: normal;
    text-align: center;
    text-transform: uppercase;
    opacity: 0.5;
    color: #fff;

    @media screen and (min-width: 768px) {
      font-size: 11px;

    }

    @media screen and (min-width: 1280px) {

    }
  }
}
</style>
