/**
 * Очередь операций над одним визитом (стол): корзина гостя, правка официантом, отправка в iiko и оплата
 * выполняются строго по одной. Без этого двойное «В работу» создавало два заказа в iiko, а автосохранение
 * корзины во время отправки пересоздавало строки — и уже отправленные блюда уходили повторно.
 * API работает одним процессом (systemd), поэтому очереди в памяти достаточно; транзакции с FOR UPDATE
 * в БД остаются второй линией защиты.
 */
const queues = new Map();

export function withSessionMutex(sessionId, fn) {
  const key = String(sessionId || '');
  const prev = queues.get(key) || Promise.resolve();
  const run = prev.catch(() => {}).then(fn);
  const tail = run.catch(() => {});
  queues.set(key, tail);
  tail.then(() => { if (queues.get(key) === tail) queues.delete(key); });
  return run;
}
