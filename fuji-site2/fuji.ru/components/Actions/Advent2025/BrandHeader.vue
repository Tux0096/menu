<template>
  <div class="advent-brand-header">
    <div class="advent-brand-header__text">
      <div class="advent-brand-header__title">
        Новый год
      </div>
      <div class="advent-brand-header__subtitle">
        под созвездием
      </div>
    </div>
    <svg class="advent-brand-header__logo">
      <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#logo" />
    </svg>
  </div>
</template>

<script>
export default {
  name: 'BrandHeader',
};
</script>

<style lang="scss" scoped>
.advent-brand-header {
  display: flex;
  align-items: center;
  flex-direction: column;
  width: extClamp(238);

  @media screen and (min-width: 768px) {
    width: 424px;
  }

  @media screen and (min-width: 1280px) {
    width: 424px;
  }

  &__text {
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: extClamp(2);

    @media screen and (min-width: 768px) {
      gap: 8px;
    }

    @media screen and (min-width: 1280px) {
      gap: 8px;
    }
  }

  &__logo {
    width: extClamp(212);
    height: extClamp(43);
    margin-top: extClamp(10);
    color: #fff;

    @media screen and (min-width: 768px) {
      width: 424px;
      height: 86px;
      margin-top: 16px;
    }

    @media screen and (min-width: 1280px) {
      width: 424px;
      height: 86px;
      margin-top: 16px;
    }
  }

  &__title {
    font-family: 'GG Kizhich', sans-serif;
    font-size: extClamp(36);
    font-weight: 400;
    line-height: 1.032;
    margin: 0;
    text-align: center;
    color: #fff;

    @media screen and (min-width: 768px) {
      font-size: 72px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 72px;
    }
  }

  &__subtitle {
    font-family: 'GG Kizhich', sans-serif;
    font-size: extClamp(20);
    font-weight: 400;
    line-height: 100%;
    margin: 0;
    text-align: center;
    color: #c5b68f;
    text-shadow: 0px 0px 0px rgba(255, 255, 255, 1);

    @media screen and (min-width: 768px) {
      font-size: 36px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 36px;
    }
  }
}
</style>

