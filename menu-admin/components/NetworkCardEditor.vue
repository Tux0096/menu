<script setup lang="ts">
import type { NetworkItem, NetworkPoint } from '~/types/api';
import { useMenuStore } from '~/stores/menu';

// Карточка позиции сразу на нескольких точках: фото, описание, метка, КБЖУ. У каждой точки свой ID блюда
// в iiko — правка записывается на каждую выбранную точку. Уходят только изменённые поля: то, что уже
// настроено на отдельных точках, не затирается.
const props = defineProps<{ item: NetworkItem | null; points: NetworkPoint[]; tab?: 'card' | 'availability' }>();
const emit = defineEmits<{ close: []; saved: [] }>();

const notify = useNotify();
const menu = useMenuStore();

const open = computed({
  get: () => Boolean(props.item),
  set: (v: boolean) => {
    if (!v) emit('close');
  },
});

// Вкладки: карточка (контент) и доступность по точкам
const tab = ref<'card' | 'availability'>('card');
const available = computed(() => props.points.filter((p) => props.item?.points[p.slug]));
const targets = ref<string[]>([]);

const blank = () => ({
  image_url: '', video_url: '', description: '', badge: '', weight: '',
  energy: '', proteins: '', fats: '', carbs: '', allergens: '', is_recommended: false,
});
const form = reactive(blank());
const initial = ref<Record<string, unknown>>({});
const { takeSnapshot, requestClose, dirty } = useModalCloseGuard(open, () => ({ ...form, targets: targets.value }));

watch(
  () => props.item,
  (it) => {
    if (!it) return;
    tab.value = props.tab ?? 'card';
    Object.assign(form, blank(), { image_url: it.image ?? '', description: it.description ?? '', badge: it.badge ?? '' });
    initial.value = { ...form };
    targets.value = available.value.map((p) => p.slug);
    takeSnapshot();
  },
  { immediate: true },
);

const changed = computed(() => Object.keys(form).filter((k) => (form as Record<string, unknown>)[k] !== initial.value[k]));

const saving = ref(false);
async function save() {
  const it = props.item;
  if (!it) return;
  if (!targets.value.length) {
    notify.error('Выберите хотя бы одну точку');
    return;
  }
  if (!changed.value.length) {
    notify.error('Вы ничего не изменили');
    return;
  }
  const num = (v: string) => (v === '' ? '' : Number(String(v).replace(',', '.')));
  const fields: Record<string, unknown> = {};
  for (const k of changed.value) {
    const v = (form as Record<string, unknown>)[k];
    if (['energy', 'proteins', 'fats', 'carbs'].includes(k)) fields[k] = num(String(v));
    else if (k === 'allergens') fields[k] = String(v).split(',').map((a) => a.trim()).filter(Boolean);
    else fields[k] = typeof v === 'string' ? v.trim() : v;
  }
  saving.value = true;
  try {
    await useAuthFetch('/admin/network-menu/card', {
      method: 'POST',
      body: {
        productName: it.name,
        targets: targets.value.map((slug) => ({ restaurant: slug, productId: it.points[slug]!.productId })),
        fields,
      },
    }, { restaurant: false });
    menu.invalidate();
    notify.success('Карточка сохранена', `Точек: ${targets.value.length}`);
    takeSnapshot();
    emit('saved');
    emit('close');
  } catch (e) {
    notify.error(e, 'Не удалось сохранить');
  } finally {
    saving.value = false;
  }
}

function onVideo(url: string, file: File) {
  if (file.type.startsWith('image/')) form.image_url = url;
  else form.video_url = url;
}
const shortName = (p: NetworkPoint) => p.name.replace(/^Фуджи\s+/i, '');

// ---------- доступность: показывать ли блюдо гостям на каждой точке (сохраняется сразу)
const busy = ref<Set<string>>(new Set());
const shownCount = computed(() => props.points.filter((p) => props.item?.points[p.slug] && !props.item.points[p.slug]!.hidden).length);
function cellState(p: NetworkPoint) {
  const c = props.item?.points[p.slug];
  if (!c) return { label: 'нет в меню iiko точки', cls: 'text-slate-400' };
  if (c.hidden) return { label: 'скрыто от гостей', cls: 'text-slate-500' };
  if (c.stop) return { label: 'стоп в iiko', cls: 'text-red-700' };
  return { label: 'в меню', cls: 'text-green-700' };
}
async function setVisible(p: NetworkPoint, visible: boolean) {
  const it = props.item;
  const cell = it?.points[p.slug];
  if (!it || !cell || cell.hidden === !visible) return;
  busy.value = new Set(busy.value).add(p.slug);
  try {
    await useAuthFetch('/admin/network-menu/availability', {
      method: 'POST',
      body: { restaurant: p.slug, productId: cell.productId, productName: it.name, available: visible },
    }, { restaurant: false });
    cell.hidden = !visible;
    menu.invalidate();
    notify.success(visible ? `«${it.name}» снова в меню · ${shortName(p)}` : `«${it.name}» скрыто от гостей · ${shortName(p)}`);
  } catch (e) {
    notify.error(e, 'Не удалось переключить');
  } finally {
    const next = new Set(busy.value);
    next.delete(p.slug);
    busy.value = next;
  }
}
async function setAll(visible: boolean) {
  for (const p of props.points) if (props.item?.points[p.slug]) await setVisible(p, visible);
}
</script>

<template>
  <USlideover v-model="open" prevent-close :ui="{ width: 'w-screen max-w-2xl' }" @close-prevented="requestClose">
    <div v-if="item" class="flex h-full flex-col">
      <div class="flex items-start gap-3 border-b border-brand-50 px-5 py-4">
        <div class="min-w-0 flex-1">
          <div class="text-xs text-slate-500">{{ item.group || 'Без раздела' }} · общая карточка для всех точек</div>
          <h2 class="truncate text-lg font-semibold">{{ item.name }}</h2>
        </div>
        <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" aria-label="Закрыть" @click="requestClose" />
      </div>
      <div class="flex gap-1 border-b border-brand-50 px-5" role="tablist">
        <button
          v-for="t in [{ v: 'card', l: 'Карточка' }, { v: 'availability', l: `Доступность · ${shownCount} из ${points.length}` }] as const"
          :key="t.v"
          type="button"
          role="tab"
          :aria-selected="tab === t.v"
          class="-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition"
          :class="tab === t.v ? 'border-brand-500 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'"
          @click="tab = t.v"
        >
          {{ t.l }}
        </button>
      </div>

      <!-- Доступность по точкам -->
      <div v-if="tab === 'availability'" class="flex-1 space-y-3 overflow-y-auto px-5 py-5">
        <p class="text-sm text-slate-600">Отметьте точки, где гости видят блюдо. Сохраняется сразу. Цена и стоп-лист приходят из iiko точки.</p>
        <div class="flex gap-2">
          <UButton size="xs" color="white" icon="i-heroicons-check" @click="setAll(true)">Показывать везде</UButton>
          <UButton size="xs" color="white" icon="i-heroicons-eye-slash" @click="setAll(false)">Скрыть везде</UButton>
        </div>
        <div class="overflow-hidden rounded-xl ring-1 ring-brand-100">
          <label
            v-for="p in points"
            :key="p.slug"
            class="flex items-center gap-3 border-b border-brand-50 px-3 py-2.5 text-sm last:border-0"
            :class="item.points[p.slug] ? 'cursor-pointer hover:bg-cream/60' : 'opacity-70'"
          >
            <UCheckbox
              :model-value="Boolean(item.points[p.slug] && !item.points[p.slug]!.hidden)"
              :disabled="!item.points[p.slug] || busy.has(p.slug)"
              @update:model-value="(v: boolean) => setVisible(p, v)"
            />
            <span class="min-w-0 flex-1 font-medium">{{ shortName(p) }}</span>
            <template v-if="item.points[p.slug]">
              <span class="w-12 text-xs text-slate-500">{{ item.points[p.slug]!.source && item.points[p.slug]!.source !== 'main' ? 'бар' : 'кухня' }}</span>
              <span class="w-20 text-right font-semibold">{{ item.points[p.slug]!.price ? formatRub(item.points[p.slug]!.price) : 'без цены' }}</span>
            </template>
            <span class="w-36 text-right text-xs" :class="cellState(p).cls">{{ cellState(p).label }}</span>
          </label>
        </div>
        <p class="text-xs text-slate-500">«Нет в меню iiko точки» — блюдо не добавлено во внешнее меню iiko этой точки: добавьте его в iiko, и после обновления оно появится здесь.</p>
      </div>

      <div v-show="tab === 'card'" class="flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <!-- Точки -->
        <section class="space-y-2">
          <h3 class="panel-section-title">На каких точках применить</h3>
          <div class="grid gap-2 sm:grid-cols-2">
            <label v-for="p in available" :key="p.slug" class="flex items-center gap-3 rounded-xl p-3 text-sm ring-1 ring-brand-100">
              <UCheckbox v-model="targets" :value="p.slug" />
              <span class="flex-1">{{ shortName(p) }}</span>
              <span class="text-xs text-slate-500">{{ formatRub(item.points[p.slug]!.price) }}</span>
            </label>
          </div>
          <p class="text-xs text-slate-500">
            Обычно — все точки. Точки без этого блюда в iiko здесь не показаны. Цена у каждой точки своя и приходит из iiko.
          </p>
        </section>

        <section class="space-y-4">
          <h3 class="panel-section-title">Фото и видео</h3>
          <div class="grid gap-4 sm:grid-cols-[120px_1fr]">
            <div class="h-[120px] w-[120px] overflow-hidden rounded-2xl bg-brand-50">
              <img v-if="form.image_url" :src="thumbUrl(form.image_url)" alt="" class="h-full w-full object-cover" @error="hideBrokenImage" />
            </div>
            <div class="space-y-2">
              <UploadBox accept="image" compact @uploaded="(url: string) => (form.image_url = url)" />
              <UploadBox accept="video" compact @uploaded="onVideo" />
            </div>
          </div>
        </section>

        <section class="space-y-4">
          <h3 class="panel-section-title">Описание и метка</h3>
          <UFormGroup label="Описание" :help="`${form.description.length} / 400`">
            <UTextarea v-model="form.description" :rows="3" :maxlength="400" autoresize />
          </UFormGroup>
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormGroup label="Метка на фото"><USelect v-model="form.badge" :options="BADGE_OPTIONS" /></UFormGroup>
            <UFormGroup label="Вес / объём"><UInput v-model="form.weight" placeholder="не менять" /></UFormGroup>
          </div>
          <label class="flex items-center gap-3 text-sm"><UToggle v-model="form.is_recommended" /> Рекомендуем</label>
        </section>

        <section class="space-y-4">
          <h3 class="panel-section-title">КБЖУ и аллергены</h3>
          <div class="grid gap-4 sm:grid-cols-4">
            <UFormGroup label="Ккал"><UInput v-model="form.energy" inputmode="decimal" placeholder="—" /></UFormGroup>
            <UFormGroup label="Белки"><UInput v-model="form.proteins" inputmode="decimal" placeholder="—" /></UFormGroup>
            <UFormGroup label="Жиры"><UInput v-model="form.fats" inputmode="decimal" placeholder="—" /></UFormGroup>
            <UFormGroup label="Углеводы"><UInput v-model="form.carbs" inputmode="decimal" placeholder="—" /></UFormGroup>
          </div>
          <UFormGroup label="Аллергены" help="Через запятую; пусто — не менять"><UInput v-model="form.allergens" /></UFormGroup>
        </section>

        <p class="rounded-xl bg-cream p-3 text-xs text-slate-600">
          Сохраняются только изменённые поля — то, что уже настроено отдельно на точках, не затрётся.
          Показ блюда на точках — во вкладке «Доступность». Стоп-лист ставят на кассе iiko.
        </p>
      </div>

      <div v-show="tab === 'card'" class="flex flex-wrap items-center gap-2 border-t border-brand-50 bg-white px-5 py-3">
        <span class="text-xs text-slate-500">{{ changed.length ? `Изменено полей: ${changed.length}` : 'Изменений нет' }} · точек: {{ targets.length }}</span>
        <div class="flex-1" />
        <UButton color="white" @click="requestClose">Отмена</UButton>
        <UButton color="cta" :loading="saving" :disabled="!dirty || !changed.length" @click="save">Сохранить на точках</UButton>
      </div>
    </div>
  </USlideover>
</template>
