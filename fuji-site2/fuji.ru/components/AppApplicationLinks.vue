<template>
  <div class="application-links">
    <AppExternalLink
      class="application-links__item"
      href="https://apps.apple.com/ru/app/%D1%84%D1%83%D0%B4%D0%B6%D0%B8-%D0%B4%D0%BE%D1%81%D1%82%D0%B0%D0%B2%D0%BA%D0%B0-%D0%B5%D0%B4%D1%8B/id6473526879"
    >
      <svg class="application-links__icon">
        <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#apple" />
      </svg>
    </AppExternalLink>
    <AppExternalLink
      class="application-links__item"
      href="https://play.google.com/store/apps/details?id=ru.fuji.app"
    >
      <svg class="application-links__icon">
        <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#android" />
      </svg>
    </AppExternalLink>
  </div>
</template>
<script>
export default {
  name: 'AppApplicationLinks',
};
</script>

<style lang="scss"
       scoped
>

.application-links {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  justify-content: flex-end;
  gap: extClamp(8);

  @media screen and (min-width: 768px) {
    gap: 10px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .application-links__item
  &__item {

  }

  // .application-links__icon
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
