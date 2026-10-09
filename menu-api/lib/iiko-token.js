import axios from 'axios';

export const IIKO_URL = process.env.IIKO_URL || 'https://api-ru.iiko.services';

// ── Именные ключи из секрета IIKO_KEYS: «Название = ключ» по строке (в .env — IIKO_KEYS_B64) ──
const TRANSLIT = { а: 'A', б: 'B', в: 'V', г: 'G', д: 'D', е: 'E', ё: 'E', ж: 'ZH', з: 'Z', и: 'I', й: 'Y', к: 'K', л: 'L', м: 'M', н: 'N', о: 'O', п: 'P', р: 'R', с: 'S', т: 'T', у: 'U', ф: 'F', х: 'H', ц: 'C', ч: 'CH', ш: 'SH', щ: 'SCH', ъ: '', ы: 'Y', ь: '', э: 'E', ю: 'YU', я: 'YA' };
/** Код ключа из названия (хранится в базе у точки): латиница, цифры и «_», до 30 символов */
export const credsCode = (name) => String(name).toLowerCase().split('').map((ch) => TRANSLIT[ch] ?? ch.toUpperCase()).join('')
  .replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30);
let namedCache = null;
/** code → { name, key } */
export function namedIikoKeys() {
  const raw = process.env.IIKO_KEYS_B64 || '';
  if (namedCache?.raw === raw) return namedCache.map;
  const map = new Map();
  let text = '';
  try { text = Buffer.from(raw, 'base64').toString('utf8'); } catch { /* пусто */ }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=][^=]*?)\s*=\s*([A-Za-z0-9._-]+)\s*$/);
    if (!m) continue;
    const code = credsCode(m[1]);
    if (code && code !== 'MENU') map.set(code, { name: m[1].trim(), key: m[2] });
  }
  namedCache = { raw, map };
  return map;
}

/**
 * Один ключ iiko на всё: меню, заказы, стоп-лист, статусы кухни, вебхуки.
 * Имя секрета любое из двух: IIKO_MENU_API_LOGIN (если задан) или IIKO_API_LOGIN.
 */
export function iikoApiLogin(creds = '') {
  if (creds) return process.env[`IIKO_${creds}_API_LOGIN`] || namedIikoKeys().get(creds)?.key || '';
  return process.env.IIKO_MENU_API_LOGIN || process.env.IIKO_API_LOGIN || '';
}

/** Секрет клиента ключа (для ключей нового поколения): IIKO_CLIENT_SECRET или IIKO_MENU_CLIENT_SECRET. */
export function iikoClientSecret(creds = '') {
  // Секрет клиента принадлежит приложению iiko, а не ключу — у второго ключа по умолчанию тот же, что у основного
  if (creds) return process.env[`IIKO_${creds}_CLIENT_SECRET`] || iikoClientSecret();
  return process.env.IIKO_CLIENT_SECRET || process.env.IIKO_MENU_CLIENT_SECRET || '';
}

/** ID приложения (appId) — новые ключи iiko выдают токен только вместе с ним: IIKO_APP_ID или IIKO_MENU_APP_ID. */
export function iikoAppId(creds = '') {
  if (creds) return process.env[`IIKO_${creds}_APP_ID`] || iikoAppId();
  return process.env.IIKO_APP_ID || process.env.IIKO_MENU_APP_ID || '';
}

/**
 * Наборы ключей: '' — основной; 'BAR' и т.п. — второй iiko (IIKO_BAR_API_LOGIN / _APP_ID / _CLIENT_SECRET).
 * ID приложения и секрет клиента у второго ключа по умолчанию те же, что у основного.
 */
export function iikoCredsList() {
  const extra = Object.keys(process.env)
    .map((k) => k.match(/^IIKO_([A-Z0-9_]{1,30})_API_LOGIN$/)?.[1])
    .filter((c) => c && c !== 'MENU' && process.env[`IIKO_${c}_API_LOGIN`]);
  return ['', ...new Set([...extra, ...namedIikoKeys().keys()])];
}

/** Название ключа для админки: код из имени секрета (IIKO_<КОД>_API_LOGIN) и маска ключа */
export function iikoCredsLabel(creds = '') {
  if (!creds) return `Основной ключ · ${maskIikoKey()}`;
  return `${namedIikoKeys().get(creds)?.name || creds.replace(/_/g, ' ')} · ${maskIikoKey(iikoApiLogin(creds))}`;
}

export function maskIikoKey(k = iikoApiLogin()) {
  return k ? `${k.slice(0, 4)}…${k.slice(-2)} (${k.length} симв.)` : 'не задан';
}

/**
 * Токен iiko Cloud API. Новые ключи работают только через /api/v2/access_token
 * (ключ + ID приложения + секрет клиента); старые — через /api/1/access_token. Пробуем v2, затем v1.
 */
export async function requestIikoTokenFor(creds = '') {
  return requestIikoToken(iikoApiLogin(creds), iikoClientSecret(creds), iikoAppId(creds));
}

export async function requestIikoToken(apiLogin = iikoApiLogin(), clientSecret = iikoClientSecret(), appId = iikoAppId()) {
  if (!apiLogin) throw new Error('IIKO_API_LOGIN не задан');
  const errors = [];
  // По спецификации iiko Cloud API (v2/access_token): apiKey + appId + clientSecret; v1 устарел, но старые ключи работают только им
  const v2 = { apiKey: apiLogin };
  if (appId) v2.appId = appId;
  if (clientSecret) v2.clientSecret = clientSecret;
  const attempts = [
    ['/api/v2/access_token', v2],
    // ID приложения и секрет могли остаться от прежнего ключа — пробуем и без них
    ...(appId || clientSecret ? [['/api/v2/access_token (без ID приложения)', { apiKey: apiLogin }]] : []),
    ['/api/1/access_token', { apiLogin }],
  ];
  for (const [path, body] of attempts) {
    try {
      const { data } = await axios.post(`${IIKO_URL}${path.split(' ')[0]}`, body, { timeout: 15000 });
      const token = data?.token || data?.accessToken || data?.access_token;
      if (token) return token;
      errors.push(`${path}: в ответе нет токена (поля: ${Object.keys(data || {}).join(', ')})`);
    } catch (e) {
      errors.push(`${path}: ${e.response?.status || ''} ${e.response?.data?.errorDescription || e.response?.data?.message || e.message}`);
    }
  }
  // iiko повторяет ключ в тексте ошибки («Login … is not authorized») — в логи он попадать не должен
  const safe = errors.join(' | ').replace(/[0-9a-f]{24,}/gi, (k) => `${k.slice(0, 4)}…${k.slice(-2)}`);
  throw new Error(`iiko: не удалось получить токен — ${safe}`);
}
