const errorMessage = (text) => {
  $nuxt.$notify({
    group: 'messages',
    type: 'error',
    text,
  });
};

export const state = () => ({
  notifications: [],
  FCMToken: null,
  lastCheckDateNotification: (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString();
  })(),
});

export const mutations = {
  setNotifications(state, notifications) {
    state.notifications = notifications;
  },
  setFCMToken(state, FCMToken) {
    state.FCMToken = FCMToken;
  },
  setLastCheckDateNotification(state, lastCheckDateNotification) {
    state.lastCheckDateNotification = lastCheckDateNotification;
  },
};
export const actions = {
  async fetchNotifications({ commit, rootGetters }) {
    try {
      if (!rootGetters['user/isAuth']) {
        commit('setNotifications', []);
        return;
      }

      const notifications = await this.$axios.$get(`${this.$config.FRONT_API_URL}/api/v1/notification/${rootGetters['user/id']}`);

      commit('setNotifications', notifications);
    } catch (e) {
      console.log(e);
    }
  },
};
export const getters = {
  notifications: ({ notifications }) => notifications,
  FCMToken: ({ FCMToken }) => FCMToken,
  hasNewNotifications: (state, getters) => getters.countNewNotifications > 0,
  countNewNotifications: ({ notifications, lastCheckDateNotification }) => {
    if (!lastCheckDateNotification) return 0;
    const lastCheckDate = new Date(lastCheckDateNotification);
    return notifications.items?.filter((notification) => new Date(notification.createdAt)
      > lastCheckDate).length;
  },
};
