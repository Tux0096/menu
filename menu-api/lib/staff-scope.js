/**
 * Доступ персонала к ресторанам и визитам: сотрудник, привязанный к ресторану, работает только в нём.
 */
import pool from '../db/pool.js';
import { httpError } from './http.js';
import { QR_RESTAURANT_SLUG } from './qr-config.js';
import { resolveRestaurant } from '../services/table-session.js';

export async function restaurantById(id) {
  const { rows } = await pool.query('SELECT * FROM restaurants WHERE id = $1', [id]);
  if (!rows[0]) throw httpError(404, 'Ресторан не найден');
  return rows[0];
}

/**
 * Ресторан запроса персонала. Сотрудник, привязанный к ресторану, работает только в нём:
 * ?restaurant= другого ресторана — 403. Сотрудник «на все рестораны» выбирает ресторан параметром.
 */
export async function staffRestaurant(req) {
  const own = req.staff?.restaurantId;
  if (own) {
    const r = await restaurantById(own);
    const asked = req.query.restaurant ? String(req.query.restaurant) : '';
    if (asked && asked !== r.slug && asked !== r.id) throw httpError(403, 'Нет доступа к этому ресторану');
    return r;
  }
  if (req.query.restaurant) return resolveRestaurant(req.query.restaurant);
  if (req.staff?.loginRestaurantId) return restaurantById(req.staff.loginRestaurantId);
  return resolveRestaurant(QR_RESTAURANT_SLUG);
}

/** Визит доступен сотруднику: привязанный к ресторану видит только визиты своего ресторана */
export async function assertStaffSession(req, sessionId) {
  const own = req.staff?.restaurantId;
  const { rows } = await pool.query('SELECT restaurant_id FROM table_sessions WHERE id::text = $1', [String(sessionId)]);
  if (!rows[0] || (own && rows[0].restaurant_id !== own)) throw httpError(404, 'Визит не найден');
}

