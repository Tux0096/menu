export default function ({ store, redirect }) {
  if (!store.getters['user/isAuth']) {
    redirect('/');
    if (process.client) {
      setTimeout(() => store.commit('modal/showAuthModal'));
    }
  }
}
