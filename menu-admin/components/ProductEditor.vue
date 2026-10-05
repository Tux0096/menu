<script setup lang="ts">
import type { AdminProduct } from '~/types/api';
import { useAuthStore } from '~/stores/auth';
import { useMenuStore } from '~/stores/menu';

// Карточка блюда: данные приходят из iiko, правки админки хранятся только в меню (menu_overrides)
// и накладываются по UUID блюда. В iiko ничего не пишется.
const props = defineProps<{ productId: string | null }>();
const emit = defineEmits<{ close: []; saved: [] }>();

const auth = useAuthStore();
const menu = useMenuStore();
const notify = useNotify();
const confirm = useConfirm();

const open = computed({
  get: () => Boolean(props.productId),
  set: (v: boolean) => {
    if (!v) emit('close');
  },
});

const product = computed<AdminProduct | null>(() => menu.data?.products.find((p) => String(p.id) === String(props.productId)) ?? null);
const ownOverrides = computed(() => (menu.data?.overrides ?? []).filter((o) => String(o.product_id) === String(props.productId)));
const canStop = computed(() => auth.hasRole('admin'));

const form = reactive({
  badge: '',
  priority: 0,
  is_recommended: false,
  is_stopped: false,
  image_url: '',
  video_url: '',
  description: '',
  weight: '',
  energy: '' as string | number,
  proteins: '' as string | number,
  fats: '' as string | number,
  carbs: '' as string | number,
  allergens: '',
  scope: 'restaurant' as 'restaurant' | 'global',
});

const { takeSnapshot, requestClose, dirty } = useModalCloseGuard(open, () => form);

watch(
  () => props.productId,
  () => {
    const p = product.value;
    if (!p) return;
    Object.assign(form, {
      badge: p.badge ?? '',
      priority: Number(p.priority) || 0,
      is_recommended: Boolean(p.isRecommended),
      is_stopped: Boolean(p.isInStopList),
      image_url: p.image ?? '',
      video_url: p.video ?? '',
      description: p.description ?? '',
      weight: p.weight ?? '',
      energy: p.energy ?? '',
      proteins: p.proteins ?? '',
      fats: p.fats ?? '',
      carbs: p.carbs ?? '',
      allergens: (p.allergens ?? []).join(', '),
      scope: 'restaurant',
    });
    takeSnapshot();
  },
  { immediate: true },
);

const SCOPE_OPTIONS = [
  { value: 'restaurant', label: 'Только в этом ресторане' },
  { value: 'global', label: 'Во всех ресторанах' },
];

// ---------- заполненность: что гость увидит в карточке
const checklist = computed(() => [
  { key: 'photo', label: 'Фото', ok: Boolean(form.image_url) },
  { key: 'desc', label: 'Описание', ok: form.description.trim().length >= 20 },
  { key: 'weight', label: 'Вес или объём', ok: Boolean(String(form.weight).trim()) },
  { key: 'kbju', label: 'КБЖУ', ok: [form.energy, form.proteins, form.fats, form.carbs].every((v) => v !== '' && v !== null) },
  { key: 'price', label: 'Цена в iiko', ok: Boolean(product.value?.price) },
]);
const score = computed(() => Math.round((checklist.value.filter((c) => c.ok).length / checklist.value.length) * 100));

const saving = ref(false);
async function save() {
  const p = product.value;
  if (!p) return;
  const num = (v: string | number) => (v === '' || v === null ? '' : Number(String(v).replace(',', '.')));
  const body: Record<string, unknown> = {
    productId: p.id,
    product_name: p.name,
    scope: form.scope,
    badge: form.badge,
    priority: Math.max(-999, Math.min(999, Math.round(Number(form.priority) || 0))),
    is_recommended: form.is_recommended,
    image_url: form.image_url.trim(),
    video_url: form.video_url.trim(),
    description: form.description.trim(),
    weight: String(form.weight).trim(),
    energy: num(form.energy),
    proteins: num(form.proteins),
    fats: num(form.fats),
    carbs: num(form.carbs),
    allergens: form.allergens.split(',').map((a) => a.trim()).filter(Boolean),
  };
  // стоп-лист пишем, только если его переключили: иначе зафиксировали бы стоп из iiko как правку админки
  if (canStop.value && form.is_stopped !== Boolean(p.isInStopList)) body.is_stopped = form.is_stopped;
  saving.value = true;
  try {
    await useAuthFetch('/admin/menu/override', { method: 'POST', body });
    await menu.load({ force: true });
    takeSnapshot();
    notify.success('Карточка сохранена', 'Гости увидят изменения при следующем открытии меню');
    emit('saved');
    emit('close');
  } catch (e) {
    notify.error(e, 'Не удалось сохранить карточку');
  } finally {
    saving.value = false;
  }
}

async function resetToIiko() {
  const ok = await confirm({
    title: 'Вернуть карточку как в iiko?',
    description: 'Фото, описание, метка, приоритет и стоп-лист из админки удалятся — останутся данные из iiko.',
    confirmLabel: 'Вернуть',
    danger: true,
  });
  if (!ok) return;
  saving.value = true;
  try {
    for (const o of ownOverrides.value) await useAuthFetch(`/admin/menu/override/${o.id}`, { method: 'DELETE' });
    await menu.load({ force: true });
    notify.success('Карточка снова как в iiko');
    emit('saved');
    emit('close');
  } catch (e) {
    notify.error(e, 'Не удалось вернуть карточку');
  } finally {
    saving.value = false;
  }
}

function onImage(url: string, file: File) {
  form.image_url = url;
  if (file.type === 'image/gif') notify.success('Анимация загружена', 'Она будет показываться вместо фото');
}
function onVideo(url: string, file: File) {
  // анимированная картинка встаёт вместо фото, видео — поверх фото
  if (file.type.startsWith('image/')) form.image_url = url;
  else form.video_url = url;
}

// Ctrl+S / ⌘S — сохранить
function onKey(e: KeyboardEvent) {
  if (open.value && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    if (dirty.value && !saving.value) save();
  }
}
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <USlideover v-model="open" prevent-close :ui="{ width: 'w-screen max-w-2xl' }" @close-prevented="requestClose">
    <div v-if="product" class="flex h-full flex-col">
      <!-- Шапка -->
      <div class="flex items-start gap-3 border-b border-brand-50 px-5 py-4">
        <div class="min-w-0 flex-1">
          <div class="text-xs text-slate-500">{{ product.group || 'Без категории' }} · {{ sourceLabel(product.source) }}</div>
          <h2 class="truncate text-lg font-semibold">{{ product.name }}</h2>
          <div class="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <span class="font-medium">{{ product.price ? formatRub(product.price) : 'нет цены в iiko' }}</span>
            <UBadge v-if="product.isInStopList" color="red" variant="subtle" size="xs">в стоп-листе</UBadge>
            <UBadge v-if="ownOverrides.length" color="cta" variant="subtle" size="xs">есть правки админки</UBadge>
          </div>
        </div>
        <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" aria-label="Закрыть" @click="requestClose" />
      </div>

      <div class="flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <!-- Заполненность -->
        <div class="rounded-xl bg-cream p-4">
          <div class="mb-2 flex items-center gap-3">
            <UProgress :value="score" size="sm" :color="score === 100 ? 'green' : score >= 60 ? 'amber' : 'red'" />
            <span class="w-10 text-right text-sm font-semibold">{{ score }}%</span>
          </div>
          <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span v-for="c in checklist" :key="c.key" class="flex items-center gap-1" :class="c.ok ? 'text-green-700' : 'text-slate-500'">
              <UIcon :name="c.ok ? 'i-heroicons-check-circle' : 'i-heroicons-minus-circle'" class="h-4 w-4" />{{ c.label }}
            </span>
          </div>
        </div>

        <!-- Основное -->
        <section class="space-y-4">
          <h3 class="panel-section-title">Основное</h3>
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormGroup label="Метка на фото" help="Плашка в меню гостя">
              <USelect v-model="form.badge" :options="BADGE_OPTIONS" />
            </UFormGroup>
            <UFormGroup label="Приоритет" help="Больше — выше в разделе; 0 — как в iiko">
              <UInput v-model.number="form.priority" type="number" min="-999" max="999" step="1" />
            </UFormGroup>
          </div>
          <div class="space-y-3">
            <label class="flex items-center gap-3 text-sm"><UToggle v-model="form.is_recommended" /> Рекомендуем — показывать в подборке и подсказках AI</label>
            <label v-if="canStop" class="flex items-center gap-3 text-sm">
              <UToggle v-model="form.is_stopped" color="red" /> В стоп-листе — блюдо видно, но заказать нельзя
            </label>
          </div>
        </section>

        <!-- Фото и видео -->
        <section class="space-y-4">
          <h3 class="panel-section-title">Фото и видео</h3>
          <div class="grid gap-4 sm:grid-cols-[140px_1fr]">
            <div class="h-[140px] w-[140px] overflow-hidden rounded-2xl bg-brand-50">
              <img v-if="form.image_url" :src="thumbUrl(form.image_url, 320)" alt="" class="h-full w-full object-cover" @error="hideBrokenImage" />
              <div v-else class="flex h-full items-center justify-center"><UIcon name="i-heroicons-photo" class="h-8 w-8 text-brand-200" /></div>
            </div>
            <div class="space-y-2">
              <UploadBox accept="image" compact hint="Квадрат от 1000×1000, блюдо по центру. JPG, PNG, WebP до 8 МБ" @uploaded="onImage" />
              <UInput v-model="form.image_url" placeholder="или ссылка на картинку" size="sm" />
            </div>
          </div>
          <div class="grid gap-4 sm:grid-cols-[140px_1fr]">
            <div class="h-[140px] w-[140px] overflow-hidden rounded-2xl bg-brand-50">
              <video v-if="form.video_url" :src="form.video_url" muted loop playsinline autoplay class="h-full w-full object-cover" />
              <div v-else class="flex h-full items-center justify-center"><UIcon name="i-heroicons-film" class="h-8 w-8 text-brand-200" /></div>
            </div>
            <div class="space-y-2">
              <UploadBox accept="video" compact @uploaded="onVideo" />
              <div class="flex items-center gap-2">
                <p class="flex-1 text-xs text-slate-500">«Живое» меню: короткое видео без звука играет вместо фото по кругу. Фото остаётся обложкой, пока видео грузится.</p>
                <UButton v-if="form.video_url" size="xs" color="red" variant="soft" icon="i-heroicons-trash" @click="form.video_url = ''">Убрать видео</UButton>
              </div>
            </div>
          </div>
        </section>

        <!-- Описание -->
        <section class="space-y-4">
          <h3 class="panel-section-title">Описание и КБЖУ</h3>
          <UFormGroup label="Описание" :help="`${form.description.length} / 400 · 2–3 предложения о вкусе и составе`">
            <UTextarea v-model="form.description" :rows="4" :maxlength="400" autoresize />
          </UFormGroup>
          <div class="grid gap-4 sm:grid-cols-5">
            <UFormGroup label="Вес / объём" class="sm:col-span-1"><UInput v-model="form.weight" placeholder="250 г" /></UFormGroup>
            <UFormGroup label="Ккал"><UInput v-model="form.energy" inputmode="decimal" /></UFormGroup>
            <UFormGroup label="Белки"><UInput v-model="form.proteins" inputmode="decimal" /></UFormGroup>
            <UFormGroup label="Жиры"><UInput v-model="form.fats" inputmode="decimal" /></UFormGroup>
            <UFormGroup label="Углеводы"><UInput v-model="form.carbs" inputmode="decimal" /></UFormGroup>
          </div>
          <UFormGroup label="Аллергены" help="Через запятую: рыба, кунжут, глютен">
            <UInput v-model="form.allergens" />
          </UFormGroup>
        </section>

        <!-- Где применить -->
        <section class="space-y-3">
          <h3 class="panel-section-title">Где применить</h3>
          <USelect v-model="form.scope" :options="SCOPE_OPTIONS" />
          <p class="text-xs text-slate-500">
            Цена, название и состав меню приходят из iiko — здесь их не меняют. Правки карточки накладываются по UUID блюда
            ({{ product.id }}) и не теряются при обновлении меню.
          </p>
        </section>
      </div>

      <!-- Низ: как в редакторе карточки примера — действия всегда на виду -->
      <div class="flex flex-wrap items-center gap-2 border-t border-brand-50 bg-white px-5 py-3">
        <UButton v-if="ownOverrides.length" color="red" variant="ghost" icon="i-heroicons-arrow-uturn-left" :disabled="saving" @click="resetToIiko">
          Вернуть как в iiko
        </UButton>
        <div class="flex-1" />
        <span v-if="dirty" class="hidden text-xs text-slate-500 sm:inline">Есть несохранённые изменения · Ctrl+S</span>
        <UButton color="white" @click="requestClose">Отмена</UButton>
        <UButton color="cta" :loading="saving" :disabled="!dirty" @click="save">Сохранить</UButton>
      </div>
    </div>
  </USlideover>
</template>
