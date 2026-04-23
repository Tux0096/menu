<template>
  <nav class="main-menu">
    <ul class="main-menu__list">
      <li
        v-for="item in visibleItems"
        :key="item.slug"
        :class="{...{'main-menu__item--hide': isHiddenAllExceptBtn}, ...item.wrapperClass}"
        class="main-menu__item"
        @click="onClick(item)"
      >
        <NuxtLink
          :class="item.class"
          :to="item.slug"
          active-class="main-menu__link--active"
          class="main-menu__link"
        >
          <svg
            v-if="item.hasBtnIcon"
            class="main-menu__icon"
          >
            <use xlink:href="~/assets/images/icons/svg/sprite.svg#category" />
          </svg>
          {{ item.name }}
        </NuxtLink>
      </li>
      <li
        v-if="hasMore"

        class="main-menu__item main-menu__item--more"
        @mouseleave="hideDropdown"
        @mouseover="showDropdown"
      >
        <div
          :class="{'main-menu__item--hide': isHiddenAllExceptBtn}"
          class="main-menu__link main-menu__link--more"
        >
          Ещё
          <svg class="">
            <use xlink:href="~/assets/images/icons/svg/sprite.svg#moresquare" />
          </svg>
        </div>
        <div
          v-if="isShowDropdown"
          class="main-menu__dropdown"
        >
          <ul
            class="main-menu-dropdown"
          >
            <li
              v-for="item in hiddenItems"
              :key="item.slug"
              class="main-menu-dropdown__item"
            >
              <NuxtLink
                :to="item.slug"
                class="main-menu-dropdown__link"
              >
                {{ item.name }}
              </NuxtLink>
            </li>
          </ul>
        </div>
      </li>
    </ul>
  </nav>
</template>

<script>

export default {
  name: 'AppMainMenu',
  props: {
    numberVisibleItems: {
      type: Number,
      default: 10,
    },
    isHiddenAllExceptBtn: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      items: [
        {
          slug: '',
          name: 'Меню',
          class: ['main-menu__link--btn'],
          wrapperClass: { 'main-menu__item--btn': true },
          hasBtnIcon: true,
          onClick: () => {
            this.$store.commit('modal/showCatalogModal');
          },
        },
        { slug: '/promo', name: 'Акции' },
        { slug: '/delivery', name: 'Доставка' },
        { slug: '/restaurant', name: 'Рестораны' },
        { slug: '/about', name: 'О компании' },
        { slug: '/vacancies', name: 'Вакансии' },
      ],
      isShowDropdown: false,
    };
  },
  computed: {
    visibleItems() {
      return [...this.items].splice(0, this.numberVisibleItems);
    },
    hiddenItems() {
      return [...this.items].splice(this.numberVisibleItems);
    },
    hasMore() {
      return this.hiddenItems.length > 0;
    },
  },
  watch: {
    $route() {
      this.isShowDropdown = false;
    },
  },
  methods: {
    onClick(item) {
      if (item.onClick) {
        item.onClick();
      }
    },
    showDropdown() {
      this.isShowDropdown = true;
    },
    hideDropdown() {
      this.isShowDropdown = false;
    },
  },
};
</script>

<style lang="scss" scoped>
.main-menu {
  // .main-menu__list
  &__list {
    display: flex;
    flex-direction: column;
    gap: extClamp(40);

    @media screen and (min-width: 768px) {
      gap: 40px
    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .main-menu__item
  &__item {
    position: relative;
    list-style: none;

    // .main-menu__item--hide
    &--hide {
      &:not(.main-menu__item--btn) {

      }
    }

    // .main-menu__item--more
    &--more {
      color: #c1c2cb;

      &:hover {
        color: #ff6523;
      }
    }

  }

  // .main-menu__link
  &__link {
    font-size: extClamp(32);
    font-weight: 700;
    line-height: 1.15;

    // .main-menu__link--active
    &--active {

    }

    // .main-menu__link--more
    &--more {
      display: flex;
      align-items: center;
      cursor: pointer;
      gap: extClamp(8);

      @media screen and (min-width: 768px) {
        gap: 10px;
      }

      @media screen and (min-width: 1280px) {

      }

      > svg {
        width: extClamp(24);
        height: extClamp(24);
        margin-right: extClamp(14);

        @media screen and (min-width: 768px) {
          width: 40px;
          height: 40px;
          margin-right: 20px;
        }

        @media screen and (min-width: 1280px) {

        }
      }
    }

    // .main-menu__link--btn
    &--btn {
      display: flex;
      align-items: center;
      gap: extClamp(8);

      @media screen and (min-width: 768px) {
        gap: 10px;
      }

      @media screen and (min-width: 1280px) {

      }

      > svg {
        display: none;
        width: extClamp(24);
        height: extClamp(24);
        transform: rotate(180deg);
        color: #ff392e;

        @media screen and (min-width: 768px) {
          width: 40px;
          height: 40px;
        }

        @media screen and (min-width: 1280px) {

        }

      }
    }
  }

  // .main-menu__dropdown
  &__dropdown {
    position: absolute;
    z-index: 10;
    left: 50%;
    padding-top: extClamp(9);
    transform: translateX(-50%);

    @media screen and (min-width: 768px) {
      padding-top: 9px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

}

.main-menu-dropdown {
  position: relative;
  z-index: 10;
  top: calc(100% + extClamp(10));
  display: flex;
  align-items: center;
  padding: extClamp(16) extClamp(45);
  border-radius: extClamp(16);
  background: #404353;
  gap: extClamp(24);

  @media screen and (min-width: 768px) {
    top: calc(100% + 10px);
    padding: 20px 30px;
    border-radius: 20px;
    gap: 40px;
  }

  @media screen and (min-width: 1280px) {

  }

  &::before {
    position: absolute;
    top: extClamp(-9);
    left: 50%;
    display: block;
    width: extClamp(29);
    height: extClamp(10);
    content: '';
    transform: translateX(-50%);
    background-image: url(~assets/images/icons/svg/dropdown-arrow.svg);

    @media screen and (min-width: 768px) {
      top: -9px;
      width: 40px;
      height: 40px;

    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .main-menu-dropdown__item
  &__item {
  }

  // .main-menu-dropdown__link
  &__link {
    @include WebCaption;
    white-space: nowrap;
    color: #fff;
  }
}
</style>
