import { createHmac } from 'crypto';
import pool from '../db/pool.js';
import { safeEqual } from './http.js';

/** Ресторан по умолчанию, если в QR-ссылке нет ?restaurant= (демо: https://menu.franchise-fuji.ru/?table=5). */
export const QR_RESTAURANT_SLUG = process.env.QR_RESTAURANT_SLUG || 'novo-sadovaya';

/** Публичный адрес QR-меню — для генерации QR-кодов в админке. */
export const PUBLIC_MENU_URL = (process.env.PUBLIC_MENU_URL || 'https://menu.franchise-fuji.ru').replace(/\/$/, '');

// ── Подпись стола в QR ──────────────────────────────────────────────────────
// ТЗ: «гость не видит чужой стол без QR». В QR-ссылке — подпись k = HMAC(ресторан|стол): номер стола
// можно подобрать, подпись — нет. Секрет QR_SECRET отдельный и не меняется при деплое, иначе напечатанные
// наклейки перестанут работать. Проверку включает QR_SIGNED_REQUIRED=true — после того как на столы
// наклеены новые QR из админки; до этого старые QR без подписи продолжают работать.

const QR_SECRET = process.env.QR_SECRET || `${process.env.AUTH_SECRET || 'fuji-menu-dev-secret-change-me'}:qr`;
export const QR_SIGNED_REQUIRED = process.env.QR_SIGNED_REQUIRED === 'true';

// Включается и в админке («QR-коды» → «Вход только по QR на столе»): настройка qr_signed_required в БД
let cached = { at: 0, value: false };
export async function qrSignedRequired() {
  if (QR_SIGNED_REQUIRED) return true;
  if (Date.now() - cached.at < 15_000) return cached.value;
  try {
    const { rows } = await pool.query("SELECT value FROM settings WHERE name = 'qr_signed_required'");
    cached = { at: Date.now(), value: rows[0]?.value === true };
  } catch {
    cached = { at: Date.now(), value: cached.value };
  }
  return cached.value;
}
export async function setQrSignedRequired(on) {
  await pool.query(
    `INSERT INTO settings (name, value, updated_at) VALUES ('qr_signed_required', $1, NOW())
     ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [JSON.stringify(Boolean(on))],
  );
  cached = { at: Date.now(), value: Boolean(on) };
}

export function qrKey(restaurantSlug, table) {
  return createHmac('sha256', QR_SECRET).update(`${restaurantSlug}|${String(table).trim()}`).digest('base64url').slice(0, 16);
}

export function isValidQrKey(restaurantSlug, table, key) {
  return Boolean(key) && safeEqual(String(key), qrKey(restaurantSlug, table));
}
