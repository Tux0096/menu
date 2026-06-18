<template>
  <div
    class="restaurant"
  >
    <div class="restaurant__header">
      <div class="restaurant__icon-wrapper">
        <svg class="restaurant__icon">
          <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#location" />
        </svg>
      </div>
      <div class="restaurant__title">
        {{ rest.address }}
      </div>
      <div class="restaurant__number">
        {{ number }}
      </div>
    </div>
    <div
      v-if="rest.times.length || rest.phone.length"
      class="restaurant__line"
    />
    <div
      v-if="rest.times.length"
      class="restaurant__times restaurant-times"
    >
      <div
        v-for="(time, idx) in rest.times"
        :key="`${time.time}+${time.days}+${idx}`"
        class="restaurant-times__time restaurant-time"
      >
        <svg class="restaurant-time__icon">
          <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#time" />
        </svg>
        <div class="restaurant-time__inner">
          <div class="restaurant-time__time">
            {{ time.time }}
          </div>
          <div class="restaurant-time__days">
            {{ time.days }}
          </div>
        </div>
      </div>
    </div>
    <BaseGradientButton
      v-if="rest.phone.length"
      class="restaurant__book"
      type="outline"
      @click="onReservation(rest.phone)"
    >
      Забронировать
    </BaseGradientButton>
  </div>
</template>

<script>
import BaseGradientButton from '~/components/Base/BaseGradientButton.vue';

export default {
  name: 'AppRestaurant',
  components: { BaseGradientButton },
  props: {
    rest: {
      type: Object,
      require: true,
    },
    number: {
      type: Number,
      require: true,
    },
  },
  methods: {
    onReservation(phone = 'Номер не указан') {
      const getPhone = () => phone;
      this.$store.commit(
        'modal/showModal',
        {
          component: 'AppReservation',
          callback: getPhone,
          params: {
            title: 'Забронировать стол',
            isModalCenter: true,
            isNotMaxHeight: true,
            icon: 'phone',
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

.restaurant {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  padding: extClamp(16) extClamp(12);
  border-radius: extClamp(12);
  background: var(---Secondary-FooterLightGray, #f6f6f6);
  gap: extClamp(6);

  @media screen and (min-width: 768px) {
    padding: 20px 16px;
    gap: 8px;
  }

  @media screen and (min-width: 1280px) {
    border-radius: 20px;
  }

  // .restaurant__header
  &__header {
    font-size: extClamp(12);
    font-weight: 400;
    font-style: normal;
    line-height: normal;
    display: flex;
    align-items: center;
    width: 100%;
    color: #292929;
    gap: extClamp(8);

    @media screen and (min-width: 768px) {
      font-size: 24px;
      line-height: 100%;
      gap: 10px;
    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .restaurant__icon-wrapper
  &__icon-wrapper {

  }

  // .restaurant__icon
  &__icon {
    width: extClamp(18);
    height: extClamp(18);
    color: #993ca6;

    @media screen and (min-width: 768px) {
      width: 24px;
      height: 24px;
    }

    @media screen and (min-width: 1280px) {
      width: 24px;
      height: 24px;
    }
  }

  // .restaurant__title
  &__title {
    font-size: extClamp(12);
    font-weight: 600;
    line-height: 120%;
    flex-grow: 1;

    @media screen and (min-width: 768px) {
      font-size: 16px;
      line-height: normal;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      line-height: 140%;
    }
  }

  // .restaurant__number
  &__number {
    font-size: extClamp(9);
    font-weight: 400;
    font-style: normal;
    line-height: 120%;
    display: flex;
    align-items: center;
    flex-direction: column;
    flex-shrink: 0;
    justify-content: center;
    width: extClamp(18);
    height: extClamp(18);
    margin-left: auto;
    text-align: center;
    color: var(---Main-White, #fff);
    border-radius: 50%;
    background: var(---Main-Purple, #993ca6);

    @media screen and (min-width: 768px) {
      font-size: 12px;
      line-height: normal;
      width: 24px;
      height: 24px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 12px;
      line-height: 120%;
      width: 24px;
      height: 24px;
    }
  }

  // .restaurant__line
  &__line {
    width: 100%;
    height: 1px;
    background-color: #e8e8e8;
  }

  // .restaurant__times
  &__times {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    width: 100%;
    gap: extClamp(5);

    @media screen and (min-width: 768px) {
      padding-top: 8px;
      padding-bottom: 8px;
      gap: 5px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .restaurant__time
  &__time {
  }

  // .restaurant__book
  &__book.gradient-button {
    width: extClamp(192);
    margin-top: extClamp(8);
    margin-right: auto;
    margin-left: auto;

    @media screen and (min-width: 768px) {
      width: 100%;
      max-width: 528px;
      margin-top: 0;
    }

    @media screen and (min-width: 1280px) {
      max-width: 301px;
    }
  }
}

.restaurant-time {
  display: flex;
  align-items: center;
  gap: extClamp(8);

  @media screen and (min-width: 768px) {
    gap: 10px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .restaurant-time__inner
  &__inner {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    justify-content: center;
    gap: extClamp(6);

    @media screen and (min-width: 768px) {
      gap: 2px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .restaurant-time__icon
  &__icon {
    width: extClamp(18);
    height: extClamp(18);
    color: #993ca6;

    @media screen and (min-width: 768px) {
      width: 24px;
      height: 24px;
    }

    @media screen and (min-width: 1280px) {
      width: 24px;
      height: 24px;
    }
  }

  // .restaurant-time__time
  &__time {
    font-size: extClamp(12);
    font-weight: 500;
    line-height: 100%;
    white-space: nowrap;

    @media screen and (min-width: 768px) {
      font-size: 16px;
      line-height: 120%;
    }

    @media screen and (min-width: 1280px) {
      font-size: 14px;
    }
  }

  // .restaurant-time__days
  &__days {
    font-size: extClamp(9);
    font-weight: 400;
    line-height: 120%;
    color: var(---Primary-Gray, #969696);

    @media screen and (min-width: 768px) {
      font-size: 12px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 12px;
      line-height: 120%;
    }
  }
}
</style>
