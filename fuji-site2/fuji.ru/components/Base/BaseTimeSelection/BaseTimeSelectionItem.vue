<template>
  <div
    :class="{'time-selection-item--active': isActive}"
    class="time-selection-item"
    @click="$emit('click')"
  >
    <div class="time-selection-item__item">
      <div class="time-selection-item__value time-selection-item__value--from">
        {{ propTimeData.from }}
      </div>
    </div>
    <div class="time-selection-item__item">
      <div class="time-selection-item__value time-selection-item__value--to">
        {{ propTimeData.to }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    isActive: {
      type: Boolean,
      default: false,
    },
    propTimeData: {
      type: Object,
    },

  },
};
</script>

<style lang="scss"
       scoped
>

.time-selection-item {
  font-size: extClamp(12);
  font-weight: 600;
  font-style: normal;
  line-height: 120%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-evenly;
  padding: extClamp(8) 0;
  cursor: pointer;
  text-align: center;
  color: var(---Primary-Gray, #969696);
  gap: extClamp(44);

  @media screen and (min-width: 768px) {
    font-size: 16px;
    line-height: normal;
    padding: 10px 0;
    gap: 100px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .time-selection-item--active
  &--active {
    color: #993ca6;
    border-top-color: #f0f0f0;
    border-bottom-color: #f0f0f0;
    background-color: #f5ecf6;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .time-selection-item__item
  &__item {

    @media screen and (min-width: 768px) {
      gap: 20px;
    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .time-selection-item__value
  &__value {
    text-align: center;

    @media screen and (min-width: 768px) {
      width: 48px;
    }

    @media screen and (min-width: 1280px) {

    }

    // time-selection-item__value--from
    &--from {

    }

    // time-selection-item__value--to
    &--to {

    }

  }
}
</style>
