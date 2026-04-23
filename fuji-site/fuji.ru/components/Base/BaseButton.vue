<template>
  <button
    :class="[
      `button--${type}`
    ]"
    class="button"
    @click.prevent="$emit('click')"
  >
    <slot />
    <slot name="icon" />
  </button>
</template>

<script>
export default {
  props: {
    type: {
      type: String,
      default: 'fill',
    },
  },
  computed: {},
};
</script>

<style lang="scss"
       scoped
>
.button {
  font-size: extClamp(12);
  font-weight: 600;
  font-style: normal;
  line-height: 120%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: extClamp(14) extClamp(12);
  text-align: center;
  color: var(---Main-White, #fff);
  border: 2px solid #993ca6;
  border-radius: 148.837px;
  background: var(---Main-Purple, #993ca6);

  @media screen and (min-width: 768px) {
    font-size: 16px;
    padding: 20px 30px;
  }

  @media screen and (min-width: 1280px) {
    font-size: 16px;
    font-weight: 600;
    font-style: normal;
    line-height: normal;
    height: auto;
    min-height: 52px;
    padding: 16px;
  }

  // .button--online
  &--outline {
    color: #993ca6;
    background-color: #fff;
  }

  // .button--s
  &--s {

    &.button--icon {

    }

  }

  // .button--l
  &--l {

  }

  &::v-deep svg {
    width: extClamp(20);
    height: extClamp(20);

    @media screen and (min-width: 768px) {
      width: 20px;
      height: 20px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

}
</style>
