/**
 * Push-уведомления в приложение официанта через Firebase Cloud Messaging (HTTP v1).
 * Ключ сервисного аккаунта Firebase — секрет FCM_SERVICE_ACCOUNT (JSON или base64 от JSON).
 * Без ключа push выключен, остальное работает как обычно (приложение опрашивает сервер).
 */
import axios from 'axios';
import { createSign } from 'crypto';
import pool from '../db/pool.js';

let account = null;
function serviceAccount() {
  if (account !== null) return account;
  const raw = process.env.FCM_SERVICE_ACCOUNT || '';
  account = false;
  if (!raw) return account;
  try {
    const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const a = JSON.parse(json);
    if (a.client_email && a.private_key && a.project_id) account = a;
  } catch (e) {
    console.warn('FCM_SERVICE_ACCOUNT: не удалось прочитать —', e.message);
  }
  return account;
}

export const isPushEnabled = () => Boolean(serviceAccount());

let accessToken = null;
let accessExp = 0;
async function googleAccessToken() {
  if (accessToken && Date.now() < accessExp - 60000) return accessToken;
  const a = serviceAccount();
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: a.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(a.private_key).toString('base64url');
  const { data } = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: `${unsigned}.${signature}`,
  }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 });
  accessToken = data.access_token;
  accessExp = Date.now() + (data.expires_in || 3600) * 1000;
  return accessToken;
}

/** Сохранить FCM-токен телефона официанта. */
export async function registerDevice(staff, restaurantId, token, platform = '') {
  if (!token || String(token).length > 4096) return;
  await pool.query(
    `INSERT INTO waiter_devices (token, staff_id, restaurant_id, platform, updated_at) VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (token) DO UPDATE SET staff_id = EXCLUDED.staff_id, restaurant_id = EXCLUDED.restaurant_id,
       platform = EXCLUDED.platform, updated_at = NOW()`,
    [String(token), staff.id, restaurantId, String(platform).slice(0, 20)],
  );
}

export async function unregisterDevice(token) {
  await pool.query('DELETE FROM waiter_devices WHERE token = $1', [String(token || '')]);
}

// Звук и важность по типу события: «готово», новый заказ и вызов — громкий канал
const LOUD = new Set(['dish_ready', 'cart_ready', 'reorder_intent', 'call_waiter', 'bill_requested', 'wait_too_long']);

/** Push всем телефонам официантов ресторана (не блокирует основной поток). */
export async function pushToRestaurant(restaurantId, { title, body, type, sessionId, tableNumber }) {
  if (!isPushEnabled() || !restaurantId) return;
  const { rows } = await pool.query('SELECT token FROM waiter_devices WHERE restaurant_id = $1', [restaurantId]);
  if (!rows.length) return;
  const a = serviceAccount();
  let token;
  try { token = await googleAccessToken(); } catch (e) {
    console.warn('FCM auth:', e.response?.data?.error_description || e.message);
    return;
  }
  const channel = LOUD.has(type) ? 'waiter_alerts' : 'waiter_info';
  await Promise.all(rows.map(async ({ token: device }) => {
    try {
      await axios.post(`https://fcm.googleapis.com/v1/projects/${a.project_id}/messages:send`, {
        message: {
          token: device,
          notification: { title, body },
          data: { type: String(type || ''), sessionId: String(sessionId || ''), tableNumber: String(tableNumber || '') },
          android: { priority: 'HIGH', notification: { channel_id: channel, sound: 'default', tag: `table-${tableNumber || ''}` } },
          apns: { payload: { aps: { sound: 'default', 'thread-id': `table-${tableNumber || ''}` } }, headers: { 'apns-priority': '10' } },
        },
      }, { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 });
    } catch (e) {
      const status = e.response?.data?.error?.details?.find?.((d) => d.errorCode)?.errorCode || e.response?.data?.error?.status;
      if (status === 'UNREGISTERED' || status === 'NOT_FOUND' || e.response?.status === 404) {
        await unregisterDevice(device).catch(() => {});
      } else {
        console.warn('FCM send:', e.response?.data?.error?.message || e.message);
      }
    }
  }));
}
