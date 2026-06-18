export const IDLE_REMINDER_MS = parseInt(process.env.IDLE_REMINDER_MS || '300000', 10); // 5 min

export const WORKFLOW = {
  BROWSING: 'browsing',
  BUILDING_CART: 'building_cart',
  CART_READY: 'cart_ready',
  WAITER_REVIEW: 'waiter_review',
  IN_PRODUCTION: 'in_production',
  REORDER_PENDING: 'reorder_pending',
  PAID: 'paid',
  CLOSED: 'closed',
};

export const NOTIFY_TYPES = {
  MENU_OPENED: 'menu_opened',
  IDLE_REMINDER: 'idle_reminder',
  CART_READY: 'cart_ready',
  CALL_WAITER: 'call_waiter',
  REORDER_INTENT: 'reorder_intent',
  PAYMENT_DONE: 'payment_done',
  NEGATIVE_FEEDBACK: 'negative_feedback',
};
