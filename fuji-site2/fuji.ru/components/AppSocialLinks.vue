<template>
  <div class="social-links">
    <AppExternalLink
      :href="$store.getters['city/cityData']?.social?.vk"
      class="social-links__item"
    >
      <svg class="social-links__icon">
        <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#vk" />
      </svg>
    </AppExternalLink>
    <!--    <AppExternalLink-->
    <!--      class="social-links__item"-->
    <!--      href="#"-->
    <!--    >-->
    <!--      <svg class="social-links__icon">-->
    <!--        <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#inst" />-->
    <!--      </svg>-->
    <!--    </AppExternalLink>-->
    <AppExternalLink
      class="social-links__item"
      href="https://t.me/fujisamara"
    >
      <svg class="social-links__icon">
        <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#tg" />
      </svg>
    </AppExternalLink>
  </div>
</template>
<script>
export default {
  name: 'AppSocialLinks',
};
</script>

<style lang="scss"
       scoped
>

.social-links {
  display: flex;
  align-items: flex-start;
  gap: extClamp(10);

  @media screen and (min-width: 768px) {
    gap: 10px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .social-links__item
  &__item {
    display: flex;
    align-items: center;
    justify-content: center;
    width: extClamp(26);
    height: extClamp(26);
    color: #993ca6;
    border-radius: extClamp(8);
    background: var(---Primary-LightPurple, #f5ecf6);

    @media screen and (min-width: 768px) {
      width: 56px;
      height: 56px;
      border-radius: 13px;

    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .social-links__icon
  &__icon {
    width: 14px;
    height: 14px;

    @media screen and (min-width: 768px) {
      width: 24px;
      height: 24px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}
</style>
