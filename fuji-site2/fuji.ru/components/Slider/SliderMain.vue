<template>
  <div class="slider-main">
    <AppSlider
      v-if="slides.mobile.length"
      :number-slides="slides.mobile.length"
      class="slider-main__slider slider-main__slider--mobile"
    >
      <swiper-slide
        v-for="(slide, idx) in slides.mobile"
        :key="slide.id"
        class="swiper-slide"
      >
        <nuxt-link :to="slide.link ? slide.link : '#'">
          <img
            v-if="slides.mobile[idx]"
            :src="slides.mobile[idx].path"
            alt="Промо"
            class="main-slider__slide main-slider__slide--mob"
            height="488"
            loading="lazy"
            width="366"
          >
        </nuxt-link>
      </swiper-slide>
    </AppSlider>
    <AppSlider
      v-if="slides.mobile.length"
      class="slider-main__slider slider-main__slider--desktop"
    >
      <swiper-slide
        v-for="(slide, idx) in slides.desktop"
        :key="slide.id"
        class="swiper-slide"
      >
        <nuxt-link :to="slide.link ? slide.link : '#'">
          <nuxt-img
            v-if="slides.desktop[idx]"
            :src="slides.desktop[idx].path"
            alt="Промо"
            class="main-slider__slide main-slider__slide--desktop"
            height="388"
            loading="lazy"
            width="1320"
          />
        </nuxt-link>
      </swiper-slide>
    </AppSlider>
  </div>
</template>

<script>
import AppSlider from '~/components/AppSlider.vue';

export default {
  name: 'SliderMain',
  components: { AppSlider },
  data() {
    return {

      slides: {
        desktop: [],
        mobile: [],
      },
    };
  },
  async fetch() {
    const { data: slides } = await this.$axios.get(`${this.$config.FRONT_API_URL}/api/v1/slide/type/slide`);
    if (!slides) {
      return;
    }

    const preloadLinksDesktop = [];
    const preloadLinksMobile = [];

    slides.forEach((s) => {
      if (!s.isMobile) {
        const imagePath = this.$img(s.path, { width: 1320, quality: 50, format: 'webp' });
        s.path = imagePath;

        this.slides.desktop.push(s);
        preloadLinksDesktop.push({
          hid: `preload-slide-${s.id}`,
          rel: 'preload',
          as: 'image',
          href: imagePath,
        });
      } else {
        const imagePath = this.$img(s.path, { width: 500, quality: 60, format: 'webp' });
        s.path = imagePath;

        this.slides.mobile.push(s);
        preloadLinksMobile.push({
          hid: `preload-slide-${s.id}`,
          rel: 'preload',
          as: 'image',
          href: imagePath,
        });
      }
    });

    this.preloadLinks = [...preloadLinksDesktop.slice(0, 3), ...preloadLinksMobile.slice(0, 1)];
  },

  head() {
    return {
      __dangerouslyDisableSanitizers: ['link'],
      link: this.preloadLinks,
    };
  },
};
</script>

<style lang="scss" scoped>
.slider-main {

  &::v-deep .swiper-ssr {
    display: flex;
    gap: 20px;
  }

  // .slider-main__slider
  &__slider {

  }

  // .slider-main__slider--desktop
  &__slider--desktop {
    display: none;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1024px) {
      display: block;
      max-width: 1320px;
      margin-right: auto;
      margin-left: auto;
    }

    &::v-deep {
      @media screen and (min-width: 768px) {

      }

      @media screen and (min-width: 1280px) {
        .swiper-slide {

        }
        .swiper-wrapper {

        }
        .swiper-container {
          overflow: visible;
        }
      }
    }

  }

  // .slider-main__slider--mobile
  &__slider--mobile {
    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1024px) {
      display: none;
    }
  }

  // .slider-main__catalog-categories
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
}
</style>
