<template>
  <div class="app-need-update">
    <lord-icon
      :src="`/assets/libs/icon-json/phone.json`"
      class="app-need-update__icon"
      trigger="loop"
    />
    <div class="app-need-update__text">
      Для продолжения работы обновите приложение
    </div>
    <AppApplicationLinks class="app-need-update__apps" />
  </div>
</template>

<script lang="ts"
        setup
>
</script>
<style lang="scss"
       scoped
>
.app-need-update {
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  padding: extClamp(20) 0 extClamp(50);
  gap: extClamp(20);

  @media screen and (min-width: 768px) {
    padding: 60px 20px 100px 20px;
    gap: 20px;

  }

  @media screen and (min-width: 1280px) {

  }

  // .app-need-update__icon
  &__icon {
    width: extClamp(72);
    height: extClamp(72);

    @media screen and (min-width: 768px) {
      width: 150px;
      height: 150px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .app-need-update__text
  &__text {
    font-size: extClamp(14);
    font-weight: 400;
    line-height: normal;
    text-align: center;
    color: #993ca6;

    @media screen and (min-width: 768px) {
      font-size: 32px;
      font-weight: 500;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .app-need-update__apps
  &__apps {

    &::v-deep .application-links__icon {
      width: 120px;
      height: 120px;
    }
  }
}
</style>
