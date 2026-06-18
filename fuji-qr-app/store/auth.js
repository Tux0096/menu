const getDefaultState = () => ({
  token: null,
});

export const state = () => ({
  ...getDefaultState(),

});

export const mutations = {
  resetState(state) {
    Object.assign(state, getDefaultState());
  },

  setAuthToken(state, token) {
    state.token = token;
  },
};

export const actions = {};

export const getters = {
  token: ({ token }) => token,
};
