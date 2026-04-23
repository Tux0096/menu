<template>
  <div
    class="checkout-address"
    @click="$emit('click')"
  >
    <div class="checkout-address__icon-wrapper">
      <svg
        :class="{'checkout-address__icon--active': isActive}"
        class="checkout-address__icon"
      >
        <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#home" />
      </svg>
    </div>
    <div class="checkout-address__name">
      <span class="checkout-address__title">
        <slot name="title" />:</span>
      <slot />
    </div>

    <div class="checkout-address__actions">
      <svg
        v-if="canEdit"
        class="checkout-address__action"
        @click="$emit('edit')"
      >
        <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#rounded-edit" />
      </svg>

      <svg
        v-if="canDelete"
        class="checkout-address__action"
        @click="$emit('delete')"
      >
        <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#rounded-close" />
      </svg>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  props: {
    canEdit: {
      type: Boolean,
      default: false,
    },
    canDelete: {
      type: Boolean,
      default: false,
    },
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

.checkout-address {
  display: flex;
  align-items: center;
  gap: extClamp(8);

  @media screen and (min-width: 768px) {
    gap: 10px;
  }

  @media screen and (min-width: 1280px) {
    align-items: center;
    gap: 16px;
  }

  // .checkout-address__icon-wrapper
  &__icon-wrapper {
  }

  // .checkout-address__icon
  &__icon {
    width: extClamp(18);
    height: extClamp(18);
    color: #993ca6;

    @media screen and (min-width: 768px) {
      width: 32px;
      height: 32px;
    }

    @media screen and (min-width: 1280px) {
      width: 24px;
      height: 24px;
    }

    // checkout-address__icon--active
    &--active {

    }
  }

  // .checkout-address__name
  &__name {
    font-size: extClamp(12);
    font-weight: 600;
    font-style: normal;
    line-height: 120%;
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 16px;

    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
    }
  }

  // .checkout-address__title
  &__title {
    color: var(---Main-Purple, #993ca6);
  }

  // .checkout-address__actions
  &__actions {
    margin-left: auto;

  }

  // .checkout-address__action
  &__action {
    width: extClamp(24);
    height: extClamp(24);

    @media screen and (min-width: 768px) {
      width: 32px;
      height: 32px;
    }

    @media screen and (min-width: 1280px) {
      width: 24px;
      height: 24px;
    }
  }
}
</style>
