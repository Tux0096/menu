import { pushToRestaurant } from './push.js';
import { uuidOrNull } from '../lib/uuid.js';
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
  // Push: стол закреплён за официантом — ему; «долго ждут» и ошибки iiko — всем (подстраховка). Не задерживая запрос
  let staffId = null;
  if (sessionId && !BROADCAST.has(type)) {
    staffId = (await pool.query('SELECT waiter_id FROM table_sessions WHERE id = $1', [sessionId]).catch(() => ({ rows: [] }))).rows[0]?.waiter_id || null;
  }
  pushToRestaurant(restaurantId, { title, body, type, sessionId, tableNumber, staffId }).catch((e) => console.warn('push:', e.message));
  return rows[0];
}

const BROADCAST = new Set(['wait_too_long', 'iiko_error']);

/**
 * Лента официанта: is_read — прочитано им самим или закрыто для всех (стол взят в работу, оплачен, закрыт).
 */
export async function listWaiterNotifications(restaurantId, { unreadOnly = false, limit = 50, staffId = null } = {}) {
  const { rows } = await pool.query(
    `SELECT n.*, (n.is_read OR r.staff_id IS NOT NULL) AS is_read
     FROM waiter_notifications n
     LEFT JOIN waiter_notification_reads r ON r.notification_id = n.id AND r.staff_id = $3
     WHERE n.restaurant_id = $1
       ${unreadOnly ? 'AND n.is_read = FALSE AND r.staff_id IS NULL' : ''}
     ORDER BY n.created_at DESC
     LIMIT $2`,
    [restaurantId, limit, staffId],
  );
  return rows;
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
