<script setup lang="ts">
import type { MenuCategory } from '~/types/api';

// Разделы меню для гостя (строка разделов и шторка «Меню»): порядок, своё название, вкладка «Кухня/Бар»,
// скрытие и картинка. Настройки общие для всех точек и привязаны к названию раздела в iiko —
// перевыгрузка меню их не затирает. Картинка сохраняется сразу, остальное — кнопкой «Сохранить».
const notify = useNotify();
const confirm = useConfirm();

const list = ref<MenuCategory[] | null>(null);
const initial = ref('');
const loadError = ref('');
async function load() {
  loadError.value = '';
  try {
    list.value = await useAuthFetch<MenuCategory[]>('/admin/network-menu/categories', {}, { restaurant: false });
    initial.value = snapshot();
  } catch (e) {
    loadError.value = getErrorMessage(e);
  }
}
onMounted(load);

const snapshot = () => JSON.stringify((list.value ?? []).map((c) => [c.key, c.title, c.tab, c.hidden, c.showFrom || '', c.showUntil || '']));
const dirty = computed(() => Boolean(list.value) && snapshot() !== initial.value);

// Время показа раздела («Завтраки до 12:00»): по времени точки; вне времени раздел скрыт у гостя, официант видит пометку
const hoursText = (c: MenuCategory) => {
  const f = c.showFrom || '';
  const u = c.showUntil || '';
  return f && u ? `с ${f} до ${u}` : u ? `до ${u}` : f ? `с ${f}` : '';
};
const hoursError = (c: MenuCategory) => (c.showFrom && c.showUntil && c.showFrom === c.showUntil ? 'Начало и конец совпадают' : '');
const hasError = computed(() => (list.value ?? []).some((c) => hoursError(c)));
function clearHours(c: MenuCategory) {
  c.showFrom = '';
  c.showUntil = '';
}
const emit = defineEmits<{ 'update:dirty': [boolean] }>();
watch(dirty, (v) => emit('update:dirty', v), { immediate: true });
useLeaveGuard(dirty);

// Вкладка у гостя: своя или по умолчанию (бар — напитки и касса бара)
const tabOf = (c: MenuCategory) => (c.tab === 'bar' || (!c.tab && c.isBar) ? 'bar' : 'kitchen');
const TAB_OPTIONS = [
  { value: '', label: 'Авто' },
  { value: 'kitchen', label: 'Кухня' },
  { value: 'bar', label: 'Бар' },
];

// Раздел с таким же названием есть и в кухне, и в баре — настраиваются отдельно, строки помечаем
const twin = (c: MenuCategory) => (list.value ?? []).some((x) => x !== c && x.name.trim().toLowerCase() === c.name.trim().toLowerCase() && Boolean(x.bar) !== Boolean(c.bar));
const sourceLabel = (c: MenuCategory) => (twin(c) ? (c.bar ? '(бар)' : '(кухня)') : '');

// Порядок: стрелки и перетаскивание
function move(i: number, d: number) {
  const l = list.value!;
  const j = i + d;
  if (j < 0 || j >= l.length) return;
  [l[i], l[j]] = [l[j]!, l[i]!];
}
const dragFrom = ref<number | null>(null);
function onDrop(i: number) {
  const from = dragFrom.value;
  dragFrom.value = null;
  if (from == null || from === i) return;
  const l = list.value!;
  const [it] = l.splice(from, 1);
  l.splice(i, 0, it!);
}

const saving = ref(false);
async function save() {
  if (!list.value) return;
  saving.value = true;
  try {
    await useAuthFetch('/admin/network-menu/categories', {
      method: 'PUT',
      body: { items: list.value.map((c) => ({ name: c.name, bar: c.bar, title: c.title, tab: c.tab || null, hidden: c.hidden, showFrom: c.showFrom || '', showUntil: c.showUntil || '' })) },
    }, { restaurant: false });
    initial.value = snapshot();
    notify.success('Разделы сохранены', 'Гости увидят новый порядок, когда откроют или обновят меню');
  } catch (e) {
    notify.error(e, 'Не удалось сохранить разделы');
  } finally {
    saving.value = false;
  }
}
async function reset() {
  if (dirty.value && !(await confirm({ title: 'Отменить изменения?', description: 'Порядок, названия и вкладки вернутся к сохранённым.', confirmLabel: 'Отменить изменения' }))) return;
  await load();
}

const imageSaving = ref('');
const { upload } = useUpload();
const imageAccept = IMAGE_TYPES.join(',');
async function pickImage(c: MenuCategory, e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  imageSaving.value = c.key;
  try {
    await setImage(c, await upload(file));
  } catch (err) {
    notify.error(err, `Не удалось загрузить ${file.name}`);
    imageSaving.value = '';
  }
}
async function setImage(c: MenuCategory, image: string | null) {
  imageSaving.value = c.key;
  try {
    await useAuthFetch('/admin/network-menu/categories', { method: 'POST', body: { name: c.name, bar: c.bar, image } }, { restaurant: false });
    c.image = image;
    notify.success(image ? `Картинка раздела «${c.title || c.name}» сохранена` : `У раздела «${c.title || c.name}» снова стандартная картинка`);
  } catch (e) {
    notify.error(e, 'Не удалось сохранить картинку');
  } finally {
    imageSaving.value = '';
  }
}

// Стандартные картинки гостевого меню — те же правила, что в menu-web/guest/app.js (CAT_IMAGES)
const DEFAULTS: [string, string][] = [['новин', 'novinki'], ['хит', 'hity'], ['ролл', 'rolly'], ['суш', 'rolly'], ['сет', 'rolly'],
  ['пицц', 'pizza'], ['бенто', 'bento'], ['wok', 'wok'], ['вок', 'wok'], ['лапш', 'wok'], ['бургер', 'burgery'], ['поке', 'poke'],
  ['салат', 'poke'], ['суп', 'supy'], ['горяч', 'goryachee'], ['закуск', 'zakuski'], ['десерт', 'deserty'], ['напит', 'napitki'],
  ['бар', 'napitki'], ['лимонад', 'napitki'], ['чай', 'napitki'], ['кофе', 'napitki'], ['соус', 'sousy']];
function defaultImage(name: string) {
  const n = name.toLowerCase();
  const hit = DEFAULTS.find(([k]) => n.includes(k));
  return hit ? `/ui/cats/${hit[1]}.webp` : null;
}
// Что видит гость: своя картинка → из iiko → стандартная по названию
const shown = (c: MenuCategory) => c.image || c.iikoImage || defaultImage(c.name);
const imageLabel = (c: MenuCategory) => (c.image ? 'своя картинка' : c.iikoImage ? 'картинка из iiko' : defaultImage(c.name) ? 'стандартная' : 'без картинки — у гостя значок');

// Превью шторки «Меню» как у гостя
const previewTab = ref<'kitchen' | 'bar'>('kitchen');
const previewTiles = computed(() => (list.value ?? []).filter((c) => !c.hidden && tabOf(c) === previewTab.value));
const missingImages = computed(() => (list.value ?? []).filter((c) => !c.hidden && !shown(c)).length);
</script>

<template>
  <SyncReport />
  <div class="grid gap-4 xl:grid-cols-[1fr_360px]">
    <div class="panel-box overflow-hidden">
      <div class="flex flex-wrap items-center gap-3 border-b border-brand-50 px-4 py-3">
        <div class="min-w-[220px] flex-1 text-sm text-slate-600">
          Порядок разделов в строке и в шторке «Меню» у гостя — общий для всех точек. Перетащите строку или нажмите стрелки.
          <span v-if="missingImages" class="text-amber-700">Без картинки: {{ missingImages }}.</span>
        </div>
        <UButton color="white" :disabled="!dirty || saving" @click="reset">Отменить</UButton>
        <UButton :loading="saving" :disabled="!dirty || hasError" icon="i-heroicons-check" @click="save">Сохранить</UButton>
      </div>
      <LoadError v-if="loadError" :message="loadError" class="m-4" />
      <TableSkeleton v-else-if="!list" :rows="6" />
      <EmptyState v-else-if="!list.length" title="Разделов пока нет" description="Меню точек ещё не выгружено из iiko." />
      <ul v-else class="divide-y divide-brand-50">
        <li
          v-for="(c, i) in list"
          :key="c.key"
          class="flex flex-wrap items-center gap-3 px-3 py-2.5 transition"
          :class="[c.hidden ? 'bg-slate-50 opacity-60' : '', dragFrom === i ? 'opacity-40' : '']"
          draggable="true"
          @dragstart="dragFrom = i"
          @dragover.prevent
          @drop="onDrop(i)"
        >
          <div class="flex w-8 shrink-0 cursor-grab flex-col items-center text-slate-400" title="Перетащите">
            <UIcon name="i-heroicons-bars-3" class="h-5 w-5" />
            <span class="text-[11px]">{{ i + 1 }}</span>
          </div>
          <div class="flex shrink-0 flex-col">
            <UButton size="2xs" color="gray" variant="ghost" icon="i-heroicons-chevron-up" :disabled="i === 0" aria-label="Выше" @click="move(i, -1)" />
            <UButton size="2xs" color="gray" variant="ghost" icon="i-heroicons-chevron-down" :disabled="i === list.length - 1" aria-label="Ниже" @click="move(i, 1)" />
          </div>
          <div class="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-brand-100">
            <img v-if="shown(c)" :src="thumbUrl(shown(c), 160)" alt="" class="h-12 w-12 object-contain" />
            <UIcon v-else name="i-heroicons-photo" class="h-6 w-6 text-amber-500" />
          </div>
          <div class="min-w-[180px] flex-1 space-y-1">
            <div class="flex items-center gap-2">
              <UInput v-model="c.title" size="sm" class="min-w-0 flex-1" :placeholder="c.name" maxlength="100" :aria-label="`Название раздела ${sourceLabel(c)} ${c.name}`" />
              <!-- Одноимённые разделы кухни и бара — две строки, их отличает пометка -->
              <UBadge v-if="twin(c)" :color="c.bar ? 'purple' : 'gray'" variant="subtle" size="xs">{{ c.bar ? 'бар' : 'кухня' }}</UBadge>
            </div>
            <div class="text-xs text-slate-500">
              <template v-if="c.title && c.title !== c.name">в iiko: «{{ c.name }}» · </template>
              {{ c.items }} блюд · точек: {{ c.points }} · {{ imageLabel(c) }}
            </div>
          </div>
          <USelect v-model="c.tab" :options="TAB_OPTIONS" size="sm" class="w-28" aria-label="Вкладка у гостя" />
          <label class="flex w-28 items-center gap-2 text-xs">
            <UToggle :model-value="!c.hidden" @update:model-value="(v: boolean) => (c.hidden = !v)" />
            {{ c.hidden ? 'скрыт' : 'показан' }}
          </label>
          <div class="flex items-center gap-1">
            <label
              class="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-300 hover:bg-slate-50"
              :class="imageSaving === c.key ? 'pointer-events-none opacity-60' : ''"
            >
              <input type="file" :accept="imageAccept" class="hidden" @change="pickImage(c, $event)">
              <UIcon name="i-heroicons-photo" class="h-4 w-4" />{{ c.image ? 'Заменить' : 'Картинка' }}
            </label>
            <UButton v-if="c.image" size="xs" color="white" :loading="imageSaving === c.key" @click="setImage(c, null)">Стандартная</UButton>
          </div>
          <!-- Время показа: «до 12:00» / «с 18:00» / окно; пусто — раздел виден всегда -->
          <div class="flex basis-full flex-wrap items-center gap-x-3 gap-y-1 sm:pl-[5.5rem] text-xs text-slate-600">
            <UIcon name="i-heroicons-clock" class="h-4 w-4" :class="hoursText(c) ? 'text-brand-500' : 'text-slate-400'" />
            <span class="font-medium">Показывать</span>
            <label class="flex items-center gap-1">с
              <input v-model="c.showFrom" type="time" class="h-8 rounded-md px-2 text-sm ring-1 ring-brand-100" :aria-label="`Раздел ${c.title || c.name}: показывать с`">
            </label>
            <label class="flex items-center gap-1">до
              <input v-model="c.showUntil" type="time" class="h-8 rounded-md px-2 text-sm ring-1 ring-brand-100" :aria-label="`Раздел ${c.title || c.name}: показывать до`">
            </label>
            <UButton v-if="c.showFrom || c.showUntil" size="2xs" color="gray" variant="ghost" icon="i-heroicons-x-mark" @click="clearHours(c)">Всегда</UButton>
            <span v-if="hoursError(c)" class="text-red-600">{{ hoursError(c) }}</span>
            <span v-else-if="hoursText(c)" class="text-slate-500">Гость видит раздел {{ hoursText(c) }} (по времени точки), вне времени он скрыт и заказать из него нельзя</span>
            <span v-else class="text-slate-400">без ограничения — раздел виден всегда</span>
          </div>
        </li>
      </ul>
      <p v-if="list?.length" class="border-t border-brand-50 px-4 py-3 text-xs text-slate-500">
        Скрытый раздел не видят ни гости, ни приложение официанта — вместе с его блюдами. Раздел со временем показа вне времени скрыт у гостя, а официант видит его с пометкой («до 12:00») и добавить блюдо не может. «Авто» — вкладка по кассе и названию (напитки — в «Бар»).
        Картинка: лучше PNG без фона, квадрат от 400 px; без своей — картинка из iiko или стандартная по названию.
      </p>
    </div>

    <!-- Превью шторки «Меню» как у гостя -->
    <aside class="panel-box h-fit p-4 xl:sticky xl:top-4">
      <div class="mb-3 text-center text-lg font-medium text-brand-600">Меню</div>
      <div class="mb-3 grid grid-cols-2 gap-3">
        <button
          v-for="t in [{ v: 'kitchen', l: 'Кухня' }, { v: 'bar', l: 'Бар' }] as const"
          :key="t.v"
          type="button"
          class="rounded-lg py-2 text-xs font-medium"
          :class="previewTab === t.v ? 'bg-slate-100 text-brand-600' : 'bg-slate-50 text-slate-700'"
          @click="previewTab = t.v"
        >
          {{ t.l }}
        </button>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <div v-for="c in previewTiles" :key="c.key" class="flex h-24 flex-col items-center justify-center gap-1 rounded-xl p-1 text-center ring-1 ring-slate-300">
          <img v-if="shown(c)" :src="thumbUrl(shown(c), 160)" alt="" class="h-12 w-14 object-contain" />
          <UIcon v-else name="i-heroicons-photo" class="h-8 w-8 text-slate-300" />
          <span class="line-clamp-2 text-[10px] leading-tight">{{ c.title || c.name }}</span>
          <span v-if="hoursText(c)" class="rounded bg-amber-50 px-1 text-[9px] leading-tight text-amber-700">{{ hoursText(c) }}</span>
        </div>
      </div>
      <p v-if="!previewTiles.length" class="py-6 text-center text-xs text-slate-500">Во вкладке нет разделов</p>
      <p v-if="dirty" class="mt-3 text-center text-xs text-amber-700">Превью с несохранёнными изменениями</p>
    </aside>
  </div>
</template>
