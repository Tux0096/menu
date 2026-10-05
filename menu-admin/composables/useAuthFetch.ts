import type { NitroFetchOptions } from 'nitropack';
import { useAuthStore } from '~/stores/auth';
import { useRestaurantStore } from '~/stores/restaurant';

type FetchOpts = NitroFetchOptions<string>;

export interface AuthFetchExtra {
  /**
   * false — на 401 не открывать модалку повторного входа, а просто бросить ошибку
   * (проверка профиля в middleware при загрузке страницы: формы ещё нет, терять нечего).
   */
  reauth?: boolean;
  /** false — не добавлять ?restaurant=<slug> выбранного ресторана */
  restaurant?: boolean;
}

/** HTTP-статус ошибки $fetch */
export function httpStatusOf(error: unknown): number | undefined {
  return (error as { statusCode?: number })?.statusCode ?? (error as { response?: { status?: number } })?.response?.status;
}

/**
 * Запрос к menu-api с токеном персонала. baseURL — runtimeConfig.public.apiBase (/api/v1).
 * К запросу добавляется ?restaurant=<slug> выбранного ресторана.
 * На 401 токен не стираем и на /login не уходим: открываем модалку повторного входа (useReauth),
 * ждём новый токен и повторяем исходный запрос — заполненная форма остаётся на месте.
 */
export const useAuthFetch = async <T>(request: string, opts: FetchOpts = {}, extra: AuthFetchExtra = {}): Promise<T> => {
  const auth = useAuthStore();
  const { apiBase } = useRuntimeConfig().public;
  const canReauth = extra.reauth !== false && import.meta.client;
  const slug = extra.restaurant === false ? '' : useRestaurantStore().slug;
  const query = { ...((opts.query as Record<string, unknown> | undefined) ?? {}), ...(slug ? { restaurant: slug } : {}) };

  // три попытки: исходная и до двух повторов после входа — защита от бесконечного цикла
  for (let attempt = 0; ; attempt++) {
    if (!auth.token) {
      if (!canReauth) throw Object.assign(new Error('Нет токена авторизации'), { statusCode: 401 });
      await requestReauth('expired');
    }
    const token = auth.token;
    const headers = {
      ...((opts.headers as Record<string, string> | undefined) ?? {}),
      Authorization: `Bearer ${token}`,
    };

    try {
      return (await $fetch(request, { baseURL: apiBase, ...opts, query, headers })) as T;
    } catch (error) {
      if (httpStatusOf(error) !== 401 || !canReauth || attempt >= 2) throw error;
      // токен могли уже обновить параллельный запрос или соседняя вкладка — тогда просто повторяем
      if (auth.token === token) await requestReauth('expired');
    }
  }
};
