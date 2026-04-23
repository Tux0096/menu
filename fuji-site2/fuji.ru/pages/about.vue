<template>
  <div class="page-content">
    <div class="page-about">
      <div class="page-about__inner">
        <portal
          :disabled="isSliderPortalDisable"
          to="header-slider"
        >
          <AppSlider
            v-if="content?.slides.length"
            class="page-about__slider"
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

        <div class="page-about__text">
          <AppMainTextBlock
            v-if="content"
            class="page-about__text"
          >
            <template #title>
              {{ content.title }}
            </template>
            <div v-html="content.text " />
          </AppMainTextBlock>
          <div class="page-about__buttons">
            <BaseGradientButton
              class="page-about__button"
              type="outline"
              @click="$router.push('/legal-information')"
            >
              Правовая информация
            </BaseGradientButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import BaseGradientButton from '~/components/Base/BaseGradientButton.vue';

export default {
  name: 'PageAbout',
  components: { BaseGradientButton },
  data() {
    return {
      content: null,
      isSliderPortalDisable: false,
    };
  },
  async fetch() {
    const cityId = this.$store.getters['city/cityIikoId'];
    this.content = await this.$axios.$get(`${this.$config.FRONT_API_URL}/api/v1/page/about/${cityId}`);
  },
  head() {
    return {
      title: `О компании Фуджи Суши Friends в ${this.$store.getters['city/cityIn']}`,
      meta: [
        {
          hid: 'description',
          name: 'description',
          content: `О компании Фуджи Суши Friends в ${this.$store.getters['city/cityIn']}`,
        },
      ],
    };
  },
  mounted() {
    this.isSliderPortalDisable = window.innerWidth >= 1280;
  },
};
</script>

<style lang="scss"
       scoped
>

.page-about {

  // .page-about__inner
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

  // .page-about__slider
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

  // .page-about__text
  &__text {

  }

  // .page-about__buttons
  &__buttons {
    display: flex;
    flex-direction: column;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      margin-top: 36px;
    }
  }

  // .page-about__button
  &__button {
    flex-grow: 1;
  }

}

</style>
