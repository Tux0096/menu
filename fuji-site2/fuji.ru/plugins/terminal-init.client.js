export default ({ store }) => {
  if (process.client) {
    store.dispatch('terminal/initTerminalId');
  }
};
