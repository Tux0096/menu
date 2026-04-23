<template>
  <div class="city-selection">
    <div class="city-selection__inner">
      <CitySelectionItem
        v-for="city in cities"
        :key="city.iikoId"
        :city="city"
        :selected-city-iiko-id="selectedCityIikoId"
        class="city-selection__item"
        @select-city="selectCity"
      />
    </div>
    <div
      v-if="selectedCityIikoId"
      class="city-selection__footer"
    >
      <BaseButton
        class="city-selection__btn"
        type="fill"
        @click="setCity"
      >
        Продолжить
      </BaseButton>
    </div>
  </div>
</template>

<script>
import CitySelectionItem from './CitySelectionItem.vue';

export default {
  name: 'CitySelection',
  components: {
    CitySelectionItem,
  },
  data() {
    return {
      selectedCityIikoId: null,
    };
  },
  computed: {
    cities() {
      return this.$store.getters['city/cities'];
    },
  },
  created() {
    this.selectedCityIikoId = this.$store.getters['city/city']?.iikoId;
  },
  methods: {
    selectCity(iikoId) {
      this.selectedCityIikoId = iikoId;
    },
    async setCity() {
      if (!this.selectedCityIikoId) {
        this.$notify({
          group: 'messages',
          type: 'error',
          text: 'Выберите город',
        });
        return;
      }
      await this.$store.dispatch('city/setCity', this.selectedCityIikoId);
      this.$store.commit('user/setIsAlreadySelectedCity', true, { root: true });
      this.$store.commit('modal/hideModal', 'city');
      window.location.reload();
    },
  },
};
</script>

<style lang="scss"
       scoped
>
.city-selection {
  // .city-selection__inner
  &__inner {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: extClamp(16);
    grid-auto-rows: minmax(extClamp(103), auto);

    @media screen and (min-width: 768px) {
      gap: 16px;
      grid-auto-rows: minmax(138px, auto);
    }

    @media screen and (min-width: 1280px) {
      grid-auto-rows: minmax(140px, auto);
    }
  }

  // .city-selection__footer
  &__footer {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: extClamp(12);

    @media screen and (min-width: 768px) {
      margin-top: 16px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .city-selection__btn
  &__btn {
    width: 100%;
  }
}
</style>
