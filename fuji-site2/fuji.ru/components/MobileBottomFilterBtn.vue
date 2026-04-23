<template>
  <div
    class="mobile-bottom-filter-btn"
    @click="onBtnClick"
  >
    <div
      v-if="isCloseButtonShow"
      class="mobile-bottom-filter-btn__icon-wrapper"
    >
      <svg

        class="mobile-bottom-filter-btn__icon"
      >
        <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#close" />
      </svg>
    </div>
    <div
      v-else
      class="mobile-bottom-filter-btn__icon-wrapper"
    >
      <svg

        class="mobile-bottom-filter-btn__icon"
      >
        <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#search" />
      </svg>
    </div>

    <div class="mobile-bottom-filter-btn__title">
      Поиск
    </div>
  </div>
</template>
<script>
import { normalizeRouteName } from '~/lib/common';

export default {
  name: 'MobileBottomFilterBtn',
  computed: {
    isCloseButtonShow() {
      const routeName = normalizeRouteName(this.$route.name);
      return routeName === 'catalog-search';
    },
  },

  methods: {
    onBtnClick() {
      if (this.isCloseButtonShow) {
        this.hideFilter();
      } else {
        this.showFilter();
      }
    },
    showFilter() {
      this.$router.push('/catalog/search');
    },

    clear() {
      this.$store.commit('catalog/setSelectedFilters', []);
      this.$store.commit('catalog/setSearchString', '');
    },

    hideFilter() {
      if (this.$store.getters['catalog/isCatalogFiltered']) {
        this.clear();
      }
      if (this.$store.getters['modal/isFilterActive']) {
        this.$store.commit('modal/hideModal');
      }
      this.$router.push('/');
    },
  },
};
</script>
<style lang="scss"
       scoped
>
.mobile-bottom-filter-btn {
  position: relative;
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  cursor: pointer;

  @media screen and (min-width: 768px) {
    flex-direction: row;
  }

  @media screen and (min-width: 1280px) {

  }

  // .mobile-bottom-filter-btn__icon-wrapper
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

  // .mobile-bottom-filter-btn__icon
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

  // .mobile-bottom-filter-btn__title
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
