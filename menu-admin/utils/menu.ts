// Метки блюда в меню гостя (menu-api: menu_overrides.badge — коды через запятую; гостевое меню рисует их на фото).
// Набор и цвета — из макета Figma «WEB MENU»; цвета — токены tag-* в tailwind.config.ts (cls — готовые классы фона и текста)
export const TAGS: { value: string; label: string; cls: string }[] = [
  { value: 'mild', label: 'Остро (зелёный перец)', cls: 'bg-tag-mild text-tag-mild-ink' },
  { value: 'spicy', label: 'Остро (красный перец)', cls: 'bg-tag-spicy text-tag-spicy-ink' },
  { value: 'new', label: 'Новинка', cls: 'bg-tag-new text-tag-new-ink' },
  { value: 'hit', label: 'Хит', cls: 'bg-tag-hit text-tag-hit-ink' },
  { value: 'kids', label: 'Детям', cls: 'bg-tag-kids text-tag-kids-ink' },
  { value: 'gift', label: 'Подарок', cls: 'bg-tag-gift text-tag-gift-ink' },
  { value: 'nosugar', label: 'Без сахара', cls: 'bg-tag-nosugar text-tag-nosugar-ink' },
];
/** Классы метки, которой нет в TAGS (прежние: вег, выгодно, шеф) */
export const TAG_FALLBACK_CLS = 'bg-slate-100 text-slate-600';
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
