<template>
  <div class="additional-items">
    <div
      v-if="title.length"
      class="additional-items__title"
    >
      {{ title }}
    </div>
    <div class="additional-items__inner">
      <swiper :options="swiperOptions">
        <swiper-slide
          v-for="item in items"
          :key="item.id"
          class="additional-items__slide"
        >
          <component
            :is="`AdditionalItemV${version}`"
            :class="`additional-items__item--v${version}`"
            :item="item"
            class="additional-items__item"
          />
        </swiper-slide>

        <div
          slot="pagination"
          class="additional-items__swiper-pagination swiper-pagination"
        />
      </swiper>
    </div>
  </div>
</template>

<script>
import AdditionalItemV1 from '~/components/Cart/AdditionalItemV1.vue';
import AdditionalItemV2 from '~/components/Cart/AdditionalItemV2.vue';

export default {
  name: 'AdditionalItems',
  components: { AdditionalItemV1, AdditionalItemV2 },
  props: {
    title: {
      type: String,
      default: '',
    },
    items: {
      type: Array,
      default: () => ([]),
    },
    version: {
      type: String,
      default: '1',
    },
  },
  data() {
    return {
      swiperOptions: {
        direction: 'horizontal',
        loop: false,
        spaceBetween: 12,
        slidesPerView: 'auto',
        autoplay: {
          delay: 30000,
        },

        breakpoints: {
          768: {
            spaceBetween: 16,

          },
          1280: {
            spaceBetween: 16,

          },
        },

        pagination: {
          el: '.swiper-pagination',
          clickable: true,
        },

      },
    };
  },
};
</script>

<style lang="scss"
       scoped
>
.additional-items {

  // .additional-items__title
  &__title {
    font-size: extClamp(18);
    font-weight: 600;
    font-style: normal;
    line-height: 120%;
    margin-bottom: extClamp(8);
    color: var(---Main-Purple, #993ca6);

    @media screen and (min-width: 768px) {
      font-size: 24px;
      line-height: normal;
      margin-bottom: 16px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 36px;
      font-weight: 600;
      font-style: normal;
      line-height: 100%;
      margin-bottom: 24px;
      font-feature-settings: 'liga' off, 'clig' off;
    }
  }

  // .additional-items__inner
  &__inner {
    display: flex;
    overflow-x: hidden;
    margin-right: extClampNegative(10);
    margin-left: extClampNegative(10);
    gap: extClamp(10);

    @media screen and (min-width: 768px) {
      margin-right: -24px;
      margin-left: -24px;
      gap: 16px;
    }

    @media screen and (min-width: 1280px) {
      margin-right: 0;
      margin-left: 0;
    }

    .swiper-container {
      padding-right: extClamp(10);
      padding-left: extClamp(10);

      @media screen and (min-width: 768px) {
        width: 100%;
        padding-right: 24px;
        padding-left: 24px;

      }

      @media screen and (min-width: 1280px) {
        width: 100%;
        padding-right: 0;
        padding-left: 0;
      }
    }

  }

  // .additional-items__slide
  &__slide {
    flex-shrink: 1;
    width: auto;
  }

  // .additional-items__item
  &__item {
    width: extClamp(120);

    @media screen and (min-width: 768px) {
      width: 240px;
    }

    // .additional-items__item--v1
    &--v1 {
      width: extClamp(128);

      @media screen and (min-width: 768px) {
        width: 164px;
      }

      @media screen and (min-width: 1280px) {
        width: 203px;
      }
    }

    // .additional-items__item--v2
    &--v2 {
      width: extClamp(120);

      @media screen and (min-width: 768px) {
        width: 240px;
      }

      @media screen and (min-width: 1280px) {
        width: 232px;
      }
    }
  }

  // .additional-items__swiper-pagination
  &__swiper-pagination {
    display: none;
  }
}

</style>
