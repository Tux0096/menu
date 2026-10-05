// Метки блюда в меню гостя (menu-api: menu_overrides.badge; гостевое меню рисует их на фото)
export const BADGES: Record<string, string> = {
  hit: 'Хит',
  new: 'Новинка',
  spicy: 'Острое',
  veg: 'Вег',
  sale: 'Выгодно',
  chef: 'Шеф рекомендует',
};

export const BADGE_OPTIONS = [{ value: '', label: 'Без метки' }, ...Object.entries(BADGES).map(([value, label]) => ({ value, label }))];

// Источник блюда: кухня (основная касса ИП) или бар (ведомая касса ООО «Регион Стандарт», крепкий алкоголь)
export const SOURCE_LABELS: Record<string, string> = { main: 'Кухня', bar: 'Бар' };
export const sourceLabel = (code: string | null | undefined) => SOURCE_LABELS[code || 'main'] ?? code ?? '';

/** Картинки iiko — мегабайты: в списке берём уменьшенную копию через /img */
export function thumbUrl(url: string | null | undefined, width = 320): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('/media/')) return url;
  return url.startsWith("http") ? `/img?u=${encodeURIComponent(url)}&w=${width}` : url;
}
