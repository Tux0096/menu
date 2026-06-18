<template>
  <div
    :class="[
      { 'day--active': isCurrentDay },
      `day--${day.date}`
    ]"
    :style="{
      backgroundColor: isCurrentDayAfter ? day.cardColor : '#c9c9c9'
    }"
    class="day"
    @click="$emit('click')"
  >
    <div
      class="day__inner"
    >
      <div class="day__icon-wrapper">
        <svg class="day__icon">
          <use :xlink:href="`${fmPromos}#${day.date}`" />
        </svg>
      </div>
      <div class="day__number">
        {{ dayNumber }}
      </div>
    </div>
  </div>
</template>

<script>
import fmPromos from '~/assets/images/icons/svg/fm-promos.svg?url';

export default {
  name: 'FMPromoItem',
  props: {
    day: {
      type: Object,
      required: true,
    },
    currentDay: {
      type: String,
      required: true,
    },

  },
  data() {
    return {
      fmPromos,
    };
  },
  computed: {
    dayNumber() {
      const date = new Date(this.day.date);
      return date?.getDate() || 1;
    },
    date() {
      return new Date(this.day.date);
    },

    isCurrentDay() {
      return this.day.date === this.currentDay;
    },
    isCurrentDayAfter() {
      return this.day.date >= this.currentDay;
    },
  },
  methods: {},
};
</script>

<style lang="scss" scoped>
@import "@/assets/fonts/tt-bluescreens/style.css";

.day {
  position: relative;
  overflow: hidden;
  width: 294px;

  height: 212px;
  border-radius: 16px;
  background: #7c7ef6;

  grid-row: 13 / 14;
  grid-column: 14 / 15;

  // .day--active
  &--active {
    &::after {
      position: absolute;
      top: extClamp(4);
      left: 0;
      width: 100%;
      height: 100%;
      content: "";
      background-image: url("~/assets/images/content/FMPromos/GiftBow.png");
      background-repeat: no-repeat;
      background-size: contain;

      @media screen and (min-width: 768px) {
        top: 4px;
      }

      @media screen and (min-width: 1280px) {
        top: 5px;
      }
    }

  }

  &--2025-02-14 {
    width: extClamp(256);
    height: extClamp(212);

    @media screen and (min-width: 768px) {
      width: 224px;
      height: 212px;
      grid-row: 1 / 2;
      grid-column: 1 / 5;

    }

    @media screen and (min-width: 1280px) {
      width: 294px;
      height: 212px;
      grid-row: 1 / 2;
      grid-column: 1 / 3;
    }

    .day__icon-wrapper {
      top: 50%;
      left: 50%;
      width: extClamp(231);
      height: extClamp(281);
      transform: translate(-50%, -50%);

      @media screen and (min-width: 768px) {
        width: 231px;
        height: 181px;
      }

      @media screen and (min-width: 1280px) {
        width: 231px;
        height: 181px;
      }
    }
  }

  &--2025-02-15 {
    width: extClamp(120);
    height: extClamp(139);

    @media screen and (min-width: 768px) {
      width: 104px;
      height: 139px;
      grid-row: 2 / 3;
      grid-column: 1 / 3;
    }

    @media screen and (min-width: 1280px) {
      width: 135px;
      height: 139px;
      grid-row: 1 / 2;
      grid-column: 3 / 4;
    }

    .day__icon-wrapper {
      top: extClamp(10);
      left: 0;
      width: extClamp(150);
      height: extClamp(150);

      @media screen and (min-width: 768px) {
        top: 10px;
        left: 0;
        width: 150px;
        height: 150px;
      }

      @media screen and (min-width: 1280px) {
        position: absolute;
        top: 17px;
        left: 0;
        width: 150px;
        height: 150px;
      }
    }
  }

  &--2025-02-16 {
    width: extClamp(120);
    height: extClamp(139);

    @media screen and (min-width: 768px) {
      width: 104px;
      height: 139px;
      grid-row: 2 / 3;
      grid-column: 3 / 5;

    }

    @media screen and (min-width: 1280px) {
      width: 135px;
      height: 139px;
      grid-row: 2 / 3;
      grid-column: 1 / 2;
    }

    .day__icon-wrapper {
      top: extClamp(7);
      left: extClamp(7);
      width: extClamp(54);
      height: extClamp(88);

      @media screen and (min-width: 768px) {
        top: 7px;
        left: 7px;
        width: 54px;
        height: 58px;
      }

      @media screen and (min-width: 1280px) {
        position: absolute;
        top: 28px;
        left: 15px;
        width: 54px;
        height: 58px;
      }
    }
  }

  &--2025-02-17 {
    width: extClamp(256);
    height: extClamp(139);

    @media screen and (min-width: 768px) {
      width: 224px;
      height: 139px;
      grid-row: 1 / 2;
      grid-column: 5 / 9;
    }

    @media screen and (min-width: 1280px) {
      width: 135px;
      height: 139px;
      grid-row: 2 / 3;
      grid-column: 2 / 3;
    }

    .day__icon-wrapper {
      top: extClamp(-14);
      left: extClamp(-10);
      width: extClamp(179);
      height: extClamp(179);

      @media screen and (min-width: 768px) {
        top: -14px;
        left: -10px;
        width: 179px;
        height: 179px;
      }

      @media screen and (min-width: 1280px) {
        top: -14px;
        left: -10px;
        width: 179px;
        height: 179px;
      }
    }
  }

  &--2025-02-18 {
    width: extClamp(256);
    height: extClamp(212);

    @media screen and (min-width: 768px) {
      width: 224px;
      height: 212px;
      margin-top: -73px;
      grid-row: 2 / 3;
      grid-column: 5 / 9;
    }

    @media screen and (min-width: 1280px) {
      width: 135px;
      height: 212px;
      margin-top: -73px;
      grid-row: 2 / 3;
      grid-column: 3 / 4;
    }

    .day__icon-wrapper {
      top: extClamp(-10);
      left: extClamp(-35);
      width: extClamp(124);
      height: extClamp(124);

      @media screen and (min-width: 768px) {
        top: -10px;
        left: -35px;
        width: 124px;
        height: 124px;
      }

      @media screen and (min-width: 1280px) {
        top: -10px;
        left: -35px;
        width: 124px;
        height: 124px;
      }
    }
  }

  &--2025-02-19 {
    width: extClamp(256);
    height: extClamp(375);

    @media screen and (min-width: 768px) {
      width: 224px;
      height: 367px;
      grid-row: 1 / 3;
      grid-column: 9 / 13;
    }

    @media screen and (min-width: 1280px) {
      width: 294px;
      height: 375px;
      grid-row: 1 / 3;
      grid-column: 4 / 6;
    }

    .day__icon-wrapper {
      top: 50%;
      left: 50%;
      width: extClamp(350);
      height: extClamp(350);
      transform: translate(-50%, -50%);

      @media screen and (min-width: 768px) {
        width: 350px;
        height: 350px;
      }

      @media screen and (min-width: 1280px) {
        width: 350px;
        height: 350px;
      }
    }
  }

  &--2025-02-20 {
    width: extClamp(120);
    height: extClamp(139);

    @media screen and (min-width: 768px) {
      width: 164px;
      height: 139px;
      grid-row: 3 / 4;
      grid-column: 1 / 4;
    }

    @media screen and (min-width: 1280px) {
      width: 135px;
      height: 139px;
      grid-row: 1 / 2;
      grid-column: 6 / 7;
    }

    .day__icon-wrapper {
      top: extClamp(0);
      left: extClamp(-37);
      width: extClamp(135);
      height: extClamp(139);

      @media screen and (min-width: 768px) {
        top: 0px;
        left: -37px;
        width: 135px;
        height: 139px;
      }

      @media screen and (min-width: 1280px) {
        top: 0px;
        left: -37px;
        width: 135px;
        height: 139px;
      }
    }
  }

  &--2025-02-21 {
    width: extClamp(120);
    height: extClamp(139);

    @media screen and (min-width: 768px) {
      width: 164px;
      height: 139px;
      grid-row: 3 / 4;
      grid-column: 4 / 7;
    }

    @media screen and (min-width: 1280px) {
      width: 135px;
      height: 139px;
      grid-row: 1 / 2;
      grid-column: 7 / 8;
    }

    .day__icon-wrapper {
      top: extClamp(-36);
      left: extClamp(25);
      width: extClamp(135);
      height: extClamp(135);

      @media screen and (min-width: 768px) {
        top: -36px;
        left: 25px;
        width: 135px;
        height: 135px;
      }

      @media screen and (min-width: 1280px) {
        top: -36px;
        left: 25px;
        width: 135px;
        height: 135px;
      }
    }
  }

  &--2025-02-22 {
    width: extClamp(256);
    height: extClamp(212);

    @media screen and (min-width: 768px) {
      width: 344px;
      height: 212px;
      grid-row: 4 / 5;
      grid-column: 1 / 7;
    }

    @media screen and (min-width: 1280px) {
      width: 294px;
      height: 212px;
      margin-top: -73px;
      grid-row: 2 /3;
      grid-column: 6 / 8;
    }

    .day__icon-wrapper {
      top: extClamp(25);
      left: extClamp(-25);
      width: extClamp(239);
      height: extClamp(239);

      @media screen and (min-width: 768px) {
        top: 25px;
        left: -25px;
        width: 239px;
        height: 239px;
      }

      @media screen and (min-width: 1280px) {
        top: 25px;
        left: -25px;
        width: 239px;
        height: 239px;
      }
    }
  }

  &--2025-02-23 {
    width: extClamp(256);
    height: extClamp(375);

    @media screen and (min-width: 768px) {
      width: 344px;
      height: 367px;
      grid-row: 3 / 5;
      grid-column: 7 / 13;
    }

    @media screen and (min-width: 1280px) {
      width: 134px;
      height: 375px;
      grid-row: 1 /3;
      grid-column: 8 / 9;
    }

    .day__icon-wrapper {
      top: extClamp(0);
      left: extClamp(0);
      width: extClamp(134);
      height: extClamp(375);

      @media screen and (min-width: 768px) {
        top: 0px;
        left: 0px;
        width: 134px;
        height: 375px;
      }

      @media screen and (min-width: 1280px) {
        top: 0px;
        left: 0px;
        width: 134px;
        height: 375px;
      }
    }
  }

  &--2025-02-24 {
    width: extClamp(256);
    height: extClamp(375);

    @media screen and (min-width: 768px) {
      width: 224px;
      height: 367px;
      grid-row: 5 / 7;
      grid-column: 1 / 5;
    }

    @media screen and (min-width: 1280px) {
      width: 294px;
      height: 375px;
      grid-row: 3 / 5;
      grid-column: 1 /3;
    }

    .day__icon-wrapper {
      top: 50%;
      left: 50%;
      width: extClamp(212);
      height: extClamp(394);
      transform: translate(-50%, -50%);

      @media screen and (min-width: 768px) {
        width: 212px;
        height: 394px;
      }

      @media screen and (min-width: 1280px) {
        width: 212px;
        height: 394px;
      }
    }
  }

  &--2025-02-25 {
    width: extClamp(120);
    height: extClamp(139);

    @media screen and (min-width: 768px) {
      width: 104px;
      height: 139px;
      grid-row: 5 / 6;
      grid-column: 5 / 7;
    }

    @media screen and (min-width: 1280px) {
      width: 135px;
      height: 139px;
      grid-row: 3 / 4;
      grid-column: 3 / 4;
    }

    .day__icon-wrapper {
      top: extClamp(13);
      left: extClamp(-15);
      width: extClamp(78);
      height: extClamp(166);

      @media screen and (min-width: 768px) {
        top: 13px;
        left: -15px;
        width: 78px;
        height: 166px;
      }

      @media screen and (min-width: 1280px) {
        top: 13px;
        left: -15px;
        width: 78px;
        height: 166px;
      }
    }
  }

  &--2025-02-26 {
    width: extClamp(120);
    height: extClamp(139);
    grid-row: 5 / 6;
    grid-column: 7 / 9;

    @media screen and (min-width: 768px) {
      width: 104px;
      height: 139px;
    }

    @media screen and (min-width: 1280px) {
      width: 135px;
      height: 139px;
      grid-row: 3 / 4;
      grid-column: 4 / 5;
    }

    .day__icon-wrapper {
      top: extClamp(-172);
      left: extClamp(-57);
      width: extClamp(357);
      height: extClamp(357);

      @media screen and (min-width: 768px) {
        top: -172px;
        left: -57px;
        width: 357px;
        height: 357px;
      }

      @media screen and (min-width: 1280px) {
        top: -172px;
        left: -57px;
        width: 357px;
        height: 357px;
      }
    }
  }

  &--2025-02-27 {
    width: extClamp(256);
    height: extClamp(212);

    @media screen and (min-width: 768px) {
      width: 224px;
      height: 212px;
      grid-row: 6 / 7;
      grid-column: 5 / 9;
    }

    @media screen and (min-width: 1280px) {
      width: 135px;
      height: 139px;
      grid-row: 3 / 4;
      grid-column: 5 / 6;
    }

    .day__icon-wrapper {
      top: auto;
      bottom: extClamp(0);
      left: extClamp(-20);
      width: extClamp(277);
      height: extClamp(91);

      @media screen and (min-width: 768px) {
        bottom: 0px;
        left: -41px;
        width: 277px;
        height: 91px;
      }

      @media screen and (min-width: 1280px) {
        bottom: 0px;
        left: -41px;
        width: 277px;
        height: 91px;
      }
    }
  }

  &--2025-02-28 {
    width: extClamp(256);
    height: extClamp(139);

    @media screen and (min-width: 768px) {
      width: 224px;
      height: 139px;
      grid-row: 5 / 6;
      grid-column: 9 / 13;
    }

    @media screen and (min-width: 1280px) {
      width: 294px;
      height: 212px;
      margin-top: -73px;
      grid-row: 4 / 5;
      grid-column: 3 / 5;
    }

    .day__icon-wrapper {
      top: extClamp(-56);
      left: extClamp(0);
      width: extClamp(223);
      height: extClamp(211);

      @media screen and (min-width: 768px) {
        top: -56px;
        left: 0px;
        width: 223px;
        height: 211px;
      }

      @media screen and (min-width: 1280px) {
        top: 0px;
        left: 0px;
        width: 223px;
        height: 211px;
      }
    }
  }

  &--2025-03-01 {
    width: extClamp(256);
    height: extClamp(212);

    @media screen and (min-width: 768px) {
      width: 224px;
      height: 212px;
      grid-row: 6 / 7;
      grid-column: 9 / 13;
    }

    @media screen and (min-width: 1280px) {
      width: 135px;
      height: 212px;
      margin-top: -73px;
      grid-row: 4 / 5;
      grid-column: 5 / 6;
    }

    .day__icon-wrapper {
      top: extClamp(14);
      left: extClamp(-69);
      width: extClamp(182);
      height: extClamp(182);

      @media screen and (min-width: 768px) {
        top: 14px;
        left: -69px;
        width: 182px;
        height: 182px;
      }

      @media screen and (min-width: 1280px) {
        top: 14px;
        left: -69px;
        width: 182px;
        height: 182px;
      }
    }
  }

  &--2025-03-02 {
    width: extClamp(256);
    height: extClamp(375);

    @media screen and (min-width: 768px) {
      width: 344px;
      height: 367px;
      grid-row: 7 / 9;
      grid-column: 1 / 7;
    }

    @media screen and (min-width: 1280px) {

      width: 135px;
      height: 375px;
      grid-row: 3 / 5;
      grid-column: 6 / 7;
    }

    .day__icon-wrapper {
      top: extClamp(-20);
      left: extClamp(-20);
      width: extClamp(80);
      height: extClamp(391);
      transform: rotate(-159deg);

      @media screen and (min-width: 768px) {
        top: -20px;
        left: -20px;
        width: 80px;
        height: 391px;
      }

      @media screen and (min-width: 1280px) {
        top: -20px;
        left: -20px;
        width: 80px;
        height: 391px;
      }
    }
  }

  &--2025-03-03 {
    width: extClamp(256);
    height: extClamp(212);

    @media screen and (min-width: 768px) {
      width: 344px;
      height: 212px;
      grid-row: 7 / 9;
      grid-column: 7 / 13;
    }

    @media screen and (min-width: 1280px) {
      width: 294px;
      height: 212px;
      grid-row: 3 / 4;
      grid-column: 7 / 9;
    }

    .day__icon-wrapper {
      top: extClamp(-8);
      left: extClamp(-243);
      width: extClamp(440);
      height: extClamp(220);

      @media screen and (min-width: 768px) {
        top: -8px;
        left: -243px;
        width: 440px;
        height: 220px;
      }

      @media screen and (min-width: 1280px) {
        top: -8px;
        left: -243px;
        width: 440px;
        height: 220px;
      }
    }
  }

  &--2025-03-04 {
    width: extClamp(120);
    height: extClamp(139);

    @media screen and (min-width: 768px) {
      width: 164px;
      height: 139px;
      grid-row: 8 / 9;
      grid-column: 7 / 10;
    }

    @media screen and (min-width: 1280px) {
      width: 135px;
      height: 139px;
      grid-row: 4 / 5;
      grid-column: 7 / 8;
    }

    .day__icon-wrapper {
      top: extClamp(-3);
      left: extClamp(0);
      width: extClamp(302);
      height: extClamp(131);

      @media screen and (min-width: 768px) {
        top: -3px;
        left: 0px;
        width: 302px;
        height: 131px;
      }

      @media screen and (min-width: 1280px) {
        top: -3px;
        left: 0px;
        width: 302px;
        height: 131px;
      }
    }
  }

  &--2025-03-05 {
    width: extClamp(120);
    height: extClamp(139);

    @media screen and (min-width: 768px) {
      width: 164px;
      height: 139px;
      grid-row: 8 / 9;
      grid-column: 10 / 13;
    }

    @media screen and (min-width: 1280px) {
      width: 135px;
      height: 139px;
      grid-row: 4 / 5;
      grid-column: 8 / 9;
    }

    .day__icon-wrapper {
      top: extClamp(0);
      left: extClamp(0);
      width: extClamp(129);
      height: extClamp(123);

      @media screen and (min-width: 768px) {
        top: 0px;
        left: 0px;
        width: 129px;
        height: 123px;
      }

      @media screen and (min-width: 1280px) {
        top: 0px;
        left: 0px;
        width: 129px;
        height: 123px;
      }
    }
  }

  &--2025-03-06 {
    width: extClamp(120);
    height: extClamp(139);

    @media screen and (min-width: 768px) {
      width: 164px;
      height: 139px;
      grid-row: 9 / 10;
      grid-column: 1 / 4;
    }

    @media screen and (min-width: 1280px) {
      width: 135px;
      height: 139px;
      grid-row: 5 / 6;
      grid-column: 1 / 2;
    }

    .day__icon-wrapper {
      top: extClamp(-32);
      left: extClamp(19);
      width: extClamp(171);
      height: extClamp(171);

      @media screen and (min-width: 768px) {
        top: -32px;
        left: 19px;
        width: 171px;
        height: 171px;
      }

      @media screen and (min-width: 1280px) {
        top: -32px;
        left: 19px;
        width: 171px;
        height: 171px;
      }
    }
  }

  &--2025-03-07 {
    width: extClamp(120);
    height: extClamp(139);

    @media screen and (min-width: 768px) {
      width: 164px;
      height: 139px;
      grid-row: 9 / 10;
      grid-column: 4 / 7;
    }

    @media screen and (min-width: 1280px) {
      width: 135px;
      height: 139px;
      grid-row: 5 / 6;
      grid-column: 2 / 3;
    }

    .day__icon-wrapper {
      top: extClamp(0);
      left: extClamp(-37);
      width: extClamp(129);
      height: extClamp(155);

      @media screen and (min-width: 768px) {
        top: 0px;
        left: -37px;
        width: 129px;
        height: 155px;
      }

      @media screen and (min-width: 1280px) {
        top: 0px;
        left: -37px;
        width: 129px;
        height: 155px;
      }
    }
  }

  &--2025-03-08 {
    width: extClamp(256);
    height: extClamp(212);

    @media screen and (min-width: 768px) {
      width: 344px;
      height: 212px;
      margin-top: -73px;
      grid-row: 10 / 11;
      grid-column: 1 / 7;
    }

    @media screen and (min-width: 1280px) {
      width: 135px;
      height: 212px;
      margin-top: 0;
      grid-row: 5 / 6;
      grid-column: 3 / 4;
    }

    .day__icon-wrapper {
      top: extClamp(29);
      left: extClamp(-7);
      width: extClamp(356);
      height: extClamp(286);

      @media screen and (min-width: 768px) {
        top: 29px;
        left: -7px;
        width: 356px;
        height: 286px;
      }

      @media screen and (min-width: 1280px) {
        top: 29px;
        left: -53px;
        width: 356px;
        height: 286px;
      }
    }
  }

  &--2025-03-09 {
    width: extClamp(256);
    height: extClamp(212);

    @media screen and (min-width: 768px) {
      width: 344px;
      height: 212px;
      grid-row: 9 / 10;
      grid-column: 7 / 13;
    }

    @media screen and (min-width: 1280px) {
      width: 294px;
      height: 212px;
      margin-top: -73px;
      grid-row: 6 / 7;
      grid-column: 1 / 3;
    }

    .day__icon-wrapper {
      top: extClamp(19);
      left: extClamp(-32);
      width: extClamp(224);
      height: extClamp(224);

      @media screen and (min-width: 768px) {
        top: 19px;
        left: -32px;
        width: 224px;
        height: 224px;
      }

      @media screen and (min-width: 1280px) {
        top: 19px;
        left: -32px;
        width: 224px;
        height: 224px;
      }
    }
  }

  &--2025-03-10 {
    width: extClamp(256);
    height: extClamp(139);

    @media screen and (min-width: 768px) {
      width: 344px;
      height: 139px;
      grid-row: 10 / 11;
      grid-column: 7 / 13;
    }

    @media screen and (min-width: 1280px) {
      width: 135px;
      height: 139px;
      grid-row: 6 / 7;
      grid-column: 3 / 4;
    }

    .day__icon-wrapper {
      top: extClamp(50);
      left: extClamp(0);
      width: extClamp(277);
      height: extClamp(91);

      @media screen and (min-width: 768px) {
        top: 50px;
        left: -32px;
        width: 277px;
        height: 91px;
      }

      @media screen and (min-width: 1280px) {
        top: 50px;
        left: -174px;
        width: 277px;
        height: 91px;
      }
    }
  }

  &--2025-03-11 {
    width: extClamp(256);
    height: extClamp(139);

    @media screen and (min-width: 768px) {
      width: 224px;
      height: 139px;
      grid-row: 11 / 12;
      grid-column: 1 / 5;
    }

    @media screen and (min-width: 1280px) {
      width: 294px;
      height: 139px;
      grid-row: 5/ 6;
      grid-column: 4 / 6;
    }

    .day__icon-wrapper {
      top: extClamp(-30);
      left: extClamp(-25);
      width: extClamp(219);
      height: extClamp(219);

      @media screen and (min-width: 768px) {
        top: -30px;
        left: -25px;
        width: 219px;
        height: 219px;
      }

      @media screen and (min-width: 1280px) {
        top: -30px;
        left: -25px;
        width: 219px;
        height: 219px;
      }
    }
  }

  &--2025-03-12 {
    width: extClamp(256);
    height: extClamp(212);

    @media screen and (min-width: 768px) {
      width: 224px;
      height: 212px;
      grid-row: 12 / 13;
      grid-column: 1 / 5;
    }

    @media screen and (min-width: 1280px) {
      width: 294px;
      height: 212px;
      margin-top: -73px;
      grid-row: 6/ 7;
      grid-column: 4 / 6;
    }

    .day__icon-wrapper {
      top: extClamp(23);
      left: extClamp(15);
      width: extClamp(278);
      height: extClamp(278);

      @media screen and (min-width: 768px) {
        top: 23px;
        left: 15px;
        width: 278px;
        height: 278px;
      }

      @media screen and (min-width: 1280px) {
        top: 23px;
        left: 40px;
        width: 278px;
        height: 278px;
      }
    }
  }

  &--2025-03-13 {
    width: extClamp(256);
    height: extClamp(375);

    @media screen and (min-width: 768px) {
      width: 224px;
      height: 367px;
      grid-row: 11 / 13;
      grid-column: 5 / 9;
    }

    @media screen and (min-width: 1280px) {
      width: 135px;
      height: 375px;
      grid-row: 5/ 7;
      grid-column: 6 / 7;
    }

    .day__icon-wrapper {
      top: extClamp(-72);
      left: extClamp(94);
      width: extClamp(244);
      height: extClamp(347);

      @media screen and (min-width: 768px) {
        top: -72px;
        left: 94px;
        width: 244px;
        height: 347px;
      }

      @media screen and (min-width: 1280px) {
        top: -72px;
        left: 10px;
        width: 244px;
        height: 347px;
      }
    }
  }

  &--2025-03-14 {
    width: extClamp(120);
    height: extClamp(139);

    @media screen and (min-width: 768px) {
      width: 104px;
      height: 139px;
      grid-row: 11 / 12;
      grid-column: 9 / 11;
    }

    @media screen and (min-width: 1280px) {
      width: 135px;
      height: 139px;
      grid-row: 5/ 6;
      grid-column: 7 / 8;
    }

    .day__icon-wrapper {
      top: extClamp(15);
      left: extClamp(15);
      width: extClamp(135);
      height: extClamp(135);

      @media screen and (min-width: 768px) {
        top: 15px;
        left: 15px;
        width: 135px;
        height: 135px;
      }

      @media screen and (min-width: 1280px) {
        top: 15px;
        left: 15px;
        width: 135px;
        height: 135px;
      }
    }
  }

  &--2025-03-15 {
    width: extClamp(120);
    height: extClamp(139);

    @media screen and (min-width: 768px) {
      width: 104px;
      height: 139px;
      grid-row: 11 / 12;
      grid-column: 11 / 13;
    }

    @media screen and (min-width: 1280px) {
      width: 135px;
      height: 139px;
      grid-row: 5/ 6;
      grid-column: 8 / 9;
    }

    .day__icon-wrapper {
      top: extClamp(-4);
      left: extClamp(-26);
      width: extClamp(193);
      height: extClamp(129);
      transform: rotate(45deg);

      @media screen and (min-width: 768px) {
        top: -4px;
        left: -26px;
        width: 193px;
        height: 129px;
      }

      @media screen and (min-width: 1280px) {
        top: -4px;
        left: -26px;
        width: 193px;
        height: 129px;
      }
    }
  }

  &--2025-03-16 {
    width: extClamp(256);
    height: extClamp(212);

    @media screen and (min-width: 768px) {
      width: 224px;
      height: 212px;
      grid-row: 12 / 13;
      grid-column: 9 / 13;
    }

    @media screen and (min-width: 1280px) {
      width: 294px;
      height: 212px;
      margin-top: -73px;
      grid-row: 6/ 7;
      grid-column: 7 / 9;
    }

    .day__icon-wrapper {
      top: extClamp(-39);
      left: extClamp(-126);
      width: extClamp(600);
      height: extClamp(297);
      transform: rotate(-32deg);

      @media screen and (min-width: 768px) {
        top: -39px;
        left: -126px;
        width: 600px;
        height: 297px;
      }

      @media screen and (min-width: 1280px) {
        top: -39px;
        left: -126px;
        width: 600px;
        height: 297px;
      }
    }
  }

  // .day__inner
  &__inner {
    display: flex;
    width: 100%;
    height: 100%;
    padding: 4px 20px;
  }

  // .day__icon-wrapper
  &__icon-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0.1;
  }

  // .day__icon
  &__icon {
    width: 100%;
    height: 100%;
  }

  // .day__number
  &__number {
    font-family: "TT Bluescreens Trial Black", sans-serif;
    font-size: 96px;
    font-style: normal;
    line-height: normal;
    margin-top: auto;
    margin-left: auto;
    color: #fff;

  }
}
</style>
