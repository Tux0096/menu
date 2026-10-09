/**
 * Общие HTTP-примитивы API: ошибка с кодом статуса, обёртка async-обработчиков,
 * проверка обязательных полей, ограничение частоты запросов и заголовки безопасности.
 */
import { timingSafeEqual } from 'crypto';

/** Ошибка с HTTP-статусом: текст уходит клиенту (для статусов < 500). */
export function httpError(status, message, extra = {}) {
  const err = new Error(message);
  err.status = status;
  Object.assign(err, extra);
  return err;
}

/** Ответ об ошибке: внутренние детали (SQL, axios, стек) наружу не отдаём. */
export function sendError(res, err, req) {
  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
  if (status >= 500) console.error(`${req?.method || ''} ${req?.path || ''}:`, err.stack || err.message);
  // 502 — понятная ошибка iiko для официанта (текст формирует сервер), остальные 5xx — без деталей
  const message = status >= 500 && status !== 502 && status !== 503 ? 'Внутренняя ошибка сервера — попробуйте ещё раз' : err.message;
  if (!res.headersSent) res.status(status).json({ error: message, code: err.code, details: status < 500 ? err.details : undefined });
}

/** async-обработчик с единым форматом ответа и ошибок */
export const h = (fn) => async (req, res) => {
  try {
    const result = await fn(req, res);
    if (!res.headersSent) res.json(result ?? { ok: true });
  } catch (err) {
    sendError(res, err, req);
  }
};

export function requireBody(body, ...keys) {
  const missing = keys.filter((k) => body?.[k] === undefined || body?.[k] === null || body?.[k] === '');
  if (missing.length) throw httpError(400, `Не заполнено: ${missing.join(', ')}`);
}

/** Сравнение секретов за постоянное время */
export function safeEqual(a, b) {
  const x = Buffer.from(String(a ?? ''));
  const y = Buffer.from(String(b ?? ''));
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Ограничение частоты: не больше `max` событий за `windowMs` на ключ (скользящее окно, в памяти процесса —
 * API работает одним процессом, systemd). Возвращает функцию hit(key) → бросает 429 при превышении.
 */
export function createLimiter({ windowMs, max, message = 'Слишком много запросов — подождите минуту' }) {
  const hits = new Map();
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [k, list] of hits) if (!list.length || now - list[list.length - 1] > windowMs) hits.delete(k);
  }, Math.max(windowMs, 60000));
  sweep.unref?.();
  const check = (key, { count = true } = {}) => {
    const now = Date.now();
    const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (list.length >= max) {
      hits.set(key, list);
      throw httpError(429, message, { code: 'RATE_LIMITED' });
    }
    if (count) list.push(now);
    hits.set(key, list);
  };
  return {
    /** Засчитать событие (и бросить 429, если лимит исчерпан) */
    hit: (key) => check(key),
    /** Только проверить, не засчитывая (для «засчитать только неудачные попытки») */
    assert: (key) => check(key, { count: false }),
    reset: (key) => hits.delete(key),
  };
}

/** Express middleware: лимит по IP клиента (req.ip — реальный адрес за nginx, см. trust proxy) */
export function rateLimit(opts, keyOf = (req) => req.ip) {
  const limiter = createLimiter(opts);
  return (req, res, next) => {
    try {
      limiter.hit(`${keyOf(req)}`);
      next();
    } catch (err) {
      sendError(res, err, req);
    }
  };
}

/**
 * Заголовки безопасности для всех ответов. CSP — запрет встраивания во фреймы (кликджекинг)
 * и запрет плагинов; скрипты и стили не ограничиваем — гостевое меню и админка используют inline-обработчики.
 */
export function securityHeaders(req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  // Превью карточки блюда (гостевое меню ?preview=1) показывается во фрейме админки
  if (req.query?.preview === '1' && (req.path === '/' || req.path === '/index.html')) {
    const admin = process.env.ADMIN_FRAME_ORIGINS || 'https://adm.menu.franchise-fuji.ru';
    res.removeHeader('X-Frame-Options');
    res.set('Content-Security-Policy', `frame-ancestors 'self' ${admin}; object-src 'none'; base-uri 'self'`);
  }
  if (req.secure) res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
}
