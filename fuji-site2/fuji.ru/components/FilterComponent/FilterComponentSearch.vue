<template>
  <div class="search">
    <BaseInput
      ref="searchInput"
      v-model="searchString"
      class="search__field"
      placeholder="Введите название блюда"
      @click="onSearch(true)"
      @keyup-enter="onSearch(true)"
    >
      <template #icon>
        <svg
          ref="searchInputIcon"
          class="search__icon"
          @click="onSearch(true)"
        >
          <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#search-rounded" />
        </svg>
      </template>
    </BaseInput>
  </div>
</template>

<script>

export default {
  name: 'FilterComponentSearch',
  data() {
    return {
      searchString: '',

    };
  },
  watch: {
    searchString(val) {
      if (val.length > 2) {
        this.onSearch();
      } else {
        this.$emit('on-reset-search');
      }
    },
  },

  mounted() {
    this.$refs.searchInput.setFocus();
  },
  methods: {
    onSearch(needUnFocus) {
      this.$store.commit('catalog/setSearchString', this.searchString);
      this.$emit('on-filter', needUnFocus);
    },

    onFocus(event) {
      const { target } = event;
      target.focus();
    },
    clearSearch() {
      this.searchString = '';
    },
  },
};
</script>

<style lang="scss"
       scoped
>
.search {
  // .search__field
  &__field {
  }

  // .search__tags
  &__tags {
    margin-top: extClamp(16);
    padding-bottom: extClamp(5);

    @media screen and (min-width: 768px) {
      margin-top: 16px;
      padding-bottom: 5px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .search__icon
  &__icon {
    width: extClamp(18);
    height: extClamp(18);

    @media screen and (min-width: 768px) {
      width: 28px;
      height: 28px;
    }

    @media screen and (min-width: 1280px) {
      width: 28px !important;
      height: 28px !important;
    }
  }

  &::v-deep .base-input__icon-wrapper {
    padding: 0;
    background: none;

    @media screen and (min-width: 768px) {
      top: 16px;
      right: 16px;
      width: 24px;
      height: 24px;

    }

    @media screen and (min-width: 1280px) {

    }
  }
}
</style>
