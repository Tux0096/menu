import type { ApiError } from '~/types/api';

/**
 * Человекочитаемый текст ошибки: menu-api отвечает `{ error, code }`, сетевые ошибки — своим текстом.
 * Технические подробности не показываем.
 */
export function getErrorMessage(error: unknown, fallback = 'Не удалось выполнить запрос. Попробуйте ещё раз'): string {
  const e = error as {
    data?: Partial<ApiError>;
    statusCode?: number;
    message?: string;
  };
  if (typeof error === 'string') return error;
  if (typeof e?.data?.error === 'string' && e.data.error) return e.data.error;
  if (e?.statusCode === 401) return 'Сессия закончилась — войдите заново';
  if (e?.statusCode === 403) return 'Недостаточно прав для этого действия';
  if (e?.statusCode === 404) return 'Не найдено — возможно, запись уже удалили';
  if (e?.statusCode && e.statusCode >= 500) return 'Сервер временно не отвечает. Попробуйте через минуту';
  if (e?.message?.includes('Failed to fetch') || e?.message?.includes('<no response>') || e?.message?.includes('NetworkError')) {
    return 'Нет связи с сервером. Проверьте интернет и обновите страницу';
  }
  if (e instanceof Error && e.message && !e.message.startsWith('[')) return e.message;
  return fallback;
}
