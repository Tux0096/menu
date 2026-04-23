<template>
  <div class="delivery-filter">
    <div class="delivery-filter__inner">
      <div
        v-if="isRestShow"
        :class="{'delivery-filter-type--active': mode === 'rest'}"
        class="delivery-filter__item delivery-filter-type delivery-filter-type--self"
        @click="setFilterMode('rest')"
      >
        <div class="delivery-filter-type__title">
          Рестораны
        </div>
        <svg class="delivery-filter-type__icon">
          <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#food" />
        </svg>
      </div>
      <div
        v-if="isSelfShow"
        :class="{'delivery-filter-type--active': mode === 'self'}"
        class="delivery-filter-type delivery-filter-type delivery-filter-type--delivery"
        @click="setFilterMode('self')"
      >
        <div class="delivery-filter-type__title">
          Самовывоз
        </div>
        <svg class="delivery-filter-type__icon">
          <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#address" />
        </svg>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AppDeliveryFilter',
  props: {
    mode: {
      type: String,
      default: 'rest',
    },
    isRestShow: {
      type: Boolean,
      default: false,
    },
    isSelfShow: {
      type: Boolean,
      default: false,
    },
  },

  methods: {
    setFilterMode(mode) {
      this.$emit('select', mode);
    },
  },
};
</script>

<style lang="scss"
       scoped
>
.delivery-filter {
  // .delivery-filter__inner
  &__inner {
    display: flex;
    gap: extClamp(10);

    @media screen and (min-width: 768px) {
      gap: 20px;
    }

    @media screen and (min-width: 1280px) {
      gap: 36px;
    }
  }

  // .delivery-filter__type-select
  &__type-select {
  }

  // .delivery-filter__item
  &__item {
  }
}

.delivery-filter-type-select {

  // .delivery-filter-type-select__item
  &__item {
  }
}

.delivery-filter-type {
  position: relative;
  display: flex;
  overflow: hidden;
  align-items: flex-start;
  flex-grow: 1;
  height: extClamp(93);
  padding: extClamp(10);
  cursor: pointer;
  opacity: 0.2;
  border: 2px solid #993ca6;
  border-radius: extClamp(10);
  gap: extClamp(10);

  @media screen and (min-width: 768px) {
    height: 94px;
    padding: 16px 8px;
    border-radius: 8px;
    gap: 37px;
  }

  @media screen and (min-width: 1280px) {
    flex-grow: 0;
    width: auto;
    height: auto;
    padding: 0;
    opacity: 1;
    border: none;
    border-radius: 0;
  }

  // .delivery-filter-type--self
  &--self {
  }

  // .delivery-filter-type--delivery
  &--delivery {
  }

  // .delivery-filter-type--active
  &--active {
    opacity: 1;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      .delivery-filter-type__title {
        color: #993ca6;
      }
    }
  }

  // .delivery-filter-type__title
  &__title {
    font-size: extClamp(10);
    font-weight: 400;
    line-height: normal;
    color: #993ca6;

    @media screen and (min-width: 768px) {
      font-size: 14px;
      font-weight: 600;
      line-height: 120%;

    }

    @media screen and (min-width: 1280px) {
      font-size: 36px;
      font-weight: 500;
      line-height: 100%;
      color: #d0d0d0;
    }
  }

  // .delivery-filter-type__icon
  &__icon {
    position: absolute;
    right: extClamp(-20);
    bottom: extClamp(-20);
    width: extClamp(110);
    height: extClamp(110);
    transform: rotate(-30deg);
    opacity: 0.5;
    color: #993ca6;

    @media screen and (min-width: 768px) {
      right: -20px;
      bottom: -20px;
      width: 100px;
      height: 100px;
    }

    @media screen and (min-width: 1280px) {
      display: none;
    }
  }
}
</style>
