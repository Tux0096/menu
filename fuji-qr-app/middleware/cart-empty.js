export default function ({ store, redirect }) {
  if (process.client) {
    if (store.getters['cart/cartItems'].length === 0) {
      redirect('/');
      store.commit('modal/showCatalogModal');
    }
  }
}
