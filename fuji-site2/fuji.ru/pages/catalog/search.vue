<template>
  <div class="page-content">
    <div class="page-catalog-search">
      <div class="page-catalog-search__header">
        <FilterComponentIndex class="page-catalog-search__form" />
      </div>
      <client-only>
        <div class="page-catalog-search__result">
          <div
            v-if="products?.length"
            class="page-catalog-search__products"
          >
            <CatalogItem
              v-for="item in products"
              :key="item.id"
              :item="item"
            />
          </div>

          <template v-else>
            <div class="filter-empty">
              Данного блюда нет в ассортименте
            </div>
          </template>
        </div>
      </client-only>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PageCatalogSearch',
  computed: {
    products() {
      const catalog = this.$store.getters['catalog/catalogIsIncludedInMenuFiltered'].filter((el) => el.items.length);
      return catalog.flatMap((item) => item.items);
    },
  },
};
</script>

<style lang="scss"
       scoped
>
$header-height: 124;
.page-catalog-search {
  display: flex;
  flex-direction: column;
  padding-top: extClamp($header-height);
  gap: extClamp(20);

  @media screen and (min-width: 768px) {
    padding-top: 190px;
  }

  @media screen and (min-width: 1280px) {
    padding-top: 250px;
  }

  // .page-catalog-search__header
  &__header {
    position: fixed;
    z-index: 5;
    top: 0;
    right: 0;
    left: 0;
    height: calc(extClamp($header-height) + var(--safe-area-inset-top, 0));
    padding: calc(extClamp(10) + var(--safe-area-inset-top)) extClamp(16) extClamp(16);
    border-bottom: 1px solid #e8e8e8;
    background-color: #fff;

    @media screen and (min-width: 768px) {
      height: initial;
      padding: calc(40px + var(--safe-area-inset-top)) 24px 16px;
    }

    @media screen and (min-width: 1280px) {
      top: 90px;
      padding-top: 24px;
      padding-bottom: 24px;
      border-top: 1px solid #e8e8e8;
      border-bottom: 1px solid #e8e8e8;
    }
  }

  // .page-catalog-search__form
  &__form {

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      max-width: 1440px;
      margin-right: auto;
      margin-left: auto;
      padding: 0 60px 0;

    }

  }

  // .page-catalog-search__result
  &__result {
    padding-top: extClamp(12);

    @media screen and (min-width: 768px) {
      padding-top: 36px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .page-catalog-search__products
  &__products {
    display: flex;
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
}
</style>
