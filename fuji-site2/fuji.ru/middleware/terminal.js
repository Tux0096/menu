export default function ({ store, route, redirect }) {
  const { terminalId } = route.query;

  if (terminalId) {
    store.commit('terminal/setKioskMode', true);
    store.commit('terminal/setTerminalId', terminalId);

    const path = route.path;
    if (!path.includes('/terminal')) {
      const citySlug = store.getters['city/city']?.slug;
      const terminalPath = citySlug ? `/${citySlug}/terminal` : '/terminal';
      const newQuery = { ...route.query };
      delete newQuery.terminalId;
      return redirect({ path: terminalPath, query: newQuery });
    }
  }

  if (route.path.includes('/terminal')) {
    const storedTerminalId = store.getters['terminal/terminalId'];
    if (storedTerminalId) {
      store.commit('terminal/setKioskMode', true);
    }
  }
}
