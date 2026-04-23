export const state = () => ({
  currentRestaurant: null,
});

export const mutations = {
  setCurrentRestaurant(state, restaurant) {
    state.currentRestaurant = restaurant;
  },
};

export const getters = {
  currentRestaurant: (state) => state.currentRestaurant,
};
