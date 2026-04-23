<template>
  <div
    ref="slider"
    class="main-slider"
  >
    <swiper
      ref="slider"
      :options="swiperOptions"
      class="swiper-ssr"
    >
      <slot />

      <div
        v-if="$slots.default?.length > 1"
        slot="pagination"
        class="swiper-pagination"
      />
      <div
        class="swiper-pagination swiper-pagination-fake"
      >
        <span
          v-for="i in numberSlides"
          :key="i"
          :class="{'swiper-pagination-bullet-active': i === 1}"
          class="swiper-pagination-bullet"
          role="button"
          tabindex="0"
        />
      </div>
    </swiper>
  </div>
</template>

<script>
export default {
  name: 'AppSlider',
  props: {
    numberSlides: {
      type: Number,
      default: 0,
    },
  },
  data() {
    return {
      swiperOptions: {
        direction: 'horizontal',
        slidesPerView: 'auto',
        loop: true,
        spaceBetween: 16,
        autoplay: {
          delay: this.$slots.default?.length > 1 ? 3000 : 3000000,
        },
        lazy: {
          loadPrevNext: true,
        },
        breakpoints: {
          // when window width is >= 1280px
          1280: {
            spaceBetween: 20,
          },
        },

        // If we need pagination
        pagination: {
          el: '.swiper-pagination',
          clickable: true,
        },

      },
    };
  },
  mounted() {
    const needEl = this.$parent.$el || this.$refs.slide;
    const safeAreaInsetTop = getComputedStyle(document.documentElement)
      .getPropertyValue('--safe-area-inset-top');
    let safeAreaInsetTopValue = parseInt(safeAreaInsetTop, 10);

    if (Number.isNaN(safeAreaInsetTopValue)) {
      safeAreaInsetTopValue = 0;
    }

    const marginTop = 60 + safeAreaInsetTopValue;

    const options = {
      root: null,
      rootMargin: `-${marginTop}px 0px 0px 0px`,
      threshold: 0,
    };

    this.headerSliderObserver = new IntersectionObserver(this.handleHeaderSliderIntersect, options);
    this.headerSliderObserver.observe(needEl);
  },

  beforeDestroy() {
    if (this.headerSliderObserver) {
      this.headerSliderObserver.disconnect();
    }
  },
  methods: {
    handleHeaderSliderIntersect(entries) {
      this.$store.commit('view/setIsHeaderOnSlider', entries[0]?.isIntersecting);
    },
  },

};
</script>
<style>
@import "@/node_modules/swiper/css/swiper.css";
</style>
<style lang="scss"
       scoped
>

.swiper-container {
  height: 100%;
}

.swiper-pagination {
  position: absolute;
  z-index: 1;
  right: 0;
  bottom: extClamp(18);
  left: 0;
  display: flex;
  justify-content: center;
  gap: extClamp(12);

  @media screen and (min-width: 768px) {
    bottom: 24px;
    gap: 32px;
  }

  @media screen and (min-width: 1280px) {
    bottom: 16px;
    gap: 12px;
  }

  & ::v-deep(.swiper-pagination-bullet) {
    display: block;
    width: extClamp(6);
    height: extClamp(6);
    margin: 0;
    cursor: pointer;
    transition: width 0.3s;
    opacity: 1;
    border: none;
    border-radius: 50%;
    outline: 0;

    background: var(---Main-White, #fff);

    @media screen and (min-width: 768px) {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    @media screen and (min-width: 1280px) {
      width: 6px;
      height: 6px;
    }
  }

  & ::v-deep(.swiper-pagination-bullet-active) {
    background: var(---Main-Purple, #993ca6);
  }
}

.main-slider {
  overflow: hidden;
  max-height: extClamp(480);
  margin-bottom: extClamp(12);

  @media screen and (min-width: 768px) {
    margin-bottom: 36px;
  }

  @media screen and (min-width: 1280px) {
    overflow: visible;
    max-height: 400px;
    margin-bottom: 0;
  }

  &::v-deep .swiper-slide {
    display: flex;
    overflow: hidden;
    align-items: center;
    justify-content: center;
    width: 100%;
    border-radius: 0 0 extClamp(20) extClamp(20);

    @media screen and (min-width: 768px) {
      border-radius: 0 0 40px 40px;
    }

    @media screen and (min-width: 1280px) {

    }

    a {
      width: 100%;
    }

    img {
      width: 100%;
      max-height: initial;

      @media screen and (min-width: 768px) {
        max-height: calc(800px + var(--safe-area-inset-top, 0));
      }

      @media screen and (min-width: 1280px) {
        max-height: 400px;
      }
    }
  }
}
</style>
