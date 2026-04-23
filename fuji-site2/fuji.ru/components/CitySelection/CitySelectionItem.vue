<template>
  <div
    :class="{'city-selection-item--active': city.iikoId === selectedCityIikoId }"
    class="city-selection-item"
    @click="selectCity(city.iikoId)"
  >
    <div class="city-selection-item__letter">
      {{ city.name[0] }}
    </div>
    <div class="city-selection-item__title">
      {{ city.name }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'CitySelectionItem',
  props: {
    city: {
      type: Object,
      required: true,
    },
    selectedCityIikoId: {
      type: String,
      default: null,
    },
  },
  methods: {
    selectCity(iikoId) {
      this.$emit('select-city', iikoId);
    },
  },
};
</script>

<style lang="scss"
       scoped
>

.city-selection-item {
  position: relative;
  display: flex;
  overflow: hidden;
  padding: extClamp(10);
  cursor: pointer;
  color: #993ca6;
  border-radius: extClamp(20);
  background-color: #f5ecf6;

  @media screen and (min-width: 768px) {
    padding: 16px;
    border-radius: 20px;
  }

  @media screen and (min-width: 1280px) {
    padding: 16px;
    border-radius: 20px;
  }

  &:nth-child(odd) {
    min-height: extClamp(100);

    @media screen and (min-width: 768px) {
      min-height: 136px;
    }

    @media screen and (min-width: 1280px) {
      min-height: 136px;
    }
  }

  &:nth-child(even) {
    grid-row: span 2;
  }

  // .city-selection-item--active
  &--active {

  }

  &--active::after {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    display: block;
    content: '';
    border: 3px solid #993ca6;
    border-radius: extClamp(20);

    @media screen and (min-width: 768px) {
      border-radius: 20px;
    }

    @media screen and (min-width: 1280px) {
      border-width: 4px;
      border-radius: 20px;
    }

  }

  // .city-selection-item__letter
  &__letter {
    font-size: extClamp(160);
    font-weight: 700;
    font-style: normal;
    line-height: 1;
    position: absolute;
    text-align: center;
    opacity: 0.2;
    color: #993ca6;

    @media screen and (min-width: 768px) {
      font-size: 175px;
      line-height: 74%;
    }

    @media screen and (min-width: 1280px) {

    }

    &:nth-child(odd) {
      top: extClampNegative(30);
      right: auto;
      left: auto;

      @media screen and (min-width: 768px) {
        top: -21px;
        left: -12px;
      }

      @media screen and (min-width: 1280px) {
        top: -15px;
        left: -11px;
      }
    }

    &:nth-child(even) {
      top: extClampNegative(20);
      left: extClampNegative(2);

      @media screen and (min-width: 768px) {
        top: -20px;
        left: -2px;
      }

      @media screen and (min-width: 1280px) {

      }
    }

  }

  // .city-selection-item__title
  &__title {
    font-size: extClamp(12);
    font-weight: 600;
    line-height: 120%;
    margin-top: auto;
    color: var(---Main-Purple, #993ca6);

    @media screen and (min-width: 768px) {
      font-size: 16px;
      line-height: normal;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      font-weight: 600;
      line-height: normal;
    }
  }
}
</style>
