/** Персональные данные гостя: версия политики, сроки хранения. Версия — та же, что в menu-web/guest/privacy.html и terms.html. */

export const PRIVACY_VERSION = '2026-10-23';

const days = (name, def) => {
  const n = parseInt(process.env[name] || '', 10);
  return Number.isFinite(n) && n > 0 ? n : def;
};

/** Сроки хранения (дни). Описаны в политике — менять вместе с ней. */
export const RETENTION = {
  get aiQueryLogDays() { return days('AI_QUERY_LOG_RETENTION_DAYS', 90); },
  get guestDays() { return days('GUEST_RETENTION_DAYS', 1095); },
  get reservationDays() { return days('RESERVATION_RETENTION_DAYS', 365); },
};

/** Нулевой UUID — «удалённый гость» в обезличенных записях (длина массивов и суммы остаются) */
export const ERASED_GUEST_ID = '00000000-0000-0000-0000-000000000000';
