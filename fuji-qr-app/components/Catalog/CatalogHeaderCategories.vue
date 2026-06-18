<template>
  <div
    v-if="$store.state.catalog.isCatalogLoad"
    ref="category-menu-wrapper"
    class="catalog-header-categories-wrapper"
  >
    <portal to="catalog-header-categories">
      <div
        ref="category-menu"
        class="catalog-header-categories"
      >
        <div

          class="catalog-header-categories__inner"
        >
          <div
            v-for="(item, index) in catalogMenu"
            :id="`catalog-header-category-id-${item.slug}`"
            :key="`${item.slug}-${index}`"
            :class="{'catalog-header-category--active': item === selectedItem}"
            class="catalog-header-categories__item catalog-header-category"
            @click="onMenuItemClick(item)"
          >
            <div class="catalog-header-category__title">
              {{ item.name }}
            </div>
          </div>
          <!--        у последнего элемента нет расстояния справа-->
          <div class="catalog-header-categories__item catalog-header-categories__item--stub" />
        </div>
      </div>
    </portal>

    <div
      class="catalog-header-categories"
    >
      <div class="catalog-header-categories__inner">
        <div

          v-for="(item, index) in catalogMenu"
          :id="`catalog-header-category-id-${item.slug}`"
          :key="`${item.slug}-${index}`"
          :class="{'catalog-header-category--active': item === selectedItem}"
          class="catalog-header-categories__item catalog-header-category"
          @click="onMenuItemClick(item)"
        >
          <div class="catalog-header-category__title">
            {{ item.name }}
          </div>
        </div>
        <!--        у последнего элемента нет расстояния справа-->
        <div class="catalog-header-categories__item catalog-header-categories__item--stub" />
      </div>
    </div>
    <div
      v-if="submenu.length"
      class="overlay"
    />
    <div
      v-if="submenu.length"
      class="catalog-header-categories__submenu submenu"
    >
      <div class="submenu__inner">
        <div
          v-for="submenuItem in submenu"
          :key="submenuItem.slug"

          class="submenu__item submenu-item"
          @click="onMenuItemClick(submenuItem)"
        >
          <div class="submenu-item__image-wrapper">
            <nuxt-img
              v-if="submenuItem?.image"
              :alt="submenuItem.name"
              :src="submenuItem.image"
              class="submenu-item__image"
              format="webp"
              loading="lazy"
              quality="90"
              width="300"
            />
          </div>
          <div class="submenu-item__name">
            {{ submenuItem.name }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>

import { scrollToCatalogCategory } from '~/lib/common';

export default {
  name: 'CatalogHeaderCategories',
  data() {
    return {
      submenu: [],
      selectedItem: null,

      isScrolling: false,
      startX: 0,
      scrollLeft: 0,

    };
  },
  computed: {
    catalogMenu() {
      return this.$store.getters['setting/CATALOG_MENU'];
    },
    isTableMode() {
      return this.$store.getters['tableSession/isActive'];
    },
  },
  watch: {
    submenu(items) {
      this.$store.commit('view/setIsPageScrollHidden', items.length > 0);
    },
  },
  unmounted() {
    document.body.removeEventListener('click', this.clickOutside);
    const categoryMenu = this.$refs['category-menu'];
    if (categoryMenu) {
      categoryMenu.removeEventListener('mousedown', this.onMouseDown);
      categoryMenu.removeEventListener('mousemove', this.onMouseMove);
      categoryMenu.removeEventListener('mouseup', this.onMouseUp);
      categoryMenu.removeEventListener('mouseleave', this.onMouseUp);
    }
  },
  mounted() {
    document.body.addEventListener('click', this.clickOutside);

    setTimeout(() => {
      const categoryMenu = this.$refs['category-menu'];

      const categoryMenus = document.querySelectorAll('.catalog-header-categories');
      if (categoryMenus?.length > 0) {
        categoryMenus.forEach((categoryMenu) => {
          categoryMenu.addEventListener('mousedown', (event) => this.onMouseDown(event, categoryMenu));
          categoryMenu.addEventListener('mousemove', (event) => this.onMouseMove(event, categoryMenu));
          categoryMenu.addEventListener('mouseup', this.onMouseUp);
          categoryMenu.addEventListener('mouseleave', this.onMouseUp);
        });
      }
      // if (categoryMenu) {
      //   categoryMenu.addEventListener('mousedown', this.onMouseDown);
      //   categoryMenu.addEventListener('mousemove', this.onMouseMove);
      //   categoryMenu.addEventListener('mouseup', this.onMouseUp);
      //   categoryMenu.addEventListener('mouseleave', this.onMouseUp);
      // }
    });
  },

  methods: {
    onMenuItemClick(item) {
      this.selectedItem = item;

      if (!item.isParent) {
        this.closeSubmenu();
        this.$nextTick(() => {
          const sectionElement = document.getElementById(`catalog-section-${item.slug}`);
          if (sectionElement) {
            scrollToCatalogCategory(sectionElement);
            return;
          }
          if (this.isTableMode) {
            this.$router.push(`/catalog/${item.slug}`);
          }
        });

        return;
      }

      this.submenu = item.children;
      const categoryMenuElement = this.$refs['category-menu'];
      if (categoryMenuElement) {
        categoryMenuElement.scrollIntoView({ behavior: 'auto' });
      }
    },

    clickOutside(event) {
      const categoryMenuWrapper = this.$refs['category-menu-wrapper'];
      if (!categoryMenuWrapper) {
        return;
      }
      const categoryMenu = this.$refs['category-menu'];
      if (categoryMenu && categoryMenu.contains(event.target)) {
        return;
      }

      const isClickInside = categoryMenuWrapper.contains(event.target);
      if (!isClickInside) {
        this.closeSubmenu();
      }
    },
    closeSubmenu() {
      this.submenu = [];
    },

    onMouseDown(event, categoryMenu) {
      this.isScrolling = true;
      this.startX = event.pageX - categoryMenu.offsetLeft;
      this.scrollLeft = categoryMenu.scrollLeft;
    },
    onMouseMove(event, categoryMenu) {
      if (!this.isScrolling) return;
      event.preventDefault();
      const x = event.pageX - categoryMenu.offsetLeft;
      const walk = (x - this.startX);
      categoryMenu.scrollLeft = this.scrollLeft - walk;
    },
    onMouseUp() {
      this.isScrolling = false;
    },

  },
};
</script>

<style lang="scss"
       scoped
>
.catalog-header-categories-wrapper {
  position: relative;
}

.catalog-header-categories {
  position: relative;
  z-index: 2;
  overflow: auto;
  width: 100%;
  padding-right: extClamp(16);
  padding-left: extClamp(16);
  background-color: #fff;

  @media screen and (min-width: 768px) {
    padding-right: 20px;
    padding-left: 20px;
  }

  @media screen and (min-width: 1280px) {
    $margin: calc((100vw - 1320px - 6px) / 2);
    // overflow: visible;
    padding-left: $margin;

  }

  &::-webkit-scrollbar {
    display: none;
  }

  // .catalog-header-categories__inner
  &__inner {
    display: flex;
    width: auto;
    gap: extClamp(16);

    @media screen and (min-width: 768px) {
      gap: 16px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .catalog-header-categories__item
  &__item {

    // .catalog-header-categories__item--stub
    &--stub {
      flex-shrink: 0;
      width: 1px;
      height: 1px;
    }
  }

  // .catalog-header-categories__submenu
  &__submenu {
    position: absolute;
    top: 100%;
    right: 0;
    left: 0;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {

    }

  }
}

.catalog-header-category {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: extClamp(8) extClamp(10);
  cursor: pointer;
  border: 1px solid #f0f0f0;
  border-radius: extClamp(16);
  background: var(---Primary-LightGray, #f5f5f5);

  @media screen and (min-width: 768px) {
    padding: 16px 20px;
  }

  @media screen and (min-width: 1280px) {
    padding: 10px;
  }

  // .catalog-header-category--active
  &--active {
    border: 1px solid var(---Main-Purple, #993ca6);
    border-color: #993ca6;

    border-radius: 16px;
    background-color: #fff;

    @media screen and (min-width: 768px) {
      border-radius: 26px;
    }

    @media screen and (min-width: 1280px) {

    }

    .catalog-header-category__title {
      color: #993ca6;
    }

  }

  // .catalog-header-category__title
  &__title {
    font-size: extClamp(12);
    font-weight: 500;
    font-style: normal;
    line-height: 95%;
    white-space: nowrap;
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 20px;
      line-height: 92%;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      line-height: 63%;
    }
  }
}

.submenu {
  z-index: 2;
  padding: extClamp(12) extClamp(12) extClamp(16);
  border-radius: 0 0 extClamp(20) extClamp(20);
  background-color: #fff;

  @media screen and (min-width: 768px) {
    padding: 36px 0;
    border-radius: 0 0 16px 16px;

  }

  @media screen and (min-width: 1280px) {
    padding: 24px 0;
  }

  // .submenu__inner
  &__inner {
    display: flex;
    overflow-y: auto;
    flex-wrap: wrap;
    justify-content: center;
    max-height: calc(100vh - extClamp(180));
    gap: extClamp(6);

    @media screen and (min-width: 768px) {
      max-height: calc(100vh - 320px);
      padding: 0 20px;
      gap: 8px;
    }

    @media screen and (min-width: 1280px) {

      margin-right: 64px;
      margin-left: 64px;
      gap: 8px;
    }
  }

  // .submenu__item
  &__item {
    width: calc(100% / 3 - (extClamp(20) / 3));
    max-width: extClamp(84);

    @media screen and (min-width: 768px) {
      width: 164px;
      max-width: none;
      min-height: 196px;
    }

    @media screen and (min-width: 1280px) {
      width: 164px;
    }
  }
}

.submenu-item {
  display: flex;
  overflow: hidden;
  align-items: center;
  flex-direction: column;
  padding: extClamp(12) extClamp(6);
  border: extClamp(1) solid var(---Primary-Gray, #969696);
  border-radius: extClamp(12);
  gap: extClamp(4);

  @media screen and (min-width: 768px) {
    display: flex;
    padding: 8px;
    border-width: 1px;
    border-radius: 16px;
    gap: 0;
  }

  @media screen and (min-width: 1280px) {
    min-height: initial;
    padding: 8px;
    border-radius: 16px;
    gap: 0;
  }

  // .submenu-item__image-wrapper
  &__image-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: extClamp(72);
    height: extClamp(68);

    @media screen and (min-width: 768px) {
      width: 136px;
      height: 123px;
    }

    @media screen and (min-width: 1280px) {
      width: 136px;
      height: 123px;
    }
  }

  // .submenu-item__image
  &__image {
  }

  // .submenu-item__name
  &__name {
    font-size: extClamp(10);
    font-weight: 600;
    font-style: normal;
    line-height: 120%;
    margin: auto;
    text-align: center;
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 58px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      font-weight: 500;
      font-style: normal;
      line-height: 120%;
      display: flex;
      align-items: center;
      height: 58px;
    }
  }
}

.overlay {
  position: fixed;
  z-index: 1;
  top: calc(var(--safe-area-inset-top, 0) + extClamp(100));
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.50);

  @media screen and (min-width: 768px) {
    top: calc(var(--safe-area-inset-top, 0) + 130px);
  }

  @media screen and (min-width: 1280px) {

  }

}
</style>
