<template>
  <div
    v-if="($device.isIos || $device.isAndroid) && href.length > 0"
    class="mobile-app"
  >
    <svg
      class="mobile-app__close"
      @click="onClose"
    >
      <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#close" />
    </svg>
    <div class="mobile-app__text">
      <svg class="mobile-app__icon">
        <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#logo-2" />
      </svg>
      Скачайте приложение ФУДЖИ
    </div>
    <AppExternalLink
      :href="href"
      class="mobile-app__download"
      @click="onClose"
    >
      Скачать
    </AppExternalLink>
  </div>
</template>

<script>
export default {
  name: 'AppMobileApp',
  data() {
    return {};
  },
  computed: {
    href() {
      if (this.$device.isAndroid) {
        return 'https://play.google.com/store/apps/details?id=ru.fuji.app';
      }
      if (this.$device.isIos) {
        return 'https://apps.apple.com/us/app/%D1%84%D1%83%D0%B4%D0%B6%D0%B8-%D0%B4%D0%BE%D1%81%D1%82%D0%B0%D0%B2%D0%BA%D0%B0-%D0%B5%D0%B4%D1%8B/id6473526879';
      }
      return '';
    },
  },

  methods: {
    onClose() {
      this.$store.commit('user/setIsShowGetMobileApp', false);
    },
  },
};
</script>

<style lang="scss" scoped>

.mobile-app {
  position: relative;
  z-index: 100;
  display: flex;
  align-items: center;
  padding: extClamp(6) extClamp(14) extClamp(14);
  background: var(---Main-White, #fff);
  gap: extClamp(8);

  @media screen and (min-width: 768px) {
    display: none;
  }

  @media screen and (min-width: 1280px) {

  }

  // .mobile-app__close
  &__close {

    width: extClamp(18);
    height: extClamp(18);
    color: var(---Main-Purple, #993ca6);
  }

  // .mobile-app__text
  &__text {
    font-size: extClamp(14px);
    font-weight: 600;
    line-height: 100%;
    display: flex;
    align-items: center;

    color: var(---Main-Purple, #993ca6);
    gap: extClamp(8);
  }

  // .mobile-app__icon
  &__icon {
    flex-shrink: 0;
    width: extClamp(30);
    height: extClamp(30);
    color: #993ca6;
  }

  // .mobile-app__download
  &__download {
    font-size: extClamp(10);
    font-weight: 500;
    font-style: normal;
    line-height: 100%;
    display: flex;
    align-items: center;
    align-self: stretch;
    justify-content: center;
    padding: extClamp(8) extClamp(12);
    text-align: center;
    color: var(---Main-White, #fff);
    border-radius: extClamp(6);
    background: var(---Main-Purple, #993ca6);

    gap: extClamp(10);
  }
}
</style>
