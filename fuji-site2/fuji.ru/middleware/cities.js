export default function ({ store, $config, route }) {
  if (route.fullPath.includes('admin') || route.fullPath.startsWith('/menu')) {
    $config._app.basePath = '/';
    return;
  }

  const city = store.getters['city/city'];
  if (city?.slug?.length) {
    $config._app.basePath = `/${city.slug}/`;
  } else {
    $config._app.basePath = '/';
  }
}
