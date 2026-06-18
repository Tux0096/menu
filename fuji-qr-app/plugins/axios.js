export default function ajaxErrorHandler({ $axios, store, $cookies }) {
  $axios.onRequest((config) => {
    if (store?.state?.auth?.token) {
      config.headers.common.Authorization = `Bearer ${store.state.auth.token}`;
    }

    if (store?.state?.cityPersist?.slug) {
      config.headers.common['x-city'] = store.state.cityPersist.slug;
    }

    const zoneId = store?.getters['address/selectedAddress']?.zoneId;
    if (zoneId) {
      config.headers.common['x-zone-id'] = store?.getters['address/selectedAddress']?.zoneId;
    }

    const terminalId = store?.state?.cart?.selectedRestaurant?.deliveryTerminalId;
    if (terminalId) {
      config.headers.common['x-terminal-id'] = terminalId;
    }

    return config;
  });

  $axios.onResponse((response) => {
    // console.log('onResponse');
    // console.log(`[${response.status}] ${response.request.path}`);
  });

  $axios.onError((err) => {
    console.log(
      `[${err?.response && err?.response.status}] ${err?.response
      && err?.response?.request?.path}`,
    );
    console.log(err?.response && err?.response?.data);
    return Promise.reject(err);
  });

  $axios.onResponseError(async (err) => {
    // если сервак ответил 401, но фронте юзер авторизован,
    // значит токен протух разлогиним юзера
    if (err?.response && err?.response?.status === 401
      && store.getters['user/isAuth']) {
      await store.dispatch('user/logoutUser');
      $nuxt.$notify({
        group: 'messages',
        type: 'error',
        text: 'Ваша сессия авторизации истекла. Пожалуйста, перелогиньтесь для продолжения работы.',
      });
    }

    if (err?.response && err?.response?.status === 422) {
      const serverMessage = err?.response && err?.response?.data
        && err?.response?.data?.message;
      const messageToShow = serverMessage || 'Произошла ошибка при запросе';
      $nuxt.$notify({
        group: 'messages',
        type: 'error',
        text: messageToShow,
      });
    }
    if (err?.response && err?.response?.status === 403) {
      const serverMessage = err?.response && err?.response.data
        && err?.response?.data?.message;
      const messageToShow = serverMessage || 'Произошла ошибка при запросе';
      $nuxt.$notify({
        group: 'messages',
        type: 'error',
        text: messageToShow,
      });
    }

    return Promise.reject(err);
  });
}
