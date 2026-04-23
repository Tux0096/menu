<template>
  <div
    class="close-button"
    @click="$emit('click')"
  >
    <svg class="close-button__icon">
      <use xlink:href="~/assets/images/icons/svg/sprite.svg#times" />
    </svg>
  </div>
</template>

<script>
export default {};
</script>

<style lang="scss"
       scoped
>
.close-button {
  display:         flex;
  align-items:     center;
  justify-content: center;
  width:           extClamp(43);
  height:          extClamp(43);
  cursor:          pointer;
  border-radius:   extClamp(14);
  background:      #eef0f5;

  @media screen and (min-width: 768px) {
    width:         40px;
    height:        40px;
    border-radius: 50%;
  }

  @media screen and (min-width: 1280px) {

  }

  // .close-button__icon
  &__icon {
    width:  extClamp(13);
    height: extClamp(13);

    @media screen and (min-width: 768px) {
      width:  24px;
      height: 24px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}
</style>
