/**
 * Мониторинг ошибок: глобальные обработчики, необязательный Sentry (SENTRY_DSN) и сторож сервера —
 * БД, диск, лимит iiko. Оповещения уходят в Telegram через lib/alerts.js (если настроен).
 */
import { statfs } from 'fs/promises';
import { sendAlert } from './alerts.js';

let sentry = null;

const brief = (err) => String(err?.stack || err?.message || err).split('\n').slice(0, 4).join('\n').slice(0, 800);

/** Передать ошибку в Sentry (если подключён). Остальное — забота вызывающего: журнал и оповещение. */
export function captureError(err, extra = {}) {
  try { sentry?.captureException(err, { extra }); } catch { /* мониторинг не должен ронять сервер */ }
}

/** Вызвать как можно раньше при старте. */
export async function initMonitoring() {
  if (process.env.SENTRY_DSN) {
    try {
      // Пакет необязательный: не установлен — работаем без него
      const mod = await import('@sentry/node');
      mod.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV || 'production', tracesSampleRate: 0, sendDefaultPii: false });
      sentry = mod;
      console.log('Sentry: подключён');
    } catch (e) {
      console.warn(`Sentry: SENTRY_DSN задан, но подключить не удалось (${e.code === 'ERR_MODULE_NOT_FOUND' ? 'npm i @sentry/node' : e.message})`);
    }
  }

  process.on('unhandledRejection', (reason) => {
    console.error('unhandledRejection:', reason?.stack || reason);
    captureError(reason instanceof Error ? reason : new Error(String(reason)), { kind: 'unhandledRejection' });
    sendAlert('crash:rejection', `Необработанная ошибка (promise):\n${brief(reason)}`);
  });
  process.on('uncaughtException', async (err) => {
    console.error('uncaughtException:', err?.stack || err);
    captureError(err, { kind: 'uncaughtException' });
    // Состояние процесса после такой ошибки ненадёжно: сообщаем и выходим — systemd поднимет сервер заново
    await Promise.race([
      sendAlert('crash:exception', `Сервер упал (uncaughtException), systemd перезапустит:\n${brief(err)}`, { gapMs: 0 }),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
    try { await sentry?.flush?.(2000); } catch { /* ignore */ }
    process.exit(1);
  });
}

// ── Сторож: БД, диск, лимит iiko ────────────────────────────────────────────

const DISK_LIMIT = Number(process.env.ALERT_DISK_PERCENT || 85);
const IIKO_429_LIMIT_MS = 10 * 60_000;

/** Доля занятого места на диске с сервером, % (null — не удалось узнать). */
export async function diskUsedPercent(path = process.cwd()) {
  try {
    const s = await statfs(path);
    if (!s.blocks) return null;
    return Math.round(((s.blocks - s.bavail) / s.blocks) * 100);
  } catch { return null; }
}

/**
 * pool — пул БД; iikoStreakMs — функция «сколько мс подряд iiko отвечает 429» (0 — не отвечает).
 * Проверки: БД раз в минуту (тревога после двух сбоев подряд), диск и iiko — раз в 5 минут.
 */
export function startWatchdog(pool, iikoStreakMs = () => 0) {
  let dbFails = 0;
  setInterval(async () => {
    try {
      await pool.query('SELECT 1');
      dbFails = 0;
    } catch (e) {
      dbFails += 1;
      console.error(`watchdog: БД недоступна (${dbFails}):`, e.message);
      if (dbFails >= 2) sendAlert('db', `База данных недоступна: ${e.message}`);
    }
  }, 60_000).unref?.();

  const slow = async () => {
    const used = await diskUsedPercent();
    if (used != null && used >= DISK_LIMIT) {
      console.warn(`watchdog: диск занят на ${used}%`);
      sendAlert('disk', `Диск сервера занят на ${used}% (порог ${DISK_LIMIT}%). Проверьте /var/backups/menu, журналы и кэш картинок.`);
    }
    const ms = iikoStreakMs();
    if (ms >= IIKO_429_LIMIT_MS) {
      sendAlert('iiko429', `iiko отвечает 429 (лимит запросов) уже ${Math.round(ms / 60_000)} мин подряд — фоновые опросы на паузе.`);
    }
  };
  setInterval(slow, 5 * 60_000).unref?.();
  setTimeout(slow, 30_000).unref?.();
}
