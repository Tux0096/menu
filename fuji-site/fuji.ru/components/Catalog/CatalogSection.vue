<template>
  <section
    v-if="products.length"
    ref="catalog-section"
    :data-catalog-header-category-id="`catalog-header-category-id-${currentSectionData.slug}`"
    class="catalog-section"
  >
    <header
      ref="catalog-section-header"
      class="catalog-section__header"
    >
      <component
        :is="groupTitleTag"
        class="catalog-section__title"
      >
        <nuxtLink :to="`/catalog/${currentSectionData.slug}`">
          {{ pageTitle }}
        </nuxtLink>
      </component>
    </header>

    <div
      class="catalog-section__inner"
    >
      <CatalogItem
        v-for="item in startProducts"
        :key="item.id"
        :item="item"
        :item-title-tag="itemTitleTag"
      />

      <div
        v-if="!isShown && sectionPromoImages"
        class="catalog-item catalog-item--image"
      >
        <div class="catalog-item__image-wrapper">
          <img
            :key="`section-promo-image-${sectionPromoImages.desktop}`"
            :src="sectionPromoImages.desktop"
            alt=""
            class="desktop"
          >
          <img
            :key="`section-promo-image-${sectionPromoImages.sectionPromoImages}`"
            :src="sectionPromoImages.mobile"
            alt=""
            class="mobile"
          >
        </div>
      </div>
    </div>
    <button
      v-if="isShown && endProducts.length"
      aria-label="Показать все товары категории"
      class="catalog-section__more catalog-more-button"
      type="button"
      @click.prevent="showMore"
    >
      <span class="catalog-more-button__icon-wrapper">
        <svg class="catalog-more-button__icon">
          <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#arrow-down" />
        </svg>
      </span>
      <span class="catalog-more-button__text">
        Показать ещё
      </span>
      <span class="catalog-more-button__count">
        {{ endProducts.length }}
      </span>
    </button>
  </section>
</template>

<script>

import { normalizeRouteName } from '~/lib/common';

const CatalogItem = () => import('~/components/Catalog/CatalogItem.vue');

export default {
  components: { CatalogItem },

  props: {
    currentSectionData: {
      type: Object,
      required: true,
    },
    hasMore: {
      type: Boolean,
      default: false,
    },
    groupTitleTag: {
      type: String,
      default: 'h1',
    },
    itemTitleTag: {
      type: String,
      default: 'h2',
    },

  },
  data() {
    return {
      hasMoreClone: this.hasMore,
      products: this.currentSectionData.items,
    };
  },
  computed: {

    filteredProducts() {
      return this.currentSectionData.items;
    },
    pageTitle() {
      const routeName = normalizeRouteName(this.$route.name);
      if (['index'].includes(routeName)) {
        return this.currentSectionData.name;
      }
      return `${this.currentSectionData.name} в ${this.$store.getters['city/cityIn']}`;
    },
    startProducts() {
      return this.isShown ? this.filteredProducts.slice(0, 12) : this.filteredProducts;
    },
    endProducts() {
      return this.isShown ? this.filteredProducts.slice(12) : [];
    },
    isShown() {
      if (this.currentSectionData.isShown) {
        return false;
      }
      return this.hasMoreClone;
    },

    sectionPromoImages() {
      const SECTION_PROMO_IMAGES = this.$store.getters['setting/SECTION_PROMO_IMAGES'];

      if (SECTION_PROMO_IMAGES?.[this.currentSectionData.slug]) {
        return SECTION_PROMO_IMAGES?.[this.currentSectionData.slug];
      }
      return null;
    },
  },

  methods: {
    showMore() {
      this.hasMoreClone = false;
      this.$store.commit('catalog/setIsSectionShownTrue', this.currentSectionData);
    },

  },
};
</script>

<style lang="scss"
       scoped
>
.catalog-section {
  display: flex;
  flex-direction: column;
  gap: extClamp(12);

  @media screen and (min-width: 768px) {
    gap: 16px;
  }

  @media screen and (min-width: 1280px) {
    gap: 24px;
  }

  // .catalog-section__header
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: extClamp(16);

    @media screen and (min-width: 768px) {
      gap: 16px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .catalog-section__title
  &__title {
    font-size: extClamp(20);
    font-weight: 600;
    line-height: 100%;
    color: var(---Main-Purple, #993ca6);

    @media screen and (min-width: 768px) {
      font-size: 32px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 36px;
    }
  }

  // .catalog-section__inner
  &__inner {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    gap: extClamp(14);

    @media screen and (min-width: 768px) {
      align-items: stretch;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 48px 36px;
    }

    @media screen and (min-width: 1280px) {
      gap: 36px;
    }

  }

  // .catalog-section__more
  &__more {
    width: 100%;

  }
}

.catalog-more-button {
  display: flex;
  align-items: center;
  align-self: stretch;
  justify-content: space-between;
  width: 100%;
  height: extClamp(42);
  padding: extClamp(12);
  border-radius: extClamp(28);
  background: #f0f0f0;
  background: var(---Primary-LightPurple, #f5ecf6);
  gap: extClamp(50);

  @media screen and (min-width: 768px) {
    align-self: center;
    width: 100%;
    min-width: 315px;
    height: auto;
    padding: 16px;
    gap: 50px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .catalog-more-button__icon
  &__icon {
    flex-shrink: 0;
    width: extClamp(14);
    height: extClamp(14);
    color: var(---Main-Purple, #f5ecf6);

    @media screen and (min-width: 768px) {
      width: 18px;
      height: 18px;

    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .catalog-more-button__text
  &__text {
    font-family: "Wix Madefor Display", sans-serif;
    font-size: extClamp(12);
    font-weight: 600;
    font-style: normal;
    line-height: 120%;
    text-align: center;
    white-space: nowrap;
    color: var(---Main-Purple, #993ca6);

    @media screen and (min-width: 768px) {
      font-size: 16px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      line-height: 100%;
    }
  }

  // .catalog-more-button__count
  &__count {

    font-family: "Wix Madefor Display", sans-serif;
    font-size: extClamp(9);
    font-weight: 400;
    font-style: normal;
    line-height: 120%;
    display: flex;
    align-items: center;
    flex-direction: column;
    flex-shrink: 0;
    justify-content: center;
    width: extClamp(18);
    height: extClamp(18);
    padding: extClamp(4);

    text-align: center;

    color: var(---Main-White, #fff);
    border-radius: 200px;

    background-color: #993ca6;

    @media screen and (min-width: 768px) {
      font-size: 12px;
      width: 24px;
      height: 24px;
      padding: 4px;
    }

    @media screen and (min-width: 1280px) {

    }

  }
}

.catalog-item--image {
  overflow: hidden;
  width: 100%;
  padding: 0;
  border-radius: extClamp(12);
  grid-column: 1/3;

  @media screen and (min-width: 768px) {
    border-radius: 20px;
  }

  @media screen and (min-width: 1280px) {

  }

  .image-wrapper {
    overflow: hidden;
    width: 100%;
    border-radius: extClamp(15);

    @media screen and (min-width: 768px) {
      border-radius: 20px;
    }

    @media screen and (min-width: 1280px) {

    }

  }

  img {
    width: 100%;
    max-width: none;
  }

  .desktop {
    display: none;

  }

  .mobile {
    display: block;

  }

}

</style>
