export const IDLE_REMINDER_MS = parseInt(process.env.IDLE_REMINDER_MS || '300000', 10); // 5 min
/** Норматив: сколько гость может ждать официанта после «Передать официанту». */
export const WAITER_RESPONSE_SLA_MS = parseInt(process.env.WAITER_RESPONSE_SLA_MS || '300000', 10);

export const WORKFLOW = {
  BROWSING: 'browsing', // guest_identified — «Добро пожаловать»
  BUILDING_CART: 'building_cart',
  CART_READY: 'cart_ready',
  WAITER_REVIEW: 'waiter_review',
  IN_PRODUCTION: 'in_production',
  REORDER_PENDING: 'reorder_pending',
  BILL_REQUESTED: 'bill_requested',
  PAID: 'paid',
  CLOSED: 'closed',
};

/** Тексты статусов для гостя (раздел 3 ТЗ). */
export const WORKFLOW_GUEST_LABELS = {
  browsing: 'Добро пожаловать',
  building_cart: 'Выбирает блюда',
  cart_ready: 'Ждёт официанта',
  waiter_review: 'Официант уточняет заказ',
  in_production: 'На кухне',
  reorder_pending: 'Дозаказ — ждёт официанта',
  bill_requested: 'Выберите способ оплаты',
  paid: 'Оплачено',
  closed: 'Визит завершён',
};

export const NOTIFY_TYPES = {
  GUEST_SEATED: 'guest_seated',
  MENU_OPENED: 'menu_opened',
  IDLE_REMINDER: 'idle_reminder',
  CART_READY: 'cart_ready',
  WAIT_TOO_LONG: 'wait_too_long',
  CALL_WAITER: 'call_waiter',
  REORDER_INTENT: 'reorder_intent',
  BILL_REQUESTED: 'bill_requested',
  PAYMENT_DONE: 'payment_done',
  NEGATIVE_FEEDBACK: 'negative_feedback',
  IIKO_ERROR: 'iiko_error',
};
