/** Самовывоз по ссылке: ?city=<slug|iikoId>&terminal=<uuid> — алиасы: c, t, terminalId */

import { nuxtInstance } from '~/plugins/nuxt-instance';

const SESSION_PENDING_PICKUP = 'fuji_pending_pickup_after_city';

function normalizeQueryPart(value) {
  if (value == null || Array.isArray(value)) {
    return '';
  }
  return String(value).trim();
}

function stripPickupParamsFromRoute(ctx) {
  if (!process.client || !ctx?.app?.router || !ctx?.route) {
    return;
  }
  const { query, path } = ctx.route;
  const next = { ...query };
  delete next.city;
  delete next.c;
  delete next.terminal;
  delete next.terminalId;
  delete next.t;
  const hasLeft = Object.keys(next).length > 0;
  ctx.app.router.replace({ path, query: hasLeft ? next : {} });
}

export const actions = {
  async tryApplyFromQuery({ dispatch, commit, rootGetters }, ctx) {
    const query = ctx?.route?.query || {};
    const terminalId = normalizeQueryPart(query.terminal ?? query.terminalId ?? query.t);
    const cityRaw = normalizeQueryPart(query.city ?? query.c);

    if (!terminalId || !cityRaw) {
      return { applied: false };
    }

    const cityKey = cityRaw.toLowerCase();
    const cities = rootGetters['city/cities'] || [];
    const city = cities.find(
      (x) => x.slug?.toLowerCase() === cityKey || String(x.iikoId).toLowerCase() === cityKey,
    );

    if (!city) {
      await dispatch('failPickupDeepLink', 'Город не найден. Выберите город и заведение.');
      return { applied: false, error: 'city' };
    }

    await dispatch('city/setCity', city.iikoId, { root: true });

    const restaurants = rootGetters['setting/RESTAURANT_LIST'] || [];
    const restaurant = restaurants.find(
      (r) => !r.isRestHide
        && (r.deliveryTerminalId === terminalId || r.terminalId === terminalId),
    );

    if (!restaurant) {
      await dispatch(
        'failPickupDeepLink',
        'Заведение не найдено для этого города. Выберите город и точку самовывоза.',
      );
      return { applied: false, error: 'terminal' };
    }

    commit('cart/setSelectedRestaurant', restaurant, { root: true });
    commit('user/setIsAlreadySelectedCity', true, { root: true });

    stripPickupParamsFromRoute(ctx);

    return { applied: true };
  },

  failPickupDeepLink({ commit }, message) {
    if (process.client) {
      try {
        sessionStorage.setItem(SESSION_PENDING_PICKUP, '1');
      } catch (e) {
        /* ignore */
      }
    }
    commit('cart/setSelectedRestaurant', null, { root: true });
    commit('user/setIsAlreadySelectedCity', false, { root: true });
    const notify = nuxtInstance?.$notify;
    if (message && typeof notify === 'function') {
      notify({
        group: 'messages',
        type: 'error',
        text: message,
      });
    }
    /* Модалку города откроет city/initCitySelection (isAlreadySelectedCity = false) */
  },

  consumePendingPickupModal({ dispatch, rootState }) {
    if (!process.client) {
      return;
    }
    if (!rootState.user.isAlreadySelectedCity) {
      return;
    }
    try {
      if (sessionStorage.getItem(SESSION_PENDING_PICKUP)) {
        sessionStorage.removeItem(SESSION_PENDING_PICKUP);
        dispatch('modal/showDeliveryModal', null, { root: true });
      }
    } catch (e) {
      /* ignore */
    }
  },
};
