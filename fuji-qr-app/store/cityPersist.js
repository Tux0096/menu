export const state = () => ({
  iikoId: null,
  slug: null,
});

export const mutations = {
  setCityIikoId(state, id) {
    state.iikoId = id;
  },
  setCitySlug(state, id) {
    state.slug = id;
  },

};
