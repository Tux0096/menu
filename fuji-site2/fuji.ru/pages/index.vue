<template>
  <div class="page-content">
    <div class="page-index">
      <div

        ref="page-index-catalog-categories"
        class="page-index__catalog-categories"
      >
        <CatalogHeaderCategories />
      </div>

      <div id="top-of-catalog" />
      <template v-if="catalog?.length > 0">
        <CatalogSection
          v-for="currentSectionData in catalog"
          :id="`catalog-section-${currentSectionData.slug}`"
          :key="currentSectionData.id"
          :current-section-data="currentSectionData"
          :has-more="true"
          class="page-index__catalog-section"
          group-title-tag="h2"
          item-title-tag="h3"
        />
      </template>
      <lord-icon
        v-else
        :src="`/assets/libs/icon-json/clock.json`"
        class="page-index__empty-icon"
        trigger="loop"
      />
      <AppMainTextBlock
        class="page-index__text"
      >
        <template #title>
          Доставка роллов и суши на дом в {{ $store.getters['city/cityIn'] }} для вас!
        </template>
        <template #footer>
          <BaseButton
            class="page-index__btn"
            type="outline"
            @click="$router.push('/about')"
          >
            Подробнее
          </BaseButton>
        </template>
        <p>
          Добро пожаловать на сайт компании Фуджи Суши! Мы занимаемся доставкой суши и роллов на дом в
          {{ $store.getters['city/cityIn'] }}.
        </p>

        <p>
          В любое время, когда вам захочется, в любом месте, дома, в гостях, на вечеринке, вы сможете насладиться
          вкусами любимой японской кухни!
        </p>

        <p>
          В России японская кухня быстро завоевала любовь гурманов и не намерена сдавать свои позиции. Доставка суши
          и роллов пользуется огромной популярностью!
        </p>

        <p>
          И в Самаре есть такое место, где можно заказать доставку роллов на дом и доставку суши на дом, при этом
          быть уверенным, что все блюда будут очень вкусными, сделанными опытными сушистами. Конечно, это Фуджи Суши!
        </p>

        <p>
          В нашем меню разнообразно представлена японская кухня. Это всевозможные роллы – классические, теплые,
          сладкие
          роллы для сладкоежек, запеченные роллы для гурманов, сеты для больших компаний или просто для
          гастрономического праздника, большие роллы, для тех, кто привык к большим порциям, фруктовые роллы, которые
          особенно любят дети. Конечно же, суши и сашими.
        </p>
      </AppMainTextBlock>
    </div>
  </div>
</template>

<script>
import { scrollToCatalogCategory } from '~/lib/common';
import CatalogHeaderCategories from '~/components/Catalog/CatalogHeaderCategories.vue';

export default {
  name: 'PageIndex',
  components: { CatalogHeaderCategories },
  validate({ store, route }) {
    // не делать проверку, то 404 ошибка на главной глючит например https://fuji.ru/samara/check404
    // не отрабатывал правильно
    if (route.name !== 'city-index') {
      return true;
    }
    const { city } = route.params;

    return city === store.getters['city/city'].slug;
  },

  data() {
    return {};
  },

  head() {
    return {
      title: `Доставка еды. Пицца, суши, роллы в ${this.$store.getters['city/cityIn']} Фуджи Суши Friends`,
      meta: [
        {
          hid: 'description',
          name: 'description',
          // eslint-disable-next-line max-len,vue/max-len
          content: `Доставка еды в ${this.$store.getters['city/cityIn']}. В Фуджи Суши Friends можно заказать блюда итальянской и японской кухни: пицца, суши, роллы и др. 8 800 2222-000`,
        },
      ],
    };
  },
  computed: {
    catalog() {
      return this.$store.getters['catalog/catalogIsIncludedInMenu'].filter((el) => el.items.length);
    },

    isCatalogMenuShow() {
      const { isCatalogCategoriesIntersecting, scrollDirection } = this.$store.state.view;
      return isCatalogCategoriesIntersecting && scrollDirection === 'down';
    },

  },
  beforeDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  },
  mounted() {
    const safeAreaInsetTop = getComputedStyle(document.documentElement)
      .getPropertyValue('--safe-area-inset-top');
    let safeAreaInsetTopValue = parseInt(safeAreaInsetTop, 10);

    if (Number.isNaN(safeAreaInsetTopValue)) {
      safeAreaInsetTopValue = 0;
    }

    const marginTop = 105 + safeAreaInsetTopValue;

    const options = {
      root: null,
      rootMargin: `-${marginTop}px 0px 0px 0px`,
      threshold: 0,
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const isDirectionTop = entry.boundingClientRect?.top < entry.rootBounds?.top;

        this.$store.commit('view/setIsCatalogCategoriesIntersecting', isDirectionTop && !entry.isIntersecting);
      });
    }, options);

    this.observer.observe(this.$refs['page-index-catalog-categories']);

    //

    this.$nextTick(() => {
      const slug = this.$route.query.scrollToCatalogSection;
      setTimeout(() => {
        const sectionElement = document.getElementById(`catalog-section-${slug}`);
        if (sectionElement) {
          scrollToCatalogCategory(sectionElement);
        }
      }, 500);
    });
  },

};
</script>

<style lang="scss"
       scoped
>

.page-index {
  // .page-index__catalog-categories
  &__catalog-categories {
    height: extClamp(30);
    margin-right: extClampNegative(16);
    margin-left: extClampNegative(16);

    @media screen and (min-width: 768px) {
      $margin: calc((100vw - 730px) / 2);
      height: 52px;
      margin-top: 0;
      margin-right: calc($margin * -1);
      margin-bottom: 0;
      margin-left: calc($margin * -1);
    }

    @media screen and (min-width: 1280px) {
      $margin: calc((100vw - 1320px - 6px) / 2);
      height: auto;
      margin-top: 0;
      margin-right: calc($margin * -1);
      margin-left: calc($margin * -1);
    }
  }

  // чтобы не дергалась страница
  // .page-index__catalog-categories-stub
  &__catalog-categories-stub {
    height: extClamp(30);

    @media screen and (min-width: 768px) {
      height: 47px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .page-index__catalog-section
  &__catalog-section {
    margin-top: extClamp(12);
    margin-bottom: extClamp(12);

    @media screen and (min-width: 768px) {
      margin-top: 36px;
      margin-bottom: 64px;
    }

    @media screen and (min-width: 1280px) {
      margin-top: 36px;
      margin-bottom: 36px;
    }

  }

  // .page-index__empty-icon
  &__empty-icon {
    display: block;
    width: extClamp(120);
    height: extClamp(121);
    margin: extClamp(40) auto 0;

    @media screen and (min-width: 768px) {
      width: 240px;
      height: 240px;
      margin: 40px auto 0;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .page-index__text
  &__text {
    margin-top: extClamp(24);

    @media screen and (min-width: 768px) {
      margin-top: 60px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .page-index__btn
  &__btn {
    width: 100%;
    max-width: extClamp(327);

    @media screen and (min-width: 768px) {
      max-width: 100%;

    }

    @media screen and (min-width: 1280px) {

    }
  }
}

</style>
