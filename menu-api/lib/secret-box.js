/**
 * Шифрование секретов в базе (например, ключ CloudPayments точки): AES-256-GCM, формат `enc:v1:<iv>:<tag>:<данные>` (base64url).
 * Ключ выводится из DATA_KEY, а если его нет — из AUTH_SECRET. Смена ключа делает старые записи нечитаемыми:
 * секрет придётся ввести в админке заново.
 */
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'crypto';

const PREFIX = 'enc:v1:';
let keyCache = null;
function key() {
  const src = process.env.DATA_KEY || process.env.AUTH_SECRET || 'fuji-menu-dev-secret-change-me';
  if (keyCache?.src !== src) keyCache = { src, key: Buffer.from(hkdfSync('sha256', src, 'fuji-menu', 'secret-box:v1', 32)) };
  return keyCache.key;
}

export const isEncrypted = (v) => typeof v === 'string' && v.startsWith(PREFIX);

export function encryptSecret(plain) {
  const value = String(plain ?? '');
  if (!value || isEncrypted(value)) return value;
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([c.update(value, 'utf8'), c.final()]);
  return `${PREFIX}${[iv, c.getAuthTag(), data].map((b) => b.toString('base64url')).join(':')}`;
}

/** Открытое значение (старая запись) возвращается как есть; не расшифровалось — пустая строка */
export function decryptSecret(stored) {
  const value = String(stored ?? '');
  if (!isEncrypted(value)) return value;
  try {
    const [iv, tag, data] = value.slice(PREFIX.length).split(':').map((p) => Buffer.from(p, 'base64url'));
    const d = createDecipheriv('aes-256-gcm', key(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(data), d.final()]).toString('utf8');
  } catch {
    console.warn('secret-box: не удалось расшифровать секрет (сменился AUTH_SECRET/DATA_KEY?) — введите его в админке заново');
    return '';
  }
}
