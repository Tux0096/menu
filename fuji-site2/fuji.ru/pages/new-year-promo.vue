<template>
  <div class="new-year-page">
    <div class="new-year-page__inner">
      <div class="new-year-page__header">
        <NuxtLink
          class="new-year-page__title"
          to="/"
        >
          <svg class="new-year-page__logo">
            <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#logo" />
          </svg>
        </NuxtLink>
        <div class="new-year-page__subtitle">
          Подарки каждый день!
        </div>
      </div>
      <div class="new-year-page__content">
        <div class="new-year-page__grid days">
          <div class="days__inner">
            <div
              v-for="day in days"
              :key="day.number"
              class="days__item day"
            >
              <div
                v-if="currentDay > day.number"
                class="day__inner center"
              >
                <div

                  class="day__old"
                >
                  <svg class="day__ny-gift-icon">
                    <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#ny-gift" />
                  </svg>
                </div>
              </div>
              <div
                v-else-if="currentDay=== day.number "
                class="day__inner"
                @click="isModalShow = true"
              >
                <div class="day__header">
                  {{ day.title }}
                </div>
                <div class="day__image-wrapper">
                  <nuxt-img
                    v-if="day.image"
                    :src="day.image"
                    class="day__image"
                    height="500"
                    width="500"
                  />
                </div>
              </div>
              <div
                v-else
                class="day__inner center"
              >
                <div

                  class="day__number"
                >
                  {{ day.number }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="new-year-page__gifts-1" />
    <div class="new-year-page__gifts-2" />

    <NYCalendarModal
      :gift="currentGift"
      :is-visible="isModalShow"
      @close="isModalShow = false"
    />
  </div>
</template>

<script>

import NYCalendarModal from '~/components/Actions/NY/NYCalendarModal.vue';

const days = [
  {
    number: 1,
    productCode: '65434',
    subtitle: 'при заказе от 2490 рублей',
    promocode: 'HNY1',
  },
  {
    number: 2,
    productCode: '66640',
    subtitle: 'при заказе от 2190 рублей',
    promocode: 'HNY2',
  },
  {
    number: 3,
    productCode: '65222',
    subtitle: 'при заказе от 2390 рублей',
    promocode: 'HNY3',
  },
  {
    number: 4,
    productCode: '66653',
    subtitle: 'при заказе от 2490 рублей',
    promocode: 'HNY4',
  },
  {
    number: 5,
    productCode: '66666',
    subtitle: 'при заказе от 2490 рублей',
    promocode: 'HNY5',
  },
  {
    number: 6,
    productCode: '66641',
    subtitle: 'при заказе от 2390 рублей',
    promocode: 'HNY6',
  },
  {
    number: 7,
    productCode: '66637',
    subtitle: 'при заказе от 2590 рублей',
    promocode: 'HNY7',
  },
  {
    number: 8,
    productCode: '66642',
    subtitle: 'при заказе от 2090 рублей',
    promocode: 'HNY8',
  },
  {
    number: 9,
    productCode: '65472',
    subtitle: 'при заказе от 2290 рублей',
    promocode: 'HNY9',
  },
  {
    number: 10,
    productCode: '66667',
    subtitle: 'при заказе от 2690 рублей',
    promocode: 'HNY10',
  },
  {
    number: 11,
    productCode: '65435',
    subtitle: 'при заказе от 2290 рублей',
    promocode: 'HNY11',
  },
  {
    number: 12,
    productCode: '66643',
    subtitle: 'при заказе от 3190 рублей',
    promocode: 'HNY12',
  },
  {
    number: 13,
    productCode: '66663',
    subtitle: 'при заказе от 2690 рублей',
    promocode: 'HNY13',
  },
  {
    number: 14,
    productCode: '66649',
    subtitle: 'при заказе от 2490 рублей',
    promocode: 'HNY14',
  },
  {
    number: 15,
    productCode: '65443',
    subtitle: 'при заказе от 2490 рублей',
    promocode: 'HNY15',
  },
  {
    number: 16,
    productCode: '66644',
    subtitle: 'при заказе от 2390 рублей',
    promocode: 'HNY16',
  },
  {
    number: 17,
    productCode: '66632',
    subtitle: 'при заказе от 2890 рублей',
    promocode: 'HNY17',
  },
  {
    number: 18,
    productCode: '66645',
    subtitle: 'при заказе от 2090 рублей',
    promocode: 'HNY18',
  },
  {
    number: 19,
    productCode: '65447',
    subtitle: 'при заказе от 2490 рублей',
    promocode: 'HNY19',
  },
  {
    number: 20,
    productCode: '66650',
    subtitle: 'при заказе от 2290 рублей',
    promocode: 'HNY20',
  },
  {
    number: 21,
    productCode: '66646',
    subtitle: 'при заказе от 2290 рублей',
    promocode: 'HNY21',
  },
  {
    number: 22,
    productCode: '65446',
    subtitle: 'при заказе от 2290 рублей',
    promocode: 'HNY22',
  },
  {
    number: 23,
    productCode: '65557',
    subtitle: 'при заказе от 2390 рублей',
    promocode: 'HNY23',
  },
  {
    number: 24,
    productCode: '66665',
    subtitle: 'при заказе от 2790 рублей',
    promocode: 'HNY24',
  },
  {
    number: 25,
    productCode: '66648',
    subtitle: 'при заказе от 2090 рублей',
    promocode: 'HNY25',
  },
  {
    number: 26,
    productCode: '66626',
    subtitle: 'при заказе от 2890 рублей',
    promocode: 'HNY26',
  },
  {
    number: 27,
    productCode: '65443',
    subtitle: 'при заказе от 2290 рублей',
    promocode: 'HNY27',
  },
  {
    number: 28,
    productCode: '65429',
    subtitle: 'при заказе от 2190 рублей',
    promocode: 'HNY28',
  },
  {
    number: 29,
    productCode: '66651',
    subtitle: 'при заказе от 2190 рублей',
    promocode: 'HNY29',
  },
  {
    number: 30,
    productCode: '66629',
    subtitle: 'при заказе от 2790 рублей',
    promocode: 'HNY30',
  },
  {
    number: 31,
    productCode: '65469',
    subtitle: 'при заказе от 2490 рублей',
    promocode: 'HNY31',
  },
];

export default {
  components: { NYCalendarModal },
  data() {
    return {
      currentDay: new Date().getDate(),

      isModalShow: false,
      days: days.map((day, index) => {
        try {
          let product = this.$store.getters['catalog/productByCode'](day.productCode);

          // TODO: для теста пока нет всех подарков
          if (!product) {
            product = this.$store.getters['catalog/productByCode'](days[0].productCode);
          }

          return ({
            ...day,
            number: index + 1,
            title: product.name,
            image: product.image,
          });
        } catch (e) {
          console.log(e);
        }
      }),
    };
  },
  computed: {
    currentGift() {
      return this.days[this.currentDay - 1];
    },
  },
  methods: {},
};
</script>
<style lang="scss">

.page:has(.new-year-page) .header-wrapper {
  display: none;

  @media screen and (min-width: 768px) {

  }

  @media screen and (min-width: 1280px) {
    display: block;
  }
}

.page:has(.new-year-page) .page__footer {
  margin-top: 0 !important;
}

.page:has(.new-year-page) .main {
  padding-top: 0;

  @media screen and (min-width: 768px) {

  }

  @media screen and (min-width: 1280px) {
    display: block;
    padding-top: 90px;
  }
}

.page--new-year-promo {
  padding-top: 0 !important;

}
</style>

<style lang="scss" scoped>
.new-year-page {
  position: relative;
  overflow: hidden;
  padding-bottom: extClamp(164);
  background-image: url("@/assets/images/content/new-year/bg-2.png"),
  url("@/assets/images/content/new-year/main-bg.png"),
  linear-gradient(90deg, #78b9f5 0%, #bed9f6 100%);
  background-repeat: no-repeat;
  background-position: top 15px right -561px, left bottom, left bottom;
  background-size: 1441px 1147px, 100%, 100%;

  @media screen and (min-width: 768px) {
    padding-bottom: 164px;
    background-position: 50% 146px, left bottom, left bottom;
  }

  @media screen and (min-width: 1280px) {
    background-position: 50% 3px, left bottom, left bottom;
  }

  &::before {
    position: absolute;
    z-index: 0;
    top: 0;
    left: 50%;
    width: extClamp(1442);
    height: extClamp(592);
    content: '';
    transform: translateX(-50%);
    background-image: url("~/assets/images/content/new-year/bg-1.png");
    background-repeat: no-repeat;
    background-position: center;
    background-size: cover;
    mix-blend-mode: screen;

    @media screen and (min-width: 768px) {
      width: 1442px;
      height: 592px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .new-year-page__gifts-1
  &__gifts-1 {
    position: absolute;
    z-index: 0;
    right: extClampNegative(53);
    bottom: extClampNegative(121);
    width: extClamp(312);
    height: extClamp(210);

    @media screen and (min-width: 768px) {
      right: -79px;
      bottom: -117px;
      width: 473px;
      height: 331px;
    }

    @media screen and (min-width: 1280px) {
      bottom: -211px;
      left: -86px;
      height: 388px;
    }

    &::before,
    &::after {
      position: absolute;
      content: '';
      background-repeat: no-repeat;
      background-size: contain;
    }

    &::before {
      top: extClamp(42);
      left: extClamp(13);
      width: extClamp(142);
      height: extClamp(149);
      transform: rotate(-191deg) scale(1, -1);
      background-image: url("~/assets/images/content/new-year/gift-3.png");

      @media screen and (min-width: 768px) {
        top: 34px;
        left: 35px;
        transform: rotate(-18deg);
        background-image: url("~/assets/images/content/new-year/gift-1.png");
      }

      @media screen and (min-width: 1280px) {

      }
    }

    &::after {
      top: extClamp(13);
      right: extClamp(15);
      width: extClamp(158);
      height: extClamp(184);
      transform: rotate(10deg);
      background-image: url("~/assets/images/content/new-year/gift-4.png");

      @media screen and (min-width: 768px) {
        top: 0;
        right: 0;
        width: 270px;
        height: 316px;
        transform: rotate(0deg);
        background-image: url("~/assets/images/content/new-year/gift-2.png");
      }

      @media screen and (min-width: 1280px) {

      }
    }

  }

  // .new-year-page__gifts-2
  &__gifts-2 {
    position: absolute;
    z-index: 0;
    display: none;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      position: absolute;
      z-index: 0;
      right: -86px;
      bottom: -211px;
      display: block;
      width: 500px;
      height: 388px;
    }

    &::before,
    &::after {
      position: absolute;
      content: '';
      background-repeat: no-repeat;
      background-size: contain;
    }

    &::before {

      @media screen and (min-width: 768px) {

      }

      @media screen and (min-width: 1280px) {
        top: 25px;
        right: 297px;
        width: 248px;
        height: 260px;
        transform: rotate(-190deg) scale(1, -1);
        background-image: url("~/assets/images/content/new-year/gift-3.png");
      }
    }

    &::after {

      @media screen and (min-width: 768px) {

      }

      @media screen and (min-width: 1280px) {
        top: 48px;
        right: 65px;
        width: 275px;
        height: 321px;
        transform: rotate(10deg);
        background-image: url("~/assets/images/content/new-year/gift-4.png");
      }
    }

  }

  // .new-year-page__inner

  &__inner {
    position: relative;
  }

  // .new-year-page__header
  &__header {
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    margin-top: extClamp(48);
    padding: extClamp(16) 0;
    gap: extClamp(8);

    @media screen and (min-width: 768px) {
      margin-top: 48px;
      padding: 16px 0;
      gap: 8px;
    }

    @media screen and (min-width: 1280px) {
      margin-top: 96px;
      padding: 36px 0;
    }
  }

  // .new-year-page__title
  &__title {
  }

  // .new-year-page__logo
  &__logo {
    width: extClamp(286);
    height: extClamp(60);
    color: #993ca6;

    @media screen and (min-width: 768px) {
      width: 440px;
      height: 90px;
    }

    @media screen and (min-width: 1280px) {
      width: 510px;
      height: 105px;
    }
  }

  // .new-year-page__subtitle
  &__subtitle {
    font-size: extClamp(26);
    font-weight: 400;
    line-height: normal;
    text-align: center;
    color: #782484;

    @media screen and (min-width: 768px) {
      font-size: 40px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 46px;
    }
  }

  // .new-year-page__content
  &__content {
    padding-top: extClamp(48);

    @media screen and (min-width: 768px) {
      padding-top: 48px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .new-year-page__grid
  &__grid {
  }

  // .new-year-page__modal
  &__modal {
  }
}

.days {

  // .days__inner
  &__inner {
    display: flex;
    align-items: flex-end;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    gap: extClamp(24) extClamp(16);

    @media screen and (min-width: 768px) {
      max-width: 576px;
      margin-right: auto;
      margin-left: auto;
      gap: 24px 16px;
    }

    @media screen and (min-width: 1280px) {
      max-width: 1248px;
    }
    @media screen and (min-width: 1920px) {
      max-width: 1728px;
    }
  }

  // .days__item
  &__item {
  }
}

.center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.day {
  width: extClamp(128);
  height: extClamp(128);
  cursor: pointer;
  border-radius: extClamp(12);
  background: linear-gradient(90deg, #7ed4ff 0%, #36c3ff 15%, #8ed9ff 25%, #67c0ff 50%, #8ed9ff 68.5%, #36c3ff 78.5%, #7ed4ff 100%);

  @media screen and (min-width: 768px) {
    width: 164px;
    height: 164px;
    border-radius: 16px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .day__inner
  &__inner {
    position: relative;
    width: extClamp(128);
    height: extClamp(122);
    padding: extClamp(12);
    color: #fff;
    border: 1px solid #a5e9fb;
    border-radius: extClamp(12);
    background-image: url("~/assets/images/content/new-year/bg-card.png"), linear-gradient(180deg, #0199cb 0%, #a5e9fb 100%);
    background-repeat: no-repeat;
    background-size: contain;

    @media screen and (min-width: 768px) {
      width: 164px;
      height: 156px;
      padding: 16px;
      border-radius: 16px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .day__ny-gift-icon
  &__ny-gift-icon {
    width: extClamp(63);
    height: extClamp(80);
    fill: #fff;

    @media screen and (min-width: 768px) {
      width: 81px;
      height: 102px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .day__number
  &__number {
    font-size: extClamp(52);
    font-weight: 700;

    @media screen and (min-width: 768px) {
      font-size: 64px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .day__header
  &__header {
    font-size: extClamp(14);
    font-weight: 700;
    font-style: normal;
    line-height: 100%;
    display: -webkit-box;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #fff;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;

    @media screen and (min-width: 768px) {
      font-size: 16px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .day__image-wrapper
  &__image-wrapper {
    position: absolute;
    right: 0;
    bottom: 0;
  }

  // .day__image
  &__image {
    width: extClamp(96);
    max-height: extClamp(96);
    object-fit: cover;

    @media screen and (min-width: 768px) {
      width: 128px;
      height: 128px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}

.day--open {
  cursor: initial;
}

</style>
