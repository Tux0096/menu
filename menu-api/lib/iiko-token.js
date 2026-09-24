import axios from 'axios';

export const IIKO_URL = process.env.IIKO_URL || 'https://api-ru.iiko.services';

/**
 * Токен iiko Cloud API. Новые ключи (созданные в 2026+) работают только через
 * /api/v2/access_token и требуют секрет клиента (IIKO_CLIENT_SECRET); старые — /api/1/access_token.
 * Пробуем v2, затем v1.
 */
export async function requestIikoToken(apiLogin, clientSecret = process.env.IIKO_CLIENT_SECRET) {
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
