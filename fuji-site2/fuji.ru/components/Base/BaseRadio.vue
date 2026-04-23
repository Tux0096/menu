<template>
  <div class="base-radio">
    <label class="base-radio__label">
      <input
        :checked="isChecked"
        :value="value"
        class="base-radio__input visually-hidden"
        type="radio"
        @input="onChange"
      >

      <svg
        v-if="isChecked"
        class="base-radio__radio"
        fill="none"
        viewBox="0 0 18 18"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M9 12.75C10.0375 12.75 10.9219 12.3844 11.6531 11.6531C12.3844 10.9219 12.75 10.0375 12.75 9C12.75 7.9625 12.3844 7.07812 11.6531 6.34688C10.9219 5.61562 10.0375 5.25 9 5.25C7.9625 5.25 7.07812 5.61562 6.34688 6.34688C5.61562 7.07812 5.25 7.9625 5.25 9C5.25 10.0375 5.61562 10.9219 6.34688 11.6531C7.07812 12.3844 7.9625 12.75 9 12.75ZM9 16.5C7.9625 16.5 6.9875 16.3031 6.075 15.9094C5.1625 15.5156 4.36875 14.9813 3.69375 14.3063C3.01875 13.6313 2.48438 12.8375 2.09063 11.925C1.69687 11.0125 1.5 10.0375 1.5 9C1.5 7.9625 1.69687 6.9875 2.09063 6.075C2.48438 5.1625 3.01875 4.36875 3.69375 3.69375C4.36875 3.01875 5.1625 2.48438 6.075 2.09063C6.9875 1.69687 7.9625 1.5 9 1.5C10.0375 1.5 11.0125 1.69687 11.925 2.09063C12.8375 2.48438 13.6313 3.01875 14.3063 3.69375C14.9813 4.36875 15.5156 5.1625 15.9094 6.075C16.3031 6.9875 16.5 7.9625 16.5 9C16.5 10.0375 16.3031 11.0125 15.9094 11.925C15.5156 12.8375 14.9813 13.6313 14.3063 14.3063C13.6313 14.9813 12.8375 15.5156 11.925 15.9094C11.0125 16.3031 10.0375 16.5 9 16.5ZM9 15C10.675 15 12.0938 14.4187 13.2563 13.2563C14.4187 12.0938 15 10.675 15 9C15 7.325 14.4187 5.90625 13.2563 4.74375C12.0938 3.58125 10.675 3 9 3C7.325 3 5.90625 3.58125 4.74375 4.74375C3.58125 5.90625 3 7.325 3 9C3 10.675 3.58125 12.0938 4.74375 13.2563C5.90625 14.4187 7.325 15 9 15Z"
          fill="#993CA6"
        />
      </svg>
      <svg
        v-else
        class="base-radio__radio"
        fill="none"
        viewBox="0 0 18 18"
      >
        <path
          d="M9 16.5C7.9625 16.5 6.9875 16.3031 6.075 15.9094C5.1625 15.5156 4.36875 14.9813 3.69375 14.3063C3.01875 13.6313 2.48438 12.8375 2.09063 11.925C1.69687 11.0125 1.5 10.0375 1.5 9C1.5 7.9625 1.69687 6.9875 2.09063 6.075C2.48438 5.1625 3.01875 4.36875 3.69375 3.69375C4.36875 3.01875 5.1625 2.48438 6.075 2.09063C6.9875 1.69687 7.9625 1.5 9 1.5C10.0375 1.5 11.0125 1.69687 11.925 2.09063C12.8375 2.48438 13.6313 3.01875 14.3063 3.69375C14.9813 4.36875 15.5156 5.1625 15.9094 6.075C16.3031 6.9875 16.5 7.9625 16.5 9C16.5 10.0375 16.3031 11.0125 15.9094 11.925C15.5156 12.8375 14.9813 13.6313 14.3063 14.3063C13.6313 14.9813 12.8375 15.5156 11.925 15.9094C11.0125 16.3031 10.0375 16.5 9 16.5ZM9 15C10.675 15 12.0938 14.4187 13.2563 13.2563C14.4187 12.0938 15 10.675 15 9C15 7.325 14.4187 5.90625 13.2563 4.74375C12.0938 3.58125 10.675 3 9 3C7.325 3 5.90625 3.58125 4.74375 4.74375C3.58125 5.90625 3 7.325 3 9C3 10.675 3.58125 12.0938 4.74375 13.2563C5.90625 14.4187 7.325 15 9 15Z"
          fill="#969696"
        />

      </svg>
      <span class="base-radio__name"><slot /></span>
      <span
        v-if="$slots.icon"
        class="base-radio__icon-wrapper"
      ><slot name="icon" /></span>
    </label>
  </div>
</template>

<script>
export default {
  props: {
    value: {
      type: [String, Number, Boolean],
      required: true,
    },
    val: {
      type: [String, Number, Boolean],
      required: true,
    },

  },
  computed: {
    isChecked() {
      return this.val === this.value;
    },
  },
  methods: {
    onChange() {
      this.$emit('input', this.val);
      this.$emit('change', this.val);
    },
  },
};
</script>

<style lang="scss"
       scoped
>
.base-radio {

  // .base-radio__label
  &__label {
    font-size: extClamp(10);
    font-weight: 400;
    line-height: 120%;
    display: flex;
    align-items: center;
    cursor: pointer;
    color: var(---Primary-Gray, #969696);
    gap: extClamp(8);

    @media screen and (min-width: 768px) {
      font-size: 14px;
      color: var(---Primary-Gray, #969696);
      gap: 8px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 14px;
      font-weight: 400;
      line-height: 120%;
    }
  }

  // .base-radio__radio
  &__radio {

    width: extClamp(18);
    height: extClamp(18);

    @media screen and (min-width: 768px) {
      width: 24px;
      height: 24px;
    }

    @media screen and (min-width: 1280px) {
      width: 24px;
      height: 24px;
    }
  }
}
</style>
