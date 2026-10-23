/**
 * Деньги в целых копейках. Колонки БД — NUMERIC(…,2) (точный десятичный тип), а вот JS-числа с плавающей точкой
 * (0.1 + 0.2 = 0.30000000000000004) для сумм платежей не годятся: считаем в копейках и сравниваем точно.
 */

/** Рубли (число или строка из NUMERIC: «1027.50») → целые копейки. Мусор и NaN → 0. */
export function toKop(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'string') {
    const m = value.trim().match(/^(-?)(\d+)(?:[.,](\d+))?$/);
    if (m) {
      const frac = (m[3] || '').padEnd(3, '0');
      const kop = Number(m[2]) * 100 + Number(frac.slice(0, 2)) + (Number(frac[2]) >= 5 ? 1 : 0);
      return m[1] ? -kop : kop;
    }
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  // toPrecision(15) убирает хвост двоичной дроби: 1.005 * 100 = 100.49999999999999 → 100.5 → 101
  return Math.sign(n) * Math.round(Number(Math.abs(n * 100).toPrecision(15)));
}

/** Копейки → рубли (число с двумя знаками после запятой; для JSON и колонок NUMERIC). */
export function fromKop(kop) {
  return Math.round(Number(kop) || 0) / 100;
}

/** Сумма в копейках: sumKop([0.1, 0.2]) = 30; для объектов — sumKop(rows, (r) => r.line_total). */
export function sumKop(list, pick = (x) => x) {
  let n = 0;
  for (const x of list || []) n += toKop(pick(x));
  return n;
}

/** Поделить копейки на `parts` частей без потери копейки: остаток раздаётся первым (10000 на 3 → 3334, 3333, 3333). */
export function splitKop(totalKop, parts) {
  const n = Math.max(1, Math.floor(Number(parts) || 1));
  const total = Math.round(Number(totalKop) || 0);
  const base = Math.floor(total / n);
  const rest = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
}

/** Цена за количество: копейки × штуки */
export const mulKop = (kop, qty) => Math.round(kop * qty);
