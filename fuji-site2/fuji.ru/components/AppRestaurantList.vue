<template>
  <div class="restaurant-list">
    <div class="restaurant-list__title">
      Адреса ресторанов:
    </div>
    <div class="restaurant-list__inner">
      <BaseAddressItem
        v-for="rest in filteredRestaurants"
        :key="rest.deliveryTerminalId"
        :is-active="selectedRestaurantId === rest.deliveryTerminalId"
        class="restaurant-list__item"
        start-icon-name="self-item-icon"
        @click="selectRest(rest)"
      >
        {{ rest.address }}
      </BaseAddressItem>
    </div>
  </div>
</template>

<script>

export default {
  name: 'AppRestaurantList',
  data() {
    return {
      restaurants: this.$store.getters['setting/RESTAURANT_LIST'],
    };
  },
  computed: {
    filteredRestaurants() {
      return this.restaurants.filter((rest) => rest.isRestHide !== true);
    },
    selectedRestaurantId() {
      return this.$store.state.cart.selectedRestaurant?.deliveryTerminalId;
    },
  },
  created() {
    this.$store.commit('cart/setSelectedRestaurant', null);
  },
  methods: {
    selectRest(rest) {
      this.$store.dispatch('cart/setSelectedRestaurant', rest);
      this.$store.commit('modal/hideModal');
    },
  },
};
</script>

<style lang="scss"
       scoped
>
.restaurant-list {

  // .restaurant-list__title
  &__title {
    font-size: extClamp(12);
    font-weight: 600;
    line-height: 120%;
    margin-bottom: extClamp(10);
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 16px;
      margin-bottom: 16px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      line-height: 120%;
      margin-bottom: 16px;
    }
  }

  // .restaurant-list__inner
  &__inner {
    display: flex;
    overflow: auto;
    flex-direction: column;
    height: extClamp(223);
    margin-right: extClampNegative(12);
    margin-left: extClampNegative(12);
    padding-right: extClamp(12);
    padding-bottom: extClamp(30);
    padding-left: extClamp(12);
    gap: extClamp(8);

    @media screen and (min-width: 768px) {
      padding-bottom: 0;
      gap: 10px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .restaurant-list__item
  &__item {
  }
}

</style>
