import { nuxtInstance } from '~/plugins/nuxt-instance';

/** UUID v4 без node:crypto (клиентский бандл). */
export const createRemarkedCartGuid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const toPlain = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export interface RemarkedOrderUpdatePayload {
  order: {
    guid: string;
    total: number;
    basket: unknown[];
    /** LoyaltyAPI v2: `order.promocodes` — массив строк (коды промокодов). */
    promocodes: string[];
  };
}

export interface RemarkedTransactionOrderPayload {
  total: number;
  basket: unknown[];
  promocodes: string[];
}

export interface RemarkedTransactionMakeOrUpdatePayload {
  transaction_id: number;
  withdraw_bonuses?: number;
  order: RemarkedTransactionOrderPayload;
}

export interface RemarkedTransactionConfirmPayload {
  transaction_id: number;
}

export const buildRemarkedOrderUpdatePayload = (params: {
  basket: unknown[];
  coupon: string;
  remarkedCartOrderGuid: string;
  cartTotal: number;
}): RemarkedOrderUpdatePayload => {
  const trimmed = params.coupon?.trim();
  const basketWithoutGifts = params.basket.filter((item: any) => !item.isGift);
  return {
    order: {
      guid: params.remarkedCartOrderGuid,
      total: params.cartTotal,
      basket: toPlain(basketWithoutGifts),
      promocodes: trimmed ? [trimmed] : [],
    },
  };
};

export const buildRemarkedTransactionMakeOrUpdatePayload = (params: {
  transactionId: number;
  basket: unknown[];
  coupon: string;
  cartTotal: number;
  withdrawBonuses?: number;
}): RemarkedTransactionMakeOrUpdatePayload => {
  const trimmed = params.coupon?.trim();
  const basketWithoutGifts = params.basket.filter((item: any) => !item.isGift);
  const body: RemarkedTransactionMakeOrUpdatePayload = {
    transaction_id: params.transactionId,
    order: {
      total: params.cartTotal,
      basket: toPlain(basketWithoutGifts),
      promocodes: trimmed ? [trimmed] : [],
    },
  };
  if (params.withdrawBonuses && params.withdrawBonuses > 0) {
    body.withdraw_bonuses = params.withdrawBonuses;
  }
  return body;
};

/**
 * POST /api/v1/remarked-loyalty/order/update (бэк проксирует в Remarked Loyalty).
 * JWT подставляет plugins/axios.js.
 */
export const postRemarkedOrderUpdate = (body: RemarkedOrderUpdatePayload) => {
  const base = nuxtInstance.$config.FRONT_API_URL;
  return nuxtInstance.$axios.$post(
    `${base}/api/v1/remarked-loyalty/order/update`,
    body,
  );
};

export const postRemarkedTransactionMakeOrUpdate = (
  body: RemarkedTransactionMakeOrUpdatePayload,
) => {
  const base = nuxtInstance.$config.FRONT_API_URL;
  return nuxtInstance.$axios.$post(
    `${base}/api/v1/remarked-loyalty/transaction/makeorupdate`,
    body,
  );
};

export const postRemarkedTransactionConfirm = (
  body: RemarkedTransactionConfirmPayload,
) => {
  const base = nuxtInstance.$config.FRONT_API_URL;
  return nuxtInstance.$axios.$post(
    `${base}/api/v1/remarked-loyalty/transaction/confirm`,
    body,
  );
};

export const isRemarkedLoyaltyFeatureEnabled = (): boolean =>
  nuxtInstance.$config.FEATURE_REMARKED_LOYALTY === true
  || nuxtInstance.$config.FEATURE_REMARKED_LOYALTY === 'true';
