/**
 * Кому уходят уведомления официантам (лента и push).
 *   - у визита есть официант (waiter_id) → только ему;
 *   - официанта нет («Общие столы») → всем официантам точки;
 *   - общие тревоги («долго ждут», ошибки iiko, брони) и смена официанта у стола → всем;
 *   - управляющий видит в ленте всё.
 */
import { NOTIFY_TYPES } from './table-workflow-config.js';

/** Тревоги: приходят всем официантам точки, у какого бы стола ни был официант */
export const BROADCAST_TYPES = new Set([
  NOTIFY_TYPES.WAIT_TOO_LONG, NOTIFY_TYPES.IIKO_ERROR,
  // брони: о приходе гостей, неявке и занятом столе должен знать весь зал
  NOTIFY_TYPES.RESERVATION, NOTIFY_TYPES.RESERVATION_ARRIVED, NOTIFY_TYPES.RESERVATION_NO_SHOW, NOTIFY_TYPES.RESERVATION_CONFLICT,
]);
/** В ленте видны всем: тревоги и смена официанта у стола */
export const FEED_FOR_ALL_TYPES = new Set([...BROADCAST_TYPES, NOTIFY_TYPES.TABLE_ASSIGNED, NOTIFY_TYPES.TABLE_UNASSIGNED]);

/** Роли, которые видят ленту целиком */
export const SEES_ALL_ROLES = new Set(['manager', 'admin']);

/**
 * Получатели push: null — все телефоны точки, массив — только эти сотрудники.
 * Тревога и стол без официанта → null; стол с официантом → [его id].
 */
export function pushAudience({ type, waiterId = null }) {
  if (BROADCAST_TYPES.has(type)) return null;
  return waiterId ? [String(waiterId)] : null;
}

/** Видно ли уведомление в ленте сотрудника */
export function feedVisible({ type, tableWaiterId = null, staff }) {
  if (SEES_ALL_ROLES.has(staff?.role)) return true;
  if (FEED_FOR_ALL_TYPES.has(type)) return true;
  if (!tableWaiterId) return true;
  return String(tableWaiterId) === String(staff?.id);
}
