<template>
  <div class="filter">
    <div class="filter__header">
      <FilterComponentSearch
        ref="filterComponentSearch"
        class="filter__search"
        @on-filter="onSearch"
        @on-reset-search="onResetSearch"
      />
      <button
        ref="filterComponentClear"
        class="filter__close"
        @click="clearFilter"
      >
        Сбросить
      </button>
    </div>

    <div class="filter__filter-wrapper">
      <FilterComponentSelector
        class="filter__filter"
        @on-filter="onFilter"
      />

      <div
        class="filter__exclude-allergens"
        @click="onAllergenClick"
      >
        Исключить аллергены
      </div>
    </div>
  </div>
</template>

<script>

export default {
  name: 'FilterComponentIndex',

  methods: {
    onSearch(needUnFocus) {
      if (needUnFocus) {
        this.$refs.filterComponentClear.focus();
      }
      window.scrollTo(0, 0);
    },
    onResetSearch() {
      this.$store.commit('catalog/setSearchString', '');
    },
    async onFilter() {
      this.$refs.filterComponentSearch.clearSearch();
      window.scrollTo(0, 0);

      // Пока не используем
      return;

      this.$store.commit('modal/hideModal');

      const topOfCatalogElement = document.getElementById('top-of-catalog');
      if (topOfCatalogElement) {
        // если прокрутить документ далеко и выполнить фильтрацию и если документ
        // по высоте станет меньше чем прокрутка, то при фильтрации глючит и не прокручивает наверх

        // Сохраняем текущий стиль прокрутки
        const originalScrollBehavior = document.documentElement.style.scrollBehavior;

        // Устанавливаем прокрутку на 'auto' (моментальную)
        document.documentElement.style.scrollBehavior = 'auto';

        // Выполняем прокрутку
        const rect = topOfCatalogElement.getBoundingClientRect();
        const topPosition = rect.top + window.scrollY;
        const FIXED_HEADER_HEIGHT = 80;
        window.scrollTo(0, topPosition - FIXED_HEADER_HEIGHT);

        // Восстанавливаем исходный стиль прокрутки
        setTimeout(() => document.documentElement.style.scrollBehavior = originalScrollBehavior, 300);
      } else {
        await this.$router.push({ path: '/', hash: '#top-of-catalog' });
      }
    },
    clearFilter() {
      this.$store.commit('catalog/setSelectedFilters', []);
      this.$store.commit('catalog/setSearchString', '');

      this.$refs.filterComponentSearch.clearSearch();
    },

    onAllergenClick() {
      this.$store.commit('modal/showAllergensSelector');
    },
  },
};
</script>

<style lang="scss"
       scoped
>
.filter {
  display: flex;
  flex-direction: column;
  gap: extClamp(12);

  @media screen and (min-width: 768px) {
    gap: 16px;
  }

  @media screen and (min-width: 1280px) {
    font-size: 20px;
    line-height: 100%;
    display: flex;
    padding: 15px 30px;
    border-radius: 200px;
    gap: 16px;
  }

  // .filter__header
  &__header {
    display: flex;
    align-items: center;
    gap: extClamp(12);

    @media screen and (min-width: 768px) {
      gap: 16px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .filter__search
  &__search {
    flex-grow: 1;
  }

  &::v-deep .base-input__input {
    font-size: extClamp(12);
    font-weight: 600;
    font-style: normal;
    line-height: 120%;
    align-items: center;
    height: auto;
    min-height: 0;
    padding: extClamp(12);
    color: var(---Primary-Gray, #969696);
    border: 2px solid var(---Main-Purple, #993ca6);
    border-radius: extClamp(150);

    @media screen and (min-width: 768px) {
      font-size: 16px;
      line-height: normal;
      min-height: initial;
      padding: 16px;
      border-radius: 200px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .filter__close
  &__close {

    font-size: extClamp(10);
    font-weight: 500;
    font-style: normal;
    line-height: 120%;
    text-align: right;
    opacity: 0.5;
    color: var(---Main-Black, #292929);
    outline: none;

    @media screen and (min-width: 768px) {
      font-size: 14px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
    }
  }

  // .filter__filter
  &__filter {

    &::-webkit-scrollbar {
      display: none;
    }

    @media screen and (min-width: 768px) {
      overflow: auto;
      width: calc(100% - 212px);

    }

    @media screen and (min-width: 1280px) {
      &::-webkit-scrollbar {
        display: block;
      }
    }
  }

  // .filter__filter-wrapper
  &__filter-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: extClamp(6);

    @media screen and (min-width: 768px) {
      gap: 8px;
    }

    @media screen and (min-width: 1280px) {
      gap: 16px;
    }
  }

  // .filter__exclude-allergens
  &__exclude-allergens {
    font-size: extClamp(10);
    font-weight: 600;
    font-style: normal;
    line-height: 120%;
    margin-left: extClamp(3);
    cursor: pointer;
    color: var(---Main-Purple, #993ca6);
    background-color: #fff;
    text-decoration-line: underline;
    font-feature-settings: 'liga' off, 'clig' off;

    @media screen and (min-width: 768px) {
      font-size: 14px;
      line-height: 140%;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}
</style>
