import pool from '../db/pool.js';
import { hashPassword, signToken, verifyPassword, verifyToken } from '../lib/passwords.js';

// Маркетинг — не ступень иерархии: доступ только к контенту меню (баннеры, подсказки, карточки блюд)
const ROLE_LEVEL = { marketing: 0, waiter: 1, manager: 2, admin: 3 };
const ROLES = new Set(Object.keys(ROLE_LEVEL));

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
    hasPin: Boolean(row.pin_hash),
  };
}

function issueToken(staff) {
  return signToken({ sid: staff.id, role: staff.role, name: staff.name, rid: staff.restaurantId });
}

// Защита PIN от перебора: не больше 5 неудачных попыток в минуту с одного адреса
const pinFails = new Map();
function pinThrottle(key) {
  const now = Date.now();
  const list = (pinFails.get(key) || []).filter((t) => now - t < 60000);
  pinFails.set(key, list);
  if (list.length >= 5) throw httpError(429, 'Слишком много попыток — подождите минуту');
  return () => { list.push(now); pinFails.set(key, list); };
}

/** Вход по PIN (приложение официанта): сотрудники ресторана и сотрудники «на все рестораны». */
export async function pinLogin(restaurantId, pin, clientKey = '') {
  const code = String(pin || '').trim();
  if (!/^\d{4,6}$/.test(code)) throw httpError(400, 'PIN — 4–6 цифр');
  const fail = pinThrottle(`${clientKey}|${restaurantId}`);
  const { rows } = await pool.query(
    `SELECT * FROM staff_users WHERE is_active = TRUE AND pin_hash IS NOT NULL
       AND (restaurant_id = $1 OR restaurant_id IS NULL)`,
    [restaurantId],
  );
  const user = rows.find((u) => verifyPassword(code, u.pin_hash));
  if (!user) { fail(); throw httpError(401, 'Неверный PIN'); }
  const staff = { ...mapStaff(user), restaurantId: user.restaurant_id || restaurantId };
  await audit(staff, 'login.pin', 'staff', staff.id);
  return { token: issueToken(staff), staff };
}

async function assertPinFree(pin, restaurantId, exceptId) {
  const { rows } = await pool.query(
    `SELECT id, pin_hash FROM staff_users WHERE pin_hash IS NOT NULL AND id IS DISTINCT FROM $1
       AND (restaurant_id IS NOT DISTINCT FROM $2 OR restaurant_id IS NULL OR $2::uuid IS NULL)`,
    [exceptId || null, restaurantId || null],
  );
  if (rows.some((r) => verifyPassword(pin, r.pin_hash))) throw httpError(409, 'Такой PIN уже есть у другого сотрудника — выберите другой');
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
  const token = issueToken(staff);
  await audit(staff, 'login', 'staff', staff.id);
  return { token, staff };
}

/** Express middleware: проверка токена персонала и минимальной роли. */
export function staffAuth(minRole = 'waiter', alsoRoles = []) {
  return (req, res, next) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : req.query.token;
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Требуется вход персонала', code: 'STAFF_AUTH_REQUIRED' });
    if (!ROLES.has(payload.role) || ((ROLE_LEVEL[payload.role] ?? -1) < ROLE_LEVEL[minRole] && !alsoRoles.includes(payload.role))) {
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
  if (!login || !data.name || !ROLES.has(data.role)) throw httpError(400, 'Логин, имя и роль обязательны');
  const pin = String(data.pin || '').trim();
  if (pin && !/^\d{4,6}$/.test(pin)) throw httpError(400, 'PIN — 4–6 цифр');
  if (pin) await assertPinFree(pin, data.restaurantId, data.id);
  const pinHash = pin ? hashPassword(pin) : null;
  if (data.id) {
    const { rows } = await pool.query(
      `UPDATE staff_users SET login = $2, name = $3, role = $4, restaurant_id = $5, is_active = $6,
         password_hash = COALESCE($7, password_hash),
         pin_hash = CASE WHEN $9 THEN NULL ELSE COALESCE($8, pin_hash) END
       WHERE id = $1 RETURNING *`,
      [data.id, login, data.name, data.role, data.restaurantId || null, data.isActive !== false,
        data.password ? hashPassword(data.password) : null, pinHash, data.clearPin === true],
    );
    if (!rows[0]) throw httpError(404, 'Сотрудник не найден');
    return mapStaff(rows[0]);
  }
  if (!data.password) throw httpError(400, 'Задайте пароль');
  const { rows } = await pool.query(
    `INSERT INTO staff_users (login, name, role, restaurant_id, password_hash, pin_hash)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [login, data.name, data.role, data.restaurantId || null, hashPassword(data.password), pinHash],
  );
  return mapStaff(rows[0]);
}
