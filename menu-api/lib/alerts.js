/**
 * Оповещения в Telegram. Включаются, когда заданы ALERT_TELEGRAM_BOT_TOKEN и ALERT_TELEGRAM_CHAT_ID;
 * иначе всё остальное работает как раньше (сообщение остаётся только в журнале).
 * Одно оповещение каждого типа — не чаще раза в 10 минут: сбой не засыпает чат.
 */
import { hostname } from 'os';

const MIN_GAP_MS = 10 * 60_000;
const lastSent = new Map();

export const alertsEnabled = () => Boolean(process.env.ALERT_TELEGRAM_BOT_TOKEN && process.env.ALERT_TELEGRAM_CHAT_ID);

/**
 * @param {string} type — тип оповещения (для ограничения частоты): 'crash', 'db', 'disk', 'iiko429', 'ai-limit'…
 * @param {string} text — текст без секретов и персональных данных
 * @returns {Promise<boolean>} отправлено ли
 */
export async function sendAlert(type, text, { gapMs = MIN_GAP_MS } = {}) {
  if (!alertsEnabled()) return false;
  const now = Date.now();
  if (now - (lastSent.get(type) || 0) < gapMs) return false;
  lastSent.set(type, now);
  try {
    const res = await fetch(`https://api.telegram.org/bot${process.env.ALERT_TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.ALERT_TELEGRAM_CHAT_ID,
        text: `Фуджи меню (${hostname()})\n${String(text).slice(0, 3500)}`,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.warn(`alert: Telegram ответил ${res.status}`);
    return res.ok;
  } catch (e) {
    console.warn('alert: Telegram недоступен:', e.name === 'TimeoutError' ? 'таймаут' : e.message);
    return false;
  }
}

/** Только для тестов: сбросить ограничение частоты. */
export const resetAlertThrottle = () => lastSent.clear();
