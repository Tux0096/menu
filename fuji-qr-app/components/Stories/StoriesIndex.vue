<template>
  <div
    ref="stories"
    class="stories"
  >
    <div
      v-if="isFirstImageLoad"
      ref="storiesInner"
      class="stories__inner"
    >
      <div
        ref="close-btn"
        class="stories__close"
        @click="closeStories"
      >
        <svg class="stories__close-icon">
          <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#close-2" />
        </svg>
      </div>
      <swiper
        ref="slider"
        :options="swiperOptions"
        class="stories__slider"
        @touch-end="onTouchEnd"
        @touch-start="onTouchStart"
        @slide-change="slideChange"
      >
        <swiper-slide
          v-for="story in stories"
          :key="story.src"
          class="swiper-slide stories__slide story-slide"

          @click.native="onSlideClick"
        >
          <div class="story">
            <div
              v-if="story.type === 'image'"
              class="swiper-slide__content swiper-slide__content--image"
            >
              <img
                ref="slide-entity"
                :src="story.src"
                alt=""
                class="swiper-slide__image"
                @click="stopPrevent"
                @contextmenu="stopPrevent"
                @touch="stopPrevent"
              >
              <div
                v-if="story.link"
                class="story__link"
                @click="toMove(story.link )"
              >
                {{ story.linkTitle || 'Перейти' }}
              </div>
            </div>
            <div
              v-if="story.type === 'video'"

              class="swiper-slide__content swiper-slide__content--video"
            >
              <video
                ref="slide-entity"
                :src="story.src"
                autoplay
                muted
                playsinline
                preload="auto"
                @click="stopPrevent"
                @contextmenu="stopPrevent"
                @touch="stopPrevent"
              />
              <div
                v-if="story.link"
                class="story__link"
                @click="toMove(story.link )"
              >
                {{ story.linkTitle || 'Перейти' }}
              </div>
            </div>
          </div>
        </swiper-slide>

        <div
          slot="pagination"
          class="stories__pagination stories-pagination"
        >
          <div
            ref="bullets"
            class="stories-pagination__bullets"
          >
            <StoriesBullet
              v-for="(story, index) in stories"
              :key="index"
              :class="[
                'stories-pagination__bullet',
              ]"
              :is-active="index === currentSlide && isStartBulletActive"
              :is-finished="index < currentIndex"
              :tick="tick"
            />
          </div>
        </div>
      </swiper>
    </div>
    <div
      v-else
      class="stories__preloader"
    >
      <div class="stories__preloader-back" />
      <button

        class="stories__preloader-back"
        @click="closeStories"
      >
        <svg
          height="18"
          width="18"
        >
          <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#arrow-down" />
        </svg>
      </button>
      <img
        alt=""
        class="stories__preloader-icon"
        src="~/assets/images/icons/svg/stories.svg"
      >
    </div>
  </div>
</template>

<script>

const SLIDER_INTERVAL = 10000;

export default {
  name: 'StoriesIndex',
  data() {
    return {

      swiperOptions: {
        direction: 'horizontal',
        loop: false,
        spaceBetween: 1,
        autoplay: false,

        breakpoints: {
          // when window width is >= 1280px
          1280: {
            spaceBetween: 24,
          },
        },

        // If we need pagination
        pagination: {
          el: '.swiper-pagination',
          clickable: true,
        },

        lazy: {
          loadPrevNext: true,
          loadPrevNextAmount: 2,
        },

      },
      currentIndex: 0,
      isTouch: false,
      interval: null,
      timerInterval: 100,
      timerIntervalLeft: SLIDER_INTERVAL,
      isStartBulletActive: false,
      currentSlide: 0,
      SLIDER_INTERVAL,
      SLIDER_INTERVAL_CSS: `${SLIDER_INTERVAL}ms`,
      isFirstImageLoad: false,
      tick: 0,

      interval3: null,
    };
  },
  computed: {
    stories() {
      return this.$store.getters['setting/STORIES'];
    },
  },
  mounted() {
    const [firstStories] = this.stories;
    if (firstStories && firstStories.src && firstStories.type === 'image') {
      const { src: imageSrc } = firstStories;
      const img = new Image();
      img.src = imageSrc;
      img.onload = () => {
        this.preloadContent();
      };
    }

    if (firstStories && firstStories.src && firstStories.type === 'video') {
      const video = document.createElement('video');
      video.src = firstStories.src;
      video.preload = 'auto';
      video.onloadedmetadata = () => {
        this.preloadContent();
        this.$nextTick(() => {
          const [firstSlideEntity] = this.$refs['slide-entity'];
          firstSlideEntity.muted = false;
        });
      };
    }

    this.interval3 = setInterval(() => { this.storiesPositionHandler(); }, 500);
  },

  beforeDestroy() {
    clearInterval(this.interval);
    clearInterval(this.interval3);
  },
  methods: {
    storiesPositionHandler() {
      const storiesEl = this.$refs.stories;
      const storiesInnerEl = this.$refs.storiesInner;
      if (!storiesEl || !storiesInnerEl) { return; }
      const storiesElRec = storiesEl.getBoundingClientRect();
      storiesInnerEl.style.maxHeight = `${storiesElRec.height}px`;
    },
    preloadContent() {
      this.isFirstImageLoad = true;
      this.isStartBulletActive = true;
      this.autoPlay();

      this.$nextTick(() => {
        const rootStyles = getComputedStyle(document.documentElement);
        const safeAreaInsetTop = Number.parseInt(rootStyles.getPropertyValue('--safe-area-inset-top')
          .trim(), 10);
        if (safeAreaInsetTop > 0) {
          const closeBtn = this.$refs['close-btn'];
          const { bullets } = this.$refs;
          const rect = closeBtn.getBoundingClientRect();
          const distanceFromTop = rect.top + window.scrollY;
          if (distanceFromTop < safeAreaInsetTop) {
            closeBtn.style.top = `${safeAreaInsetTop}px`;

            const styleBullet = window.getComputedStyle(bullets);
            const topValueBullets = Number.parseInt(styleBullet.top, 10);
            const bulletsTop = topValueBullets + safeAreaInsetTop;
            bullets.style.top = `${bulletsTop}px`;
          }
        }
      });
    },
    autoPlay(isClear = true) {
      clearInterval(this.interval);
      if (isClear) {
        this.timerIntervalLeft = SLIDER_INTERVAL;
        this.tick = 0;
      }

      this.interval = setInterval(() => {
        this.timerIntervalLeft -= this.timerInterval;
        this.tick += ((100 / 1000) / SLIDER_INTERVAL) * 1000;

        if (this.timerIntervalLeft <= 0) {
          const swiper = this.$refs.slider.$swiper;
          if (!swiper.isEnd) {
            swiper.slideNext();
            this.slideChange();
            this.timerIntervalLeft = SLIDER_INTERVAL;
            this.tick = 0;
            this.autoPlay();
          }
        }
      }, this.timerInterval);
    },

    closeStories() {
      this.$store.commit('view/setIsStoriesShow', false);
    },
    slideChange() {
      const swiper = this.$refs.slider.$swiper;
      const currentIndex = swiper.activeIndex;
      this.currentIndex = currentIndex;
      this.currentSlide = currentIndex;
      this.manageVideoPlayback(currentIndex);
      this.autoPlay();
    },
    manageVideoPlayback(activeIndex) {
      if (this.$refs['slide-entity']?.length === 0) { return; }
      this.$refs['slide-entity'].forEach(async (slideEntity, idx) => {
        if (!(slideEntity instanceof HTMLVideoElement)) { return; }
        let playPromise;
        if (idx === activeIndex) {
          await slideEntity.play();
          slideEntity.muted = false; // https://goo.gl/LdLk22
        } else {
          if (playPromise !== undefined) { // https://goo.gl/LdLk22
            slideEntity.pause();
          }

          slideEntity.currentTime = 0;
          slideEntity.muted = true;
        }
      });
    },

    onSlideClick(event) {
      const swiper = this.$refs.slider.$swiper;
      const width = event.currentTarget.offsetWidth;
      const clickX = event.clientX - event.currentTarget.getBoundingClientRect().left;

      if (clickX < width / 2) {
        swiper.slidePrev();
      } else if (swiper.isEnd) {
        this.closeStories();
      } else {
        swiper.slideNext();
      }
      this.slideChange();
    },
    toMove(route) {
      if (typeof route === 'string') {
        this.$router.push(route);
      } else if (typeof route === 'object' && 'hash' in route) {
        this.$router.push(route);
      }
      this.closeStories();
    },
    onTouchStart() {
      this.isTouch = true;
      clearInterval(this.interval);
    },
    onTouchEnd() {
      this.isTouch = false;
      this.autoPlay(false);
    },

    stopPrevent(event) {
      event.preventDefault();
    },
  },

};
</script>

<style lang="scss" scoped>
:root {
  --SLIDER_INTERVAL: v-bind(SLIDER_INTERVAL_CSS);
}

.stories {

  position: fixed;
  z-index: 9999;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: #000;

  &::before {
    position: absolute;
    z-index: 2;
    top: 0;
    right: 0;
    left: 0;
    height: 100px;
    content: '';
    pointer-events: none;
    background: linear-gradient(180deg, #000 -19.51%, #000 -19.5%, rgba(0, 0, 0, 0.00) 82.93%);
  }

  // .stories__inner
  &__inner {
    position: relative;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {

    }
  }

  &::v-deep .swiper-container {
    position: static;
    height: 100%;
  }

  // .stories__close
  &__close {
    position: absolute;
    z-index: 10;
    top: 0;
    right: extClamp(10);
    display: flex;
    align-items: center;
    justify-content: center;
    width: extClamp(24);
    height: extClamp(24);
    border-radius: 50%;
    background-color: #fff;

    @media screen and (min-width: 768px) {
      top: 20px;
      right: 20px;
      width: 40px;
      height: 40px;
    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .stories__close-icon
  &__close-icon {
    width: extClamp(18);
    height: extClamp(18);
    color: #993ca6;

    @media screen and (min-width: 768px) {
      width: 28px;
      height: 28px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .stories__pagination
  &__pagination {
    position: absolute;
    z-index: 5;
    top: 0;
    left: 0;
    width: 100%;
  }

  // .stories__slide
  &__slider {

  }

  // .stories__slide
  &__slide {

  }

  // .stories__preloader
  &__preloader {
    position: absolute;
    z-index: 100;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #000;
  }

  // .stories__preloader-back
  &__preloader-back {
    position: absolute;
    top: extClamp(23);
    left: extClamp(16);
    display: flex;
    align-items: center;
    flex-shrink: 0;
    justify-content: center;
    width: extClamp(24);
    height: extClamp(24);
    transition: color 0.3s;
    transform: rotate(90deg);
    color: var(---Main-White, #fff);
  }

  // .stories__preloader-icon
  &__preloader-icon {
    width: extClamp(180);
    height: extClamp(180);

    @media screen and (min-width: 768px) {
      width: 300px;
      height: 300px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

}

.stories-pagination {
  padding-top: calc(extClamp(32) + var(--safe-area-inset-top, 0));
  padding-left: extClamp(10);

  @media screen and (min-width: 768px) {
    padding-top: calc(32px + var(--safe-area-inset-top, 0));
    padding-left: 10px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .stories-pagination__bullets
  &__bullets {
    position: absolute;
    top: extClamp(10);
    right: extClamp(10);
    left: extClamp(10);
    display: flex;
    justify-content: flex-start;
    width: auto;
    padding-right: extClamp(44);
    padding-left: extClamp(10);
    gap: extClamp(5);

    @media screen and (min-width: 768px) {
      top: 40px;
      right: 20px;
      left: 20px;
      padding-right: 80px;
      padding-left: 10px;
      gap: 5px;

    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .stories-pagination__bullet
  &__bullet {

  }
}

.swiper-slide {
  display: flex;
  align-items: center;
  justify-content: center;

  // .swiper-slide__content
  &__content {
    position: relative;
    display: flex;
    overflow: hidden;
    align-items: center;
    justify-content: center;
    width: 100%;

    // .swiper-slide__content--image
    &--image {
    }

    // .swiper-slide__content--video
    &--video {
    }

  }

  // .swiper-slide__image
  &__image {
    width: 100%;
    //height:     100%;
    //object-fit: cover;
    max-width: none;
  }
}

.story {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;

  // .story__link
  &__link {
    font-size: extClamp(12);
    font-weight: 500;
    line-height: normal;
    position: absolute;
    right: extClamp(10);
    bottom: extClamp(10);
    left: extClamp(10);
    display: flex;
    align-items: center;
    flex-shrink: 0;
    justify-content: center;
    height: extClamp(42);
    padding: extClamp(12) extClamp(16);
    text-align: center;
    color: #fff;
    border-radius: extClamp(200);
    background: #993ca6;

    @media screen and (min-width: 768px) {
      font-size: 16px;
      right: 20px;
      bottom: 20px;
      left: 20px;
      height: 62px;
      padding: 20px 20px;
      border-radius: 200px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}
</style>
