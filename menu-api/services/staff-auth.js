import pool from '../db/pool.js';
import { hashPassword, signToken, verifyPassword, verifyToken } from '../lib/passwords.js';

const ROLE_LEVEL = { waiter: 1, manager: 2, admin: 3 };

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function mapStaff(row) {
  return {
    id: row.id,
    login: row.login,
    name: row.name,
    role: row.role,
    restaurantId: row.restaurant_id,
    isActive: row.is_active,
  };
}

export async function staffLogin(login, password) {
  const { rows } = await pool.query(
    'SELECT * FROM staff_users WHERE login = $1 AND is_active = TRUE',
    [String(login || '').trim().toLowerCase()],
  );
  const user = rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) {
    throw httpError(401, 'Неверный логин или пароль');
  }
  const staff = mapStaff(user);
  const token = signToken({ sid: staff.id, role: staff.role, name: staff.name, rid: staff.restaurantId });
  await audit(staff, 'login', 'staff', staff.id);
  return { token, staff };
}

/** Express middleware: проверка токена персонала и минимальной роли. */
export function staffAuth(minRole = 'waiter') {
  return (req, res, next) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : req.query.token;
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Требуется вход персонала', code: 'STAFF_AUTH_REQUIRED' });
    if ((ROLE_LEVEL[payload.role] || 0) < ROLE_LEVEL[minRole]) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    req.staff = { id: payload.sid, role: payload.role, name: payload.name, restaurantId: payload.rid };
    return next();
  };
}

export async function audit(staff, action, entity = null, entityId = null, payload = {}) {
  try {
    await pool.query(
      `INSERT INTO audit_log (staff_id, staff_name, action, entity, entity_id, payload)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [staff?.id || null, staff?.name || null, action, entity, entityId ? String(entityId) : null, JSON.stringify(payload)],
    );
  } catch (e) {
    console.warn('audit:', e.message);
  }
}

export async function listStaff() {
  const { rows } = await pool.query('SELECT * FROM staff_users ORDER BY role, login');
  return rows.map(mapStaff);
}

export async function saveStaff(data) {
  const login = String(data.login || '').trim().toLowerCase();
  if (!login || !data.name || !ROLE_LEVEL[data.role]) throw httpError(400, 'Логин, имя и роль обязательны');
  if (data.id) {
    const { rows } = await pool.query(
      `UPDATE staff_users SET login = $2, name = $3, role = $4, restaurant_id = $5, is_active = $6,
         password_hash = COALESCE($7, password_hash)
       WHERE id = $1 RETURNING *`,
      [data.id, login, data.name, data.role, data.restaurantId || null, data.isActive !== false,
        data.password ? hashPassword(data.password) : null],
    );
    if (!rows[0]) throw httpError(404, 'Сотрудник не найден');
    return mapStaff(rows[0]);
  }
  if (!data.password) throw httpError(400, 'Задайте пароль');
  const { rows } = await pool.query(
    `INSERT INTO staff_users (login, name, role, restaurant_id, password_hash)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [login, data.name, data.role, data.restaurantId || null, hashPassword(data.password)],
  );
  return mapStaff(rows[0]);
}
