<template>
  <div
    aria-live="polite"
    class="custom-loading"
    role="status"
  >
    <div class="custom-loading__inner">
      <!--      <div class="custom-loading__logo-wrapper">-->
      <!--        <svg-->
      <!--          class="custom-loading__logo-icon"-->
      <!--        >-->
      <!--          <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#logo" />-->
      <!--        </svg>-->
      <!--      </div>-->
    </div>
    <img
      alt=""
      class="custom-loading__image"
      src="~/assets/images/content/app-preload.webp"
    >
  </div>
</template>

<script>
export default {
  name: 'AppPreload',
};
</script>

<style lang="scss" scoped>
.custom-loading {
  position: fixed;
  z-index: 9999;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: #993ca6;

  // .custom-loading__image
  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  // .custom-loading__inner
  &__inner {
    max-width: 80%;
  }

  // .custom-loading__logo-wrapper
  &__logo-wrapper {

  }

  // .custom-loading__logo-icon
  &__logo-icon {
    width: 100%;
    animation: logoFly 3s ease-in-out infinite;
    color: #fff;
  }
}

@keyframes logoFly {
  0% {
    transform: scale(1);
    opacity: 0;
    filter: drop-shadow(0 0 0 #00000066);
  }
  20% {
    opacity: 1;
  }
  50% {
    filter: drop-shadow(extClamp(5) extClamp(3) extClamp(5) #00000066);
  }
  90% {
    transform: scale(1.1);
    filter: drop-shadow(extClampNegative(5) extClamp(3) extClamp(5) #00000066);
  }
  95% {
    transform: scale(1)
  }
}
</style>
