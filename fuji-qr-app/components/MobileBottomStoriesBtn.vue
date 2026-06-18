<template>
  <div
    class="mobile-bottom-stories-btn"
    v-on="$listeners"
  >
    <div class="mobile-bottom-stories-btn__icon--wrapper">
      <img
        alt=""
        class="mobile-bottom-stories-btn__icon"
        src="~/assets/images/icons/svg/stories.svg"
      >
    </div>
  </div>
</template>
<script>
export default {
  name: 'MobileBottomStoriesBtn',
};
</script>
<style lang="scss"
       scoped
>
.mobile-bottom-stories-btn {
  flex-shrink: 0;

  // .mobile-bottom-stories-btn__icon
  &__icon {
    width: extClamp(42);
    height: extClamp(42);

    @media screen and (min-width: 768px) {
      width: 56px;
      height: 56px;

    }

    @media screen and (min-width: 1280px) {

    }
  }

}
</style>
