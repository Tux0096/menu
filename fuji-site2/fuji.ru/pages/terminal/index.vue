<template>
  <div class="terminal-page">
    <div
      ref="categories-wrapper"
      class="terminal-page__categories"
    >
      <CatalogHeaderCategories />
    </div>

    <div class="terminal-page__filter">
      <FilterComponentIndex />
    </div>

    <div class="terminal-page__content">
      <div id="top-of-catalog" />
      <template v-if="catalog && catalog.length > 0">
        <CatalogSection
          v-for="currentSectionData in catalog"
          :id="`catalog-section-${currentSectionData.slug}`"
          :key="currentSectionData.id"
          :current-section-data="currentSectionData"
          :has-more="true"
          class="terminal-page__section"
          group-title-tag="h2"
          item-title-tag="h3"
        />
      </template>
      <div
        v-else-if="isCatalogLoad"
        class="terminal-page__empty"
      >
        <lord-icon
          :src="`/assets/libs/icon-json/clock.json`"
          class="terminal-page__empty-icon"
          trigger="loop"
        />
        <p class="terminal-page__empty-text">
          Меню временно недоступно
        </p>
      </div>
      <div
        v-else
        class="terminal-page__loading"
      >
        <div class="terminal-page__loader" />
      </div>
    </div>
  </div>
</template>

<script>
import { scrollToCatalogCategory } from '~/lib/common';
import CatalogHeaderCategories from '~/components/Catalog/CatalogHeaderCategories.vue';
import CatalogSection from '~/components/Catalog/CatalogSection.vue';
import FilterComponentIndex from '~/components/FilterComponent/FilterComponentIndex.vue';

export default {
  name: 'TerminalIndex',

  layout: 'terminal',

  components: {
    CatalogHeaderCategories,
    CatalogSection,
    FilterComponentIndex,
  },

  computed: {
    catalog() {
      return this.$store.getters['catalog/catalogIsIncludedInMenuFiltered']
        .filter((el) => el.items && el.items.length);
    },

    isCatalogLoad() {
      return this.$store.getters['catalog/isCatalogLoad'];
    },

    isKioskMode() {
      return this.$store.getters['terminal/isKioskMode'];
    },

    terminalId() {
      return this.$store.getters['terminal/terminalId'];
    },
  },

  mounted() {
    this.$nextTick(() => {
      const slug = this.$route.query.scrollToCatalogSection;
      if (slug) {
        setTimeout(() => {
          const sectionElement = document.getElementById(`catalog-section-${slug}`);
          if (sectionElement) {
            scrollToCatalogCategory(sectionElement);
          }
        }, 500);
      }
    });
  },
};
</script>

<style lang="scss" scoped>
.terminal-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 24px 120px;

  &__categories {
    position: sticky;
    z-index: 10;
    top: 80px;
    margin-right: -24px;
    margin-left: -24px;
    padding: 12px 0;
    background-color: #f9f9f9;
  }

  &__filter {
    margin-top: 16px;
    margin-bottom: 8px;
  }

  &__content {
    flex-grow: 1;
    margin-top: 16px;
  }

  &__section {
    margin-top: 24px;
    margin-bottom: 24px;
  }

  &__empty {
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    min-height: 40vh;
    gap: 16px;
  }

  &__empty-icon {
    width: 120px;
    height: 120px;
  }

  &__empty-text {
    font-size: 20px;
    color: #969696;
  }

  &__loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 40vh;
  }

  &__loader {
    width: 48px;
    height: 48px;
    border: 4px solid #f0f0f0;
    border-top-color: #993ca6;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
