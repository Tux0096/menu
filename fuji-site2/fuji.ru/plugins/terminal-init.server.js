export default ({ store, req }) => {
  if (process.server && req) {
    const cookieStr = req.headers.cookie || '';

    const getFromCookie = (name) => {
      const match = cookieStr
        .split(';')
        .find((c) => c.trim().startsWith(`${name}=`));
      return match ? match.split('=')[1]?.trim() : null;
    };

    const terminalId = getFromCookie('terminalId');
    if (terminalId) {
      store.commit('terminal/setTerminalId', terminalId);
    }

    const isKioskMode = getFromCookie('isKioskMode');
    if (isKioskMode === '1') {
      store.commit('terminal/setKioskMode', true);
    }
  }
};
