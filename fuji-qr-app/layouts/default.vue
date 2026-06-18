<template>
  <div
    :class="{
      'layout--has-layout-shadow-bottom': $store.state.view.hasLayoutShadowBottom,
      'is-not-app-load': isPreloadShow
    }"
    class="layout layout--default safe-top safe-left safe-right safe-bottom"
  >
    <OneTimeMarchModal />
    <div
      id="captcha-container"
      style="display: none;"
    />
    <notifications
      class="layout__notifications"
      group="messages"
      position="top center"
    >
      <template
        #body="props"
      >
        <div
          :class="[props.item.type]"
          class="custom-vue-notification"
          @click="props.close"
        >
          <div class="notification-content">
            <svg-icon
              v-if="props.item.type === 'error'"
              class="notification-content__icon"
              name="i-notification-error"
            />
            <svg-icon
              v-if="props.item.type === 'success'"
              class="notification-content__icon"
              name="i-notification-success"
            />
            <div class="notification-content__body">
              <div
                v-if="props.item.title"
                class="notification-content__title"
              >
                <svg
                  v-if="props.item.type === 'info'"
                  class="notification-content__title-icon"
                >
                  <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#notification-info" />
                </svg>
                {{ props.item.title }}
              </div>
              <div
                class="notification-content__text"
                v-html="props.item.text"
              />
            </div>
          </div>
        </div>
      </template>
    </notifications>

    <!--    <AppUpdate v-if="$store.getters['isAppNeedUpdate']" />-->
    <div
      v-show="!isPreloadShow"
      :class="globalPageClasses"
      class="page"
    >
      <div class="header-wrapper">
        <div
          v-if="hasPageSlider"
          class="header-slider-wrapper"
        >
          <portal-target name="header-slider" />
        </div>

        <TheHeader
          ref="header"
          :is-header-on-slider="$store.getters['view/isHeaderOnSlider']"
          class="page__header"
        />
        <StatusStepper
          v-show="isMainPage"
          class="page__status-stepper"
        />
      </div>

      <main class="page__main main">
        <nuxt class="main__slot" />
      </main>

      <client-only>
        <TheModals />
        <TheMobileBottomMenu
          v-show="!isMobileBottomMenuHidden"
        />
      </client-only>

      <TheFooter
        ref="footer"
        class="page__footer"
      />
    </div>
    <AppPreload v-show="isPreloadShow" />
    <StoriesIndex v-if="$store.state.view.isStoriesShow" />
  </div>
</template>

<script>
import {
  getScrollDirection, hasPageSlider, normalizeRouteName,
} from '~/lib/common';
import { checkGifts } from '~/modules/gift/gift.service';
import AppPreload from '~/components/AppPreload.vue';
import OneTimeMarchModal from '~/components/Modal/OneTimeMarchModal.vue';
import StatusStepper from '~/components/Order/StatusStepper.vue';

export default {
  components: {
    StatusStepper, AppPreload, OneTimeMarchModal,
  },

  data() {
    return {
      isIntersecting: false,

      //
      headerSliderObserver: null,
      fetchNotificationInterval: null,

      //
      minimumTimeElapsed: false,
    };
  },

  head() {
    return {
      bodyAttrs: {
        class: [
          this.$store.getters['modal/isShowModal'] ? 'scroll-hidden' : '',
          this.$store.getters['view/isScrollPageHidden'] ? 'scroll-hidden' : '',
          this.$store.getters['modal/isShowModal'] ? 'is-modal-show' : '',
        ],
      },
      meta: [{ name: 'yandex-verification', content: 'bd7bbc716263b0b8' }],
    };
  },

  computed: {
    globalPageClasses() {
      const result = [];

      const routeName = normalizeRouteName(this.$route.name);
      result.push(`page--${routeName}`);

      return result;
    },

    isMainPage() {
      const routeName = normalizeRouteName(this.$route.name);
      return routeName === 'index';
    },
    cartItems() {
      return this.$store.getters['cart/cartItems'];
    },
    hasPageSlider() {
      return hasPageSlider(normalizeRouteName(this.$route.name));
    },

    isMobileBottomMenuHidden() {
      if (this.$store.state.modal.component === 'CatalogDetailItem') {
        return true;
      }
      if (this.$store.state.modal.component === 'AppAuth') {
        return true;
      }
      if (this.$store.state.modal.component === 'Address') {
        return true;
      }
      if (this.$store.getters['modal/isShowModal']) {
        return false;
      }
      if (this.isIntersecting && !this.$store.getters['modal/isShowModal']) {
        return true;
      }

      const EXCLUDED_PAGES = ['cart', 'checkout', 'complete', 'complete-error'];

      const pageName = normalizeRouteName(this.$route.name);

      return EXCLUDED_PAGES.includes(pageName);
    },
    isPreloadShow() {
      return false;
      return !this.minimumTimeElapsed || !this.$store.getters['catalog/isCatalogLoad'];
    },
    IS_SITE_INFORMATION() {
      return this.$store.getters['setting/IS_SITE_INFORMATION'];
    },
  },
  watch: {
    $route(newPath, oldPath) {
      this.$store.commit('modal/hideModal');
      this.$store.commit('view/resetAllHiddenBlocks');

      if (newPath.name !== oldPath.name) {
        this.$store.commit('view/setIsCatalogCategoriesIntersecting', false);
      }
      if (newPath.name !== 'index') {
        this.$store.commit('catalog/clearAllFilers');
      }
    },
    IS_SITE_INFORMATION(newValue) {
      if (newValue) {
        this.showSiteInfoModal();
      }
    },
    cartItems(newCartItems) {
      checkGifts(newCartItems); // TODO: move cart.service.ts
    },
  },
  created() {
    setTimeout(() => {
      this.minimumTimeElapsed = true;
    }, 3000);
  },

  mounted() {
    if (this.$refs.footer?.$el) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          this.isIntersecting = entry.isIntersecting;
        });
      }, { rootMargin: '-62px' });

      observer.observe(this.$refs.footer.$el);

      this.fetchNotificationInterval = setInterval(() => this.fetchNotifications(), 1000 * 60);
      this.fetchNotifications();
    }

    window.addEventListener('scroll', () => {
      this.handleScroll();
    });

    if (this.IS_SITE_INFORMATION) {
      this.showSiteInfoModal();
    }
  },

  beforeDestroy() {
    window.removeEventListener('scroll', this.handleScroll);
  },
  methods: {
    handleScroll() {
      this.$store.commit('view/setIsPageScroll', this.isScrolled = window.scrollY > 0);

      const direction = getScrollDirection();
      this.$store.commit('view/setScrollDirection', direction);
    },
    showSiteInfoModal() {
      this.$store.commit(
        'modal/showInformationModal',
        { TEXT_SITE_INFORMATION: this.$store.getters['setting/TEXT_SITE_INFORMATION'] },
        { root: true },
      );
    },

    fetchNotifications() {
      this.$store.dispatch('notification/fetchNotifications');
    },

  },
};
</script>

<style lang="scss"
       scoped
>

.page {
  display: flex;

  flex-direction: column;
  max-width: 100vw;
  min-height: 100vh;
  padding-top: extClamp(72);

  @media screen and (min-width: 768px) {
    padding-top: 126px;
  }

  @media screen and (min-width: 1280px) {
    padding-top: 90px;
  }

  // .page__header
  &__header {

  }

  // .page__status-stepper
  &__status-stepper {
    position: fixed;
    z-index: 150;
    top: 0;
    right: 0;
    left: 0;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      display: none;
    }
  }

  // .page__footer
  &__footer {

    @media screen and (min-width: 768px) {
      margin-top: 36px;
      padding-top: 0;
      padding-bottom: 0;
    }

    @media screen and (min-width: 1280px) {
      margin-top: 36px;
      padding-top: 20px;
      padding-bottom: 20px;
    }
  }

  &--complete-error,
  &--complete,
  &--personal,
  &--cart,
  &--checkout,
  &--promocodes,
  &--promocodes-id,
  &--page-promocodes {
    padding-top: 0;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      padding-top: 90px;
    }

    .header {
      display: none;

      @media screen and (min-width: 768px) {

      }

      @media screen and (min-width: 1280px) {
        display: block;
      }
    }

    .footer {
      display: none;

      @media screen and (min-width: 768px) {

      }

      @media screen and (min-width: 1280px) {
        display: block;
      }
    }
  }

  // .page--checkout
  &--checkout {
    &::v-deep {
      .checkout-page__header {
        @media screen and (min-width: 768px) {

        }

        @media screen and (min-width: 1280px) {
          display: none;
        }
      }
    }
  }

  // .page--personal
  &--personal {
    margin-top: calc(var(--safe-area-inset-top, 0) * -1);
    padding-top: var(--safe-area-inset-top, 0);
    background: linear-gradient(180deg, #db9dee 0%, #6f81b4 100%);

    .header {
      @media screen and (min-width: 768px) {

      }

      @media screen and (min-width: 1280px) {
        position: relative;
        background: transparent;
      }
    }

    .footer {
      @media screen and (min-width: 768px) {

      }

      @media screen and (min-width: 1280px) {
        margin-top: 0;
      }
    }
  }

  // .page--catalog-search
  &--catalog-search {
    padding-top: extClamp(10);
    padding-bottom: extClamp(100);

    .header {
      display: none;

      @media screen and (min-width: 768px) {

      }

      @media screen and (min-width: 1280px) {
        display: block;
      }
    }

    .footer {
      display: none;
    }
  }

  &--catalog-section-product_id {
    padding-top: 0;

    .header {

    }

    .footer {

    }
  }

}

.main {
  position: relative;
  display: flex;
  flex-grow: 1;
  flex-wrap: wrap;
  justify-content: center;

  @media screen and (min-width: 768px) {

  }

  @media screen and (min-width: 1280px) {
    padding-top: 24px;
  }

  // .main__slot
  &__slot {
    position: relative;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    width: 100%;

  }
}

.layout {
  position: relative;

  //.layout--has-layout-shadow-bottom
  &--has-layout-shadow-bottom {
    &::after {
      position: fixed;
      z-index: 90;
      right: 0;
      bottom: 0;
      left: 0;
      flex-shrink: 0;
      height: var(--layout-bottom-shadow);
      content: "";
      pointer-events: none;
      background: linear-gradient(0deg,
        rgba(0, 0, 0, 1) 0%,
        rgba(1, 0, 12, 0.95) 10%, rgba(1, 0, 10, 0.9) 20%,
        rgba(1, 0, 9, 0.85) 30%, rgba(1, 0, 8, 0.8) 40%,
        rgba(1, 0, 7, 0.75) 50%, rgba(1, 0, 6, 0.65) 60%,
        rgba(0, 0, 0, 0) 100%);

    }
  }

  // .layout__notifications
  &__notifications {
    margin-top: calc(0 + var(--safe-area-inset-top, 0));
  }

}

.header-wrapper {

}

.header-slider-wrapper {
  position: relative;
  min-height: extClamp(406);
  margin-top: calc(extClampNegative(72) - var(--safe-area-inset-top, 0));
  padding-right: 0;
  padding-left: 0;

  @media screen and (min-width: 768px) {
    margin-top: -149px;

  }

  @media screen and (min-width: 1024px) {
    min-height: 0;
  }

  @media screen and (min-width: 1280px) {
    overflow-x: hidden;
    margin-top: 0;
    padding-right: 0;
    padding-left: 0;
  }
}

.is-not-app-load {
  background-color: #993ca6;
}
</style>
