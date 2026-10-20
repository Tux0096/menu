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
  // Push: официанту, который ведёт стол, и тем, кто выбрал этот стол в «Мои столы»; «долго ждут» и ошибки iiko — всем
  // (подстраховка). Никто не отвечает за стол — всем телефонам точки. Не задерживая запрос
  let staffIds = [];
  if (!BROADCAST.has(type)) staffIds = await tableRecipients(restaurantId, sessionId, tableNumber).catch(() => []);
  pushToRestaurant(restaurantId, { title, body, type, sessionId, tableNumber, staffIds }).catch((e) => console.warn('push:', e.message));
  return rows[0];
}

/** Кто отвечает за стол: официант визита и закрепившие стол за собой */
async function tableRecipients(restaurantId, sessionId, tableNumber) {
  const { rows } = await pool.query(
    `SELECT waiter_id AS id FROM table_sessions WHERE id = $1 AND waiter_id IS NOT NULL
     UNION SELECT staff_id FROM waiter_tables WHERE restaurant_id = $2 AND table_number = $3`,
    [uuidOrNull(sessionId), restaurantId, String(tableNumber ?? '')],
  );
  return rows.map((r) => String(r.id));
}

/** Столы, за которые отвечает официант в ресторане, и кто закрепил остальные (имена для подсказки) */
export async function getWaiterTables(restaurantId, staffId) {
  const { rows } = await pool.query(
    `SELECT t.table_number, t.staff_id, u.name FROM waiter_tables t LEFT JOIN staff_users u ON u.id = t.staff_id
     WHERE t.restaurant_id = $1`,
    [restaurantId],
  );
  const mine = rows.filter((r) => String(r.staff_id) === String(staffId)).map((r) => r.table_number);
  const others = {};
  for (const r of rows) {
    if (String(r.staff_id) === String(staffId)) continue;
    (others[r.table_number] ||= []).push(r.name || 'Официант');
  }
  return { tables: mine, others };
}

export async function setWaiterTables(restaurantId, staffId, tables, tablesCount) {
  const list = [...new Set((Array.isArray(tables) ? tables : []).map((t) => String(t).trim()).filter((t) => /^[0-9A-Za-zА-Яа-я-]{1,10}$/.test(t)))]
    .map((t) => (/^\d+$/.test(t) ? String(Number(t)) : t))
    .filter((t) => !tablesCount || !/^\d+$/.test(t) || (Number(t) >= 1 && Number(t) <= tablesCount))
    .slice(0, 200);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM waiter_tables WHERE restaurant_id = $1 AND staff_id = $2', [restaurantId, staffId]);
    if (list.length) {
      await client.query(
        `INSERT INTO waiter_tables (staff_id, restaurant_id, table_number) SELECT $1, $2, unnest($3::text[]) ON CONFLICT DO NOTHING`,
        [staffId, restaurantId, list],
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  return getWaiterTables(restaurantId, staffId);
}

// Брони — всем: визит брони без официанта, а о приходе гостей и о том, что бронь не пришла, должен знать весь зал
const BROADCAST = new Set(['wait_too_long', 'iiko_error', 'reservation', 'reservation_arrived', 'reservation_no_show', 'reservation_conflict']);

/**
 * Лента официанта. Выбрал «Мои столы» — только по ним, по столам, которые ведёт сам, по столам без ответственного
 * и общие тревоги; не выбрал — все столы точки.
 * is_read — прочитано им самим или закрыто для всех (стол взят в работу, оплачен, закрыт).
 */
export async function listWaiterNotifications(restaurantId, { unreadOnly = false, limit = 50, staffId = null } = {}) {
  const { rows } = await pool.query(
    `SELECT n.*, (n.is_read OR r.staff_id IS NOT NULL) AS is_read
     FROM waiter_notifications n
     LEFT JOIN waiter_notification_reads r ON r.notification_id = n.id AND r.staff_id = $3
     WHERE n.restaurant_id = $1
       ${unreadOnly ? 'AND n.is_read = FALSE AND r.staff_id IS NULL' : ''}
       ${staffId ? `AND (n.type = ANY($4::text[])
         OR NOT EXISTS (SELECT 1 FROM waiter_tables w WHERE w.restaurant_id = $1 AND w.staff_id = $3)
         OR EXISTS (SELECT 1 FROM waiter_tables w WHERE w.restaurant_id = $1 AND w.staff_id = $3 AND w.table_number = n.table_number)
         OR NOT EXISTS (SELECT 1 FROM waiter_tables w WHERE w.restaurant_id = $1 AND w.table_number = n.table_number)
         OR EXISTS (SELECT 1 FROM table_sessions s WHERE s.id = n.session_id AND s.waiter_id = $3))` : ''}
     ORDER BY n.created_at DESC
     LIMIT $2`,
    staffId ? [restaurantId, limit, staffId, [...BROADCAST]] : [restaurantId, limit, staffId],
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
