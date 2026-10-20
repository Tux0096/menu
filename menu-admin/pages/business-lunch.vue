<script setup lang="ts">
// Конструктор бизнес-ланча («Собери свой ланч»): время действия, наборы, ассортимент шагов, напитки к ланчу.
// Наборы приходят из iiko (раздел «Бизнес-ланч» внешнего меню кухни), напитки — из меню бара; здесь — что и когда показывать гостю.
interface Sched { days: number[]; from: string; to: string; tz: string }
interface Point { slug: string; name: string; override: Sched | null; hasLunch: boolean; active: boolean; nextStart: string | null; text: string }
interface Combo { key: string; title: string; auto: string; custom: string; iikoName: string; enabled: boolean; price: number; points: string[] }
interface StepItem { key: string; iikoName: string; name: string; price: number; image: string | null; enabled: boolean }
interface Step { key: string; title: string; items: StepItem[] }
interface Drink { key: string; iikoName: string; name: string; price: number; image: string | null; enabled: boolean }
interface LunchAdmin { schedule: Sched; text: string; points: Point[]; combos: Combo[]; steps: Step[]; drinks: Drink[] }

useHead({ title: 'Бизнес-ланч — Фуджи' });
const notify = useNotify();
const confirm = useConfirm();
const { upload } = useUpload();
const imageAccept = IMAGE_TYPES.join(',');

const data = ref<LunchAdmin | null>(null);
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

const state = () => JSON.stringify(data.value && [data.value.schedule, data.value.points.map((p) => [p.slug, p.override]), data.value.combos.map((c) => [c.key, c.custom, c.enabled]), data.value.steps.map((s) => s.items.map((i) => [i.key, i.enabled])), data.value.drinks.map((d) => [d.key, d.enabled])]);
async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    data.value = await useAuthFetch<LunchAdmin>('/admin/business-lunch', {}, { restaurant: false });
    initial.value = state();
  } catch (e) {
    loadError.value = getErrorMessage(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);
const dirty = computed(() => Boolean(data.value) && state() !== initial.value);
useLeaveGuard(dirty);

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
const hasError = computed(() => Boolean(data.value && (scheduleError(data.value.schedule) || data.value.points.some((p) => p.override && scheduleError(p.override)))));

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
        overrides: Object.fromEntries(d.points.map((p) => [p.slug, p.override])),
        combos: Object.fromEntries(d.combos.map((c, i) => [c.key, { enabled: c.enabled, title: c.custom, order: i }])),
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
            <label class="flex items-center gap-2 text-sm"><UToggle v-model="c.enabled" :aria-label="`Показывать ${c.auto}`" /> {{ c.enabled ? 'Включён' : 'Выключен' }}</label>
          </li>
        </ul>
      </section>

      <!-- Ассортимент шагов -->
      <section class="panel-box p-4">
        <h2 class="text-base font-semibold text-slate-800">Ассортимент шагов</h2>
        <p class="mb-3 text-sm text-slate-500">Блюда каждого шага: фото (общее для сети, как в «Модификаторах»), скрыть вариант из конструктора, порядок. Скрытый вариант заказать нельзя.</p>
        <EmptyState v-if="!data.steps.length" compact title="Шагов нет" />
        <div v-for="s in data.steps" :key="s.key" class="mb-4 last:mb-0">
          <div class="mb-1 text-sm font-semibold text-slate-700">{{ s.title }}</div>
          <ul class="grid gap-x-6 gap-y-1 lg:grid-cols-2">
            <li v-for="(it, i) in s.items" :key="it.key" class="flex items-center gap-2 rounded-lg px-1 py-1.5" :class="it.enabled ? '' : 'opacity-50'">
              <div class="flex flex-col">
                <UButton size="2xs" color="gray" variant="ghost" icon="i-heroicons-chevron-up" :disabled="i === 0" aria-label="Выше" @click="move(s.items, i, -1)" />
                <UButton size="2xs" color="gray" variant="ghost" icon="i-heroicons-chevron-down" :disabled="i === s.items.length - 1" aria-label="Ниже" @click="move(s.items, i, 1)" />
              </div>
              <div class="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-cream ring-1 ring-brand-100">
                <img v-if="it.image" :src="thumbUrl(it.image, 160)" alt="" class="h-full w-full object-cover">
                <UIcon v-else name="i-heroicons-photo" class="h-5 w-5 text-slate-300" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm text-slate-800">{{ it.name }}</div>
                <div class="text-[11px] text-slate-500">{{ it.price ? `${it.price} ₽` : 'без доплаты' }}<template v-if="!it.image"> · нет фото</template></div>
              </div>
              <label
                class="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-300 hover:bg-slate-50"
                :class="imageSaving === it.key ? 'pointer-events-none opacity-60' : ''"
              >
                <input type="file" :accept="imageAccept" class="hidden" @change="pickImage(it, $event)">
                <UIcon name="i-heroicons-photo" class="h-4 w-4" />{{ it.image ? 'Заменить' : 'Фото' }}
              </label>
              <UToggle v-model="it.enabled" :aria-label="`Показывать ${it.name}`" />
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
    </div>
  </div>
</template>
