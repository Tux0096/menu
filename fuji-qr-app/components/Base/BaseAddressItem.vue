<template>
  <div
    :class="{'address-item--active': isActive}"
    class="address-item"
    @click="$emit('click')"
  >
    <div class="address-item__title">
      <slot />
    </div>
    <div
      :class="{'address-item__icon-wrapper--active': isActive}"
      class="address-item__icon-wrapper"
    >
      <svg
        :class="{'address-item__icon--active': isActive}"
        class="address-item__icon"
      >
        <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#address" />
      </svg>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BaseAddressItem',
  props: {
    isActive: {
      type: Boolean,
      default: false,
    },
  },
};
</script>

<style lang="scss"
       scoped
>
.address-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: extClamp(10);
  cursor: pointer;
  border-radius: extClamp(10);
  background-color: #f6f6f6;
  gap: extClamp(10);

  @media screen and (min-width: 768px) {
    padding: 20px;
    border-radius: 15px;
    gap: 10px;
  }

  @media screen and (min-width: 1280px) {
    padding: 12px 10px;
    border-radius: 8px;
  }

  // .address-item__title
  &__title {
    font-size: extClamp(12);
    font-weight: 400;
    line-height: 140%;

    @media screen and (min-width: 768px) {
      font-size: 16px;
      font-weight: 600;
      line-height: 120%;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;

    }
  }

  // .address-item__icon-wrapper
  &__icon-wrapper {
    display: flex;
    align-items: flex-start;
    color: var(---Main-Purple, #993ca6);

    @media screen and (min-width: 768px) {
      margin-top: -8px;
      margin-right: -8px;
      margin-bottom: -8px;

    }

    @media screen and (min-width: 1280px) {
      bottom: 0;
      margin-top: 0;
      margin-right: 0;
      margin-bottom: 0;

    }
  }

  // .address-item__icon
  &__icon {
    width: extClamp(18);
    height: extClamp(18);

    @media screen and (min-width: 768px) {
      width: 32px;
      height: 32px;
    }

    @media screen and (min-width: 1280px) {
      width: 32px;
      height: 32px;
    }
  }
}
</style>
