/**
 * Web Push гостю: тексты уведомлений и проверка подписки браузера (без обращений к БД и сети).
 */

/** Первое слово имени: «Анна Иванова» → «Анна» */
export function waiterFirstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || '';
}

/** «Ваш стол обслуживает официант Анна» — tag по визиту: новое назначение заменяет прежнее уведомление */
export function waiterAssignedPush({ sessionId, waiterName }) {
  const name = waiterFirstName(waiterName);
  return {
    title: 'Фуджи',
    body: name ? `Ваш стол обслуживает официант ${name}` : 'Ваш стол обслуживает официант',
    tag: `waiter-${sessionId}`,
    sessionId: String(sessionId),
  };
}

/** «Ваш заказ готов» */
export function orderReadyPush({ sessionId }) {
  return { title: 'Фуджи', body: 'Ваш заказ готов', tag: `ready-${sessionId}`, sessionId: String(sessionId) };
}

/** Не чаще раза в 2 минуты на визит */
export const READY_PUSH_GAP_MS = 2 * 60_000;
export function readyPushDue(lastAt, now = Date.now()) {
  if (!lastAt) return true;
  return now - new Date(lastAt).getTime() >= READY_PUSH_GAP_MS;
}

// Сервер сам отправляет запрос на адрес подписки — принимаем только адреса известных push-сервисов браузеров (иначе SSRF)
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/i, // Chrome, Edge, Opera, Samsung Internet
  /^([a-z0-9-]+\.)*push\.services\.mozilla\.com$/i, // Firefox
  /^([a-z0-9-]+\.)*push\.apple\.com$/i, // Safari / iOS PWA
  /^([a-z0-9-]+\.)*notify\.windows\.com$/i, // Edge (WNS)
];
export const MAX_SUBS_PER_SESSION = 8;

const b64urlBytes = (s) => {
  if (typeof s !== 'string' || !/^[A-Za-z0-9_-]+={0,2}$/.test(s)) return -1;
  return Buffer.from(s, 'base64url').length;
};

/** Подписка из браузера (PushSubscription.toJSON()) → { endpoint, p256dh, auth } или null, если подписка неверная */
export function normalizeSubscription(sub) {
  if (!sub || typeof sub !== 'object') return null;
  const { endpoint } = sub;
  if (typeof endpoint !== 'string' || endpoint.length > 1000) return null;
  let url;
  try { url = new URL(endpoint); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || !PUSH_HOSTS.some((re) => re.test(url.hostname))) return null;
  const p256dh = sub.keys?.p256dh;
  const auth = sub.keys?.auth;
  if (b64urlBytes(p256dh) !== 65 || b64urlBytes(auth) !== 16) return null;
  if (sub.expirationTime && Number(sub.expirationTime) < Date.now()) return null;
  return { endpoint: url.toString(), p256dh, auth };
}

/** Кому слать: подписки открытого визита (закрытых визитов и просроченные не нужны), без повторов адреса */
export function pickDeliverable(rows, { now = Date.now() } = {}) {
  const seen = new Set();
  return (rows || []).filter((r) => {
    if (!r?.endpoint || seen.has(r.endpoint)) return false;
    if (r.session_status && r.session_status !== 'open') return false;
    if (r.expires_at && new Date(r.expires_at).getTime() < now) return false;
    seen.add(r.endpoint);
    return true;
  });
}

/** 404/410 от push-сервиса: подписки больше нет */
export const isGoneStatus = (status) => status === 404 || status === 410;
