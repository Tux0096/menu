<template>
  <div
    :class="{'base-input--is-focused': isFocused || isFilled}"
    class="base-input"
  >
    <input
      ref="input"
      v-model="model"
      v-phone-mask="hasPhoneMask"
      :placeholder="placeholder"
      :readonly="readonly"
      :type="type"
      class="base-input__input"
      v-bind="$attrs"
      @blur="onBlur"
      @focus="onFocus"
      @keyup="onKeyup"
      @keyup.enter="$emit('keyup-enter')"
    >
    <div
      v-if="$slots.icon"
      class="base-input__icon-wrapper"
      @click.prevent.stop="$emit('submit')"
    >
      <slot
        name="icon"
      />
    </div>
  </div>
</template>

<script>
export default {
  name: 'BaseInput',
  props: {
    value: {
      type: String,
      default: '',
    },
    placeholder: {
      type: String,
      default: '',
    },
    hasPhoneMask: {
      type: Boolean,
      default: false,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      default: 'text',
    },
  },
  data() {
    return {

      isFocused: false,
    };
  },
  computed: {
    isFilled() {
      return this.model?.length > 0;
    },
    model: {
      get() {
        return this.value;
      },
      set(value) {
        this.$emit('input', value);
      },
    },
  },

  methods: {
    setFocus() {
      this.$refs.input.focus();
    },
    onFocus() {
      this.isFocused = true;
      this.$emit('focus');
    },
    onBlur() {
      this.isFocused = false;
      this.$emit('blur');
    },
    onKeyup(event) {
      this.model = event.target.value;
    },
  },

};
</script>

<style lang="scss"
       scoped
>
.base-input {
  position: relative;

  // .base-input__input
  &__input {
    font-size: extClamp(10);
    font-weight: 500;
    font-style: normal;
    line-height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: extClamp(42);
    padding: extClamp(12) extClamp(16);
    color: var(---Main-Purple, #993ca6);
    border: 1px solid var(---Extra-LightGray, #e8e8e8);
    border-radius: extClamp(8);
    outline: none;
    background: var(---Main-White, #fff);

    @media screen and (min-width: 768px) {
      font-size: 16px;
      line-height: 120%;
      min-height: 52px;
      padding: 16px 16px;
      border-radius: 8px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 14px;
      line-height: 100%;
      min-height: 52px;
      padding: 16px 16px;
      border-radius: 8px;
    }

    // .base-textarea__input--is-filled
    &--is-filled {
      padding-top: extClamp(30);

      @media screen and (min-width: 768px) {
        padding-top: 30px;
      }

      @media screen and (min-width: 1280px) {

      }
    }

    &::placeholder {
      color: var(---Primary-Gray, #969696);
    }
  }

  // .base-input__icon-wrapper
  &__icon-wrapper {

    position: absolute;
    z-index: 2;
    top: extClamp(10);
    right: extClamp(10);
    bottom: extClamp(10);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: extClamp(3);
    border-radius: extClamp(6);
    background: #993ca6;
    gap: extClamp(10);

    @media screen and (min-width: 768px) {
      top: 10px;
      right: 10px;
      bottom: 10px;
      padding: 3px;
      border-radius: 6px;
      gap: 10px;
    }

    @media screen and (min-width: 1280px) {

    }

    > svg {
      width: extClamp(18);
      height: extClamp(18);
      color: #fff;

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
