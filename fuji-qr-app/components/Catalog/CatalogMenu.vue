<template>
  <div class="catalog-menu">
    <button
      v-if="canGoBack"
      type="button"
      class="catalog-menu__back"
      @click="goBack"
    >
      ← Назад
    </button>
    <div

      class="catalog-menu__inner"
    >
      <div

        v-for="(item, idx) in menu"
        :key="`${item.id}-${idx}`"
        class="catalog-menu__item catalog-menu-item"
        @click="onMenuItemClick(item)"
      >
        <div class="catalog-menu-item__image-wrapper">
          <nuxt-img
            v-if="item.image"
            :alt="item.name"
            :src="item.image"
            class="catalog-menu-item__image"
            format="webp"
            loading="lazy"
            quality="80"
            width="200"
          />
        </div>
        <div class="catalog-menu-item__title">
          {{ item.name }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>

import { normalizeRouteName, scrollToCatalogCategory } from '~/lib/common';

export default {
  name: 'CatalogMenu',

  data() {
    return {
      menu: this.$store.getters['setting/CATALOG_MENU'],
      menuStack: [],
    };
  },

  computed: {
    isTableMode() {
      return this.$store.getters['tableSession/isActive'];
    },
    canGoBack() {
      return this.menuStack.length > 0;
    },
  },

  methods: {
    goBack() {
      if (!this.menuStack.length) return;
      this.menu = this.menuStack.pop();
    },

    openCatalogSection(item) {
      if (this.isTableMode) {
        this.$router.push(`/catalog/${item.slug}`);
        return;
      }

      this.$store.commit('modal/hideModal');

      const normalizedRouteName = normalizeRouteName(this.$route.name);

      if (normalizedRouteName === 'index') {
        const sectionElement = document.getElementById(`catalog-section-${item.slug}`);
        if (sectionElement) {
          this.$nextTick(() => {
            scrollToCatalogCategory(sectionElement);
          });
        }
      } else {
        this.$router.push({
          path: '/',
          query: { scrollToCatalogSection: item.slug },
        });
      }
    },

    onMenuItemClick(item) {
      if (!item.isParent) {
        this.openCatalogSection(item);
        return;
      }
      this.menuStack.push(this.menu);
      this.menu = item.children;
    },

  },
};
</script>

<style lang="scss"
       scoped
>

.catalog-menu {
  // .catalog-menu__back
  &__back {
    display: block;
    margin: 0 0 extClamp(8) extClamp(4);
    padding: 0;
    border: none;
    background: none;
    color: var(---Main-Purple, #993ca6);
    font-size: extClamp(13);
    font-weight: 600;
    cursor: pointer;

    @media screen and (min-width: 768px) {
      margin-bottom: 12px;
      font-size: 14px;
    }
  }

  // .catalog-menu__inner
  &__inner {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: extClamp(6);

    @media screen and (min-width: 768px) {
      gap: 8px;
    }

    @media screen and (min-width: 1280px) {
      gap: 16px;
    }
  }

  // .catalog-menu__item
  &__item {
    width: calc(100% / 3 - extClamp(4));
    max-width: extClamp(84);

    @media screen and (min-width: 768px) {
      width: calc(100% / 4 - 6px);
      max-width: none;
      min-height: 196px;
    }

    @media screen and (min-width: 1280px) {
      width: calc(100% / 5 - 80px / 5);
    }
  }
}

.catalog-menu-item {
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  padding: extClamp(12) extClamp(6);
  border: extClamp(1) solid var(---Primary-Gray, #969696);
  border-radius: extClamp(12);
  background-color: #fff;
  gap: extClamp(4);

  @media screen and (min-width: 768px) {
    display: flex;
    padding: 8px;
    border-width: 1px;
    border-radius: 16px;
    gap: 0;
  }

  @media screen and (min-width: 1280px) {
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    min-height: 0;
    padding: 8px;
    gap: 0;
  }

  // .catalog-menu-item__image-wrapper
  &__image-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: extClamp(72);
    height: extClamp(68);

    @media screen and (min-width: 768px) {
      width: 136px;
      height: 123px;
    }

    @media screen and (min-width: 1280px) {
      width: 92px;
      height: 92px;
    }
  }

  // .catalog-menu-item__image
  &__image {

  }

  // .catalog-menu-item__title
  &__title {
    font-size: extClamp(10);
    font-weight: 600;
    font-style: normal;
    line-height: 120%;
    text-align: center;
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 58px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 12px;
      min-height: 24px;
    }
  }
}
</style>
