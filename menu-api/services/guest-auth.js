/**
 * Идентификация гостя QR-меню.
 *  - токен основного приложения Fuji (JWT { phone, roles }) — проверяется через prod API
 *    Фуджи (GET /api/v1/user/:phone) или локально по FUJI_JWT_SECRET;
 *  - номер телефона (прототип, без SMS — по ТЗ SMS в QR-меню не используется).
 * Выдаёт собственный токен гостя (30 дней), который фронт хранит в браузере.
 */
import axios from 'axios';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import pool from '../db/pool.js';

const LEGACY_API = process.env.LEGACY_API_URL || 'https://apiv2.infra-fuji.ru';
const TOKEN_TTL_DAYS = parseInt(process.env.GUEST_TOKEN_TTL_DAYS || '30', 10);

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export function normalizePhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10) digits = `7${digits}`;
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (digits.length !== 11 || !digits.startsWith('7')) return null;
  return `+${digits}`;
}

function mapGuest(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name || null,
    phone: row.phone,
    phoneMasked: row.phone ? `${row.phone.slice(0, 2)} *** ***-${row.phone.slice(-4, -2)}-${row.phone.slice(-2)}` : null,
    allergens: row.allergens || [],
    visitsCount: row.visits_count || 0,
    isFujiUser: Boolean(row.fuji_user_id),
  };
}

async function upsertGuest({ phone, name, fujiUserId = null }) {
  const { rows } = await pool.query(
    `INSERT INTO guests (phone, name, fuji_user_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (phone) DO UPDATE SET
       name = COALESCE(NULLIF(EXCLUDED.name, ''), guests.name),
       fuji_user_id = COALESCE(EXCLUDED.fuji_user_id, guests.fuji_user_id)
     RETURNING *`,
    [phone, name || null, fujiUserId],
  );
  return rows[0];
}

async function issueToken(guestId) {
  const token = randomBytes(24).toString('hex');
  await pool.query(
    `INSERT INTO guest_tokens (token, guest_id, expires_at)
     VALUES ($1, $2, NOW() + ($3 || ' days')::interval)`,
    [token, guestId, String(TOKEN_TTL_DAYS)],
  );
  return token;
}

export async function loginByPhone({ phone, name }) {
  const normalized = normalizePhone(phone);
  if (!normalized) throw httpError(400, 'Введите номер телефона в формате +7 XXX XXX-XX-XX');
  const cleanName = String(name || '').trim().slice(0, 100);
  const guest = await upsertGuest({ phone: normalized, name: cleanName });
  const token = await issueToken(guest.id);
  return { token, guest: mapGuest(guest) };
}

function decodeJwt(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  try {
    return { parts, payload: JSON.parse(Buffer.from(parts[1], 'base64url').toString()) };
  } catch {
    return null;
  }
}

function verifyJwtLocally(parts, secret) {
  const expected = createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest();
  const actual = Buffer.from(parts[2], 'base64url');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Проверка токена приложения Fuji и загрузка профиля. */
export async function loginByFujiToken(fujiToken) {
  const decoded = decodeJwt(fujiToken);
  const phone = normalizePhone(decoded?.payload?.phone);
  if (!decoded || !phone) throw httpError(401, 'Недействительный токен приложения Fuji');
  if (decoded.payload.exp && decoded.payload.exp * 1000 < Date.now()) {
    throw httpError(401, 'Сессия приложения Fuji истекла — войдите заново');
  }

  let profile = null;
  let verified = false;
  if (process.env.FUJI_JWT_SECRET) {
    verified = verifyJwtLocally(decoded.parts, process.env.FUJI_JWT_SECRET);
  }
  try {
    const { data } = await axios.get(
      `${LEGACY_API}/api/v1/user/${encodeURIComponent(decoded.payload.phone)}`,
      { headers: { Authorization: `Bearer ${fujiToken}` }, timeout: 5000 },
    );
    profile = data;
    verified = true;
  } catch (e) {
    if (e.response && [401, 403].includes(e.response.status)) {
      throw httpError(401, 'Приложение Fuji не подтвердило вход');
    }
    console.warn('fuji profile:', e.message);
  }
  if (!verified) throw httpError(503, 'Не удалось проверить вход через приложение Fuji — попробуйте позже');

  const name = profile?.name || profile?.firstName || profile?.user?.name || null;
  const guest = await upsertGuest({
    phone,
    name,
    fujiUserId: String(profile?.id || profile?.user?.id || phone),
  });
  const token = await issueToken(guest.id);
  return { token, guest: mapGuest(guest) };
}

export async function getGuestByToken(token) {
  if (!token) return null;
  const { rows } = await pool.query(
    `SELECT g.* FROM guest_tokens t
     JOIN guests g ON g.id = t.guest_id
     WHERE t.token = $1 AND t.expires_at > NOW()`,
    [token],
  );
  return mapGuest(rows[0]);
}

export async function updateGuestProfile(guestId, { name, allergens }) {
  const { rows } = await pool.query(
    `UPDATE guests SET
       name = COALESCE($2, name),
       allergens = COALESCE($3, allergens)
     WHERE id = $1 RETURNING *`,
    [guestId, name ? String(name).slice(0, 100) : null, Array.isArray(allergens) ? allergens.map(String) : null],
  );
  return mapGuest(rows[0]);
}

export function guestTokenFromRequest(req) {
  const header = req.headers['x-guest-token'] || '';
  const auth = req.headers.authorization || '';
  if (header) return String(header);
  if (auth.startsWith('Guest ')) return auth.slice(6);
  return null;
}

/** Express middleware: req.guest (или 401, если required). */
export function guestAuth({ required = true } = {}) {
  const enforce = process.env.GUEST_AUTH_REQUIRED !== 'false';
  return async (req, res, next) => {
    try {
      req.guest = await getGuestByToken(guestTokenFromRequest(req));
      if (!req.guest && required && enforce) {
        return res.status(401).json({ error: 'Войдите, чтобы пользоваться меню', code: 'GUEST_AUTH_REQUIRED' });
      }
      return next();
    } catch (e) {
      return next(e);
    }
  };
}
