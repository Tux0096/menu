<template>
  <div class="app-content">
    <div class="app-content__inner" />
  </div>
</template>

<script>
export default {
  name: 'AppContent',
};
</script>

<style lang="scss" scoped>
.app-content {
  // .app-content__inner
  &__inner {
    display:         flex;
    justify-content: space-around;
  }

  // .app-content__btn
  &__btn {
    min-width: extClamp(260);

    @media screen and (min-width: 768px) {
      min-width: 260px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}
</style>
