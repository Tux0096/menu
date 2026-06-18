<template>
  <label class="base-switch">
    <input
      class="base-switch__input visually-hidden"
      type="checkbox"
      :checked="value"
      :disabled="disabled"
      @change="$emit('input', $event.target.checked)"
    >
    <span class="base-switch__track">
      <span class="base-switch__thumb" />
    </span>
    <span
      v-if="$slots.default"
      class="base-switch__label"
    ><slot /></span>
  </label>
</template>

<script>
export default {
  name: 'BaseSwitch',
  model: {
    prop: 'value',
    event: 'input',
  },
  props: {
    value: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
};
</script>

<style lang="scss"
       scoped
>
.base-switch {
  display: inline-flex;
  align-items: center;
  gap: extClamp(10);
  cursor: pointer;
  user-select: none;

  @media screen and (min-width: 768px) {
    gap: 10px;
  }

  // .base-switch__track
  &__track {
    position: relative;
    flex-shrink: 0;
    display: inline-block;
    width: extClamp(36);
    height: extClamp(22);
    background-color: #f5f5f5;
    border-radius: 999px;
    transition: background-color 0.2s ease;

    @media screen and (min-width: 768px) {
      width: 64px;
      height: 38px;
    }
  }

  // .base-switch__thumb
  &__thumb {
    position: absolute;
    top: 50%;
    left: extClamp(2);
    width: extClamp(18);
    height: extClamp(18);
    background-color: #969696;
    border-radius: 50%;
    transform: translateY(-50%);
    transition: left 0.2s ease, background-color 0.2s ease;

    @media screen and (min-width: 768px) {
      left: 3px;
      width: 32px;
      height: 32px;
    }
  }

  // .base-switch__input
  &__input {

    &:checked ~ .base-switch__track {
      background-color: #f5ecf6;

      .base-switch__thumb {
        left: calc(100% - #{extClamp(18)} - #{extClamp(2)});
        background-color: #993ca6;

        @media screen and (min-width: 768px) {
          left: calc(100% - 32px - 3px);
        }
      }
    }

    &:disabled ~ .base-switch__track {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  // .base-switch__label
  &__label {
    font-size: extClamp(12);
    font-weight: 300;
    line-height: 140%;
    color: #292929;

    @media screen and (min-width: 768px) {
      font-size: 16px;
    }
  }
}
</style>
