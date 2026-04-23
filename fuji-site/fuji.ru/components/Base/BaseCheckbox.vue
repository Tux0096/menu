<template>
  <div class="base-checkbox">
    <label class="base-checkbox__label">
      <input
        v-model="val"
        class="base-checkbox__input visually-hidden"
        type="checkbox"
        @input="$emit('input', $event.target.checked)"
      >
      <span class="base-checkbox__radio">
        <svg
          :class="{'base-checkbox__checked-icon--checked': val}"
          class="base-checkbox__checked-icon"
        >
          <use
            v-if="val"
            xlink:href="~/assets/images/icons/svg/sprite-v2.svg#rounded-fill-tick"
          />
          <use
            v-else
            xlink:href="~/assets/images/icons/svg/sprite-v2.svg#rounded"
          />
        </svg>
      </span>
      <span class="base-checkbox__name"><slot /></span>
      <span
        v-if="$slots.icon"
        class="base-checkbox__icon-wrapper"
      ><slot name="icon" /></span>
    </label>
  </div>
</template>

<script>
export default {
  name: 'BaseCheckbox',
  props: {
    value: Boolean,
  },
  data() {
    return {
      val: this.value,
    };
  },
};
</script>

<style lang="scss"
       scoped
>
.base-checkbox {
  // .base-checkbox__label
  &__label {
    display: flex;
    align-items: center;
    cursor: pointer;
    gap: extClamp(10);

    @media screen and (min-width: 768px) {
      gap: 10px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .base-checkbox__checked-icon
  &__checked-icon {
    flex-shrink: 0;
    width: extClamp(24);
    height: extClamp(24);
    color: #e8e8e8;

    @media screen and (min-width: 768px) {
      width: 24px;
      height: 24px;
    }

    @media screen and (min-width: 1280px) {

    }

    // .base-checkbox__checked-icon--checked
    &--checked {
      color: #993ca6;
    }
  }

  // .base-checkbox__input
  &__input {

    &:checked ~ {
      .base-checkbox__radio {
        border: none;

        .base-checkbox__checked-icon {
          display: block;
        }
      }

      .base-checkbox__name {

      }

      // .base-checkbox__icon-wrapper
      .base-checkbox__icon-wrapper {
        color: #993ca6;
      }
    }
  }

  // .base-checkbox__radio
  &__radio {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: extClamp(24);
    height: extClamp(24);

    @media screen and (min-width: 768px) {
      width: 24px;
      height: 24px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .base-checkbox__name
  &__name {
    font-size: extClamp(12);
    font-weight: 300;
    line-height: 140%;
    color: #292929;

    @media screen and (min-width: 768px) {
      font-size: 16px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .base-checkbox__icon-wrapper
  &__icon-wrapper {
    display: inline-block;
    color: #c1c2cb;

    & > svg {
      width: extClamp(24);
      height: extClamp(24);

      @media screen and (min-width: 768px) {
        width: 24px;
        height: 24px;
      }

      @media screen and (min-width: 1280px) {

      }
    }
  }
}
</style>
