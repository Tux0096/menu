/** QR-режим: ?restaurant=<slug>&table=<номер> */

function normalizeQueryPart(value) {
  if (value == null || Array.isArray(value)) {
    return '';
  }
  return String(value).trim();
}

function stripTableParamsFromRoute(ctx) {
  if (!process.client || !ctx?.app?.router || !ctx?.route) {
    return;
  }
  const { query, path } = ctx.route;
  const next = { ...query };
  delete next.restaurant;
  delete next.r;
  delete next.table;
  delete next.tbl;
  delete next.tableNumber;
  const hasLeft = Object.keys(next).length > 0;
  ctx.app.router.replace({ path, query: hasLeft ? next : {} });
}

export const actions = {
  async tryApplyFromQuery({ dispatch, commit }, ctx) {
    const query = ctx?.route?.query || {};
    const restaurantSlug = normalizeQueryPart(
      query.restaurant ?? query.r ?? query.slug,
    );
    const tableNumber = normalizeQueryPart(
      query.table ?? query.tbl ?? query.tableNumber,
    );

    if (!restaurantSlug || !tableNumber) {
      return { applied: false };
    }

    commit('tableSession/setQrParams', { restaurantSlug, tableNumber }, { root: true });
    await dispatch('tableSession/enterTable', null, { root: true });

    stripTableParamsFromRoute(ctx);

    if (process.client && ctx.app.router && ctx.route.path !== '/welcome') {
      ctx.app.router.replace('/welcome');
    }

    return { applied: true };
  },
};
