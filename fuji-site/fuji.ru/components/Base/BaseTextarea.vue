<template>
  <div
    :class="{'base-textarea--is-focused': isFocused || isFilled}"
    class="base-textarea"
  >
    <span
      v-show="!(isFocused || isFilled)"
      :class="{'base-textarea__label--is-filled': isFocused || isFilled}"
      class="base-textarea__label"
      @click="$refs.input.focus()"
    >{{ placeholder }}</span>
    <textarea
      ref="input"
      v-model="model"
      :class="{'base-textarea__input--is-filled': isFocused || isFilled}"
      :readonly="readonly"
      class="base-textarea__input"
      type="text"
      @blur="onBlur"
      @focus="onFocus"
      @input="onInput"
    />
  </div>
</template>

<script>
export default {
  props: {
    value: {
      type: String,
      default: '',
    },
    placeholder: {
      type: String,
      default: '',
    },
    readonly: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      model: this.value,
      isFocused: false,
    };
  },
  computed: {
    isFilled() {
      return this.model?.length > 0;
    },
  },
  methods: {
    onInput() {
      this.$emit('input', this.model);
    },
    onFocus() {
      this.isFocused = true;
      this.$emit('focus');
    },
    onBlur() {
      this.isFocused = false;
      this.$emit('blur');
    },
  },

};
</script>

<style lang="scss"
       scoped
>
.base-textarea {
  position: relative;
  // .base-textarea__input
  &__input {
    font-size: extClamp(10);
    font-weight: 500;
    line-height: 100%;
    display: block;
    width: 100%;
    padding: extClamp(12) extClamp(16);
    color: var(---Primary-Gray, #969696);
    border: 1px solid #e8e8e8;
    border-radius: extClamp(10);
    outline: none;
    background-color: #fff;

    @media screen and (min-width: 768px) {
      font-size: 16px;
      line-height: normal;
      padding: 16px;
      border-radius: 8px;
    }

    @media screen and (min-width: 1280px) {

    }

    // .base-textarea__input--is-filled
    &--is-filled {
      // padding-top: 30px;
    }

    &::placeholder {

    }
  }

  // .base-textarea__label
  &__label {
    font-size: extClamp(10);
    font-weight: 500;
    line-height: 100%;
    position: absolute;
    top: extClamp(16);
    left: extClamp(16);
    transition: top 0.3s;
    color: var(---Primary-Gray, #969696);

    @media screen and (min-width: 768px) {
      font-size: 16px;
      top: 20px;
      left: 20px;
    }

    @media screen and (min-width: 1280px) {

    }

    // .base-textarea__label--is-filled
    &--is-filled {
      top: extClamp(8);

      @media screen and (min-width: 768px) {
        top: 8px;
      }

      @media screen and (min-width: 1280px) {

      }
    }
  }
}
</style>
