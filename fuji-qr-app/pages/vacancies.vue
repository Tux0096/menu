<template>
  <div class="page-content">
    <div class="page-vacancies">
      <portal
        :disabled="isSliderPortalDisable"
        to="header-slider"
      >
        <AppSlider
          v-if="content?.slides?.mobile?.length"
          class="page-vacancies__slider page-vacancies__slider--mobile"
        >
          <swiper-slide
            v-for="slide in content.slides.mobile"
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
        <AppSlider
          v-if="content?.slides?.desktop?.length"
          class="page-vacancies__slider page-vacancies__slider--desktop"
        >
          <swiper-slide
            v-for="slide in content.slides.desktop"
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
        <div class="page-vacancies__promo vacancies-promo">
          <div class="vacancies-promo__description">
            <h1 class="vacancies-promo__title">
              Вакансии
            </h1>
            <div class="vacancies-promo__text">
              Фуджи - это большая компания единомышленников, цель которых - создавать лучший продукт. Мы уже <b>более 9
                лет на рынке Самары</b> и планируем расширять границы
            </div>
          </div>
        </div>
      </portal>

      <div class="page-vacancies__inner">
        <div class="page-vacancies__title">
          Стань частью амбициозной команды фуджи!
        </div>

        <div class="page-vacancies__advantages vacancy-advantages">
          <div class="vacancy-advantages___inner">
            <div class="vacancy-advantages__item vacancy-advantage">
              <svg
                class="vacancy-advantage__icon"
                fill="none"
                viewBox="0 0 114 93"
              >
                <g opacity="0.5">
                  <mask
                    id="mask0_1345_12530"
                    height="151"
                    maskUnits="userSpaceOnUse"
                    style="mask-type:alpha"
                    width="151"
                    x="0"
                    y="-17"
                  >
                    <rect
                      fill="#D9D9D9"
                      height="110"
                      transform="rotate(-30 0 38)"
                      width="110"
                      y="38"
                    />
                  </mask>
                  <g mask="url(#mask0_1345_12530)">
                    <path
                      d="M96.902 95.8395C91.6857 98.8511 86.2123 100.692 80.4817 101.361C74.7511 102.03 69.2095 101.648 63.8567 100.215C58.504 98.7809 53.5136 96.342 48.8856 92.8979C44.2576 89.4539 40.4381 85.1242 37.427 79.9088C34.4159 74.6935 32.5753 69.2199 31.9051 63.4881C31.235 57.7562 31.6165 52.2135 33.0497 46.8599C34.4829 41.5062 36.9214 36.5151 40.3652 31.8865C43.8089 27.2581 48.1384 23.4382 53.3538 20.4272C58.5692 17.4161 64.0429 15.5756 69.7748 14.9058C75.5069 14.236 81.0499 14.618 86.4039 16.0519C91.7579 17.4857 96.7494 19.9249 101.378 23.3694C106.007 26.8139 109.828 31.1443 112.839 36.3606C113.871 38.1468 114.771 39.9646 115.54 41.8139C116.309 43.6632 116.927 45.5558 117.393 47.4917C116.236 47.1558 115.049 46.9809 113.833 46.967C112.618 46.953 111.411 47.1492 110.214 47.5554C109.839 46.2116 109.372 44.8983 108.815 43.6154C108.257 42.3326 107.614 41.0601 106.885 39.7981C101.767 30.9333 94.3562 25.2008 84.6517 22.6005C74.9472 20.0002 65.6626 21.2591 56.7979 26.3771C47.9331 31.4952 42.2006 38.9065 39.6003 48.6109C37 58.3154 38.2589 67.6 43.3769 76.4647C48.495 85.3295 55.9063 91.062 65.6107 93.6623C75.3152 96.2626 84.5998 95.0037 93.4645 89.8857C96.9403 87.879 99.9456 85.4466 102.481 82.5884C105.016 79.7302 107.056 76.5998 108.602 73.1973C109.691 73.6611 110.838 73.9825 112.044 74.1615C113.25 74.3406 114.448 74.3443 115.638 74.1729C113.895 78.5923 111.458 82.6606 108.328 86.3778C105.198 90.0951 101.389 93.249 96.902 95.8395ZM116.515 64.6694C115.404 65.3107 114.243 65.4698 113.032 65.1465C111.821 64.8231 110.895 64.106 110.253 62.9953C109.612 61.8845 109.453 60.7235 109.777 59.5123C110.1 58.3011 110.817 57.3748 111.928 56.7335C113.038 56.0922 114.199 55.9332 115.411 56.2565C116.622 56.5799 117.548 57.2969 118.189 58.4077C118.831 59.5185 118.99 60.6795 118.666 61.8907C118.343 63.1018 117.626 64.0281 116.515 64.6694ZM99.2911 68.1408L72.8502 61.0554L60.696 40.0037L66.6497 36.5663L77.4118 55.2067L101.059 61.543L99.2911 68.1408Z"
                      fill="url(#paint0_linear_1345_12530)"
                    />
                  </g>
                </g>
                <defs>
                  <linearGradient
                    id="paint0_linear_1345_12530"
                    gradientUnits="userSpaceOnUse"
                    x1="53.3604"
                    x2="96.902"
                    y1="20.4233"
                    y2="95.8395"
                  >
                    <stop stop-color="#DB9DEE" />
                    <stop
                      offset="1"
                      stop-color="#6F81B4"
                    />
                  </linearGradient>
                </defs>
              </svg>
              <div class="vacancy-advantage__title">
                Удобный график
              </div>
            </div>
            <div class="vacancy-advantages__item vacancy-advantage">
              <svg
                class="vacancy-advantage__icon"
                fill="none"
                viewBox="0 0 114 93"
              >
                <g opacity="0.5">
                  <mask
                    id="mask0_1345_2407"
                    height="151"
                    maskUnits="userSpaceOnUse"
                    style="mask-type:alpha"
                    width="151"
                    x="0"
                    y="-17"
                  >
                    <rect
                      fill="#D9D9D9"
                      height="110"
                      transform="rotate(-30 0 38)"
                      width="110"
                      y="38"
                    />
                  </mask>
                  <g mask="url(#mask0_1345_2407)">
                    <path
                      d="M56.9026 113.641L53.4651 107.687L128.881 64.1456L132.319 70.0994L56.9026 113.641ZM54.2612 99.8994L40.247 75.6259L50.1701 69.8968L64.1844 94.1703L54.2612 99.8994ZM73.4207 88.8377L47.9481 44.7178L57.8711 38.9888L83.3437 83.1086L73.4207 88.8377ZM92.6182 77.754L74.0206 45.542L83.9436 39.8129L102.541 72.0249L92.6182 77.754ZM111.816 66.6703L79.4681 10.6425L89.3912 4.91344L121.739 60.9412L111.816 66.6703Z"
                      fill="url(#paint0_linear_1345_2407)"
                    />
                  </g>
                </g>
                <defs>
                  <linearGradient
                    id="paint0_linear_1345_2407"
                    gradientUnits="userSpaceOnUse"
                    x1="55.6524"
                    x2="94.6107"
                    y1="24.3926"
                    y2="91.8702"
                  >
                    <stop stop-color="#DB9DEE" />
                    <stop
                      offset="1"
                      stop-color="#6F81B4"
                    />
                  </linearGradient>
                </defs>
              </svg>
              <div class="vacancy-advantage__title">
                Карьерный рост
              </div>
            </div>
            <div class="vacancy-advantages__item vacancy-advantage">
              <svg
                class="vacancy-advantage__icon"
                fill="none"
                viewBox="0 0 114 93"
              >
                <g opacity="0.5">
                  <mask
                    id="mask0_1345_12537"
                    height="151"
                    maskUnits="userSpaceOnUse"
                    style="mask-type:alpha"
                    width="151"
                    x="0"
                    y="-17"
                  >
                    <rect
                      fill="#D9D9D9"
                      height="110"
                      transform="rotate(-30 0 38)"
                      width="110"
                      y="38"
                    />
                  </mask>
                  <g mask="url(#mask0_1345_12537)">
                    <path
                      d="M93.1123 89.2747L59.2208 90.1559L46.793 68.6303L28.7168 69.0519L55.829 24.698L107.797 23.3952L124.279 51.9433L118.325 55.3806L103.747 30.13L98.3935 38.8387L110.821 60.3643L93.1123 89.2747ZM76.7359 60.9099L95.4081 30.5477L59.7776 31.5372L41.1054 61.8994L76.7359 60.9099ZM89.199 82.4965L102.858 60.3211L94.273 45.4516L80.6804 67.742L54.5801 68.3682L63.165 83.2378L89.199 82.4965Z"
                      fill="url(#paint0_linear_1345_12537)"
                    />
                  </g>
                </g>
                <defs>
                  <linearGradient
                    id="paint0_linear_1345_12537"
                    gradientUnits="userSpaceOnUse"
                    x1="55.8289"
                    x2="93.1123"
                    y1="24.698"
                    y2="89.2747"
                  >
                    <stop stop-color="#DB9DEE" />
                    <stop
                      offset="1"
                      stop-color="#6F81B4"
                    />
                  </linearGradient>
                </defs>
              </svg>
              <div class="vacancy-advantage__title">
                Бесплатное обучение с нуля
              </div>
            </div>

            <div class="vacancy-advantages__item vacancy-advantage">
              <svg
                class="vacancy-advantage__icon"
                fill="none"
                viewBox="0 0 114 93"
              >
                <g opacity="0.5">
                  <mask
                    id="mask0_1345_12549"
                    height="151"
                    maskUnits="userSpaceOnUse"
                    style="mask-type:alpha"
                    width="151"
                    x="0"
                    y="-17"
                  >
                    <rect
                      fill="#D9D9D9"
                      height="110"
                      transform="rotate(-30 0 38)"
                      width="110"
                      y="38"
                    />
                  </mask>
                  <g mask="url(#mask0_1345_12549)">
                    <path
                      d="M85.297 94.6012L101.556 85.2142L98.991 80.7717L101.785 77.3265C105.518 72.9798 108.072 68.2141 109.449 63.0295C110.825 57.8449 111.086 52.9853 110.232 48.4506L49.1968 83.6894C52.697 86.6963 57.0133 88.9132 62.1456 90.34C67.278 91.7668 72.6798 91.9388 78.3513 90.856L82.7321 90.1587L85.297 94.6012ZM82.7807 103.992L79.1228 97.6569C71.0568 99.152 63.3341 98.471 55.9546 95.614C48.5751 92.7571 42.7799 88.1814 38.569 81.8869L46.5076 77.3036L27.8878 45.0532L91.0685 -1.34747L93.8229 3.42332L52.8331 33.6126L57.1917 41.162L101.006 15.8655L103.739 20.598L59.924 45.8945L70.1705 63.6418L113.985 38.3454C117.382 45.11 118.447 52.4166 117.18 60.2653C115.914 68.114 112.617 75.1572 107.289 81.395L110.947 87.7306L82.7807 103.992ZM47.7266 46.6267L52.4592 43.8943L48.3782 36.8258L43.9541 40.0926L47.7266 46.6267ZM38.2614 52.0914L42.9941 49.359L39.5345 43.3668L35.0971 46.6106L38.2614 52.0914ZM60.7053 69.1065L65.438 66.3741L55.1915 48.6268L50.4589 51.3592L60.7053 69.1065ZM51.2402 74.5712L55.9728 71.8388L45.7264 54.0915L40.9937 56.8239L51.2402 74.5712Z"
                      fill="url(#paint0_linear_1345_12549)"
                    />
                  </g>
                </g>
                <defs>
                  <linearGradient
                    id="paint0_linear_1345_12549"
                    gradientUnits="userSpaceOnUse"
                    x1="53.3604"
                    x2="96.902"
                    y1="20.4233"
                    y2="95.8395"
                  >
                    <stop stop-color="#DB9DEE" />
                    <stop
                      offset="1"
                      stop-color="#6F81B4"
                    />
                  </linearGradient>
                </defs>
              </svg>
              <div class="vacancy-advantage__title">
                Корпоративное питание
              </div>
            </div>

            <div class="vacancy-advantages__item vacancy-advantage vacancy-advantage--wide">
              <svg
                class="vacancy-advantage__icon"
                fill="none"
                viewBox="0 0 109 93"
              >
                <g opacity="0.5">
                  <mask
                    id="mask0_1345_3105"
                    height="151"
                    maskUnits="userSpaceOnUse"
                    style="mask-type:alpha"
                    width="151"
                    x="0"
                    y="-12"
                  >
                    <rect
                      fill="#D9D9D9"
                      height="110"
                      transform="rotate(-30 0 43)"
                      width="110"
                      y="43"
                    />
                  </mask>
                  <g mask="url(#mask0_1345_3105)">
                    <path
                      d="M83.276 104.738C79.1642 107.112 74.8167 107.684 70.2334 106.456C65.6501 105.228 62.1715 102.558 59.7976 98.4466L40.6665 65.3106C37.8546 65.7874 35.1586 65.5103 32.5787 64.4792C29.9987 63.4481 28.0252 61.7486 26.6582 59.3808C24.9055 56.3451 24.4765 53.1523 25.3713 49.8025C26.266 46.4526 28.2288 43.9028 31.2596 42.1529C34.2904 40.4031 37.4815 39.9774 40.8329 40.8757C44.1843 41.774 46.7364 43.7411 48.489 46.7768C49.8561 49.1446 50.3411 51.7034 49.9441 54.4533C49.5471 57.2031 48.4391 59.6764 46.6202 61.8732L65.7513 95.0092C67.1693 97.4652 69.2584 99.0624 72.0186 99.8008C74.7788 100.539 77.388 100.199 79.846 98.7796C82.3041 97.3605 83.9009 95.2725 84.6367 92.5157C85.3724 89.759 85.0312 87.1526 83.6133 84.6966L60.6966 45.0038C58.3227 40.892 57.7498 36.5445 58.9779 31.9612C60.2059 27.3779 62.8758 23.8993 66.9876 21.5254C71.0994 19.1514 75.4469 18.5785 80.0302 19.8067C84.6135 21.0347 88.0921 23.7046 90.466 27.8164L109.597 60.9524C112.409 60.4756 115.105 60.7527 117.685 61.7838C120.265 62.8149 122.238 64.5144 123.605 66.8822C125.358 69.9179 125.787 73.1107 124.892 76.4605C123.998 79.8104 122.035 82.3602 119.004 84.1101C115.973 85.8599 112.782 86.2856 109.431 85.3873C106.079 84.489 103.527 82.5219 101.775 79.4862C100.408 77.1184 99.9129 74.543 100.291 71.7601C100.669 68.9772 101.786 66.5204 103.643 64.3897L84.5123 31.2538C83.0943 28.7978 81.0052 27.2006 78.245 26.4622C75.4848 25.7238 72.8756 26.0642 70.4176 27.4834C67.9595 28.9025 66.3626 30.9905 65.6269 33.7473C64.8912 36.504 65.2324 39.1104 66.6503 41.5664L89.567 81.2592C91.9409 85.371 92.5138 89.7185 91.2857 94.3018C90.0577 98.8851 87.3878 102.364 83.276 104.738ZM40.4307 58.0275C41.8098 57.2313 42.7031 56.0726 43.1108 54.5515C43.5183 53.0303 43.324 51.5802 42.5278 50.2012C41.7316 48.8221 40.5729 47.9287 39.0518 47.5211C37.5306 47.1136 36.0805 47.3079 34.7015 48.1041C33.3224 48.9003 32.429 50.059 32.0214 51.5801C31.6139 53.1013 31.8082 54.5514 32.6044 55.9304C33.4006 57.3095 34.5593 58.2029 36.0804 58.6105C37.6016 59.018 39.0517 58.8237 40.4307 58.0275ZM115.562 78.1589C116.941 77.3627 117.835 76.204 118.242 74.6829C118.65 73.1617 118.455 71.7116 117.659 70.3326C116.863 68.9535 115.704 68.0601 114.183 67.6525C112.662 67.245 111.212 67.4393 109.833 68.2355C108.454 69.0317 107.56 70.1904 107.153 71.7115C106.745 73.2327 106.94 74.6828 107.736 76.0618C108.532 77.4409 109.691 78.3343 111.212 78.7419C112.733 79.1494 114.183 78.9551 115.562 78.1589Z"
                      fill="url(#paint0_linear_1345_3105)"
                    />
                  </g>
                </g>
                <defs>
                  <linearGradient
                    id="paint0_linear_1345_3105"
                    gradientUnits="userSpaceOnUse"
                    x1="55.0798"
                    x2="95.1838"
                    y1="28.4004"
                    y2="97.8626"
                  >
                    <stop stop-color="#DB9DEE" />
                    <stop
                      offset="1"
                      stop-color="#6F81B4"
                    />
                  </linearGradient>
                </defs>
              </svg>
              <div class="vacancy-advantage__title">
                Работа рядом с домом
              </div>
            </div>
          </div>
        </div>
        <AppVacancyForm
          class="page-vacancies__form"
          @send="showModalThanks"
        />
      </div>
    </div>
  </div>
</template>

<script>

export default {
  name: 'PageVacancies',

  data() {
    return {
      content: null,
      isSliderPortalDisable: false,
    };
  },
  async fetch() {
    const cityId = this.$store.getters['city/cityIikoId'];
    this.content = await this.$axios.$get(`${this.$config.FRONT_API_URL}/api/v1/page/vacancies/${cityId}`);
  },
  head() {
    return {
      title: `Вакансии Фуджи Суши Friends в ${this.$store.getters['city/cityIn']}`,
      meta: [
        {
          hid: 'description',
          name: 'description',
          content: `Вакансии Фуджи Суши Friends на доставку в ${this.$store.getters['city/cityIn']}`,
        },
      ],
    };
  },
  mounted() {
    this.isSliderPortalDisable = window.innerWidth >= 1280;
  },
  methods: {
    showModalThanks() {
      this.$store.commit(
        'modal/showModal',
        {
          component: 'ModalThanks',
          params: {
            title: 'Спасибо за заявку',
            isModalCenter: true,
            isNotMaxHeight: true,
            icon: 'tick',
            iconColors: 'primary:#43D068,secondary:#43D068',
          },
        },
      );
    },
  },
};
</script>
<style lang="scss"
       scoped
>
.vacancies-slider {

}

.vacancy-advantages {

  // .vacancy-advantages___inner
  &___inner {
    display: flex;
    flex-wrap: wrap;
    gap: extClamp(6);

    @media screen and (min-width: 768px) {
      gap: 16px 8px;
    }

    @media screen and (min-width: 1280px) {
      flex-wrap: nowrap;
    }

  }

  // .vacancy-advantages__item
  &__item {
    width: calc(100% / 2 - extClamp(5));

    @media screen and (min-width: 768px) {
      width: calc(100% / 2 - 10px);
    }

    @media screen and (min-width: 1280px) {
      width: 206px;
    }
  }
}

.vacancy-advantage-image {

}

.vacancy-advantage {
  position: relative;
  display: flex;
  overflow: hidden;
  align-items: flex-start;
  height: extClamp(93);
  padding: extClamp(12) extClamp(6);
  border-radius: extClamp(10);
  background-color: #f6f6f6;
  gap: extClamp(10);

  @media screen and (min-width: 768px) {
    height: 128px;
    padding: 16px 8px;
    border-radius: 8px;
    gap: 60px;
  }

  @media screen and (min-width: 1280px) {
    height: 160px;
    padding: 20px;
  }

  // .vacancy-advantage__icon
  &__icon {
    position: absolute;
    right: extClampNegative(1);
    bottom: extClampNegative(9);
    width: extClamp(112);
    height: extClamp(112);

    @media screen and (min-width: 768px) {
      right: -2px;
      bottom: -9px;
      width: 110px;
      height: 110px;
    }

    @media screen and (min-width: 1280px) {
      width: 206px;
      height: 206px;
      opacity: 0.2;
    }

  }

  // .vacancy-advantage__title
  &__title {
    font-size: extClamp(10);
    font-weight: 600;
    line-height: 120%;
    color: var(---Main-Purple, #993ca6);

    @media screen and (min-width: 768px) {
      font-size: 18px;
      max-width: 189px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      line-height: 140%;
      max-width: none;
    }
  }

  // .vacancy-advantage--wide
  &--wide {
    width: 100%;

    @media screen and (min-width: 768px) {
      flex-grow: 1;
      width: auto;
    }

    @media screen and (min-width: 1280px) {

    }
  }

}

.page-vacancies {
  display: flex;
  flex-direction: column;
  gap: extClamp(40);

  @media screen and (min-width: 768px) {
    gap: 40px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .page-vacancies__slider
  &__slider {

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {

      border-radius: 40px;

      &::v-deep .swiper-slide img {
        max-height: 400px;
      }
    }

    // .page-vacancies__slider--desktop
    &--desktop {
      display: none;
      @media screen and (min-width: 768px) {

      }

      @media screen and (min-width: 1280px) {
        display: block;
      }
    }

    // .page-vacancies__slider--mobile
    &--mobile {
      @media screen and (min-width: 768px) {

      }

      @media screen and (min-width: 1280px) {
        display: none;
      }
    }
  }

  // .page-vacancies__inner
  &__inner {
    display: flex;
    flex-direction: column;
    gap: extClamp(12);

    @media screen and (min-width: 768px) {
      gap: 16px;
    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .page-vacancies__title
  &__title {
    font-size: extClamp(18);
    font-weight: 600;
    line-height: 120%;
    color: var(---Main-Purple, #993ca6);

    @media screen and (min-width: 768px) {
      font-size: 24px;

      line-height: normal;

    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .page-vacancies__advantages
  &__advantages {
  }

  // .page-vacancies__promo
  &__promo {
  }

  // .page-vacancies__form
  &__form {

  }
}

.vacancies-promo {
  position: relative;
  z-index: 1;
  top: extClampNegative(343);

  @media screen and (min-width: 768px) {
    top: -603px;
  }

  @media screen and (min-width: 1280px) {
    top: -340px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  // .vacancies-promo__description
  &__description {
    position: absolute;
    top: extClamp(90);
    display: inline-flex;
    align-items: center;
    flex-direction: column;
    color: #fff;
    gap: extClamp(5);

    @media screen and (min-width: 768px) {
      top: 90px;
      gap: 10px;
    }

    @media screen and (min-width: 1280px) {
      max-width: 510px;
      gap: 16px;
    }
  }

  // .vacancies-promo__title
  &__title {
    font-size: extClamp(18);
    font-weight: 700;
    line-height: 120%;
    text-align: center;
    color: var(---Main-White, #fff);

    @media screen and (min-width: 768px) {
      font-size: 24px;

    }

    @media screen and (min-width: 1280px) {
      font-size: 24px;
    }

  }

  // .vacancies-promo__text
  &__text {
    font-size: extClamp(10);
    font-weight: 500;
    line-height: 120%;
    text-align: center;
    color: var(---Main-White, #fff);

    @media screen and (min-width: 768px) {
      font-size: 16px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
    }

    > b {
      font-weight: 500;
      text-decoration: underline;
    }
  }
}
</style>
