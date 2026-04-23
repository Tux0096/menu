<template>
  <div class="fb-promos-page">
    <svg class="fb-promos-page__star">
      <use xlink:href="~/assets/images/icons/svg/fm-promos.svg#bg-star" />
    </svg>
    <div class="fb-promos-page__heart fb-promos-page__heart-1" />
    <div class="fb-promos-page__heart fb-promos-page__heart-2" />
    <div class="fb-promos-page__heart fb-promos-page__heart-3" />
    <div class="fb-promos-page__heart fb-promos-page__heart-4" />
    <div class="fb-promos-page__heart fb-promos-page__heart-5" />
    <div class="fb-promos-page__heart fb-promos-page__heart-6" />

    <div class="fb-promos-page__inner">
      <div class="fb-promos-page__header">
        <div class="fb-promos-page__header-item">
          <svg class="fb-promos-page__logo-left">
            <use xlink:href="~/assets/images/icons/svg/fm-promos.svg#logo-1" />
          </svg>
        </div>
        <div class="fb-promos-page__header-item">
          <NuxtLink
            class="fb-promos-page__title"
            to="/"
          >
            <svg class="fb-promos-page__logo">
              <use xlink:href="~/assets/images/icons/svg/fm-promos.svg#logo" />
            </svg>
          </NuxtLink>
        </div>
        <div class="fb-promos-page__header-item">
          <div
            class="friends"
            @click="share"
          >
            рассказать друзьям
            <svg class="friends__icon">
              <use xlink:href="~/assets/images/icons/svg/fm-promos.svg#arrow" />
            </svg>
          </div>
        </div>
      </div>
      <div class="fb-promos-page__content">
        <div class="fb-promos-page__grid days">
          <div class="days__inner">
            <FMPromoItem
              v-for="day in days"
              :key="day.date"
              :current-day="currentDay"
              :day="day"
              @click="showModal(day)"
            />
            <div
              class="days__friends friends"
              @click="share"
            >
              рассказать друзьям
              <svg class="friends__icon">
                <use xlink:href="~/assets/images/icons/svg/fm-promos.svg#arrow" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>

    <FMPromosModal
      :gift="selectedDay"
      :is-visible="isModalShow"
      @close="isModalShow = false"
    />
  </div>
</template>

<script>

import FMPromosModal from '~/components/Actions/FMPromos/FMPromosModal.vue';
import FMPromoItem from '~/components/Actions/FMPromos/FMPromoItem.vue';
import { copyTextToClipboard } from '~/lib/common';

const days = [
  {
    date: '2025-02-14',
    productCode: '65447',
    subtitle: 'При покупке от 4990 ₽',
    promocode: 'LU1',
    cardColor: '#7c7ef6',
  },
  {
    date: '2025-02-15',
    productCode: '65446',
    subtitle: 'При покупке от 2890 ₽',
    promocode: 'LU2',
    cardColor: '#7c7ef6',
  },
  {
    date: '2025-02-16',
    productCode: '65223',
    subtitle: 'При покупке от 2890 ₽',
    promocode: 'LU3',
    cardColor: '#7c7ef6',
  },
  {
    date: '2025-02-17',
    productCode: '66641',
    subtitle: 'При покупке от 2590 ₽',
    promocode: 'LU4',
    cardColor: '#7c7ef6',
  },
  {
    date: '2025-02-18',
    productCode: '66437',
    subtitle: 'При покупке от 2490 ₽',
    promocode: 'LU5',
    cardColor: '#7c7ef6',
  },
  {
    date: '2025-02-19',
    productCode: '65440',
    subtitle: 'При покупке от 2590 ₽',
    promocode: 'LU6',
    cardColor: '#7c7ef6',
  },
  {
    date: '2025-02-20',
    productCode: '67123',
    subtitle: 'При покупке от 2990 ₽',
    promocode: 'LU7',
    cardColor: '#7c7ef6',
  },
  {
    date: '2025-02-21',
    productCode: '65443',
    subtitle: 'При покупке от 4990 ₽',
    promocode: 'LU8',
    cardColor: '#7c7ef6',
  },
  {
    date: '2025-02-22',
    productCode: '65472',
    subtitle: 'При покупке от 2990 ₽',
    promocode: 'LU9',
    cardColor: '#7c7ef6',
  },
  {
    date: '2025-02-23',
    productCode: '66540',
    subtitle: 'При покупке от 4990 ₽',
    promocode: 'LU10',
    cardColor: '#7c7ef6',
  },
  {
    date: '2025-02-24',
    productCode: '66640',
    subtitle: 'При покупке от 2190 ₽',
    promocode: 'LU11',
    cardColor: '#7c7ef6',
  },
  {
    date: '2025-02-25',
    productCode: '65444',
    subtitle: 'При покупке от 2590 ₽',
    promocode: 'LU12',
    cardColor: '#7c7ef6',
  },
  {
    date: '2025-02-26',
    productCode: '66651',
    subtitle: 'При покупке от 2490 ₽',
    promocode: 'LU13',
    cardColor: '#7c7ef6',
  },
  {
    date: '2025-02-27',
    productCode: '65431',
    subtitle: 'При покупке от 2290 ₽',
    promocode: 'LU14',
    cardColor: '#7c7ef6',
  },
  {
    date: '2025-02-28',
    productCode: '66504',
    subtitle: 'При покупке от 2790 ₽',
    promocode: 'LU15',
    cardColor: '#7c7ef6',
  },
  {
    date: '2025-03-01',
    productCode: '65442',
    subtitle: 'При покупке от 2790 ₽',
    promocode: 'LU16',
    cardColor: '#fb68bc',
  },
  {
    date: '2025-03-02',
    productCode: '66663',
    subtitle: 'При покупке от 2990 ₽',
    promocode: 'LU17',
    cardColor: '#fb68bc',
  },
  {
    date: '2025-03-03',
    productCode: '66645',
    subtitle: 'При покупке от 2190 ₽',
    promocode: 'LU18',
    cardColor: '#fb68bc',
  },
  {
    date: '2025-03-04',
    productCode: '65557',
    subtitle: 'При покупке от 2590 ₽',
    promocode: 'LU19',
    cardColor: '#fb68bc',
  },
  {
    date: '2025-03-05',
    productCode: '65449',
    subtitle: 'При покупке от 2590 ₽',
    promocode: 'LU20',
    cardColor: '#fb68bc',
  },
  {
    date: '2025-03-06',
    productCode: '67122',
    subtitle: 'При покупке от 2990 ₽',
    promocode: 'LU21',
    cardColor: '#fb68bc',
  },
  {
    date: '2025-03-07',
    productCode: '65440',
    subtitle: 'При покупке от 6990 ₽',
    promocode: 'LU22',
    cardColor: '#fb68bc',
  },
  {
    date: '2025-03-08',
    productCode: '67119',
    subtitle: 'При покупке от 6990 ₽',
    promocode: 'LU23',
    cardColor: '#fb68bc',
  },
  {
    date: '2025-03-09',
    productCode: '66629',
    subtitle: 'При покупке от 3390 ₽',
    promocode: 'LU24',
    cardColor: '#fb68bc',
  },
  {
    date: '2025-03-10',
    productCode: '66642',
    subtitle: 'При покупке от 2190 ₽',
    promocode: 'LU25',
    cardColor: '#fb68bc',
  },
  {
    date: '2025-03-11',
    productCode: '66650',
    subtitle: 'При покупке от 2290 ₽',
    promocode: 'LU26',
    cardColor: '#fb68bc',
  },
  {
    date: '2025-03-12',
    productCode: '66630',
    subtitle: 'При покупке от 2690 ₽',
    promocode: 'LU27',
    cardColor: '#fb68bc',
  },
  {
    date: '2025-03-13',
    productCode: '65434',
    subtitle: 'При покупке от 2590 ₽',
    promocode: 'LU28',
    cardColor: '#fb68bc',
  },
  {
    date: '2025-03-14',
    productCode: '66626',
    subtitle: 'При покупке от 2790 ₽',
    promocode: 'LU29',
    cardColor: '#fb68bc',
  },
  {
    date: '2025-03-15',
    productCode: '66632',
    subtitle: 'При покупке от 3190 ₽',
    promocode: 'LU30',
    cardColor: '#fb68bc',
  },
  {
    date: '2025-03-16',
    productCode: '65428',
    subtitle: 'При покупке от 2590 ₽',
    promocode: 'LU31',
    cardColor: '#fb68bc',
  },
];

export default {
  components: { FMPromoItem, FMPromosModal },
  data() {
    return {
      isModalShow: false,
      days,
      selectedDay: null,
    };
  },
  computed: {
    currentDay() {
      return new Date().toISOString()
        .split('T')[0];
    },
  },
  mounted() {

  },
  methods: {
    showModal(day) {
      if (day.date !== this.currentDay) {
        return;
      }
      this.isModalShow = true;
      this.selectedDay = day;
    },
    async share() {
      const shareData = {
        title: 'Праздничный календарь Fuji',
        text: '',
        url: 'https://fuji.ru/advent',
      };

      try {
        await navigator.share(shareData);
      } catch (err) {
        await copyTextToClipboard(shareData.text);
        this.$notify({
          group: 'messages',
          type: 'success',
          text: 'Ссылка на календарь скопирована',
        });
      }
    },
  },
};
</script>
<style lang="scss">
@import "~/assets/fonts/tt-bluescreens/style.css";

.page:has(.fb-promos-page) .main {
  padding-top: 0;

  @media screen and (min-width: 768px) {

  }

  @media screen and (min-width: 1280px) {

  }
}

.page:has(.fb-promos-page) .header-wrapper {
  display: none;

  @media screen and (min-width: 768px) {

  }

  @media screen and (min-width: 1280px) {
    display: block;
  }
}

.page:has(.fb-promos-page) .main {
  padding-top: 0;

  @media screen and (min-width: 768px) {

  }

  @media screen and (min-width: 1280px) {
    display: block;
    padding-top: 90px;
  }
}

.page--fm-promos,
.page--advent {
  padding-top: 0 !important;
}
</style>

<style lang="scss" scoped>
.fb-promos-page {
  position: relative;
  overflow: hidden;
  padding: calc(extClamp(48) + var(--safe-area-inset-top, 0)) extClamp(16) extClamp(48);
  background-image: linear-gradient(94deg, #ff6abf 1.82%, #6987ff 47.7%, #ff57b7 76.98%);
  background-repeat: no-repeat;
  background-size: 100%;

  @media screen and (min-width: 768px) {
    padding: 48px 16px;
    background-image: linear-gradient(147deg, #ff6abf 1.82%, #6987ff 47.7%, #ff57b7 76.98%);
  }

  @media screen and (min-width: 1280px) {
    padding: 64px 16px 48px;
  }

  // .fb-promos-page__star
  &__star {
    position: absolute;
    top: extClamp(-440);
    left: extClamp(-510);
    width: extClamp(1150);
    height: extClamp(715);
    transform: rotate(-114deg);
    transform-origin: center;;
    opacity: 0.78;
    filter: blur(extClamp(16));

    @media screen and (min-width: 768px) {
      top: -440px;
      left: -510px;
      width: 1150px;
      height: 715px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .fb-promos-page__heart
  &__heart {
    animation-duration: 15s;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
    animation-direction: normal;
    will-change: transform;
  }

  // .fb-promos-page__heart-1
  &__heart-1 {
    position: absolute;
    top: extClamp(8);
    left: extClamp(-2);
    width: extClamp(48);
    height: extClamp(41);
    transform: rotate(-24deg);;
    background-image: url('~/assets/images/content/FMPromos/heart-1.png');
    background-repeat: no-repeat;
    background-size: contain;
    mix-blend-mode: soft-light;

    @media screen and (min-width: 768px) {
      top: 13px;
      left: 140px;
      width: 29px;
      height: 25px;
    }

    @media screen and (min-width: 1280px) {
      top: 22px;
      left: 267px;
      width: 47px;
      height: 41px;
      animation-name: heartAnimation1;

      @keyframes heartAnimation1 {
        0% {
          transform: translate(0, 0) scale(1) rotate(0);
        }
        33% {
          transform: translate(-22px, 27px) scale(1.5) rotate(18.838deg);
        }
        66% {
          transform: translate(-86px, -14px) scale(1.17) rotate(-16.606deg);
        }
        100% {
          transform: translate(0, 0) scale(1) rotate(0);
        }
      }
    }
  }

  // .fb-promos-page__heart-2
  &__heart-2 {
    position: absolute;
    top: extClamp(114);
    left: extClamp(5);
    width: extClamp(84);
    height: extClamp(72);
    transform: rotate(13deg);
    background-image: url('~/assets/images/content/FMPromos/heart-2.png');
    background-repeat: no-repeat;
    background-size: contain;
    mix-blend-mode: soft-light;

    @media screen and (min-width: 768px) {
      top: 66px;
      left: 184px;
      width: 105px;
      height: 90px;
      transform: rotate(-12deg);
    }

    @media screen and (min-width: 1280px) {
      top: 107px;
      left: 341px;
      width: 175px;
      height: 148px;
      transform: rotate(0);
      animation-name: heartAnimation2;

      @keyframes heartAnimation2 {
        0% {
          transform: translate(0, 0) scale(1) rotate(0);
        }
        33% {
          transform: translate(41px, 52px) scale(1, 0.83) rotate(24deg);
        }
        66% {
          transform: translate(100px, -10px) scale(0.71) rotate(0deg);
        }
        100% {
          transform: translate(0, 0) scale(1) rotate(0);
        }
      }
    }

  }

  // .fb-promos-page__heart-3
  &__heart-3 {
    position: absolute;
    display: none;
    transform: rotate(13deg);
    background-image: url('~/assets/images/content/FMPromos/heart-3.png');
    background-repeat: no-repeat;
    background-size: contain;
    mix-blend-mode: soft-light;

    @media screen and (min-width: 768px) {
      top: 142px;
      left: -31px;
      display: block;
      width: 74px;
      height: 63px;
    }

    @media screen and (min-width: 1280px) {
      top: 230px;
      left: -10px;
      width: 121px;
      height: 104px;
      animation-name: heartAnimation3;

      @keyframes heartAnimation3 {
        0% {
          transform: translate(0, 0) scale(1) rotate(0);
        }
        33% {
          transform: translate(124px, -3px) scale(0.72) rotate(-28deg);
        }
        66% {
          transform: translate(100px, -10px) scale(0.72) rotate(14deg);
        }
        100% {
          transform: translate(0, 0) scale(1) rotate(0);
        }
      }

    }
  }

  // .fb-promos-page__heart-4
  &__heart-4 {
    position: absolute;
    display: none;
    transform: rotate(3deg);
    background-image: url('~/assets/images/content/FMPromos/heart-4.png');
    background-repeat: no-repeat;
    background-size: contain;

    @media screen and (min-width: 768px) {
      top: 85px;
      right: 15px;
      display: block;
      width: 153px;
      height: 129px;
    }

    @media screen and (min-width: 1280px) {
      top: 135px;
      right: 103px;
      width: 244px;
      height: 206px;

      animation-name: heartAnimation4;

      @keyframes heartAnimation4 {
        0% {
          transform: translate(0, 0) scale(1) rotate(3deg);
        }
        33% {
          transform: translate(-184px, -100px) scale(0.578) rotate(-30deg);
        }
        66% {
          transform: translate(-294px, -9px) scale(0.463) rotate(-40deg);
        }
        100% {
          transform: translate(0, 0) scale(1) rotate(3deg);
        }
      }
    }

  }

  // .fb-promos-page__heart-5
  &__heart-5 {
    position: absolute;
    display: none;
    background-image: url('~/assets/images/content/FMPromos/heart-5.png');
    background-repeat: no-repeat;
    background-size: contain;
    mix-blend-mode: soft-light;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      top: 22px;
      right: -50px;
      display: block;
      width: 47px;
      height: 41px;

      animation-name: heartAnimation5;

      @keyframes heartAnimation5 {
        0% {
          transform: translate(0, 0) scale(1) rotate(-24deg);
        }
        33% {
          transform: translate(-94px, 166px) scale(1.426) rotate(14deg);
        }
        66% {
          transform: translate(-150px, 200px) scale(2) rotate(40deg);
        }
        100% {
          transform: translate(0, 0) scale(1) rotate(0deg);
        }
      }
    }

  }

  // .fb-promos-page__heart-6
  &__heart-6 {
    position: absolute;
    display: none;
    transform: rotate(-15deg);
    background-image: url('~/assets/images/content/FMPromos/heart-6.png');
    background-repeat: no-repeat;
    background-size: contain;

    @media screen and (min-width: 768px) {
      bottom: -75px;
      left: -53px;
      display: block;
      width: 297px;
      height: 250px;
    }

    @media screen and (min-width: 1280px) {
      bottom: -120px;
      left: -27px;
      width: 297px;
      height: 250px;
    }
  }

  // .fb-promos-page__inner
  &__inner {
    position: relative;
  }

  // .fb-promos-page__header
  &__header {
    display: flex;
    align-items: center;

    flex-direction: column;
    justify-content: space-between;
    gap: extClamp(24);

    @media screen and (min-width: 768px) {
      align-items: flex-start;
      flex-direction: row;
    }

    @media screen and (min-width: 1280px) {
      max-width: 1312px;
      margin-right: auto;
      margin-left: auto;
    }

    @media screen and (min-width: 1920px) {
      max-width: 1792px;
      margin-right: auto;
      margin-left: auto;
    }
  }

  // .fb-promos-page__header-item
  &__header-item {
    display: flex;
    justify-content: center;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      width: 33%;
    }

    &:first-child {
      display: none;

      @media screen and (min-width: 768px) {
        display: block;
      }

      @media screen and (min-width: 1280px) {

      }
    }

    &:last-child {

      @media screen and (min-width: 768px) {

      }

      @media screen and (min-width: 1280px) {

      }
    }
  }

  // .fb-promos-page__title
  &__title {
  }

  // .fb-promos-page__logo
  &__logo {
    width: extClamp(202);
    height: extClamp(95);

    @media screen and (min-width: 768px) {
      width: 202px;
      height: 98px;
    }

    @media screen and (min-width: 1280px) {
      width: 386px;
      height: 188px;
    }
  }

  // .fb-promos-page__logo-left
  &__logo-left {
    display: none;

    @media screen and (min-width: 768px) {
      display: block;
      width: 128px;
      height: 88px;
    }

    @media screen and (min-width: 1280px) {
      width: 224px;
      height: 155px;
    }
  }

  // .fb-promos-page__subtitle
  &__subtitle {

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .fb-promos-page__content
  &__content {
    padding-top: extClamp(24);

    @media screen and (min-width: 768px) {
      padding-top: 24px;
    }

    @media screen and (min-width: 1280px) {
      padding-top: 64px;
    }
  }

  // .fb-promos-page__grid
  &__grid {
  }

  // .fb-promos-page__modal
  &__modal {
  }
}

.days {
  max-width: extClamp(288);
  margin-inline: auto;

  @media screen and (min-width: 768px) {
    max-width: 736px;
  }

  @media screen and (min-width: 1280px) {
    max-width: 1312px;
  }

  // .days__friends
  &__friends {
    width: 100% !important;

    @media screen and (min-width: 768px) {
      grid-column: 1 / 13;
    }

    @media screen and (min-width: 1280px) {
      display: none;
    }
  }

  // .days__inner
  &__inner {
    display: flex;
    flex-wrap: wrap;
    padding: extClamp(16);
    border-radius: extClamp(24);
    background-color: #fff;
    gap: extClamp(16);

    @media screen and (min-width: 768px) {
      display: grid;
      padding: 16px;
      border-radius: 24px;
      gap: 16px;
    }

    @media screen and (min-width: 1280px) {
      border-radius: 32px;
    }
    @media screen and (min-width: 1440px) {
      padding: 32px;
      border-radius: 32px;
      gap: 24px;
    }
  }

  // .days__item
  &__item {
  }
}

.friends {
  font-family: "TT Bluescreens Trial Black", sans-serif;
  font-size: extClamp(16);
  font-weight: 900;
  font-style: normal;
  line-height: 140%; /* 22.4px */
  display: flex;
  align-items: center;
  justify-content: center;
  width: extClamp(164);
  padding: extClamp(4) extClamp(16);
  color: var(--DarkBlue, #002b4d);
  border-radius: extClamp(32);
  background: var(--LightBlue, #a5e9fb);
  gap: extClamp(8);

  @media screen and (min-width: 768px) {
    font-size: 16px;
    width: 164px;
    padding: 4px 16px;
    border-radius: 32px;
    gap: 8px;
  }

  @media screen and (min-width: 1280px) {
    display: none;
    width: 228px;
  }

  // .friends__icon
  &__icon {
    width: extClamp(17);
    height: extClamp(17);

    @media screen and (min-width: 768px) {
      width: 17px;
      height: 17px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}

</style>
