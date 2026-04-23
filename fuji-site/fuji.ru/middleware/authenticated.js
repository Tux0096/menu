export default function ({ store, redirect }) {
  if (process.client) {
    if (!store.state.auth.token) {
      return redirect('/admin');
    }
  }
}
