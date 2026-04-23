<template>
  <div
    :class="{'address-item--active': isActive}"
    class="address-item"
    @click="$emit('click')"
  >
    <div
      :class="{'address-item__icon-wrapper--active': isActive}"
      class="address-item__icon-wrapper"
    >
      <svg
        :class="{'address-item__icon--active': isActive}"
        class="address-item__icon"
      >
        <use :xlink:href="iconHref" />
      </svg>
    </div>
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
    startIconName: {
      type: String,
      default: 'address',
    },
  },
  computed: {
    iconHref() {
      return `${require('~/assets/images/icons/svg/sprite-v2.svg')}#${this.startIconName}`;
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
  padding: extClamp(12) extClamp(8);
  cursor: pointer;
  border-radius: extClamp(10);
  background-color: #f5f5f5;
  gap: extClamp(12);

  @media screen and (min-width: 768px) {
    padding: 12px 10px;
    gap: 8px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .address-item__title
  &__title {
    font-size: extClamp(12);
    font-weight: 500;
    line-height: 100%;
    margin-right: auto;

    @media screen and (min-width: 768px) {
      font-size: 16px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .address-item__icon-wrapper
  &__icon-wrapper {
    display: flex;
    align-items: flex-start;
    color: var(---Main-Purple, #993ca6);

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {

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

    }
  }
}
</style>
