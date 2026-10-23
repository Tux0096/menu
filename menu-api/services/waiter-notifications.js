import { pushToRestaurant } from './push.js';
import { uuidOrNull } from '../lib/uuid.js';
import { finishPage, parsePage } from '../lib/paging.js';
import pool from '../db/pool.js';
import { NOTIFY_TYPES } from '../lib/table-workflow-config.js';
import { FEED_FOR_ALL_TYPES, pushAudience, SEES_ALL_ROLES } from '../lib/notification-rules.js';
import { mergeLines, readyText, reorderText } from '../lib/notification-text.js';

/** Подряд идущие одинаковые события стола склеиваем в одно, если прошлое ещё не прочитано и свежее */
const MERGE_WINDOW_SEC = 90;
const MERGE_TEXT = { [NOTIFY_TYPES.DISH_READY]: readyText, [NOTIFY_TYPES.REORDER_INTENT]: reorderText };

/**
 * Уведомление в ленту + push.
 *   mergeLines — payload.lines [{name, qty}] склеивается с прошлым таким же уведомлением стола («Готово: А ×1, Б ×2»);
 *   pushStaffIds — свои получатели push (массив; null — всем), иначе по правилам: официант стола → ему, нет → всем;
 *   push: false — только в ленту.
 */
export async function createWaiterNotification({
  restaurantId,
  sessionId,
  tableNumber,
  type,
  title,
  body,
  payload = {},
  mergeLines: doMerge = false,
  pushStaffIds,
  push = true,
}) {
  let row = null;
  if (doMerge && sessionId && Array.isArray(payload.lines) && MERGE_TEXT[type]) {
    const { rows: prev } = await pool.query(
      `SELECT id, payload FROM waiter_notifications
       WHERE session_id = $1 AND type = $2 AND is_read = FALSE AND created_at > NOW() - ($3 || ' seconds')::interval
       ORDER BY created_at DESC LIMIT 1`,
      [uuidOrNull(sessionId), type, String(MERGE_WINDOW_SEC)],
    );
    if (prev[0]) {
      const lines = mergeLines(prev[0].payload?.lines, payload.lines);
      const text = MERGE_TEXT[type]({ table: tableNumber, lines });
      const merged = { ...payload, lines, itemIds: [...(prev[0].payload?.itemIds || []), ...(payload.itemIds || [])] };
      const { rows } = await pool.query(
        // Склеенное снова «новое» для всех, кто успел его прочитать, и поднимается наверх ленты
        `WITH u AS (DELETE FROM waiter_notification_reads WHERE notification_id = $1)
         UPDATE waiter_notifications SET title = $2, body = $3, payload = $4, created_at = NOW() WHERE id = $1 RETURNING *`,
        [prev[0].id, text.title, text.body, JSON.stringify(merged)],
      );
      row = rows[0];
      // Push — только про то, что добавилось сейчас
      title = text.title; body = readyOrReorderBody(type, tableNumber, payload.lines);
    }
  }
  if (!row) {
    const { rows } = await pool.query(
      `INSERT INTO waiter_notifications
         (restaurant_id, session_id, table_number, type, title, body, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurantId, sessionId, String(tableNumber), type, title, body, JSON.stringify(payload)],
    );
    row = rows[0];
  }
  if (push) {
    // Push: у визита есть официант — только ему (тревоги — всем), стол «общий» — всем телефонам точки. Не задерживая запрос
    (async () => {
      let staffIds = pushStaffIds;
      if (staffIds === undefined) {
        const { rows } = sessionId
          ? await pool.query('SELECT waiter_id FROM table_sessions WHERE id = $1', [uuidOrNull(sessionId)])
          : { rows: [] };
        staffIds = pushAudience({ type, waiterId: rows[0]?.waiter_id });
      }
      await pushToRestaurant(restaurantId, { title, body, type, sessionId, tableNumber, staffIds });
    })().catch((e) => console.warn('push:', e.message));
  }
  return row;
}

function readyOrReorderBody(type, table, lines) {
  return MERGE_TEXT[type]({ table, lines }).body;
}

/**
 * Лента официанта. Свои столы, столы без официанта и общие тревоги; чужие столы не показываем.
 * Управляющий и администратор видят всё.
 * is_read — прочитано им самим или закрыто для всех (стол взят в работу, оплачен, закрыт).
 */
export async function listWaiterNotifications(restaurantId, { unreadOnly = false, limit = 50, staff = null, query = {} } = {}) {
  const staffId = staff?.id || null;
  const seesAll = !staff || SEES_ALL_ROLES.has(staff.role);
  // Без limit/before — прежний ответ (массив, 50 свежих); с ними — { items, hasMore, nextCursor }
  const page = parsePage(query, { def: limit, max: 100 });
  const { cursor } = page;
  const params = [restaurantId, page.limit + 1, staffId, cursor?.at ?? null, cursor ? String(cursor.id) : null];
  if (!seesAll) params.push([...FEED_FOR_ALL_TYPES]);
  const { rows } = await pool.query(
    `SELECT n.*, n.created_at::text AS cursor_at, (n.is_read OR r.staff_id IS NOT NULL) AS is_read,
            s.waiter_id AS table_waiter_id, w.name AS table_waiter_name
     FROM waiter_notifications n
     LEFT JOIN waiter_notification_reads r ON r.notification_id = n.id AND r.staff_id = $3
     LEFT JOIN table_sessions s ON s.id = n.session_id
     LEFT JOIN staff_users w ON w.id = s.waiter_id
     WHERE n.restaurant_id = $1
       AND ($4::timestamptz IS NULL OR (n.created_at, n.id::text) < ($4::timestamptz, $5::text))
       ${unreadOnly ? 'AND n.is_read = FALSE AND r.staff_id IS NULL' : ''}
       ${seesAll ? '' : 'AND (n.type = ANY($6::text[]) OR s.waiter_id IS NULL OR s.waiter_id = $3)'}
     ORDER BY n.created_at DESC, n.id::text DESC
     LIMIT $2`,
    params,
  );
  return finishPage(rows, page);
}

/** Отметить уведомление прочитанным — у себя, только уведомление своего ресторана */
export async function markNotificationRead(notificationId, restaurantId, staffId) {
  await pool.query(
    `INSERT INTO waiter_notification_reads (notification_id, staff_id)
     SELECT id, $3 FROM waiter_notifications WHERE id = $1 AND restaurant_id = $2
     ON CONFLICT DO NOTHING`,
    [uuidOrNull(notificationId), restaurantId, staffId],
  );
}

export async function markAllNotificationsRead(restaurantId, staffId) {
  await pool.query(
    `INSERT INTO waiter_notification_reads (notification_id, staff_id)
     SELECT id, $2 FROM waiter_notifications
     WHERE restaurant_id = $1 AND is_read = FALSE AND created_at > NOW() - INTERVAL '2 days'
     ON CONFLICT DO NOTHING`,
    [restaurantId, staffId],
  );
}
