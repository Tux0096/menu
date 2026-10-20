/**
 * Web Push гостю (стандарт VAPID, без Firebase): «Ваш стол обслуживает официант Анна», «Ваш заказ готов».
 * Ключи VAPID — из env WEB_PUSH_PUBLIC_KEY / WEB_PUSH_PRIVATE_KEY / WEB_PUSH_SUBJECT; не заданы — создаются один раз
 * и хранятся в таблице settings (приватный ключ не логируется и наружу не отдаётся).
 * WEB_PUSH_DRY_RUN=true — ничего не отправлять в сеть (демо и тесты).
 */
import webpush from 'web-push';
import pool from '../db/pool.js';
import { httpError } from '../lib/http.js';
import {
  MAX_SUBS_PER_SESSION, normalizeSubscription, isGoneStatus, orderReadyPush, pickDeliverable, waiterAssignedPush,
} from '../lib/guest-push.js';

const SETTING = 'web_push_vapid';
const DEFAULT_SUBJECT = 'mailto:menu@franchise-fuji.ru';
const dryRun = () => /^(1|true|yes)$/i.test(process.env.WEB_PUSH_DRY_RUN || '');

let vapid = null;
let vapidLoading = null;

async function loadVapid() {
  const envPub = (process.env.WEB_PUSH_PUBLIC_KEY || '').trim();
  const envPriv = (process.env.WEB_PUSH_PRIVATE_KEY || '').trim();
  const subject = (process.env.WEB_PUSH_SUBJECT || '').trim() || DEFAULT_SUBJECT;
  if (envPub && envPriv) return { publicKey: envPub, privateKey: envPriv, subject };
  let { rows } = await pool.query('SELECT value FROM settings WHERE name = $1', [SETTING]);
  if (!rows[0]) {
    const keys = webpush.generateVAPIDKeys();
    // Несколько процессов при первом старте: побеждает первая запись, остальные читают её
    await pool.query(
      'INSERT INTO settings (name, value) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
      [SETTING, JSON.stringify({ publicKey: keys.publicKey, privateKey: keys.privateKey })],
    );
    ({ rows } = await pool.query('SELECT value FROM settings WHERE name = $1', [SETTING]));
  }
  return { publicKey: rows[0].value.publicKey, privateKey: rows[0].value.privateKey, subject };
}

async function getVapid() {
  if (vapid) return vapid;
  vapidLoading ||= loadVapid().then((v) => { vapid = v; return v; }).finally(() => { vapidLoading = null; });
  return vapidLoading;
}

export async function getVapidPublicKey() {
  return (await getVapid()).publicKey;
}

/** Создать ключи заранее (при старте), чтобы первый запрос гостя не ждал БД */
export function initGuestPush() {
  getVapid().catch((e) => console.warn('web push: ключи VAPID недоступны —', e.message));
}

/** Подписка гостя на уведомления визита. Адрес подписки уникален: тот же браузер на новом визите переезжает на него. */
export async function subscribeGuest(sessionId, guestId, subscription) {
  const sub = normalizeSubscription(subscription);
  if (!sub) throw httpError(400, 'Неверная подписка на уведомления');
  const { rows } = await pool.query('SELECT status FROM table_sessions WHERE id = $1', [sessionId]);
  if (!rows[0] || rows[0].status !== 'open') throw httpError(409, 'Визит закрыт');
  const { rows: cnt } = await pool.query(
    'SELECT COUNT(*)::int AS n FROM guest_push_subscriptions WHERE session_id = $1 AND endpoint <> $2', [sessionId, sub.endpoint],
  );
  if (cnt[0].n >= MAX_SUBS_PER_SESSION) throw httpError(429, 'Слишком много подписок на этот стол');
  await pool.query(
    `INSERT INTO guest_push_subscriptions (session_id, guest_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (endpoint) DO UPDATE SET session_id = EXCLUDED.session_id, guest_id = EXCLUDED.guest_id,
       p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, created_at = NOW()`,
    [sessionId, guestId || null, sub.endpoint, sub.p256dh, sub.auth],
  );
  return { ok: true };
}

export async function unsubscribeGuest(sessionId, endpoint) {
  await pool.query('DELETE FROM guest_push_subscriptions WHERE session_id = $1 AND endpoint = $2', [sessionId, String(endpoint || '')]);
  return { ok: true };
}

/** Подписки закрытых визитов (и старше суток) не нужны */
export async function cleanupGuestPush() {
  const { rowCount } = await pool.query(
    `DELETE FROM guest_push_subscriptions p USING table_sessions s
     WHERE s.id = p.session_id AND (s.status <> 'open' OR p.created_at < NOW() - INTERVAL '1 day')`,
  );
  return rowCount;
}

/**
 * Отправить уведомление всем подписчикам визита. `send` подменяется в тестах.
 * Возвращает число доставленных. 404/410 от push-сервиса — подписку удаляем.
 */
export async function pushToSession(sessionId, message, { send = null } = {}) {
  const { rows } = await pool.query(
    `SELECT p.endpoint, p.p256dh, p.auth, s.status AS session_status
     FROM guest_push_subscriptions p JOIN table_sessions s ON s.id = p.session_id WHERE p.session_id = $1`,
    [sessionId],
  );
  const subs = pickDeliverable(rows);
  if (!subs.length) return 0;
  const payload = JSON.stringify({ ...message, url: '/', icon: '/icon.svg' });
  let sent = 0;
  const sender = send || (dryRun()
    ? async () => {}
    : async (sub, body) => {
      const v = await getVapid();
      return webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body,
        { vapidDetails: { subject: v.subject, publicKey: v.publicKey, privateKey: v.privateKey }, TTL: 3600, urgency: 'high', timeout: 10000 },
      );
    });
  await Promise.all(subs.map(async (sub) => {
    try {
      await sender(sub, payload);
      sent += 1;
    } catch (e) {
      if (isGoneStatus(e.statusCode)) {
        await pool.query('DELETE FROM guest_push_subscriptions WHERE endpoint = $1', [sub.endpoint]).catch(() => {});
      } else {
        console.warn('web push:', e.statusCode || '', e.body ? String(e.body).slice(0, 120) : e.message);
      }
    }
  }));
  return sent;
}

/** Официант взял стол (в том числе переназначение) — гостям визита. Не бросает: основной поток не ждёт. */
export function notifyWaiterAssigned(sessionId, waiterName) {
  pushToSession(sessionId, waiterAssignedPush({ sessionId, waiterName })).catch((e) => console.warn('web push:', e.message));
}

/** Блюда готовы — не чаще раза в 2 минуты на визит (слот занимаем атомарно) */
export function notifyOrderReady(sessionId) {
  (async () => {
    const { rowCount } = await pool.query(
      `UPDATE table_sessions SET guest_push_ready_at = NOW()
       WHERE id = $1 AND (guest_push_ready_at IS NULL OR guest_push_ready_at < NOW() - INTERVAL '2 minutes')`,
      [sessionId],
    );
    if (rowCount) await pushToSession(sessionId, orderReadyPush({ sessionId }));
  })().catch((e) => console.warn('web push:', e.message));
}
