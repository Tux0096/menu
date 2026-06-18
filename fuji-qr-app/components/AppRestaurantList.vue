<template>
  <div class="restaurant-list">
    <div class="restaurant-list__inner">
      <BaseAddressItem
        v-for="rest in filteredRestaurants"
        :key="rest.deliveryTerminalId"
        :is-active="selectedRestaurantId === rest.deliveryTerminalId"
        class="restaurant-list__item"
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
  methods: {
    async selectRest(rest) {
      this.$store.commit('cart/setSelectedRestaurant', rest);
      this.$store.commit('modal/hideModal');
      await this.$store.dispatch('catalog/initCatalog', {}, { root: true });
      await this.$store.dispatch('cart/validateCart');
    },
  },
};
</script>

<style lang="scss"
       scoped
>
.restaurant-list {
  // .restaurant-list__inner
  &__inner {
    display: flex;
    flex-direction: column;
    gap: extClamp(12);

    @media screen and (min-width: 768px) {
      gap: 20px;
    }

    @media screen and (min-width: 1280px) {
      gap: 10px;
    }
  }

  // .restaurant-list__item
  &__item {
  }
}

</style>
