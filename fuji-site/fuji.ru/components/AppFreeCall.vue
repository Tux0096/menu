<template>
  <div class="free-call">
    <div class="free-call__inner">
      <a
        :href="'tel:' + phoneDeliveryService"
        class="free-call__phone"
      >
        {{ phoneDeliveryService }}
      </a>
      <div class="free-call__title">
        Звонок бесплатный
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AppFreeCall',
  computed: {
    phoneDeliveryService() {
      return this.$store.getters['setting/phoneDeliveryService'];
    },
  },
};
</script>

<style lang="scss"
       scoped
>
.free-call {

  // .free-call__inner
  &__inner {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    gap: extClamp(4);

    @media screen and (min-width: 768px) {
      gap: 8px;
    }

    @media screen and (min-width: 1280px) {
      gap: 4px;
    }
  }

  // .free-call__icon
  &__icon {
    width: extClamp(24);
    height: extClamp(24);
    color: #ff6523;
    grid-column: 1 / 2;
    grid-row: 1 / 3;

    @media screen and (min-width: 768px) {
      width: 40px;
      height: 40px;
      color: #993ca6;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .free-call__title
  &__title {
    font-size: extClamp(8);
    line-height: 120%;
    color: var(---Extra-DarkGreen, #21ac37);
    font-feature-settings: 'liga' off, 'clig' off;
    text-decoration-line: underline;

    @media screen and (min-width: 768px) {
      font-size: 16px;
      font-weight: 600;
      font-style: normal;
      line-height: 140%;

    }

    @media screen and (min-width: 1280px) {
      font-size: 12px;
      font-weight: 400;
      line-height: 120%;
    }

  }

  // .free-call__phone
  &__phone {
    font-size: extClamp(12);
    font-weight: 600;
    line-height: 120%;

    @media screen and (min-width: 768px) {
      font-size: 20px;
      line-height: 100%;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      line-height: 120%;
    }
  }
}
</style>
