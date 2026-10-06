import pool from '../db/pool.js';
import { createLimiter, httpError, sendError } from '../lib/http.js';
import { hashPassword, signToken, verifyPassword, verifyToken } from '../lib/passwords.js';

// Маркетинг — не ступень иерархии: доступ только к контенту меню (баннеры, подсказки, карточки блюд)
const ROLE_LEVEL = { marketing: 0, waiter: 1, manager: 2, admin: 3 };
const ROLES = new Set(Object.keys(ROLE_LEVEL));

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

// Защита PIN от перебора: неудачные попытки считаются и с одного адреса, и по ресторану целиком
// (адрес можно менять, ресторан — нет): 5 в минуту с адреса, 20 за 10 минут на ресторан.
const pinByClient = createLimiter({ windowMs: 60_000, max: 5, message: 'Слишком много попыток — подождите минуту' });
const pinByRestaurant = createLimiter({
  windowMs: 10 * 60_000, max: 20, message: 'Слишком много неверных PIN в этом ресторане — вход по PIN приостановлен на 10 минут',
});
// Вход по паролю: 10 неудачных попыток за 15 минут на логин и 30 — с одного адреса
const loginByName = createLimiter({ windowMs: 15 * 60_000, max: 10, message: 'Слишком много попыток — подождите 15 минут' });
const loginByClient = createLimiter({ windowMs: 15 * 60_000, max: 30, message: 'Слишком много попыток — подождите 15 минут' });
// Хэш-«пустышка»: проверка пароля несуществующего логина занимает столько же времени
const DUMMY_HASH = hashPassword('not-a-real-password');

/** Вход по PIN (приложение официанта): сотрудники ресторана и сотрудники «на все рестораны». */
export async function pinLogin(restaurantId, pin, clientKey = '') {
  const code = String(pin || '').trim();
  if (!/^\d{4,6}$/.test(code)) throw httpError(400, 'PIN — 4–6 цифр');
  const clientId = `${clientKey}|${restaurantId}`;
  pinByClient.assert(clientId);
  pinByRestaurant.assert(String(restaurantId));
  const { rows } = await pool.query(
    `SELECT * FROM staff_users WHERE is_active = TRUE AND pin_hash IS NOT NULL
       AND (restaurant_id = $1 OR restaurant_id IS NULL)`,
    [restaurantId],
  );
  const user = rows.find((u) => verifyPassword(code, u.pin_hash));
  if (!user) {
    pinByClient.hit(clientId);
    pinByRestaurant.hit(String(restaurantId));
    throw httpError(401, 'Неверный PIN');
  }
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

export async function staffLogin(login, password, clientKey = '') {
  const name = String(login || '').trim().toLowerCase();
  loginByName.assert(name);
  loginByClient.assert(clientKey);
  const { rows } = await pool.query('SELECT * FROM staff_users WHERE login = $1 AND is_active = TRUE', [name]);
  const user = rows[0];
  const ok = verifyPassword(password, user?.password_hash || DUMMY_HASH) && Boolean(user);
  if (!ok) {
    loginByName.hit(name);
    loginByClient.hit(clientKey);
    throw httpError(401, 'Неверный логин или пароль');
  }
  loginByName.reset(name);
  const staff = mapStaff(user);
  const token = issueToken(staff);
  await audit(staff, 'login', 'staff', staff.id);
  return { token, staff };
}

// Токен живёт 12 часов, но отключённый сотрудник и смена роли действуют сразу:
// при каждом запросе сверяемся с базой (с коротким кэшем, чтобы не нагружать её).
const STAFF_CACHE_MS = 30_000;
const staffCache = new Map();
async function currentStaff(id) {
  const hit = staffCache.get(id);
  if (hit && Date.now() - hit.at < STAFF_CACHE_MS) return hit.row;
  const { rows } = await pool.query('SELECT id, role, name, restaurant_id, is_active FROM staff_users WHERE id = $1', [id]);
  const row = rows[0] || null;
  staffCache.set(id, { row, at: Date.now() });
  return row;
}

/** Express middleware: проверка токена персонала и минимальной роли. Токен — только в заголовке Authorization. */
export function staffAuth(minRole = 'waiter', alsoRoles = []) {
  return async (req, res, next) => {
    try {
      const auth = req.headers.authorization || '';
      const payload = verifyToken(auth.startsWith('Bearer ') ? auth.slice(7) : '');
      const row = payload?.sid ? await currentStaff(payload.sid) : null;
      if (!payload || !row || !row.is_active) {
        return res.status(401).json({ error: 'Требуется вход персонала', code: 'STAFF_AUTH_REQUIRED' });
      }
      const role = row.role;
      if (!ROLES.has(role) || ((ROLE_LEVEL[role] ?? -1) < ROLE_LEVEL[minRole] && !alsoRoles.includes(role))) {
        return res.status(403).json({ error: 'Недостаточно прав' });
      }
      // Ресторан: привязка из базы; у сотрудника «на все рестораны» — ресторан, где он вошёл по PIN
      req.staff = { id: row.id, role, name: row.name, restaurantId: row.restaurant_id || null, loginRestaurantId: payload.rid || null };
      return next();
    } catch (err) {
      return sendError(res, err, req);
    }
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

/** Сотрудники: администратор ресторана видит и правит только своих. */
export async function listStaff(actor = null) {
  const own = actor?.restaurantId || null;
  const { rows } = await pool.query(
    'SELECT * FROM staff_users WHERE $1::uuid IS NULL OR restaurant_id = $1 ORDER BY role, login', [own],
  );
  return rows.map(mapStaff);
}

export async function saveStaff(data, actor = null) {
  const login = String(data.login || '').trim().toLowerCase();
  if (!login || !data.name || !ROLES.has(data.role)) throw httpError(400, 'Логин, имя и роль обязательны');
  // Администратор одного ресторана не может завести сотрудника «на все рестораны» или править чужих
  const own = actor?.restaurantId || null;
  const restaurantId = own || data.restaurantId || null;
  if (own && data.id) {
    const { rows } = await pool.query('SELECT restaurant_id FROM staff_users WHERE id = $1', [data.id]);
    if (!rows[0] || rows[0].restaurant_id !== own) throw httpError(404, 'Сотрудник не найден');
  }
  if (data.id && actor?.id === data.id && (data.role !== 'admin' || data.isActive === false)) {
    throw httpError(400, 'Нельзя снять с себя роль администратора или отключить себя');
  }
  const pin = String(data.pin || '').trim();
  if (pin && !/^\d{4,6}$/.test(pin)) throw httpError(400, 'PIN — 4–6 цифр');
  if (pin) await assertPinFree(pin, restaurantId, data.id);
  const pinHash = pin ? hashPassword(pin) : null;
  if (data.password && String(data.password).length < 6) throw httpError(400, 'Пароль — не короче 6 символов');
  if (data.id) {
    const { rows } = await pool.query(
      `UPDATE staff_users SET login = $2, name = $3, role = $4, restaurant_id = $5, is_active = $6,
         password_hash = COALESCE($7, password_hash),
         pin_hash = CASE WHEN $9 THEN NULL ELSE COALESCE($8, pin_hash) END
       WHERE id = $1 RETURNING *`,
      [data.id, login, String(data.name).slice(0, 100), data.role, restaurantId, data.isActive !== false,
        data.password ? hashPassword(data.password) : null, pinHash, data.clearPin === true],
    );
    if (!rows[0]) throw httpError(404, 'Сотрудник не найден');
    staffCache.delete(data.id);
    return mapStaff(rows[0]);
  }
  if (!data.password) throw httpError(400, 'Задайте пароль');
  const { rows } = await pool.query(
    `INSERT INTO staff_users (login, name, role, restaurant_id, password_hash, pin_hash)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [login, String(data.name).slice(0, 100), data.role, restaurantId, hashPassword(data.password), pinHash],
  ).catch((e) => {
    if (e.code === '23505') throw httpError(409, 'Такой логин уже есть');
    throw e;
  });
  return mapStaff(rows[0]);
}
