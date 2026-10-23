// Ошибки админки → POST /api/v1/client-errors (журнал сервера; без персональных данных, не больше 5 за сеанс)
export default defineNuxtPlugin((nuxtApp) => {
  const { apiBase } = useRuntimeConfig().public;
  let sent = 0;
  const send = (err: unknown, info?: string) => {
    if (sent++ >= 5) return;
    const e = err as { message?: string; stack?: string } | string | null;
    const message = typeof e === 'string' ? e : (e?.message ?? String(e));
    const stack = typeof e === 'object' && e ? (e.stack ?? '') : '';
    $fetch('/client-errors', {
      baseURL: apiBase,
      method: 'POST',
      keepalive: true,
      body: { app: 'admin', message: message.slice(0, 300), source: (info ?? '').slice(0, 200), stack: stack.slice(0, 1200) },
    }).catch(() => {});
  };
  nuxtApp.vueApp.config.errorHandler = (err, _instance, info) => {
    console.error(err);
    send(err, info);
  };
  window.addEventListener('error', (e) => send(e.error ?? e.message, e.filename));
  window.addEventListener('unhandledrejection', (e) => send(e.reason));
});
