function tz(): string {
  return useRuntimeConfig().public.timezone || 'Europe/Samara';
}

/** ISO → «22.09.2026, 14:05» в часовом поясе сети */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ru-RU', {
    timeZone: tz(),
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('ru-RU', { timeZone: tz(), hour: '2-digit', minute: '2-digit' });
}

/** +79991234567 → +7 999 123-45-67 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const m = phone.replace(/\D/g, '').match(/^7?(\d{3})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+7 ${m[1]} ${m[2]}-${m[3]}-${m[4]}` : phone;
}

/** «08:00:00» → «08:00» */
export function formatHours(value: string | null | undefined): string {
  if (!value) return '—';
  return value.slice(0, 5);
}

export function pluralize(n: number, forms: [string, string, string]): string {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1];
  return forms[2];
}

/** ISO → «2026-09-25» — календарный день в часовом поясе сети (для фильтров по дате) */
export function dateKey(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '';
  // en-CA даёт формат YYYY-MM-DD
  return d.toLocaleDateString('en-CA', { timeZone: tz() });
}

export function todayKey(): string {
  return dateKey(new Date());
}

/** «сегодня, 14:05» / «вчера, 09:10» / «22.09, 14:05» */
export function formatDayTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const key = dateKey(iso);
  if (!key) return iso;
  const today = todayKey();
  const yesterday = dateKey(new Date(Date.now() - 86_400_000));
  const time = formatTime(iso);
  if (key === today) return `сегодня, ${time}`;
  if (key === yesterday) return `вчера, ${time}`;
  const d = new Date(iso);
  return `${d.toLocaleDateString('ru-RU', { timeZone: tz(), day: '2-digit', month: '2-digit' })}, ${time}`;
}

/** «только что», «5 мин назад», «2 ч назад», иначе дата */
export function formatAgo(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const diff = Math.round((Date.now() - d.getTime()) / 1000);
  if (Number.isNaN(diff)) return '—';
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)} ч назад`;
  return formatDayTime(d.toISOString());
}

/** Смещение пояса сети от UTC в минутах в момент `date` (Самара — всегда +240, но не зашиваем) */
function tzOffsetMin(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz(),
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((asUtc - date.getTime()) / 60_000);
}

/** «2026-10-05» + «10:30» по часовому поясу сети → ISO (UTC). Пустое/неверное — null */
export function zonedToIso(date: string, time: string): string | null {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  if ([y, m, d, hh, mm].some((n) => n === undefined || Number.isNaN(n))) return null;
  const guess = Date.UTC(y!, m! - 1, d!, hh!, mm!);
  return new Date(guess - tzOffsetMin(new Date(guess)) * 60_000).toISOString();
}

/** ISO → { date: «2026-10-05», time: «10:30» } в часовом поясе сети (для полей даты и времени) */
export function isoToZoned(iso: string | Date | null | undefined): { date: string; time: string } {
  if (!iso) return { date: '', time: '' };
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  return { date: dateKey(d), time: formatTime(d.toISOString()) };
}

/** Подпись часового пояса сети: «по Самаре, UTC+4» */
export function tzLabel(): string {
  const off = tzOffsetMin(new Date());
  const sign = off >= 0 ? '+' : '−';
  const h = Math.floor(Math.abs(off) / 60);
  const m = Math.abs(off) % 60;
  const name = tz() === 'Europe/Samara' ? 'по Самаре' : tz();
  return `${name}, UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}
