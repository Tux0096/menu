<script setup lang="ts">
import type { NetworkItem, NetworkPoint } from '~/types/api';
import { useMenuStore } from '~/stores/menu';

// Карточка позиции сразу на нескольких точках: фото, описание, метка, КБЖУ. У каждой точки свой ID блюда
// в iiko — правка записывается на каждую выбранную точку. Уходят только изменённые поля: то, что уже
// настроено на отдельных точках, не затирается.
const props = defineProps<{ item: NetworkItem | null; points: NetworkPoint[] }>();
const emit = defineEmits<{ close: []; saved: [] }>();

const notify = useNotify();
const menu = useMenuStore();

const open = computed({
  get: () => Boolean(props.item),
  set: (v: boolean) => {
    if (!v) emit('close');
  },
});

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
</script>

<template>
  <USlideover v-model="open" prevent-close :ui="{ width: 'w-screen max-w-2xl' }" @close-prevented="requestClose">
    <div v-if="item" class="flex h-full flex-col">
      <div class="flex items-start gap-3 border-b border-brand-50 px-5 py-4">
        <div class="min-w-0 flex-1">
          <div class="text-xs text-slate-500">{{ item.group || 'Без раздела' }} · карточка для нескольких точек</div>
          <h2 class="truncate text-lg font-semibold">{{ item.name }}</h2>
        </div>
        <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" aria-label="Закрыть" @click="requestClose" />
      </div>

      <div class="flex-1 space-y-6 overflow-y-auto px-5 py-5">
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
            Точки без этой позиции в iiko здесь не показаны. Цена у каждой точки своя и приходит из iiko.
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
          Стоп-лист и «есть ли позиция на точке» меняются в таблице меню сети.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2 border-t border-brand-50 bg-white px-5 py-3">
        <span class="text-xs text-slate-500">{{ changed.length ? `Изменено полей: ${changed.length}` : 'Изменений нет' }} · точек: {{ targets.length }}</span>
        <div class="flex-1" />
        <UButton color="white" @click="requestClose">Отмена</UButton>
        <UButton color="cta" :loading="saving" :disabled="!dirty || !changed.length" @click="save">Сохранить на точках</UButton>
      </div>
    </div>
  </USlideover>
</template>
