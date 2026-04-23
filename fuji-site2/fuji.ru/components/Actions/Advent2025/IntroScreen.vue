<template>
  <div class="advent-intro">
    <svg class="advent-intro__brand-star">
      <use xlink:href="~/assets/images/content/Advent2025/sprite.svg#brand-star" />
    </svg>

    <!-- Звёзды фон -->
    <div
      ref="starsContainer"
      class="advent-intro__stars-bg"
    >
      <img
        v-for="star in allStars"
        :key="star.id"
        :alt="star.alt"
        :class="[
          'advent-intro__star',
          `advent-intro__star--${star.type}`
        ]"
        :src="star.src"
        :style="{
          top: `${star.top}%`,
          left: `${star.left}%`,
          width: `${star.size}px`,
          height: `${star.size}px`,
          animationDelay: star.delay ? `${star.delay}s` : '0s'
        }"
      >
      <!-- Луны и солнца с движением по эллипсу -->
      <img
        v-for="body in celestialBodies"
        :key="body.id"
        :alt="body.alt"
        :class="[
          'advent-intro__celestial',
          `advent-intro__celestial--${body.type}`
        ]"
        :src="body.src"
        :style="{
          top: `${body.y}%`,
          left: `${body.x}%`,
          width: `${body.size}px`,
          height: `${body.size}px`
        }"
      >
    </div>

    <div class="advent-intro__content">
      <button
        class="advent-intro__close-btn"
        @click="$router.push('/')"
      >
        <svg
          fill="none"
          style="width: 100%; height: 100%;"
          viewBox="0 0 28 28"
          xmlns="http://www.w3.org/2000/svg"
        >
          <foreignObject
            height="0"
            width="0"
            x="0"
            y="0"
          >
            <div
              style="backdrop-filter:blur(2px);clip-path:url(#bgblur_0_2002_3291_clip_path);height:100%;width:100%"
              xmlns="http://www.w3.org/1999/xhtml"
            />
          </foreignObject>
          <g data-figma-bg-blur-radius="4">
            <rect
              fill="#0D1730"
              fill-opacity="0.75"
              height="28"
              rx="14"
              width="28"
            />
            <rect
              fill="#FE00A5"
              height="28"
              rx="14"
              width="28"
            />
            <rect
              height="27"
              rx="13.5"
              stroke="#0D1730"
              stroke-opacity="0.75"
              width="27"
              x="0.5"
              y="0.5"
            />
            <rect
              fill="white"
              height="1.5"
              transform="rotate(45 9.75732 8.81287)"
              width="14"
              x="9.75732"
              y="8.81287"
            />
            <rect
              fill="white"
              height="1.5"
              transform="rotate(135 19.6567 9.87341)"
              width="14"
              x="19.6567"
              y="9.87341"
            />
          </g>
          <defs>
            <clipPath
              id="bgblur_0_2002_3291_clip_path"
              transform="translate(0 0)"
            >
              <rect
                height="28"
                rx="14"
                width="28"
              />
            </clipPath>
          </defs>
        </svg>
      </button>

      <BrandHeader class="advent-intro__header" />

      <div class="advent-intro__instructions">
        <div class="advent-intro__instruction-block advent-intro__instruction-block--1">
          <div class="advent-intro__instruction-content">
            <img
              :src="$ipx('/assets/images/content/Advent2025/gift-3d.png', { w: 300, f: 'webp' })"
              alt=""
              class="advent-intro__instruction-image  advent-intro__instruction-star--gift"
            >
            <img
              alt=""
              class="advent-intro__instruction-star advent-intro__instruction-star--1"
              src="~/assets/images/content/Advent2025/star-blue-1.png"
            >
            <img
              alt=""
              class="advent-intro__instruction-star advent-intro__instruction-star--2"
              src="~/assets/images/content/Advent2025/star-blue-1.png"
            >
            <img
              alt=""
              class="advent-intro__instruction-star advent-intro__instruction-star--3"
              src="~/assets/images/content/Advent2025/star-blue-3.png"
            >
            <div class="advent-intro__instruction-card">
              <svg
                class="advent-intro__instruction-card-date"
                fill="none"
                height="46"
                viewBox="0 0 21 46"
                width="21"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6.91018 45.1286L9.6035 27.179C8.74605 28.137 7.79524 29.0657 6.75107 29.9648C5.71937 30.8417 4.57566 31.6569 3.31995 32.4106L4.52232e-05 26.9527C1.32054 26.1617 2.48797 25.2647 3.50235 24.2616C4.53415 23.2535 5.42901 22.2285 6.18692 21.1865C6.96227 20.1395 7.61308 19.1189 8.13935 18.1245C8.66066 17.1129 9.08227 16.2142 9.40417 15.4284C9.72607 14.6427 9.96068 14.0131 10.108 13.5398C10.2678 13.0442 10.3452 12.7877 10.3402 12.7704L13.1918 2.08484L20.4626 -2.67026e-05L14.0502 43.0813L6.91018 45.1286Z"
                  fill="white"
                />
              </svg>
            </div>
          </div>

          <div class="advent-intro__instruction-text-wrapper instruction-text-wrapper instruction-text-wrapper--1">
            <div class="instruction-text-wrapper__title">
              Выбери плитку с текущей датой
            </div>
            <div class="instruction-text-wrapper__desc">
              Каждый день декабря тебя ждёт новый сюрприз!
            </div>
          </div>
        </div>

        <div class="advent-intro__dashed-line">
          <svg class="advent-intro__dashed-line-item advent-intro__dashed-line-item--1280">
            <use xlink:href="~/assets/images/content/Advent2025/arrows1280.svg#arrow-intro" />
          </svg>
          <svg class="advent-intro__dashed-line-item advent-intro__dashed-line-item--768">
            <use xlink:href="~/assets/images/content/Advent2025/arrows768.svg#arrow-intro" />
          </svg>
          <svg class="advent-intro__dashed-line-item advent-intro__dashed-line-item--320">
            <use xlink:href="~/assets/images/content/Advent2025/arrows320.svg#arrow-intro" />
          </svg>
        </div>

        <div class="advent-intro__instruction-block advent-intro__instruction-block--2">
          <div class="advent-intro__instruction-text-wrapper instruction-text-wrapper instruction-text-wrapper--2">
            <div class="instruction-text-wrapper__title">
              Используй промокод при оформлении заказа
            </div>
            <div class="instruction-text-wrapper__desc">
              Скидка или подарок применятся автоматически
            </div>
          </div>
          <div class="promo-code-banner">
            <img
              alt=""
              class="promo-code-banner__star promo-code-banner__star--1"
              src="~/assets/images/content/Advent2025/star-blue-1.png"
            >
            <img
              alt=""
              class="promo-code-banner__star promo-code-banner__star--2"
              src="~/assets/images/content/Advent2025/star-blue-1.png"
            >
            <div class="promo-code-banner__instruction-promo">
              promocode
            </div>
            <img
              alt=""
              class="promo-code-banner__hand"
              src="~/assets/images/content/Advent2025/hand-click-3d.png"
            >
          </div>
        </div>
      </div>

      <div class="advent-intro__bottom">
        <button
          class="advent-intro__button"
          @click="$emit('continue')"
        >
          <span>За подарками</span>
        </button>
        <NuxtLink
          class="advent-intro__legal"
          to="/advent-2025/legal"
        >
          Подробные условия акции
        </NuxtLink>
        <p class="advent-intro__note">
          *Не пропускай дни – подарки доступны только 24 часа!
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import advent2025StarsMixin from '~/mixins/advent2025Stars';
import BrandHeader from './BrandHeader.vue';

export default {
  name: 'IntroScreen',
  components: {
    BrandHeader,
  },
  mixins: [advent2025StarsMixin],
  data() {
    return {
      // allStars, containerWidth, containerHeight, viewportWidth, viewportHeight приходят из миксина advent2025StarsMixin
      introCards: [
        {
          id: 'c1', top: 'extClamp(8)', left: 'extClamp(8)', rotate: -10, scale: 1.0,
        },
        {
          id: 'c2', top: 'extClamp(28)', left: 'extClamp(46)', rotate: -6, scale: 1.05,
        },
        {
          id: 'c3', top: 'extClamp(22)', left: 'extClamp(94)', rotate: 6, scale: 0.98,
        },
        {
          id: 'c4', top: 'extClamp(46)', left: 'extClamp(22)', rotate: -14, scale: 0.96,
        },
        {
          id: 'c5', top: 'extClamp(58)', left: 'extClamp(76)', rotate: 8, scale: 1.0,
        },
        {
          id: 'c6', top: 'extClamp(70)', left: 'extClamp(8)', rotate: -18, scale: 0.92,
        },
      ],
    };
  },
  mounted() {
    // Устанавливаем размеры контейнера со звездами и генерируем звезды
    this.$nextTick(() => {
      this.initViewportSize(this.$refs.starsContainer);
      this.generateStars();
      this.generateCelestialBodies();
      this.startCelestialAnimation();
    });
  },
  // Методы initViewportSize() и generateStars() приходят из миксина advent2025StarsMixin
};
</script>

<style lang="scss" scoped>
.advent-intro {
  position: relative;
  display: flex;
  overflow: hidden;
  align-items: center;
  flex-direction: column;
  justify-content: space-between;
  min-height: 100vh;
  padding: extClamp(12) extClamp(16) extClamp(24);
  background: linear-gradient(180deg, rgba(6, 3, 54, 0.00) 56.41%, #00000d 100%), linear-gradient(353deg, rgba(6, 14, 37, 0.00) 1.99%, #060e25 82.25%), linear-gradient(0deg, var(--Color-Main-Dark-Blue, #002a4d) 0%, var(--Color-Main-Dark-Blue, #002a4d) 100%), #fff;
  background-blend-mode: soft-light, normal, normal, normal;

  @media screen and (min-width: 768px) {
    padding: 64px 72px 28px;
  }

  @media screen and (min-width: 1280px) {
    padding: 96px 60px 48px;
  }

  // .advent-intro__brand-star
  &__brand-star {
    position: absolute;
    top: extClamp(-280);
    left: extClamp(-210);
    width: extClamp(448);
    height: extClamp(556);
    transform: rotate(-10deg);
    aspect-ratio: 112/139;

    @media screen and (min-width: 768px) {
      top: -313px;
      left: -269px;
      width: 538px;
      height: 625px;
      filter: blur(32px);
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // Фон со звёздами
  &__stars-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  // Звезда
  &__star {
    position: absolute;
    mix-blend-mode: color-dodge;

    &--mini {

    }

    // Анимация для animated звезд встроена в SVG файлы

    &--glare-small {
      animation: glarePulse 4s ease-in-out infinite;
    }

    &--glare-large {
      animation: glarePulse 5s ease-in-out infinite;
    }

    &--shooting {
      transform: rotate(-90deg);
      animation: shootingStarFly 0.5s linear infinite;
    }
  }

  // Небесные тела (луны и солнца)
  &__celestial {
    position: absolute;
    transition: top 0.05s linear, left 0.05s linear;
    transform: translate(-50%, -50%);
    pointer-events: none;

    &--moon {
      display: none;
      opacity: 0.7;
      mix-blend-mode: screen;
      filter: blur(0.5px);
    }

    &--sun {
      display: none;
      animation: celestialGlow 8s ease-in-out infinite;
      opacity: 0.6;
      mix-blend-mode: screen;
      filter: blur(1px);
    }
  }

  // .advent-intro__content
  &__content {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: space-between;
    width: 100%;
    max-width: 100%;
    height: 100%;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .advent-intro__close-btn
  &__close-btn {
    position: absolute;
    z-index: 10;
    top: extClamp(-4);
    right: extClamp(10);
    width: extClamp(28);
    height: extClamp(28);
    cursor: pointer;

    > svg {
      width: 100%;
      height: 100%;
    }

    @media screen and (min-width: 768px) {
      top: -21px;
      right: -17px;
      width: 42px;
      height: 42px;
    }

    @media screen and (min-width: 1280px) {

    }

    &:hover {
      transform: scale(1.05);
    }

    &:active {
      transform: scale(0.95);
    }

    svg {
      width: extClamp(16);
      height: extClamp(16);

      @media screen and (min-width: 768px) {
        width: 24px;
        height: 24px;
      }
    }
  }

  // Декоративные карточки (как в макете 203:5410)
  &__cards {
    position: absolute;
    z-index: 0;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  &__card {
    position: absolute;
    width: extClamp(68);
    height: extClamp(68);
    border: extClamp(0.4) solid transparent;
    border-radius: extClamp(8);
    background: linear-gradient(180deg, rgba(13, 23, 48, 0.6) 0%, rgba(11, 18, 37, 0.6) 100%) padding-box,
    linear-gradient(224deg, rgba(255, 255, 255, 0.9) 3%, rgba(0, 24, 56, 0.7) 50%, rgba(153, 153, 153, 0.9) 98%) border-box;
    background-clip: padding-box, border-box;
    background-origin: border-box;
    box-shadow: 0 0 extClamp(3) rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);

    @media screen and (min-width: 768px) {
      width: 74px;
      height: 74px;
    }

    @media screen and (min-width: 1280px) {
      width: 84px;
      height: 84px;
    }
  }

  // .advent-intro__instructions
  &__instructions {
    position: relative;
    display: flex;
    align-items: center;
    align-self: center;
    flex-direction: column;
    width: 100%;
    gap: extClamp(16);

    @media screen and (min-width: 768px) {
      max-width: 600px;
      margin-top: -20px;
      gap: 8px;
    }

    @media screen and (min-width: 1280px) {
      position: relative;
      max-width: 1152px;
      height: 400px;
      margin-top: -40px;

    }
  }

  // .advent-intro__instruction-block
  &__instruction-block {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      position: absolute;

    }

    &--1 {
      @media screen and (min-width: 1280px) {
        top: 82px;
        left: 0;
        width: 568px;
      }
    }

    &--2 {
      margin-top: extClamp(21);

      @media screen and (min-width: 768px) {
        margin-top: 0;
      }

      @media screen and (min-width: 1280px) {
        top: 207px;
        right: 0;
        width: 568px;
        margin-top: 0;
      }
    }
  }

  &__instruction-content {
    position: relative;
    width: extClamp(148);
    height: extClamp(168);

    @media screen and (min-width: 768px) {
      width: 236px;
      height: 269px;
    }

    @media screen and (min-width: 1280px) {
      position: absolute;
      top: -59px;
      left: 18px;
      width: 236px;
      height: 269px;
    }

    .advent-intro__instruction-block--1 & {
      margin-right: extClamp(18);

      @media screen and (min-width: 768px) {
        margin-right: 0;
      }
    }

    .advent-intro__instruction-block--2 & {
      margin-left: extClamp(5);

      @media screen and (min-width: 768px) {
        margin-left: 0;
      }
    }
  }

  &__instruction-image {
    position: absolute;
    z-index: 1;
    top: 0;
    left: extClamp(36);
    width: extClamp(90);
    height: extClamp(90);
    transform-origin: center center;
    animation: giftSmartAnimate 6000ms cubic-bezier(0.24, 0, 0.3, 1) 0ms infinite;

    @media screen and (min-width: 768px) {
      top: 0;
      left: 50px;
      width: 156px;
      height: 156px;
    }

    @media screen and (min-width: 1280px) {
      left: 50px;
      width: 156px;
      height: 156px;
    }
  }

  // .advent-intro__instruction-card
  &__instruction-card {
    position: absolute;
    top: extClamp(58);
    left: extClamp(14);
    display: flex;
    align-items: end;
    justify-content: end;
    width: extClamp(82);
    height: extClamp(82);
    transform: rotate(-16deg);
    border: extClamp(0.5) solid transparent;
    border-radius: extClamp(8);
    background: linear-gradient(180deg, #0d1730 0%, #0b1225 100%) padding-box,
    linear-gradient(224deg, #fff 3%, #001838 50%, #999 98%) border-box;
    background-clip: padding-box, border-box;
    background-origin: border-box;
    backdrop-filter: blur(4px);

    @media screen and (min-width: 768px) {
      top: 103px;
      bottom: 0;
      left: 31px;
      width: 148px;
      height: 148px;
      border-width: 0.5px;
      border-radius: 8px;
    }

    @media screen and (min-width: 1280px) {
      left: 12px;
      width: 148px;
      height: 148px;
    }
  }

  .advent-intro__instruction-card-date {
    position: relative;
    right: extClamp(9);
    bottom: extClamp(1);
    width: extClamp(27);
    height: extClamp(45);
    transform: rotate(16deg);
  }

  &__instruction-star {
    position: absolute;

    &--gift {
      transform: rotate(12deg)
    }

    &--1 {
      top: extClamp(105);
      left: extClamp(75);
      width: extClamp(52);
      height: extClamp(52);
      transform: rotate(14deg);
      transform-origin: center center;
      animation: star1SmartAnimate 6000ms cubic-bezier(0.24, 0, 0.3, 1) 0ms infinite;

      @media screen and (min-width: 768px) {
        top: 201px;
        left: 117px;
        width: 64px;
        height: 64px;
      }
    }

    &--2 {
      top: extClamp(14);
      left: extClamp(22);
      width: extClamp(32);
      height: extClamp(32);
      transform: rotate(-7deg);
      transform-origin: center center;
      animation: star2SmartAnimate 6000ms cubic-bezier(0.24, 0, 0.3, 1) 0ms infinite;

      @media screen and (min-width: 768px) {
        top: 44px;
        left: 14px;
        width: 64px;
        height: 64px;
      }
    }

    &--3 {
      top: extClamp(102);
      left: 0;
      width: extClamp(18);
      height: extClamp(18);
      transform: rotate(200deg) scaleY(-1);
      transform-origin: center center;
      animation: star3SmartAnimate 6000ms cubic-bezier(0.24, 0, 0.3, 1) 0ms infinite;

      @media screen and (min-width: 768px) {
        top: 143px;
        width: 36px;
        height: 36px;
      }
    }

    &--4 {
      top: extClamp(64);
      left: 0;
      width: extClamp(53);
      height: extClamp(53);

      @media screen and (min-width: 768px) {
        top: 70px;
        width: 60px;
        height: 60px;
      }
    }

    &--5 {
      top: extClamp(20);
      left: extClamp(100);
      width: extClamp(26);
      height: extClamp(26);

      @media screen and (min-width: 768px) {
        top: 24px;
        left: 110px;
        width: 30px;
        height: 30px;
      }
    }
  }

  &__instruction-hand {
    position: absolute;
    top: extClamp(52);
    left: extClamp(76);
    width: extClamp(81);
    height: extClamp(81);

    @media screen and (min-width: 768px) {
      top: 58px;
      left: 82px;
      width: 90px;
      height: 90px;
    }
  }

  &__instruction-text-wrapper {

    // .advent-intro__instruction-block--1 .advent-intro__instruction-text-wrapper
    .advent-intro__instruction-block--1 & {
      @media screen and (min-width: 768px) {

      }
      @media screen and (min-width: 1280px) {
        position: absolute;
        top: 12px;
        left: 256px;
        width: auto;
      }
    }

    // .advent-intro__instruction-block--2 .advent-intro__instruction-text-wrapper
    .advent-intro__instruction-block--2 & {
      margin-left: extClamp(26);

      @media screen and (min-width: 768px) {
        width: 100%;
        max-width: 100%;
        margin-top: 144px;
        margin-left: 56px;
      }

      @media screen and (min-width: 1280px) {
        position: absolute;
        top: 9px;
        left: -4px;
        width: 400px;
        margin-top: 0;
      }
    }

  }

  // .advent-intro__dashed-line
  &__dashed-line {
    position: absolute;
    top: extClamp(112);
    left: extClamp(74);

    @media screen and (min-width: 768px) {
      top: 230px;
      left: 180px;

    }

    @media screen and (min-width: 1280px) {
      top: 203px;
      left: 296px;
    }
  }

  // .advent-intro__dashed-line
  &__dashed-line {
  }

  // .advent-intro__dashed-line-item
  &__dashed-line-item {
    filter: drop-shadow(0px 0px 8px rgba(255, 255, 255, 1)) drop-shadow(0px 0px 1px rgba(255, 255, 255, 1));
  }

  // .advent-intro__dashed-line-item--1280
  &__dashed-line-item--1280 {
    display: none;

    @media screen and (min-width: 768px) {
      display: none;
    }

    @media screen and (min-width: 1280px) {
      display: block;
      width: 276px;
      height: 147px;
    }
  }

  // .advent-intro__dashed-line-item--768
  &__dashed-line-item--768 {
    display: none;

    @media screen and (min-width: 768px) {
      display: block;
      width: 235px;
      height: 160px;
    }

    @media screen and (min-width: 1280px) {
      display: none;
    }
  }

  // .advent-intro__dashed-line-item--320
  &__dashed-line-item--320 {
    display: block;
    width: extClamp(138);
    height: extClamp(80);

    @media screen and (min-width: 768px) {
      display: none;
    }

    @media screen and (min-width: 1280px) {
      display: none;
    }
  }

  // .advent-intro__bottom
  &__bottom {
    display: flex;
    align-items: center;
    flex-direction: column;
    width: 100%;
    gap: extClamp(6);

    @media screen and (min-width: 768px) {
      max-width: 600px;
      gap: 10px;
    }

    @media screen and (min-width: 1280px) {
      max-width: 100%;
      gap: 16px;
    }
  }

  // .advent-intro__button
  &__button {
    font-family: 'GG Kizhich', sans-serif;
    font-size: extClamp(18);
    font-weight: 700;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: extClamp(192);
    height: extClamp(46);
    padding: extClamp(6) extClamp(12) extClamp(8);
    transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
    text-align: center;
    color: #fff;
    border: extClamp(0.5) solid rgba(255, 255, 255, 1);
    border-radius: extClamp(8);
    background: linear-gradient(180deg, rgba(254, 0, 165, 0.85) 0%, rgba(167, 0, 108, 0.85) 100%);
    box-shadow: inset 0 0 8px #fff, 0 6px 18px rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);

    @media screen and (min-width: 768px) {
      font-size: 28px;
      min-width: auto;
      height: auto;
      padding: 19px 48px 19px;
      border-width: 0.5px;
      border-radius: 8px;
      box-shadow: inset 0 0 12px #fff, inset 0 0 2px rgba(255, 255, 255, 0.25);
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
    }

    &:hover {
      box-shadow: inset 0 0 10px #fff, 0 8px 20px rgba(0, 0, 0, 0.4);
      filter: brightness(1.05);
    }

    &:active {
      transform: scale(0.98);
      box-shadow: inset 0 0 6px #fff, 0 4px 12px rgba(0, 0, 0, 0.4);
    }
  }

  // Текст ссылки
  &__legal {
    font-family: "Avenir Next Cyr", sans-serif;
    font-size: extClamp(9);
    font-weight: 300;
    font-style: normal;
    line-height: normal;
    text-align: center;
    color: var(--Color-Main-White, #fff);
    text-decoration-line: underline;
    text-decoration-style: solid;
    text-decoration-skip-ink: auto;
    text-decoration-thickness: auto;
    text-underline-offset: auto;
    text-underline-position: from-font;

    @media screen and (min-width: 768px) {
      font-size: 16px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
    }
  }

  // .advent-intro__note
  &__note {
    font-family: 'Avenir Next Cyr', sans-serif;
    font-size: extClamp(8);
    font-weight: 300;
    line-height: 1.225;
    margin: 0;
    margin-top: extClamp(1);
    text-align: center;
    color: #fff;

    @media screen and (min-width: 768px) {
      font-size: 16px;
      max-width: 330px;
      margin-top: 8px;
    }

    @media screen and (min-width: 1280px) {
      max-width: none;
      margin-top: 0;

    }
  }
}

// Анимация пульсации бликов
@keyframes glarePulse {
  0%, 100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

// Анимация падающих звезд (полет под 45 градусов с плавным появлением/исчезанием)
@keyframes shootingStarFly {
  0% {
    top: -10%;
    left: 110%;
    opacity: 0;
  }
  30% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  80% {
    opacity: 0;
  }

  100% {
    top: 110%;
    left: -10%;
    opacity: 0;
  }
}

// Поочередная анимация блоков инструкции
// Цикл 6 секунд: блок 1 яркий 1.5s → пауза 1s → блок 2 яркий 1.5s → пауза 1s
@keyframes instructionPulse1 {
  0%, 25% {
    opacity: 1;
    transform: scale(1);
  }
  25.1%, 100% {
    opacity: 0.5;
    transform: scale(0.98);
  }
}

// Блок 2: тусклый до середины, затем яркий
@keyframes instructionPulse2 {
  0%, 41.6% {
    opacity: 0.5;
    transform: scale(0.98);
  }
  41.7%, 66.6% {
    opacity: 1;
    transform: scale(1);
  }
  66.7%, 100% {
    opacity: 0.5;
    transform: scale(0.98);
  }
}

.smart-animate {
  animation-timing-function: cubic-bezier(0.24, 0.3, 0.3, 1);
}

// Smart Animate: состояние A (106:2104) -> состояние B (106:2140)
@keyframes giftSmartAnimate {
  0%, 10% {
    transform: translate3d(0, 0, 0) rotate(12deg) scale(1);
  }
  45%, 55% {
    transform: translate3d(0, extClamp(14), 0) rotate(-6deg) scale(0.911);
  }
  90%, 100% {
    transform: translate3d(0, 0, 0) rotate(12deg) scale(1);
  }
}

@keyframes star1SmartAnimate {
  0%, 10% {
    transform: translate3d(0, 0, 0) rotate(14deg) scale(1);
  }
  45%, 55% {
    transform: translate3d(extClamp(1.5), extClamp(-24), 0) rotate(24deg) scale(0.96);
  }
  90%, 100% {
    transform: translate3d(0, 0, 0) rotate(14deg) scale(1);
  }
}

@keyframes star2SmartAnimate {
  0%, 10% {
    transform: translate3d(0, 0, 0) rotate(-7deg) scale(1);
  }
  45%, 55% {
    transform: translate3d(extClamp(-14), extClamp(10), 0) rotate(-24deg) scale(1);
  }
  90%, 100% {
    transform: translate3d(0, 0, 0) rotate(-7deg) scale(1);
  }
}

@keyframes star3SmartAnimate {
  0%, 10% {
    transform: translate3d(0, 0, 0) rotate(200deg) scaleY(-1) scale(1);
  }
  45%, 55% {
    transform: translate3d(extClamp(8), extClamp(18), 0) rotate(160deg) scaleY(-1) scale(0.95);
  }
  90%, 100% {
    transform: translate3d(0, 0, 0) rotate(200deg) scaleY(-1) scale(1);
  }
}

.promo-code-banner {
  position: absolute;

  top: extClamp(-11);
  right: 0;
  width: extClamp(157);
  height: extClamp(134);

  @media screen and (min-width: 768px) {
    top: 129px;
    right: -23px;
    width: 246px;
    height: 171px;
  }

  @media screen and (min-width: 1280px) {
    top: 2px;
    right: -20px;
    width: 246px;
    height: 171px;
  }

  // .promo-code-banner__star
  &__star {
    position: absolute;
  }

  // .promo-code-banner__star--1
  &__star--1 {
    top: extClamp(64);
    left: 0;
    width: extClamp(40);
    height: extClamp(40);
    transform-origin: center center;
    animation: promoStar1Animate 6000ms cubic-bezier(0.24, 0, 0.3, 1) 0ms infinite;

    @media screen and (min-width: 768px) {
      top: 110px;
      left: 8px;
      width: 72px;
      height: 72px;
      transform: rotate(-24deg);
      animation: promoStar1Animate768 6000ms cubic-bezier(0.24, 0, 0.3, 1) 0ms infinite;
    }
  }

  // .promo-code-banner__star--2
  &__star--2 {
    top: extClamp(20);
    left: extClamp(100);
    width: extClamp(22);
    height: extClamp(22);
    transform-origin: center center;
    animation: promoStar2Animate 6000ms cubic-bezier(0.24, 0, 0.3, 1) 0ms infinite;

    @media screen and (min-width: 768px) {
      top: 0;
      left: 139px;
      width: 36px;
      height: 36px;
      animation: promoStar2Animate768 6000ms cubic-bezier(0.24, 0, 0.3, 1) 0ms infinite;
    }
  }

  // .promo-code-banner__instruction-promo
  &__instruction-promo {
    font-family: 'GG Kizhich', sans-serif;
    font-size: extClamp(18);
    font-weight: 700;
    line-height: 1;
    position: absolute;
    top: extClamp(48);
    right: extClamp(11);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: extClamp(7) extClamp(15) extClamp(9);
    transform: rotate(-5deg);
    color: #ff26b3;
    border: extClamp(0.4) solid rgba(255, 255, 255, 1);
    border-radius: extClamp(6);
    background: linear-gradient(180deg, rgba(13, 23, 48, 0.75) 0%, rgba(11, 18, 37, 0.75) 100%);
    box-shadow: 0 0 extClamp(3.2) rgba(255, 255, 255, 0.32);
    backdrop-filter: blur(1.6px);

    @media screen and (min-width: 768px) {
      font-size: 32px;
      padding: 8px 16px 16px;
      border-width: 0.5px;
      border-radius: 8px;
      box-shadow: 0 0 3.2px rgba(255, 255, 255, 0.32);
    }
  }

  // .promo-code-banner__hand
  &__hand {
    position: absolute;
    top: extClamp(52);
    left: extClamp(76);
    flex-shrink: 0;
    width: extClamp(58);
    height: extClamp(58);
    transform-origin: center center;
    animation: promoHandAnimate 6000ms cubic-bezier(0.24, 0, 0.3, 1) 0ms infinite;

    @media screen and (min-width: 768px) {
      top: 104px;
      left: 96px;
      width: 96px;
      height: 96px;
      animation: promoHandAnimate768 6000ms cubic-bezier(0.24, 0, 0.3, 1) 0ms infinite;
    }
  }
}

.instruction-text-wrapper {
  position: relative;
  top: extClamp(-9);
  display: flex;
  flex-direction: column;
  width: extClamp(123);
  margin: 0;
  color: #fff;
  gap: extClamp(4);

  @media screen and (min-width: 768px) {
    width: auto;
    max-width: 300px;
    gap: 8px;
  }

  @media screen and (min-width: 1280px) {
    top: 0;
    gap: 12px;
  }

  &::before {
    font-family: 'NauryzRedKeds', sans-serif;
    font-size: extClamp(12);
    font-weight: 700;
    line-height: 1;
    position: absolute;
    z-index: 2;
    right: calc(100% + extClamp(6));
    display: flex;
    align-items: center;
    justify-content: center;
    width: extClamp(18);
    height: extClamp(18);
    content: '1';
    color: #fff;
    border: extClamp(0.75) solid #fff;
    border-radius: 50%;
    background: transparent;

    @media screen and (min-width: 768px) {
      font-size: 24px;
      right: calc(100% + 12px);
      width: 36px;
      height: 36px;
      border-width: 0.75px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 24px;
      right: calc(100% + 12px);
      width: 36px;
      height: 36px;
      border-width: 0.75px;
    }

  }

  // .instruction-text-wrapper--1
  &--1 {

    @media screen and (min-width: 768px) {
      position: absolute;
      top: 72px;
      right: -21px;
      max-width: 330px;

    }

    @media screen and (min-width: 1280px) {

    }

    &::before {
      content: '1';
    }
  }

  // .instruction-text-wrapper--2
  &--2 {
    flex-shrink: 0;
    width: extClamp(183);

    @media screen and (min-width: 768px) {
      width: 351px;
    }

    @media screen and (min-width: 1280px) {
      width: 351px;
      gap: 6px;
    }

    &::before {
      content: '2';
    }
  }

  // .instruction-text-wrapper__title
  &__title {
    font-family: 'GG Kizhich', sans-serif;
    font-size: extClamp(15);
    font-weight: 400;
    line-height: 1.032;
    margin: 0;
    color: #fff;

    @media screen and (min-width: 768px) {
      font-size: 32px;
      max-width: 385px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 32px;
      line-height: 1;
      max-width: 266px;
    }

    // .advent-intro__instruction-block--2 .instruction-text-wrapper__title
    .advent-intro__instruction-block--2 & {
      @media screen and (min-width: 768px) {

      }

      @media screen and (min-width: 1280px) {
        max-width: 380px;
      }
    }
  }

  // .instruction-text-wrapper__desc
  &__desc {
    font-family: 'Avenir Next Cyr', sans-serif;
    font-size: extClamp(9);
    font-weight: 300;
    line-height: 1.225;
    color: #fff;

    @media screen and (min-width: 768px) {
      font-size: 20px;
      max-width: 300px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 20px;
      line-height: 1.3;
      max-width: 320px;
    }

    // .advent-intro__instruction-block--2 .instruction-text-wrapper__desc
    .advent-intro__instruction-block--2 & {
      @media screen and (min-width: 768px) {

      }

      @media screen and (min-width: 1280px) {
        max-width: 290px;
      }
    }
  }
}

// Анимация звезды 1 промокода
@keyframes promoStar1Animate {
  0%, 10% {
    transform: translate3d(0, 0, 0) rotate(-24deg);
  }
  45%, 55% {
    transform: translate3d(extClamp(4), extClamp(-21), 0) rotate(15deg);
  }
  90%, 100% {
    transform: translate3d(0, 0, 0) rotate(-24deg);
  }
}

// Анимация звезды 2 промокода
@keyframes promoStar2Animate {
  0%, 10% {
    transform: translate3d(0, 0, 0) rotate(12deg);
  }
  45%, 55% {
    transform: translate3d(extClamp(24), extClamp(15), 0) rotate(-30deg);
  }
  90%, 100% {
    transform: translate3d(0, 0, 0) rotate(12deg);
  }
}

// Анимация руки промокода
@keyframes promoHandAnimate {
  0%, 10% {
    transform: translate3d(0, 0, 0) rotate(-36deg);
  }
  45%, 55% {
    transform: translate3d(extClamp(14), extClamp(6), 0) rotate(-16deg);
  }
  90%, 100% {
    transform: translate3d(0, 0, 0) rotate(-36deg);
  }
}

// Анимации для 768px - только rotation без translate
@media screen and (min-width: 768px) {
  @keyframes promoStar1Animate768 {
    0%, 10% {
      transform: rotate(-24deg);
      top: 110px;
      left: 8px;
    }
    45%, 55% {
      transform: rotate(15deg);
      top: 66px;
      left: 4px;
    }
    90%, 100% {
      transform: rotate(-24deg);
      top: 110px;
      left: 8px;
    }
  }

  @keyframes promoStar2Animate768 {
    0%, 10% {
      transform: rotate(18deg);
      top: 47px;
      left: 152px;
    }
    45%, 55% {
      transform: rotate(-18deg);
      top: 60px;
      left: 182px;
    }
    90%, 100% {
      transform: rotate(18deg);
      top: 47px;
      left: 152px;
    }
  }

  @keyframes promoHandAnimate768 {
    0%, 10% {
      transform: rotate(-36deg);
      left: 96px;
      top: 104px;

    }
    45%, 55% {
      transform: rotate(-16deg);
      left: 150px;
      top: 104px;
    }
    90%, 100% {
      left: 96px;
      top: 104px;
      transform: rotate(-36deg);
    }
  }
}

// Анимация свечения для небесных тел
@keyframes celestialGlow {
  0%, 100% {
    opacity: 0.6;
    filter: blur(1px);
  }
  50% {
    opacity: 0.8;
    filter: blur(1.5px);
  }
}
</style>
