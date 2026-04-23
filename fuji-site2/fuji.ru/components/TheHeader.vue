<template>
  <header
    id="the-header"
    :class="[
      `header--page-${$route.name}`,
      {'header--is-page-scrolled': isScrolled},
      { 'header--is-catalog-menu-show': isCatalogMenuShow, },
      { 'header--reverse-color': isHeaderOnSlider },
    ]"
    class="header"
  >
    <client-only>
      <div
        v-if="['index', 'city-index'].includes($route.name) && $store.state.user.isShowGetMobileApp"
        class="header__mobile-app"
      >
        <AppMobileApp />
      </div>
    </client-only>
    <div class="header__inner">
      <button
        :class="{'header__back--is-main-page': isMainPage}"
        aria-label="Вернуться"
        class="header__back"
        @click="goBack"
      >
        <svg
          height="18"
          width="18"
        >
          <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#arrow-down" />
        </svg>
      </button>
      <NuxtLink
        aria-label="Вернуться на главную"
        class="header__logo"
        to="/"
      >
        <svg
          class="header__logo-icon"
          @click.prevent="scrollToTop"
        >
          <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#logo" />
        </svg>
      </NuxtLink>

      <MainMenu class="header__main-menu" />

      <div class="header__personal">
        <div class="header-personal">
          <portal-target name="order-status" />
          <div
            :class="[{'header-user--active': isAuth}]"
            class="header-personal__user header-user"
            @click="showPersonal"
          >
            <div class="header-user__text">
              <template v-if="isAuth">
                {{ userName }}
              </template>
              <template v-else>
                Кабинет
              </template>
            </div>
            <div class="header-user__icon-wrapper">
              <svg class="header-user__icon">
                <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#user" />
              </svg>
            </div>
          </div>
          <CartBlock class="header-personal__cart" />
        </div>
      </div>

      <button
        aria-label="Показать контактную информацию"
        class="header__phone"
        @click="showCallingModal"
      >
        <svg
          class="header__phone-icon"
        >
          <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#phone-2" />
        </svg>
      </button>

      <button
        class="header__close-btn"
        @click="$router.push('/')"
      >
        Закрыть
        <svg
          class="header__close-btn-icon"
        >
          <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#close" />
        </svg>
      </button>
    </div>

    <div
      id="catalog-header-categories"
      :class="{'header__catalog-header-categories--is-catalog-menu-show': isCatalogMenuShow}"
      class="header__catalog-header-categories"
    >
      <portal-target name="catalog-header-categories" />
    </div>
  </header>
</template>

<script>

import { normalizeRouteName } from '~/lib/common';
import MainMenu from '~/components/MainMenu.vue';

export default {
  name: 'TheHeader',
  components: { MainMenu },
  props: {
    isHeaderOnSlider: { type: Boolean, default: false },
  },
  data() {
    return {};
  },
  computed: {

    isScrolled() {
      const { isPageScroll } = this.$store.state.view;
      return isPageScroll;
    },
    isCatalogMenuShow() {
      const { isCatalogCategoriesIntersecting } = this.$store.state.view;
      return isCatalogCategoriesIntersecting;
    },
    isMainPage() {
      const routeName = normalizeRouteName(this.$route.name);
      return routeName === 'index';
    },
    isAuth() {
      return this.$store.getters['user/isAuth'];
    },
    userName() {
      return this.$store.getters['user/userName'];
    },

  },

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
    handleScroll() {
      this.isScrolled = window.scrollY > 0;
    },
    created() {
      window.addEventListener('scroll', this.handleScroll);
    },
    beforeDestroy() {
      window.removeEventListener('scroll', this.handleScroll);
    },
    scrollToTop() {
      this.$router.push('/');
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    },
    showPersonal() {
      if (!this.isAuth) {
        this.$store.commit('modal/showAuthModal');
      } else {
        this.$router.push('/personal');
      }
    },
    goBack() {
      if (window.history.length > 2) {
        this.$router.back();
      } else {
        this.$router.push('/');
      }
    },

  },
};
</script>

<style lang="scss"
       scoped
>
.header {
  position: fixed;
  z-index: 150;
  top: 0;
  right: 0;
  left: 0;
  width: 100%;
  padding: calc(extClamp(20) + var(--safe-area-inset-top, 0)) 0 extClamp(20);
  background-color: #fff;

  @media screen and (min-width: 768px) {
    padding: 36px 0 36px;
  }

  @media screen and (min-width: 1280px) {
    padding-top: 24px;
    padding-bottom: 24px;
  }

  // .header--page-personal
  &--page-personal {
    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      background-color: #993ca6;

      &::v-deep {
        .main-menu__link,
        .header__logo-icon {
          color: #fff;
        }

        .cart-block {
          background-color: #fff;
        }

        .cart-block__title {
          color: #993ca6;
        }

        .cart-block__qty {
          color: #fff;
          background-color: #993ca6;
        }

        .header-user--active {
          background-color: #fff;
        }

        .cart-block__icon {
          color: #993ca6;
        }
      }
    }
  }

  // .header--page-cart
  &--page-cart {
    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      .header__main-menu {
        display: none;
      }

      .header__personal {
        display: none;
      }

      .header__close-btn {

        @media screen and (min-width: 768px) {

        }

        @media screen and (min-width: 1280px) {
          display: flex;
        }

      }

    }
  }

  // .header--page-cart
  &--page-checkout {
    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      .header__main-menu {
        display: none;
      }

      .header__personal {
        display: none;
      }

      .header__close-btn {

        @media screen and (min-width: 768px) {

        }

        @media screen and (min-width: 1280px) {
          display: flex;
        }

      }

    }
  }

  // .header__mobile-app
  &__mobile-app {
    position: fixed;
    z-index: 999;
    top: calc(extClamp(0) + var(--safe-area-inset-top, 0));
    display: block;

    @media screen and (min-width: 768px) {
      display: none;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .header__inner
  &__inner {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: space-between;
    height: extClamp(30);
    padding-right: extClamp(16);
    padding-left: extClamp(16);

    @media screen and (min-width: 768px) {
      height: auto;
      padding-right: 40px;
      padding-left: 40px;
    }

    @media screen and (min-width: 1280px) {
      align-items: center;
      justify-content: flex-start;
      max-width: 1440px;
      margin-right: auto;
      margin-left: auto;
      padding: 0 60px 0;
      gap: 40px;
    }

  }

  // .header__logo
  &__logo {
    position: relative;
    top: extClamp(4);

    @media screen and (min-width: 768px) {
      top: 7px;
    }

    @media screen and (min-width: 1280px) {
      top: 4px;
    }
  }

  // .header__logo-icon
  &__logo-icon {
    width: extClamp(144);
    height: extClamp(29);
    transition: color 0.3s;
    color: #292929;

    @media screen and (min-width: 768px) {
      flex-shrink: 0;
      width: 264px;
      height: 54px;
    }

    @media screen and (min-width: 1280px) {
      width: 150px;
      height: 31px;
    }
  }

  // .header__phone
  &__phone {
    flex-shrink: 0;
    transition: color 0.3s;

    @media screen and (min-width: 768px) {
      width: 40px;
      height: 40px;
    }

    @media screen and (min-width: 1280px) {
      display: none;
    }
  }

  // .header__phone-icon
  &__phone-icon {
    width: extClamp(20);
    height: extClamp(20);

    @media screen and (min-width: 768px) {

      width: 40px;
      height: 40px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .header__close-btn
  &__close-btn {
    display: none;
    align-items: center;
    justify-content: center;
    height: 42px;
    margin-left: auto;
    padding: 10px 20px;
    cursor: pointer;
    color: var(---Primary-Gray, #969696);
    border-radius: 2000px;
    background: var(---Primary-LightGray, #f5f5f5);
    gap: 4px;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      gap: 5px;
    }
  }

  // .header__close-btn-icon
  &__close-btn-icon {
    width: 24px;
    height: 24px;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .header__back
  &__back {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    justify-content: center;
    width: extClamp(24);
    height: extClamp(24);
    transition: color 0.3s;
    transform: rotate(90deg);
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      width: 48px;
      height: 48px;
    }

    @media screen and (min-width: 1280px) {
      display: none;
    }

    > svg {
      @media screen and (min-width: 768px) {
        width: 40px;
        height: 40px;
      }

      @media screen and (min-width: 1280px) {

      }
    }

    // .header__back--is-main-page
    &--is-main-page {
      pointer-events: none;
      opacity: 0;
    }
  }

  // .header__catalog-header-categories
  &__catalog-header-categories {
    display: none;
    width: 100%;
    margin-top: extClamp(12);

    @media screen and (min-width: 768px) {
      margin-top: 34px;
    }

    @media screen and (min-width: 1280px) {
      margin-top: 20px;
    }

    // .header__catalog-header-categories--is-catalog-menu-show
    &--is-catalog-menu-show {
      display: block;
      @media screen and (min-width: 768px) {

      }

      @media screen and (min-width: 1280px) {
        padding-top: 25px;
        padding-bottom: 20px;
        border-top: 1px solid #e8e8e8;
        border-bottom: 1px solid #e8e8e8;
      }

    }

  }

  // .header--is-catalog-menu-show
  &--is-catalog-menu-show {
    padding-right: 0;
    padding-bottom: extClamp(12);
    padding-left: 0;
    background: #fff;

    @media screen and (min-width: 768px) {
      padding-bottom: 20px;
    }

    @media screen and (min-width: 1280px) {
      height: auto;
      padding-bottom: 0;
    }

    &::before {
      display: none;
    }

    .header__back,
    .header__phone,
    .header__logo {

    }

  }

  // .header--is-page-scrolled
  &--is-page-scrolled {
    //box-shadow: 0 4px 10px 0 rgba(131, 131, 131, 0.18);
  }

  // .header--reverse-color
  &--reverse-color {
    background-color: transparent;
    box-shadow: none;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      background-color: #fff;
    }

    &::before {
      position: absolute;
      top: 0;

      right: extClamp(0);
      left: extClamp(0);
      flex-shrink: 0;
      height: extClamp(82);
      content: '';
      pointer-events: none;
      background: linear-gradient(180deg, #000 -19.51%, #000 -19.5%, rgba(0, 0, 0, 0.00) 82.93%);

      @media screen and (min-width: 768px) {

      }

      @media screen and (min-width: 1280px) {
        content: none;
      }
    }

    .header__phone,
    .header__back,
    .header__logo-icon {
      position: relative;
      color: #fff;

      @media screen and (min-width: 1280px) {
        color: #292929;
      }
    }
  }

}

.header {
  // .header__personal
  &__personal {
    display: none;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      display: block;
      margin-left: auto;
    }
  }

  // .header__main-menu
  &__main-menu {

  }
}

.header-personal {
  display: flex;
  gap: 10px;

  @media screen and (min-width: 768px) {
    position: relative;
    top: 7px;
  }

  @media screen and (min-width: 1280px) {
    top: 0;
    gap: 16px;
  }

  // .header-personal__user
  &__user {
  }

  // .header-personal__cart
  &__cart {
  }
}



.header-user {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 42px;
  padding: 10px 20px;
  cursor: pointer;
  color: var(---Primary-Gray, #969696);
  border-radius: 2000px;
  background: var(---Primary-LightGray, #f5f5f5);
  gap: 5px;

  // .header-user--active
  &--active {
    color: var(---Main-Purple, #993ca6);
    background: #f5ecf6;
  }

  // .header-user__text
  &__text {
    font-size: 16px;
    font-weight: 600;
    line-height: 100%;
    text-align: center;

    font-feature-settings: 'liga' off, 'clig' off;

  }

  // .header-user__icon-wrapper
  &__icon-wrapper {

  }

  // .header-user__icon
  &__icon {
    width: 24px;
    height: 24px;
  }
}

</style>
