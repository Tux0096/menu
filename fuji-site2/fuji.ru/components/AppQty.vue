<template>
  <div
    class="qty"
  >
    <div
      class="qty__item qty__item--minus"
      @click="decrease"
    >
      <svg class="qty__icon">
        <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#minus" />
      </svg>
    </div>
    <div

      class="qty__item qty__item--value"
    >
      {{ qty }}
    </div>
    <div

      class="qty__item qty__item--plus"
      @click="increase"
    >
      <svg class="qty__icon">
        <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#plus" />
      </svg>
    </div>
  </div>
</template>
<script lang="ts">

export default {
  name: 'AppQty',
  props: {
    qty: {
      type: Number,
      default: 0,
    },

  },
  data() {
    return {};
  },
  methods: {
    decrease() {
      this.$emit('decrease');
    },
    increase() {
      this.$emit('increase');
    },
  },
};
</script>
<style lang="scss"
       scoped
>
.qty {
  font-family: "Wix Madefor Display", sans-serif;
  font-size: extClamp(12);
  font-weight: 600;
  line-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: extClamp(4);
  text-align: center;
  color: var(---Main-Purple, #993ca6);
  border-radius: extClamp(16);
  background: var(---Primary-LightPurple, #f5ecf6);
  gap: extClamp(6);

  @media screen and (min-width: 768px) {
    font-size: 16px;
    padding: 10px 6px;
    gap: 12px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .qty__item
  &__item {

    &:not(.qty__item--value) {
      cursor: pointer;
    }

    // .qty__item--minus
    &--minus {

    }

    // .qty__item--value
    &--value {
      flex: 1 1 auto;
    }

    // .qty__item--plus
    &--plus {

    }
  }

  // .qty__icon
  &__icon {
    width: extClamp(12);
    height: extClamp(12);

    @media screen and (min-width: 768px) {
      width: 18px;
      height: 18px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}
</style>
