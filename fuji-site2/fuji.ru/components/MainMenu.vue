<template>
  <div class="main-menu">
    <div class="main-menu__list">
      <div class="main-menu__item">
        <div
          class="main-menu__link"
          @click="showCatalogModal"
        >
          <svg class="main-menu__icon">
            <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#menu-3" />
          </svg>
          Меню
        </div>
      </div>

      <div class="main-menu__item">
        <div
          class="main-menu__link"
          @click="showCallingModal"
        >
          <svg class="main-menu__icon main-menu__icon--2">
            <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#phone-3" />
          </svg>
          Контакты
        </div>
      </div>
      <div class="main-menu__item">
        <NuxtLink
          class="main-menu__link"
          to="/catalog/search"
        >
          <svg class="main-menu__icon">
            <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#search-3" />
          </svg>
          Поиск
        </NuxtLink>
      </div>
      <div class="main-menu__item">
        <AppExternalLink
          class="main-menu__link"
          href="https://fujifranchise.ru"
        >
          Франшиза
        </AppExternalLink>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  name: 'MainMenu', // этот компонент нужно переименовать, уже есть AppMainMenu

  methods: {
    showCallingModal() {
      this.$store.commit(
        'modal/showModal',
        {
          component: 'AppCalling',
          params: {
            title: 'Связаться с нами:',
            isNotMaxHeight: true,
          },
        },
      );
    },
    showCatalogModal() {
      this.$store.commit('modal/showCatalogModal');
    },
  },
};
</script>
<style lang="scss" scoped>
.main-menu {
  display: none;

  @media screen and (min-width: 1280px) {
    display: block;
  }
  // .main-menu__list
  &__list {
    @media screen and (min-width: 1280px) {
      display: flex;
      align-items: center;
      gap: 40px;
    }
  }

  // .main-menu__item
  &__item {
  }

  // .main-menu__link
  &__link {

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      font-weight: 600;
      font-style: normal;
      line-height: 100%;
      display: flex;
      align-items: center;
      cursor: pointer;
      color: var(---Main-Purple, #993ca6);
      gap: 10px;
      font-feature-settings: 'liga' off, 'clig' off;
    }

  }

  // .main-menu__icon
  &__icon {
    width: 24px;
    height: 24px;

    // .main-menu__icon--2
    &--2 {

    }
  }
}
</style>
