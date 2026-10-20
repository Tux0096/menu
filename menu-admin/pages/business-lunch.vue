<script setup lang="ts">
// Конструктор бизнес-ланча («Собери свой ланч»): время действия, наборы, ассортимент шагов, напитки к ланчу.
// Наборы приходят из iiko (раздел «Бизнес-ланч» внешнего меню кухни), напитки — из меню бара; здесь — что и когда показывать гостю.
interface Sched { days: number[]; from: string; to: string; tz: string }
interface Point { slug: string; name: string; override: Sched | null; hasLunch: boolean; active: boolean; nextStart: string | null; text: string }
interface Combo { key: string; title: string; auto: string; custom: string; iikoName: string; enabled: boolean; price: number; points: string[]; image: string; iikoImage: string | null; description: string; weight: string; iikoWeight: string | null }
interface StepItem { key: string; iikoName: string; name: string; auto: string; custom: string; description: string; weight: string; iikoWeight: string | null; price: number; image: string | null; enabled: boolean }
interface Step { key: string; title: string; items: StepItem[] }
interface Drink { key: string; iikoName: string; name: string; price: number; image: string | null; enabled: boolean }
interface Placement { category: string; position: 'first' | 'last' | 'index'; index?: number }
interface Cat { key: string; name: string; tab: 'kitchen' | 'bar' }
interface LunchAdmin { schedule: Sched; text: string; image: string | null; placement: Placement | null; categories: Cat[]; points: Point[]; combos: Combo[]; steps: Step[]; drinks: Drink[] }

useHead({ title: 'Бизнес-ланч — Фуджи' });
const notify = useNotify();
const confirm = useConfirm();
const { upload } = useUpload();
const imageAccept = IMAGE_TYPES.join(',');

const data = ref<LunchAdmin | null>(null);

// Как бизнес-ланч пришёл из iiko при последней выгрузке — чтобы видеть, почему набор не попал к гостям
interface IikoLunchItem { name: string; hidden: boolean; sellable: boolean; sizes: { name: string; hidden: boolean; menuPrice: number; tillPrice: number; groups: { name: string; hidden: boolean; min: number; max: number; free: number; items: { name: string; price: number; hidden: boolean }[] }[] }[] }
interface IikoLunch { restaurant: string; source: string; menuName: string | null; at: string; lunch: { category: string; hidden: boolean; items: IikoLunchItem[] }[] | null }
const iiko = ref<IikoLunch[] | null>(null);
onMounted(async () => {
  try {
    iiko.value = await useAuthFetch<IikoLunch[]>('/admin/business-lunch/iiko', {}, { restaurant: false });
  } catch {
    iiko.value = [];
  }
});
const srcLabel = (s: string) => (s === 'main' ? 'кухня' : s === 'bar' ? 'бар' : s);
const initial = ref('');
const loadError = ref('');
const loading = ref(false);
const DAYS = [{ n: 1, l: 'пн' }, { n: 2, l: 'вт' }, { n: 3, l: 'ср' }, { n: 4, l: 'чт' }, { n: 5, l: 'пт' }, { n: 6, l: 'сб' }, { n: 7, l: 'вс' }];
const ZONES = [
  { value: 'Europe/Kaliningrad', label: 'Калининград (UTC+2)' }, { value: 'Europe/Moscow', label: 'Москва (UTC+3)' },
  { value: 'Europe/Samara', label: 'Самара (UTC+4)' }, { value: 'Asia/Yekaterinburg', label: 'Екатеринбург (UTC+5)' },
  { value: 'Asia/Omsk', label: 'Омск (UTC+6)' }, { value: 'Asia/Novosibirsk', label: 'Новосибирск (UTC+7)' },
  { value: 'Asia/Krasnoyarsk', label: 'Красноярск (UTC+7)' }, { value: 'Asia/Irkutsk', label: 'Иркутск (UTC+8)' },
  { value: 'Asia/Vladivostok', label: 'Владивосток (UTC+10)' },
];

const state = () => JSON.stringify(data.value && [data.value.image, data.value.placement, data.value.schedule, data.value.points.map((p) => [p.slug, p.override]), data.value.combos.map((c) => [c.key, c.custom, c.enabled, c.image, c.description, c.weight]), data.value.steps.map((s) => s.items.map((i) => [i.key, i.enabled, i.custom, i.description, i.weight])), data.value.drinks.map((d) => [d.key, d.enabled])]);
async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    data.value = await useAuthFetch<LunchAdmin>('/admin/business-lunch', {}, { restaurant: false });
    initial.value = state();
    initialContent.value = new Map(stepItems().map((it) => [it.key, contentOf(it)]));
  } catch (e) {
    loadError.value = getErrorMessage(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);
const dirty = computed(() => Boolean(data.value) && state() !== initial.value);
useLeaveGuard(dirty);

// ── Место карточки в меню ──
const catOptions = computed(() => (data.value?.categories ?? []).map((c) => ({ value: c.key, label: `${c.tab === 'bar' ? 'Бар' : 'Кухня'} · ${c.name}` })));
const customPlace = computed({
  get: () => Boolean(data.value?.placement),
  set: (v: boolean) => {
    const d = data.value;
    if (!d) return;
    // По умолчанию — как сейчас: первой в разделе «Бизнес-ланч»; при включении предлагаем этот раздел или первый в списке
    const lunchCat = d.categories.find((c) => /бизнес ланч/.test(c.key) && c.tab === 'kitchen') ?? d.categories[0];
    d.placement = v ? { category: lunchCat?.key ?? '', position: 'first', index: 1 } : null;
  },
});
const POSITIONS = [{ v: 'first', l: 'Первой' }, { v: 'last', l: 'Последней' }, { v: 'index', l: 'На месте №' }] as const;
const placeCat = computed(() => data.value?.categories.find((c) => c.key === data.value?.placement?.category) ?? null);
const placeError = computed(() => {
  const pl = data.value?.placement;
  if (!pl) return '';
  if (!pl.category) return 'Выберите раздел';
  if (!placeCat.value) return 'Такого раздела сейчас нет в меню (скрыт или удалён) — карточка останется в разделе «Бизнес-ланч»';
  return '';
});
const placeText = computed(() => {
  const pl = data.value?.placement;
  if (!pl || !placeCat.value) return 'Карточка стоит первой в разделе «Бизнес-ланч» кухни';
  const where = pl.position === 'first' ? 'первой в разделе' : pl.position === 'last' ? 'последней в разделе' : `на ${pl.index || 1}-м месте в разделе`;
  return `Гость увидит карточку ${where} «${placeCat.value.name}» (${placeCat.value.tab === 'bar' ? 'вкладка «Бар»' : 'вкладка «Кухня»'})`;
});

// ── Подробности набора и блюда: название, фото, описание, вес ──
const openRows = ref<Set<string>>(new Set());
function toggleRow(key: string) {
  const next = new Set(openRows.value);
  if (next.has(key)) next.delete(key); else next.add(key);
  openRows.value = next;
}
async function pickComboImage(c: Combo, e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  imageSaving.value = c.key;
  try {
    c.image = await upload(file);
  } catch (err) {
    notify.error(err, `Не удалось загрузить ${file.name}`);
  } finally {
    imageSaving.value = '';
  }
}

function toggleDay(s: Sched, n: number) {
  s.days = s.days.includes(n) ? s.days.filter((d) => d !== n) : [...s.days, n].sort((a, b) => a - b);
}
function move<T>(list: T[], i: number, d: number) {
  const j = i + d;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
}
function setOverride(p: Point, on: boolean) {
  p.override = on ? { ...(data.value as LunchAdmin).schedule, days: [...(data.value as LunchAdmin).schedule.days] } : null;
}
const when = (iso: string | null, tz: string) => (iso ? new Intl.DateTimeFormat('ru-RU', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : '');
const scheduleError = (s: Sched) => (!s.days.length ? 'Выберите хотя бы один день' : !s.from || !s.to ? 'Укажите время' : '');
const hasError = computed(() => Boolean(data.value && (scheduleError(data.value.schedule) || data.value.points.some((p) => p.override && scheduleError(p.override)) || (data.value.placement && !data.value.placement.category))));

const contentOf = (it: StepItem) => JSON.stringify([it.custom, it.description, it.weight]);
const initialContent = ref(new Map<string, string>());
const stepItems = () => (data.value?.steps ?? []).flatMap((s) => s.items);
function contentChanges() {
  const out = new Map<string, { iikoName: string; title: string; description: string; weight: string }>();
  for (const it of stepItems()) {
    if (initialContent.value.get(it.key) !== contentOf(it)) out.set(it.iikoName, { iikoName: it.iikoName, title: it.custom, description: it.description, weight: it.weight });
  }
  return [...out.values()];
}

const saving = ref(false);
async function save() {
  const d = data.value;
  if (!d || hasError.value) return;
  saving.value = true;
  try {
    await useAuthFetch('/admin/business-lunch', {
      method: 'PUT',
      body: {
        schedule: d.schedule,
        image: d.image || null,
        overrides: Object.fromEntries(d.points.map((p) => [p.slug, p.override])),
        placement: d.placement,
        combos: Object.fromEntries(d.combos.map((c, i) => [c.key, { enabled: c.enabled, title: c.custom, order: i, image: c.image, description: c.description, weight: c.weight }])),
        // Свои название, описание и вес блюд (общие для сети по названию в iiko, как фото) — только изменённые
        content: contentChanges(),
        items: Object.fromEntries(d.steps.flatMap((s) => s.items.map((it, i) => [it.key, { enabled: it.enabled, order: i }]))),
        drinks: Object.fromEntries(d.drinks.map((x, i) => [x.key, { enabled: x.enabled, order: i }])),
      },
    }, { restaurant: false });
    notify.success('Бизнес-ланч сохранён', 'Гости увидят изменения, когда откроют или обновят меню');
    await load();
  } catch (e) {
    notify.error(e, 'Не удалось сохранить');
  } finally {
    saving.value = false;
  }
}
async function reset() {
  if (dirty.value && !(await confirm({ title: 'Отменить изменения?', description: 'Всё вернётся к сохранённому.', confirmLabel: 'Отменить изменения' }))) return;
  await load();
}

// Фото варианта — то же, что во вкладке «Модификаторы»: общее для сети, привязано к названию в iiko
const imageSaving = ref('');
async function setImage(it: { key: string; iikoName: string; image: string | null }, image: string | null) {
  imageSaving.value = it.key;
  try {
    await useAuthFetch('/admin/network-menu/modifiers/image', { method: 'POST', body: { name: it.iikoName, image } }, { restaurant: false });
    for (const s of data.value?.steps ?? []) for (const x of s.items) if (x.iikoName === it.iikoName) x.image = image;
    notify.success(image ? `Фото «${it.iikoName}» сохранено` : `Фото «${it.iikoName}» убрано`);
  } catch (e) {
    notify.error(e, 'Не удалось сохранить фото');
  } finally {
    imageSaving.value = '';
  }
}
async function pickImage(it: StepItem, e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  imageSaving.value = it.key;
  try {
    await setImage(it, await upload(file));
  } catch (err) {
    notify.error(err, `Не удалось загрузить ${file.name}`);
    imageSaving.value = '';
  }
}
const shortName = (n: string) => n.replace(/^Фуджи\s+/i, '');
</script>

<template>
  <div>
    <PageHeader
      title="Бизнес-ланч"
      icon="i-heroicons-clock"
      description="Конструктор «Собери свой ланч»: когда он действует, какие наборы и блюда видит гость, в каком порядке. Наборы и цены приходят из iiko (раздел «Бизнес-ланч» меню кухни), напитки — из меню бара. Вне времени гость видит конструктор неактивным, а заказать набор нельзя."
    >
      <UButton color="white" :disabled="!dirty || saving" @click="reset">Отменить</UButton>
      <UButton :loading="saving" :disabled="!dirty || hasError" icon="i-heroicons-check" @click="save">Сохранить</UButton>
    </PageHeader>

    <LoadError v-if="loadError" :message="loadError" @retry="load" />
    <TableSkeleton v-else-if="!data" :rows="6" />
    <div v-else class="space-y-5">
      <!-- Обложка позиции «Бизнес-ланч» в меню гостя -->
      <section class="panel-box flex flex-wrap items-center gap-4 p-4">
        <div class="h-28 w-44 shrink-0 overflow-hidden rounded-xl bg-cream ring-1 ring-brand-100">
          <img v-if="data.image" :src="thumbUrl(data.image, 480)" alt="" class="h-full w-full object-cover" />
          <div v-else class="grid h-full place-items-center text-center text-xs text-slate-500">фото первого<br>набора</div>
        </div>
        <div class="min-w-[220px] flex-1 space-y-2">
          <h2 class="text-base font-semibold text-slate-800">Обложка в меню</h2>
          <p class="text-xs text-slate-500">Бизнес-ланч в меню гостя — одна позиция с большим фото; по нажатию — выбор набора и конструктор. Пусто — фото первого набора из iiko.</p>
          <div class="flex flex-wrap gap-2">
            <UploadBox accept="image" compact @uploaded="(url: string) => (data!.image = url)" />
            <UButton v-if="data.image" size="xs" color="white" icon="i-heroicons-x-mark" @click="data!.image = null">Убрать</UButton>
          </div>
        </div>
      </section>
      <!-- Где в меню гостя стоит карточка -->
      <section class="panel-box space-y-3 p-4">
        <h2 class="text-base font-semibold text-slate-800">Место в меню</h2>
        <p class="text-sm text-slate-500">В каком разделе и на каком месте гость увидит карточку «Бизнес-ланч». По умолчанию — первой в разделе «Бизнес-ланч» кухни.</p>
        <label class="flex items-center gap-2 text-sm"><UToggle v-model="customPlace" aria-label="Выбрать место карточки" /> {{ customPlace ? 'Своё место' : 'Как сейчас (по умолчанию)' }}</label>
        <div v-if="data.placement" class="flex flex-wrap items-end gap-x-5 gap-y-3">
          <div class="text-xs text-slate-500">Раздел меню
            <USelect v-model="data.placement.category" :options="catOptions" class="mt-1 w-72" placeholder="Выберите раздел" aria-label="Раздел меню для бизнес-ланча" />
          </div>
          <div>
            <div class="mb-1 text-xs text-slate-500">Место в разделе</div>
            <div class="flex items-center gap-1" role="group" aria-label="Место в разделе">
              <button
                v-for="p in POSITIONS" :key="p.v" type="button"
                class="h-9 whitespace-nowrap rounded-lg px-3 text-sm font-medium ring-1 transition"
                :class="data.placement.position === p.v ? 'bg-brand-500 text-white ring-brand-500' : 'bg-white text-slate-600 ring-brand-100 hover:ring-brand-200'"
                :aria-pressed="data.placement.position === p.v"
                @click="data.placement.position = p.v"
              >{{ p.l }}</button>
              <input
                v-if="data.placement.position === 'index'" v-model.number="data.placement.index" type="number" min="1" max="99"
                class="ml-1 h-9 w-16 rounded-lg px-2 text-sm ring-1 ring-brand-100" aria-label="Порядковый номер в разделе"
              >
            </div>
          </div>
        </div>
        <p v-if="placeError" class="text-sm text-amber-700">{{ placeError }}</p>
        <p class="text-sm text-slate-600"><b>{{ placeText }}</b>.<template v-if="data.placement"> Если раздел вне времени показа, карточка вернётся в «Бизнес-ланч».</template></p>
      </section>
      <!-- Время действия -->
      <section class="panel-box space-y-4 p-4">
        <h2 class="text-base font-semibold text-slate-800">Время действия</h2>
        <div class="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <div class="mb-1 text-xs text-slate-500">Дни недели</div>
            <div class="flex gap-1" role="group" aria-label="Дни недели">
              <button
                v-for="d in DAYS" :key="d.n" type="button"
                class="h-9 w-10 rounded-lg text-sm font-medium ring-1 transition"
                :class="data.schedule.days.includes(d.n) ? 'bg-brand-500 text-white ring-brand-500' : 'bg-white text-slate-600 ring-brand-100 hover:ring-brand-200'"
                :aria-pressed="data.schedule.days.includes(d.n)"
                @click="toggleDay(data.schedule, d.n)"
              >{{ d.l }}</button>
            </div>
          </div>
          <label class="text-xs text-slate-500">С
            <input v-model="data.schedule.from" type="time" class="mt-1 block h-9 rounded-lg px-2 text-sm text-slate-800 ring-1 ring-brand-100" aria-label="Начало, часы:минуты">
          </label>
          <label class="text-xs text-slate-500">До
            <input v-model="data.schedule.to" type="time" class="mt-1 block h-9 rounded-lg px-2 text-sm text-slate-800 ring-1 ring-brand-100" aria-label="Конец, часы:минуты">
          </label>
          <div class="text-xs text-slate-500">Часовой пояс
            <USelect v-model="data.schedule.tz" :options="ZONES" class="mt-1 w-56" aria-label="Часовой пояс" />
          </div>
        </div>
        <p v-if="scheduleError(data.schedule)" class="text-sm text-red-600">{{ scheduleError(data.schedule) }}</p>
        <p class="text-sm text-slate-600">
          Покажем гостям: <b>Бизнес-ланч доступен {{ data.schedule.from && data.schedule.to ? `с ${data.schedule.from} до ${data.schedule.to}` : '' }}</b>.
          Окно «22:00–02:00» работает через полночь. Время считается по часовому поясу точки.
        </p>

        <div v-if="data.points.some((p) => p.hasLunch)" class="border-t border-brand-50 pt-3">
          <div class="mb-2 text-sm font-medium text-slate-700">Точки</div>
          <ul class="space-y-2">
            <li v-for="p in data.points.filter((x) => x.hasLunch)" :key="p.slug" class="rounded-lg bg-cream/60 px-3 py-2">
              <div class="flex flex-wrap items-center gap-3">
                <span class="min-w-[160px] flex-1 font-medium text-slate-800">{{ shortName(p.name) }}</span>
                <UBadge :color="p.active ? 'green' : 'gray'" variant="subtle">{{ p.active ? 'Сейчас действует' : 'Сейчас закрыт' }}</UBadge>
                <span v-if="!p.active && p.nextStart" class="text-xs text-slate-500">откроется {{ when(p.nextStart, p.override?.tz || data.schedule.tz) }}</span>
                <label class="flex items-center gap-2 text-sm"><UToggle :model-value="Boolean(p.override)" @update:model-value="(v: boolean) => setOverride(p, v)" /> своё время</label>
              </div>
              <div v-if="p.override" class="mt-2 flex flex-wrap items-end gap-x-5 gap-y-2">
                <div class="flex gap-1">
                  <button
                    v-for="d in DAYS" :key="d.n" type="button"
                    class="h-8 w-9 rounded-md text-xs font-medium ring-1 transition"
                    :class="p.override.days.includes(d.n) ? 'bg-brand-500 text-white ring-brand-500' : 'bg-white text-slate-600 ring-brand-100'"
                    @click="toggleDay(p.override, d.n)"
                  >{{ d.l }}</button>
                </div>
                <input v-model="p.override.from" type="time" class="h-8 rounded-md px-2 text-sm ring-1 ring-brand-100" :aria-label="`${p.name}: начало`">
                <input v-model="p.override.to" type="time" class="h-8 rounded-md px-2 text-sm ring-1 ring-brand-100" :aria-label="`${p.name}: конец`">
                <USelect v-model="p.override.tz" :options="ZONES" size="sm" class="w-52" :aria-label="`${p.name}: часовой пояс`" />
                <span v-if="scheduleError(p.override)" class="text-sm text-red-600">{{ scheduleError(p.override) }}</span>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <!-- Наборы -->
      <section class="panel-box p-4">
        <h2 class="text-base font-semibold text-slate-800">Наборы</h2>
        <p class="mb-3 text-sm text-slate-500">Позиции раздела «Бизнес-ланч» меню кухни, в которых блюда выбираются модификаторами. Цена — из iiko, только показ. Порядок — как у гостя.</p>
        <EmptyState v-if="!data.combos.length" compact title="Наборов не найдено" description="В меню кухни нет раздела «Бизнес-ланч» с наборами (позиции с выбором блюд). Они приходят из внешнего меню iiko при выгрузке." />
        <ul v-else class="divide-y divide-brand-50">
          <li v-for="(c, i) in data.combos" :key="c.key" class="flex flex-wrap items-center gap-3 py-2" :class="c.enabled ? '' : 'opacity-60'">
            <div class="flex flex-col">
              <UButton size="2xs" color="gray" variant="ghost" icon="i-heroicons-chevron-up" :disabled="i === 0" aria-label="Выше" @click="move(data.combos, i, -1)" />
              <UButton size="2xs" color="gray" variant="ghost" icon="i-heroicons-chevron-down" :disabled="i === data.combos.length - 1" aria-label="Ниже" @click="move(data.combos, i, 1)" />
            </div>
            <div class="min-w-[220px] flex-1">
              <UInput v-model="c.custom" :placeholder="c.auto" maxlength="120" :aria-label="`Название набора ${c.iikoName}`" />
              <div class="mt-0.5 text-[11px] text-slate-500">в iiko: «{{ c.iikoName }}» · на точках: {{ c.points.length }}</div>
            </div>
            <div class="w-24 text-right text-sm tabular-nums text-slate-700">{{ c.price ? `${c.price} ₽` : '—' }}</div>
            <UButton size="xs" color="white" icon="i-heroicons-pencil-square" :aria-expanded="openRows.has(c.key)" @click="toggleRow(c.key)">Фото и описание</UButton>
            <label class="flex items-center gap-2 text-sm"><UToggle v-model="c.enabled" :aria-label="`Показывать ${c.auto}`" /> {{ c.enabled ? 'Включён' : 'Выключен' }}</label>
            <div v-if="openRows.has(c.key)" class="grid basis-full gap-3 rounded-xl bg-cream/60 p-3 sm:grid-cols-[120px_1fr]">
              <div class="space-y-2">
                <div class="grid h-24 w-28 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-brand-100">
                  <img v-if="c.image || c.iikoImage" :src="thumbUrl(c.image || c.iikoImage || '', 240)" alt="" class="h-full w-full object-cover">
                  <UIcon v-else name="i-heroicons-photo" class="h-6 w-6 text-slate-300" />
                </div>
                <div class="flex flex-wrap gap-1">
                  <label class="inline-flex cursor-pointer items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-300 hover:bg-slate-50" :class="imageSaving === c.key ? 'pointer-events-none opacity-60' : ''">
                    <input type="file" :accept="imageAccept" class="hidden" @change="pickComboImage(c, $event)">
                    <UIcon name="i-heroicons-photo" class="h-4 w-4" />{{ c.image ? 'Заменить' : 'Фото' }}
                  </label>
                  <UButton v-if="c.image" size="2xs" color="white" @click="c.image = ''">Как в iiko</UButton>
                </div>
              </div>
              <div class="space-y-2">
                <label class="block text-xs text-slate-500">Описание или состав
                  <UTextarea v-model="c.description" :rows="2" maxlength="300" placeholder="Например: салат, суп и горячее на выбор" :aria-label="`Описание набора ${c.auto}`" />
                </label>
                <label class="block text-xs text-slate-500">Вес
                  <UInput v-model="c.weight" maxlength="30" :placeholder="c.iikoWeight || 'например, 650 г'" class="w-48" :aria-label="`Вес набора ${c.auto}`" />
                </label>
                <p class="text-[11px] text-slate-500">Пусто — как в iiko. Название набора меняется в поле слева. Свои правки главнее iiko: выгрузка их не затирает.</p>
              </div>
            </div>
          </li>
        </ul>
      </section>

      <!-- Ассортимент шагов -->
      <section class="panel-box p-4">
        <h2 class="text-base font-semibold text-slate-800">Ассортимент шагов</h2>
        <p class="mb-3 text-sm text-slate-500">Блюда каждого шага: название, фото, описание, вес (общие для сети, как в «Модификаторах»), скрыть вариант из конструктора, порядок. Скрытый вариант заказать нельзя. Нажмите карандаш — откроются поля блюда.</p>
        <EmptyState v-if="!data.steps.length" compact title="Шагов нет" />
        <div v-for="s in data.steps" :key="s.key" class="mb-4 last:mb-0">
          <div class="mb-1 text-sm font-semibold text-slate-700">{{ s.title }}</div>
          <ul class="grid gap-x-6 gap-y-1 lg:grid-cols-2">
            <li v-for="(it, i) in s.items" :key="it.key" class="flex flex-wrap items-center gap-2 rounded-lg px-1 py-1.5" :class="[it.enabled ? '' : 'opacity-50', openRows.has(it.key) ? 'lg:col-span-2' : '']">
              <div class="flex flex-col">
                <UButton size="2xs" color="gray" variant="ghost" icon="i-heroicons-chevron-up" :disabled="i === 0" aria-label="Выше" @click="move(s.items, i, -1)" />
                <UButton size="2xs" color="gray" variant="ghost" icon="i-heroicons-chevron-down" :disabled="i === s.items.length - 1" aria-label="Ниже" @click="move(s.items, i, 1)" />
              </div>
              <div class="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-cream ring-1 ring-brand-100">
                <img v-if="it.image" :src="thumbUrl(it.image, 160)" alt="" class="h-full w-full object-cover">
                <UIcon v-else name="i-heroicons-photo" class="h-5 w-5 text-slate-300" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm text-slate-800">{{ it.custom || it.name }}</div>
                <div class="text-[11px] text-slate-500">{{ it.price ? `${it.price} ₽` : 'без доплаты' }}<template v-if="it.weight || it.iikoWeight"> · {{ it.weight || it.iikoWeight }}</template><template v-if="!it.image"> · нет фото</template><template v-if="it.description"> · есть описание</template></div>
              </div>
              <UButton size="2xs" color="gray" variant="ghost" icon="i-heroicons-pencil-square" :aria-expanded="openRows.has(it.key)" :aria-label="`Изменить ${it.name}`" @click="toggleRow(it.key)" />
              <label
                class="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-300 hover:bg-slate-50"
                :class="imageSaving === it.key ? 'pointer-events-none opacity-60' : ''"
              >
                <input type="file" :accept="imageAccept" class="hidden" @change="pickImage(it, $event)">
                <UIcon name="i-heroicons-photo" class="h-4 w-4" />{{ it.image ? 'Заменить' : 'Фото' }}
              </label>
              <UToggle v-model="it.enabled" :aria-label="`Показывать ${it.name}`" />
              <div v-if="openRows.has(it.key)" class="grid basis-full gap-2 rounded-xl bg-cream/60 p-3 sm:grid-cols-2">
                <label class="block text-xs text-slate-500 sm:col-span-2">Название для гостя
                  <UInput v-model="it.custom" maxlength="120" :placeholder="it.auto" :aria-label="`Название блюда ${it.iikoName}`" />
                  <span class="mt-0.5 block text-[11px]">в iiko: «{{ it.iikoName }}»</span>
                </label>
                <label class="block text-xs text-slate-500 sm:col-span-2">Описание или состав
                  <UTextarea v-model="it.description" :rows="2" maxlength="500" placeholder="Например: курица, огурец, сыр, соус цезарь" :aria-label="`Описание блюда ${it.name}`" />
                </label>
                <label class="block text-xs text-slate-500">Вес
                  <UInput v-model="it.weight" maxlength="30" :placeholder="it.iikoWeight || 'например, 250 г'" :aria-label="`Вес блюда ${it.name}`" />
                </label>
                <div class="flex flex-wrap items-end gap-2 text-[11px] text-slate-500">
                  Фото — кнопка «{{ it.image ? 'Заменить' : 'Фото' }}» в строке. Название, описание, вес и фото общие для сети (как во вкладке «Модификаторы») и не затираются выгрузкой из iiko.
                </div>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <!-- Напитки к ланчу -->
      <section class="panel-box p-4">
        <h2 class="text-base font-semibold text-slate-800">Напитки к ланчу</h2>
        <p class="mb-3 text-sm text-slate-500">Раздел «Бизнес-ланч» меню бара — гость видит их последним шагом «Напиток к ланчу (по желанию)». Цены — из iiko, это отдельные позиции заказа.</p>
        <EmptyState v-if="!data.drinks.length" compact title="Напитков не найдено" description="В меню бара нет раздела «Бизнес-ланч»." />
        <ul v-else class="grid gap-x-6 gap-y-1 lg:grid-cols-2">
          <li v-for="(x, i) in data.drinks" :key="x.key" class="flex items-center gap-2 rounded-lg px-1 py-1.5" :class="x.enabled ? '' : 'opacity-50'">
            <div class="flex flex-col">
              <UButton size="2xs" color="gray" variant="ghost" icon="i-heroicons-chevron-up" :disabled="i === 0" aria-label="Выше" @click="move(data.drinks, i, -1)" />
              <UButton size="2xs" color="gray" variant="ghost" icon="i-heroicons-chevron-down" :disabled="i === data.drinks.length - 1" aria-label="Ниже" @click="move(data.drinks, i, 1)" />
            </div>
            <div class="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-cream ring-1 ring-brand-100">
              <img v-if="x.image" :src="thumbUrl(x.image, 120)" alt="" class="h-full w-full object-cover">
              <span v-else class="text-sm text-slate-400">{{ x.name.slice(0, 1) }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm text-slate-800">{{ x.name }}</div>
              <div class="text-[11px] text-slate-500">{{ x.price }} ₽</div>
            </div>
            <UToggle v-model="x.enabled" :aria-label="`Показывать ${x.name}`" />
          </li>
        </ul>
      </section>

      <details v-if="iiko?.length" class="panel-box overflow-hidden">
        <summary class="cursor-pointer px-4 py-3 text-sm font-medium">Как бизнес-ланч пришёл из iiko (последняя выгрузка)</summary>
        <div class="space-y-4 border-t border-brand-50 px-4 py-3 text-sm">
          <p class="text-xs text-slate-500">Разделы и позиции внешнего меню iiko со словом «ланч»: цена во внешнем меню, цена кассы, группы выбора. «Не продаётся» — позиция без цены и без платного выбора, к гостям не попадает.</p>
          <div v-for="r in iiko" :key="r.restaurant + r.source">
            <div class="font-semibold">{{ r.restaurant }} · {{ srcLabel(r.source) }} <span class="font-normal text-slate-500">— меню «{{ r.menuName || '?' }}», {{ formatDayTime(r.at) }}</span></div>
            <p v-if="r.lunch === null" class="text-xs text-slate-500">Разбора ещё нет — появится после следующей выгрузки («Меню сети» → «Обновить из iiko»).</p>
            <p v-else-if="!r.lunch.length" class="text-xs text-amber-700">Во внешнем меню нет разделов и позиций со словом «ланч».</p>
            <div v-for="c in r.lunch || []" :key="c.category" class="mt-2 rounded-lg bg-cream p-2">
              <div class="font-medium">Раздел «{{ c.category }}»<span v-if="c.hidden" class="text-amber-700"> — скрыт во внешнем меню</span></div>
              <ul class="mt-1 space-y-1">
                <li v-for="it in c.items" :key="it.name" class="text-xs">
                  <b>{{ it.name }}</b>
                  <span :class="it.sellable ? 'text-green-700' : 'text-red-700'"> · {{ it.sellable ? 'продаётся' : 'не продаётся' }}</span><span v-if="it.hidden" class="text-amber-700"> · скрыта</span>
                  <div v-for="z in it.sizes" :key="z.name" class="pl-3 text-slate-600">
                    {{ z.name || 'размер' }}: в меню {{ z.menuPrice }} ₽, на кассе {{ z.tillPrice }} ₽<span v-if="z.hidden"> · скрыт</span>
                    <div v-for="g in z.groups" :key="g.name" class="pl-3">
                      «{{ g.name }}» (мин {{ g.min }}, макс {{ g.max }}, бесплатно {{ g.free }}){{ g.hidden ? ' · скрыта' : '' }}:
                      {{ g.items.map((m) => `${m.name} ${m.price} ₽${m.hidden ? ' (скрыт)' : ''}`).join(', ') || 'вариантов нет' }}
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </details>
    </div>
  </div>
</template>
