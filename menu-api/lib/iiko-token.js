import axios from 'axios';

export const IIKO_URL = process.env.IIKO_URL || 'https://api-ru.iiko.services';

/**
 * Токен iiko Cloud API. Новые ключи (созданные в 2026+) работают только через
 * /api/v2/access_token и требуют секрет клиента (IIKO_CLIENT_SECRET); старые — /api/1/access_token.
 * Пробуем v2, затем v1.
 */
/**
 * Один ключ iiko на всё: меню, заказы, стоп-лист, статусы кухни, вебхуки.
 * Имя секрета любое из двух: IIKO_MENU_API_LOGIN (если задан) или IIKO_API_LOGIN.
 */
export function iikoApiLogin() {
  return process.env.IIKO_MENU_API_LOGIN || process.env.IIKO_API_LOGIN || '';
}

/** Секрет клиента ключа (для ключей нового поколения): IIKO_CLIENT_SECRET или IIKO_MENU_CLIENT_SECRET. */
export function iikoClientSecret() {
  return process.env.IIKO_CLIENT_SECRET || process.env.IIKO_MENU_CLIENT_SECRET || '';
}

export function maskIikoKey(k = iikoApiLogin()) {
  return k ? `${k.slice(0, 4)}…${k.slice(-2)} (${k.length} симв.)` : 'не задан';
}

export async function requestIikoToken(apiLogin = iikoApiLogin(), clientSecret = iikoClientSecret()) {
  if (!apiLogin) throw new Error('IIKO_API_LOGIN не задан');
  const errors = [];
  const attempts = [
    ['/api/v2/access_token', clientSecret ? { apiLogin, clientSecret } : { apiLogin }],
    ['/api/1/access_token', { apiLogin }],
  ];
  for (const [path, body] of attempts) {
    try {
      const { data } = await axios.post(`${IIKO_URL}${path}`, body, { timeout: 15000 });
      const token = data?.token || data?.accessToken || data?.access_token;
      if (token) return token;
      errors.push(`${path}: в ответе нет токена (поля: ${Object.keys(data || {}).join(', ')})`);
    } catch (e) {
      errors.push(`${path}: ${e.response?.status || ''} ${e.response?.data?.errorDescription || e.response?.data?.message || e.message}`);
    }
  }
  throw new Error(`iiko: не удалось получить токен — ${errors.join(' | ')}`);
}
