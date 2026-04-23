<template>
  <div
    class="city-btn"
    @click="showCityModal"
  >
    <div class="city-btn__icon-wrapper">
      <svg class="city-btn__icon">
        <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#address" />
      </svg>
    </div>
    <div class="city-btn__name">
      {{ $store.getters['city/cityName'] || 'Выберите город' }}
    </div>
    <div class="city-btn__edit-wrapper">
      <svg class="city-btn__edit">
        <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#rounded-edit" />
      </svg>
    </div>
  </div>
</template>

<script>

export default {
  methods: {
    showCityModal() {
      this.$store.commit('modal/showCityModal');
    },
  },
};
</script>

<style lang="scss"
       scoped
>

.city-btn {
  display: flex;
  align-items: center;
  gap: extClamp(10);

  @media screen and (min-width: 768px) {
    gap: 8px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .city-btn__edit-wrapper
  &__edit-wrapper {
    margin-left: auto;
  }

  // .city-btn__edit
  &__edit {
    width: extClamp(24);
    height: extClamp(24);
    color: #993ca6;

    @media screen and (min-width: 768px) {
      width: 32px;
      height: 32px;
    }

    @media screen and (min-width: 1280px) {
      width: 24px;
      height: 24px;
    }
  }

  // .city-btn__icon-wrapper
  &__icon-wrapper {
  }

  // .city-btn__icon
  &__icon {
    width: extClamp(24);
    height: extClamp(24);
    color: #993ca6;

    @media screen and (min-width: 768px) {
      width: 24px;
      height: 24px;
    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .city-btn__name
  &__name {
    font-size: extClamp(12);
    font-weight: 400;
    line-height: normal;

    @media screen and (min-width: 768px) {
      font-size: 16px;
      font-weight: 600;

    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;

      font-weight: 600;
      line-height: normal;
    }

  }

}
</style>
