/**
 * Должность в iiko → роль в приложении. Чистые функции, без обращений к базе и iiko (проверяются тестами).
 *   официант и прочий зал → waiter; администратор, менеджер, управляющий, директор → manager.
 * Администраторы и маркетинг админки заводятся вручную в «Сотрудниках» (логин и пароль).
 */

// Зальные должности (по названию должности в iiko)
const hallRe = (env = process.env) => new RegExp(env.IIKO_HALL_ROLES
  || 'официант|менеджер|администратор|хостес|бармен|раннер|сомелье|кассир|управляющ', 'i');
// «Системный администратор» — не зал
const NOT_HALL_RE = /системн/i;
export const MANAGER_RE = /менеджер|администратор|управляющ|директор/i;

/** Роль по названиям должностей сотрудника: 'manager' | 'waiter' | null (не зал). */
export function roleForPositions(names, env = process.env) {
  const re = hallRe(env);
  const hall = (names || []).filter((n) => re.test(n) && !NOT_HALL_RE.test(n));
  if (!hall.length) return null;
  return hall.some((n) => MANAGER_RE.test(n)) ? 'manager' : 'waiter';
}

/** Режим входа на of.: 'iiko' — код сотрудника из iiko; 'pin' — PIN из админки (демо iiko или вход выключен). */
export function resolveLoginMode(env = process.env, demo = false) {
  return String(env.IIKO_STAFF_LOGIN || '').trim().toLowerCase() === 'on' && !demo ? 'iiko' : 'pin';
}
