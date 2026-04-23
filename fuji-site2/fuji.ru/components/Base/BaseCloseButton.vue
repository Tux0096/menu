<template>
  <div
    class="close-button"
    @click.prevent="$emit('click')"
  >
    <svg class="close-button__icon">
      <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#close" />
    </svg>
  </div>
</template>

<script>
export default {
  name: 'BaseCloseButton',
};
</script>

<style lang="scss"
       scoped
>
.close-button {

  color: #993ca6;

  // .close-button__icon
  &__icon {
    width: extClamp(18);
    height: extClamp(18);

    @media screen and (min-width: 768px) {
      width: 24px;
      height: 24px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}
</style>
