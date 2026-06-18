import { SafeArea } from 'capacitor-plugin-safe-area';

export default async ({ app }, inject) => {
  // этот плагин для андройда когда убраны статус бар и навигация снизу
  // если она не убрана то плагин добавляет не нужные отступы
  // в ios и так норм
  return;
  SafeArea.getSafeAreaInsets().then(({ insets }) => {
    Object.entries(insets).forEach(([key, value]) => {
      document.documentElement.style.setProperty(
        `--safe-area-inset-${key}`,
        `${value}px`,
      );

      if (key === 'bottom' && value > 0) {
        app.store.commit('view/setHasLayoutShadowBottom', true);
      }
    });
  });

  SafeArea.getStatusBarHeight().then(({ statusBarHeight }) => {
    // console.log(statusBarHeight, 'statusbarHeight');
  });

  // when safe-area changed
  const eventListener = await SafeArea.addListener('safeAreaChanged', (data) => {
    const { insets } = data;
    for (const [key, value] of Object.entries(insets)) {
      document.documentElement.style.setProperty(
        `--safe-area-inset-${key}`,
        `${value}px`,
      );
    }
  });
  await eventListener.remove();
};
