<template>
  <div>
    <div
      class="filter"
    >
      <div
        v-for="filter in filters"
        :key="filter.code"

        :class="[`filter__item--${filter.code}`, {'filter__item--active': selectedFilters.includes(filter.code)}]"
        class="filter__item"
        @click="setFilter(filter.code)"
      >
        {{ filter.name }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FilterComponentSelector',
  computed: {
    filters() {
      return this.$store.getters['catalog/filterList'];
    },
    selectedFilters() {
      return this.$store.state.catalog.selectedFilters;
    },
  },

  methods: {
    setFilter(filterCode) {
      const selectedFilters = [];
      selectedFilters.push(filterCode);
      this.$store.commit('catalog/setSelectedFilters', selectedFilters);
      this.$store.commit('modal/hideModal');
      this.$emit('on-filter');
    },

  },
};
</script>

<style lang="scss"
       scoped
>
.filter {
  display: flex;
  flex-wrap: wrap;
  padding: 0;
  gap: 6px;

  @media screen and (min-width: 768px) {
    flex-wrap: nowrap;
    gap: 8px;
  }

  @media screen and (min-width: 1280px) {
    gap: 8px;
  }

  // .filter__item
  &__item {

    font-size: extClamp(12);
    font-weight: 600;
    font-style: normal;
    line-height: 99%;
    padding: extClamp(6) extClamp(18);
    cursor: pointer;
    text-transform: uppercase;
    color: var(---Main-White, #fff);
    border: extClamp(2) solid var(---Main-Purple, #993ca6);
    border-radius: extClamp(12);
    background: var(---Main-Purple, #993ca6);

    @media screen and (min-width: 768px) {
      font-size: 20px;
      line-height: 100%;
      padding: 13px 28px;
      gap: 10px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      font-weight: 500;
      line-height: 120%;
      padding: 10px 24px;
      border-radius: 16px;
    }

    // .filter__item--hit
    &--hit {
      border-color: var(---Main-Purple, #993ca6);
      background-color: var(---Main-Purple, #993ca6);

      &.filter__item--active {
        color: var(---Main-Purple, #993ca6);
      }
    }

    // .filter__item--hot
    &--hot {
      border-color: var(---Extra-SpicyRed, #ff003d);
      background-color: var(---Extra-SpicyRed, #ff003d);

      &.filter__item--active {
        color: var(---Extra-SpicyRed, #ff003d);
      }
    }

    // .filter__item--new
    &--new {
      border-color: var(---Extra-Yellow, #feb941);
      background-color: var(---Extra-Yellow, #feb941);

      &.filter__item--active {
        color: var(---Extra-Yellow, #feb941);
      }
    }

    // .filter__item--active
    &--active {
      background-color: transparent;
    }

  }

  &__icon {
    width: extClamp(109);
    height: extClamp(109);

    @media screen and (min-width: 768px) {
      width: 109px;
      height: 109px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}
</style>
