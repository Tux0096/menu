import { createHmac } from 'crypto';
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

export function qrKey(restaurantSlug, table) {
  return createHmac('sha256', QR_SECRET).update(`${restaurantSlug}|${String(table).trim()}`).digest('base64url').slice(0, 16);
}

export function isValidQrKey(restaurantSlug, table, key) {
  return Boolean(key) && safeEqual(String(key), qrKey(restaurantSlug, table));
}
