/** UUID из запроса или null: сравнение по uuid идёт по индексу, а `id::text = $1` читает всю таблицу. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const uuidOrNull = (v) => (UUID_RE.test(String(v ?? '')) ? String(v) : null);
