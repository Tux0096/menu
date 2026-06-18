<template>
  <div class="page-content">
    <div class="page-restaurants">
      <div class="page-restaurants__inner">
        <portal
          :disabled="isSliderPortalDisable"
          class="page-restaurants__portal"
          to="header-slider"
        >
          <AppSlider
            v-if="content?.slides.length"
            class="page-restaurants__slider"
          >
            <swiper-slide
              v-for="slide in content.slides"
              :key="slide"
              class="swiper-slide"
            >
              <nuxt-img
                :src="slide"
                format="webp"
                loading="lazy"
                quality="90"
                width="414"
              />
            </swiper-slide>
          </AppSlider>
        </portal>

        <AppMainTextBlock
          v-if="content"
          class="page-restaurants__text"
        >
          <template #title>
            {{ content.title }}
          </template>
          <div v-html="content.text " />
        </AppMainTextBlock>
      </div>
      <div
        v-if="restList?.length"
        class="page-restaurants__list restaurants"
      >
        <div class="restaurants__inner">
          <AppRestaurant
            v-for="(rest, idx) in restList"
            :key="idx"
            :number="idx + 1"
            :rest="rest"
            class="restaurants__restaurant"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>

export default {
  name: 'PageRestaurants',
  data() {
    return {
      content: null,
      isSliderPortalDisable: false,
    };
  },
  async fetch() {
    const cityId = this.$store.getters['city/cityIikoId'];
    this.content = await this.$axios.$get(`${this.$config.FRONT_API_URL}/api/v1/page/restaurant/${cityId}`);
  },
  head() {
    return {
      title: `Рестораны Фуджи Суши Friends в ${this.$store.getters['city/cityIn']}`,
      meta: [
        {
          hid: 'description',
          name: 'description',
          content: `Ресторана Фуджи Суши Friends на доставку в ${this.$store.getters['city/cityIn']}`,
        },
      ],
    };
  },
  computed: {
    restList() {
      return this.$store.getters['city/cityData'].restList;
    },

  },
  mounted() {
    this.isSliderPortalDisable = window.innerWidth >= 1280;
  },

};
</script>

<style lang="scss"
       scoped
>

.page-restaurants {

  // .page-restaurants__inner
  &__inner {
    display: flex;
    flex-direction: column;
    gap: extClamp(30);

    @media screen and (min-width: 768px) {
      gap: 30px;
    }

    @media screen and (min-width: 1280px) {
      flex-direction: row;
      gap: 40px;
    }
  }

  // .page-restaurants__slider
  &__slider {

    &.main-slider {
      @media screen and (min-width: 768px) {

      }

      @media screen and (min-width: 1280px) {
        overflow: hidden;
        width: 640px;
        border-radius: 40px;

        &::v-deep .swiper-slide {
          max-height: 480px;
          border-radius: 40px;

          > img {
            height: auto;
            max-height: none;
          }
        }
      }
    }

  }

  // .page-restaurants__text
  &__text::v-deep {

    ul > li {
      margin-left: extClamp(15);
      list-style-type: circle;

      @media screen and (min-width: 768px) {
        margin-left: 15px;
      }

      @media screen and (min-width: 1280px) {

      }
    }

  }

  // .page-restaurants__list
  &__list {

    @media screen and (min-width: 768px) {
      margin-top: 36px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

}

.restaurants {
  // .restaurants__title
  &__title {

  }

  // .restaurants__inner
  &__inner {
    display: flex;
    flex-wrap: wrap;
    gap: extClamp(12);

    @media screen and (min-width: 768px) {
      gap: 20px;
    }

    @media screen and (min-width: 1280px) {
      gap: 20px;
    }
  }

  // .restaurants__restaurant
  &__restaurant {
    width: 100%;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      width: calc(100% / 3 - 20px);
    }
  }

}

</style>
