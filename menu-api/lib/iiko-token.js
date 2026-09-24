import axios from 'axios';

export const IIKO_URL = process.env.IIKO_URL || 'https://api-ru.iiko.services';

/**
 * Токен iiko Cloud API. Новые ключи (созданные в 2026+) работают только через
 * /api/v2/access_token, старые — через /api/1/access_token. Пробуем v2, затем v1.
 */
export async function requestIikoToken(apiLogin) {
  if (!apiLogin) throw new Error('IIKO_API_LOGIN не задан');
  const errors = [];
  for (const path of ['/api/v2/access_token', '/api/1/access_token']) {
    try {
      const { data } = await axios.post(`${IIKO_URL}${path}`, { apiLogin }, { timeout: 15000 });
      const token = data?.token || data?.accessToken || data?.access_token;
      if (token) return token;
      errors.push(`${path}: в ответе нет токена (поля: ${Object.keys(data || {}).join(', ')})`);
    } catch (e) {
      errors.push(`${path}: ${e.response?.status || ''} ${e.response?.data?.errorDescription || e.response?.data?.message || e.message}`);
    }
  }
  throw new Error(`iiko: не удалось получить токен — ${errors.join(' | ')}`);
}
