// Деньги в menu-api — рубли.
const rubFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** 1234.5 → «1 235 ₽». null/undefined → «—» */
export function formatRub(rub: number | null | undefined): string {
  if (rub === null || rub === undefined || Number.isNaN(rub)) return '—';
  return rubFormatter.format(rub);
}
