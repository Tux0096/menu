import pool from '../db/pool.js';

export async function createWaiterNotification({
  restaurantId,
  sessionId,
  tableNumber,
  type,
  title,
  body,
  payload = {},
}) {
  const { rows } = await pool.query(
    `INSERT INTO waiter_notifications
       (restaurant_id, session_id, table_number, type, title, body, payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [restaurantId, sessionId, String(tableNumber), type, title, body, JSON.stringify(payload)],
  );
  return rows[0];
}

export async function listWaiterNotifications(restaurantId, { unreadOnly = false, limit = 50 } = {}) {
  const { rows } = await pool.query(
    `SELECT * FROM waiter_notifications
     WHERE restaurant_id = $1
       ${unreadOnly ? 'AND is_read = FALSE' : ''}
     ORDER BY created_at DESC
     LIMIT $2`,
    [restaurantId, limit],
  );
  return rows;
}

export async function markNotificationRead(notificationId) {
  await pool.query(
    `UPDATE waiter_notifications SET is_read = TRUE WHERE id = $1`,
    [notificationId],
  );
}

export async function markAllNotificationsRead(restaurantId) {
  await pool.query(
    `UPDATE waiter_notifications SET is_read = TRUE
     WHERE restaurant_id = $1 AND is_read = FALSE`,
    [restaurantId],
  );
}
