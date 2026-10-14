// Метки блюда в меню гостя (menu-api: menu_overrides.badge — коды через запятую; гостевое меню рисует их на фото).
// Набор и цвета — из макета Figma «WEB MENU»
export const TAGS: { value: string; label: string; bg: string; color: string }[] = [
  { value: 'mild', label: 'Остро (зелёный перец)', bg: '#C7EA98', color: '#2B5D21' },
  { value: 'spicy', label: 'Остро (красный перец)', bg: '#FFB9CA', color: '#76122B' },
  { value: 'new', label: 'Новинка', bg: '#FFC9AC', color: '#CB4700' },
  { value: 'hit', label: 'Хит', bg: '#DFC0FF', color: '#6000C7' },
  { value: 'kids', label: 'Детям', bg: '#FFCEEE', color: '#710049' },
  { value: 'gift', label: 'Подарок', bg: '#93C9EA', color: '#0C4F79' },
  { value: 'nosugar', label: 'Без сахара', bg: '#B0D77D', color: '#456E0F' },
];
// Подписи всех меток, включая прежние (вег, выгодно, шеф) — они остаются на уже размеченных блюдах
export const BADGES: Record<string, string> = {
  ...Object.fromEntries(TAGS.map((t) => [t.value, t.label])),
  veg: 'Вег',
  sale: 'Выгодно',
  chef: 'Шеф рекомендует',
};
export const badgeList = (v: string | null | undefined) => String(v || '').split(',').map((b) => b.trim()).filter(Boolean);

// Источник блюда: кухня (основная касса ИП) или бар (ведомая касса ООО «Регион Стандарт», крепкий алкоголь)
export const SOURCE_LABELS: Record<string, string> = { main: 'Кухня', bar: 'Бар' };
export const sourceLabel = (code: string | null | undefined) => SOURCE_LABELS[code || 'main'] ?? code ?? '';

/** Картинки iiko и загруженные в админке — мегабайты: в списке берём уменьшенную копию через /img (WebP) */
export function thumbUrl(url: string | null | undefined, width = 320): string | undefined {
  if (!url) return undefined;
  return url.startsWith('http') || url.startsWith('/media/') ? `/img?u=${encodeURIComponent(url)}&w=${width}` : url;
}
