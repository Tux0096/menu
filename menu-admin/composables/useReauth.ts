import { useAuthStore } from '~/stores/auth';

/**
 * Повторный вход без потери формы. Когда API ответил 401 (токен истёк), useAuthFetch не выкидывает на /login,
 * а открывает глобальную модалку входа (components/ReauthDialog.vue в app.vue) и ждёт её промисом:
 * админ вводит пароль — исходный запрос повторяется, введённые данные остаются на месте.
 * Токен, полученный в соседней вкладке, подхватывается через событие window 'storage' и тоже закрывает модалку.
 */
export type ReauthReason = 'expired' | 'manual';

interface ReauthState {
  open: boolean;
  /** expired — токен уже не принимают, без входа работать нельзя; manual — продлеваем заранее, можно отменить */
  reason: ReauthReason;
}

let pending: Promise<void> | null = null;
let resolvePending: (() => void) | null = null;
let rejectPending: ((e: Error) => void) | null = null;

export function useReauthState() {
  return useState<ReauthState>('reauth', () => ({ open: false, reason: 'expired' }));
}

/** Открывает модалку входа (или присоединяется к уже открытой) и ждёт нового токена */
export function requestReauth(reason: ReauthReason = 'expired'): Promise<void> {
  const state = useReauthState();
  if (pending) {
    // к «продлить заранее» присоединился запрос с 401 — теперь отменить вход уже нельзя
    if (reason === 'expired' && state.value.reason !== 'expired') state.value = { ...state.value, reason };
    return pending;
  }
  state.value = { open: true, reason };
  pending = new Promise<void>((resolve, reject) => {
    resolvePending = resolve;
    rejectPending = reject;
  });
  // ручное «Продлить» никто не ждёт — не даём отказу стать unhandled rejection
  pending.catch(() => undefined);
  return pending;
}

/** Новый токен получен (вход в модалке или в соседней вкладке) — повторяем ждущие запросы */
export function finishReauth() {
  const state = useReauthState();
  state.value = { ...state.value, open: false };
  const resolve = resolvePending;
  pending = null;
  resolvePending = null;
  rejectPending = null;
  resolve?.();
}

/**
 * Отказ от повторного входа. «Отложить» продление (manual) — просто закрыть;
 * «Выйти» при истёкшем токене — ждущие запросы падают с 401, админ уходит на /login.
 */
export async function abandonReauth(logout: boolean) {
  const state = useReauthState();
  state.value = { ...state.value, open: false };
  const reject = rejectPending;
  pending = null;
  resolvePending = null;
  rejectPending = null;
  reject?.(Object.assign(new Error('Сессия закончилась — войдите заново'), { statusCode: 401 }));
  if (!logout) return;
  const auth = useAuthStore();
  auth.logout();
  const route = useRouter().currentRoute.value;
  if (route.path !== '/login') await navigateTo({ path: '/login', query: { redirect: route.fullPath } });
}

/** Момент истечения токена персонала (мс): menu-api выдаёт `base64url(JSON{…, exp: мс}).подпись` */
export function tokenExpiresAt(token: string | null | undefined): number | null {
  if (!token) return null;
  try {
    const part = token.split('.')[0];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '='))) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}
