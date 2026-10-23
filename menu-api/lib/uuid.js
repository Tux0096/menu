/** UUID из запроса или null: сравнение по uuid идёт по индексу, а `id::text = $1` читает всю таблицу. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const uuidOrNull = (v) => (UUID_RE.test(String(v ?? '')) ? String(v) : null);

/**
 * Условие «заказ iiko с таким ID есть у визита» — по индексам: iiko_order_id сравнивается как uuid,
 * дополнительные заказы (iiko_orders) — по GIN-индексу idx_table_sessions_iiko_orders_gin.
 * param — номер параметра запроса ($1), в него кладётся нормализованный ID (uuidOrNull). Колонка — table_sessions.
 */
export const sessionHasIikoOrderSql = (param) =>
  `(iiko_order_id = ${param}::uuid OR jsonb_path_query_array(iiko_orders, '$.*.orderId') @> jsonb_build_array(${param}::text))`;
