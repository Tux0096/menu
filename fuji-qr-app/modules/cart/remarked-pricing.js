/**
 * Расчёт суммы строки заказа из ответа Remarked Loyalty (order.items[]).
 */
export function computeRemarkedLineTotal(remarkedItem) {
  const count = Number(remarkedItem?.count ?? 0);
  const price = Number(remarkedItem?.price ?? 0);
  const base = price * count;
  const disc = Array.isArray(remarkedItem?.discounts)
    ? remarkedItem.discounts.reduce((s, d) => s + Number(d?.sum ?? 0), 0)
    : 0;
  return Math.max(0, Math.round((base - disc) * 100) / 100);
}

/**
 * Позиции из ответа order/update + данные каталога по product_guid === product.id.
 */
export function enrichRemarkedItemsWithCatalog(orderItems, productById) {
  if (!Array.isArray(orderItems)) {
    return [];
  }
  return orderItems.map((ri) => {
    const guid = ri?.product_guid;
    const product = guid ? productById(guid) : null;
    return {
      ...ri,
      product,
      catalogName: product?.name ?? null,
      catalogImage: product?.image ?? null,
      lineTotal: computeRemarkedLineTotal(ri),
    };
  });
}

/**
 * Для каждой строки корзины — сумма из Remarked по совпадению product_guid (последовательное сопоставление одинаковых id).
 */
export function alignRemarkedLineTotalsToCart(cartItems, remarkedOrderItems) {
  const pool = Array.isArray(remarkedOrderItems)
    ? remarkedOrderItems
      .filter((i) => i?.product_guid)
      .map((r) => ({ ...r, used: false }))
    : [];

  return cartItems.map((c) => {
    if (!c?.product?.id) {
      return null;
    }
    const id = String(c.product.id);
    const found = pool.find((r) => !r.used && String(r.product_guid) === id);
    if (!found) {
      return null;
    }
    found.used = true;
    return computeRemarkedLineTotal(found);
  });
}
