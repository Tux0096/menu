<script setup lang="ts">
import type { Banner, BannerPlacement, PublicCatalog } from '~/types/api';
import { useRestaurantStore } from '~/stores/restaurant';

useHead({ title: 'Баннеры — Фуджи' });

const restaurants = useRestaurantStore();
const notify = useNotify();
const confirm = useConfirm();

const PLACEMENTS: Record<BannerPlacement, string> = {
  menu: 'Меню — карусель сверху',
  ai: 'Экран AI-помощника',
  order: 'Экран заказа',
};
const PLACEMENT_OPTIONS = Object.entries(PLACEMENTS).map(([value, label]) => ({ value, label }));

const rows = ref<Banner[] | null>(null);
const loadError = ref('');
const loading = ref(false);
async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    rows.value = await useAuthFetch<Banner[]>('/admin/promos');
  } catch (e) {
    loadError.value = getErrorMessage(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);

function state(b: Banner): { label: string; color: 'green' | 'gray' | 'amber' } {
  const now = Date.now();
  if (!b.is_active) return { label: 'Выключен', color: 'gray' };
  if (b.starts_at && new Date(b.starts_at).getTime() > now) return { label: `С ${formatDayTime(b.starts_at)}`, color: 'amber' };
  if (b.ends_at && new Date(b.ends_at).getTime() <= now) return { label: 'Завершён', color: 'gray' };
  return { label: 'Показывается', color: 'green' };
}
const restName = (id: string | null) => (id ? restaurants.list.find((r) => r.id === id)?.name ?? 'ресторан' : 'Все рестораны');

// ---------- каталог для «по нажатию открыть блюдо / раздел»
const catalog = ref<PublicCatalog | null>(null);
async function loadCatalog() {
  if (catalog.value) return;
  try {
    catalog.value = await $fetch<PublicCatalog>(`/api/v1/restaurants/${encodeURIComponent(restaurants.slug)}/catalog`);
  } catch {
    catalog.value = { groups: [], products: [] };
  }
}
watch(() => restaurants.slug, () => (catalog.value = null));
const productOptions = computed(() => (catalog.value?.products ?? []).filter((p) => p.price > 0).map((p) => ({ value: String(p.id), label: p.name })));
const groupOptions = computed(() => {
  const used = new Set((catalog.value?.products ?? []).map((p) => p.parentGroup));
  return (catalog.value?.groups ?? []).filter((g) => used.has(g.id)).map((g) => ({ value: String(g.id), label: g.name }));
});

// ---------- редактор
type LinkType = '' | 'product' | 'category' | 'url';
const LINK_OPTIONS = [
  { value: '', label: 'Ничего' },
  { value: 'product', label: 'Открыть блюдо' },
  { value: 'category', label: 'Открыть раздел меню' },
  { value: 'url', label: 'Ссылка' },
];
const open = ref(false);
const saving = ref(false);
const form = reactive({
  id: undefined as Banner['id'],
  title: '',
  text: '',
  image_url: '',
  placement: 'menu' as BannerPlacement,
  restaurant_id: '',
  link: '' as LinkType,
  product_id: '',
  category_id: '',
  link_url: '',
  starts_date: '',
  starts_time: '',
  ends_date: '',
  ends_time: '',
  sort_order: 0,
  is_active: true,
});
const { takeSnapshot, requestClose } = useModalCloseGuard(open, () => form);
const restaurantOptions = computed(() => [{ value: '', label: 'Все рестораны' }, ...restaurants.list.map((r) => ({ value: r.id, label: r.name }))]);

function edit(b?: Banner) {
  loadCatalog();
  const s = isoToZoned(b?.starts_at);
  const e = isoToZoned(b?.ends_at);
  Object.assign(form, {
    id: b?.id,
    title: b?.title ?? '',
    text: b?.text ?? '',
    image_url: b?.image_url ?? '',
    placement: b?.placement ?? 'menu',
    restaurant_id: b?.restaurant_id ?? '',
    link: (b?.product_id ? 'product' : b?.category_id ? 'category' : b?.link_url ? 'url' : '') as LinkType,
    product_id: b?.product_id ? String(b.product_id) : '',
    category_id: b?.category_id ? String(b.category_id) : '',
    link_url: b?.link_url ?? '',
    starts_date: s.date,
    starts_time: s.time === '—' ? '' : s.time,
    ends_date: e.date,
    ends_time: e.time === '—' ? '' : e.time,
    sort_order: b?.sort_order ?? 0,
    is_active: b ? b.is_active : true,
  });
  open.value = true;
  takeSnapshot();
}

const errors = computed(() => {
  const list: string[] = [];
  if (!form.title.trim()) list.push('Впишите заголовок');
  if (form.link === 'product' && !form.product_id) list.push('Выберите блюдо, которое откроет баннер');
  if (form.link === 'category' && !form.category_id) list.push('Выберите раздел меню');
  if (form.link === 'url' && !/^https?:\/\//.test(form.link_url.trim())) list.push('Ссылка должна начинаться с https://');
  const from = form.starts_date ? zonedToIso(form.starts_date, form.starts_time || '00:00') : null;
  const to = form.ends_date ? zonedToIso(form.ends_date, form.ends_time || '23:59') : null;
  if (from && to && from >= to) list.push('«Показывать до» должно быть позже, чем «с»');
  return list;
});

async function save() {
  if (errors.value.length) {
    notify.error(errors.value[0]!, 'Проверьте баннер');
    return;
  }
  saving.value = true;
  try {
    await useAuthFetch('/admin/promos', {
      method: 'POST',
      body: {
        id: form.id,
        title: form.title.trim(),
        text: form.text.trim(),
        image_url: form.image_url.trim(),
        placement: form.placement,
        restaurant_id: form.restaurant_id,
        product_id: form.link === 'product' ? form.product_id : '',
        category_id: form.link === 'category' ? form.category_id : '',
        link_url: form.link === 'url' ? form.link_url.trim() : '',
        starts_at: form.starts_date ? zonedToIso(form.starts_date, form.starts_time || '00:00') : '',
        ends_at: form.ends_date ? zonedToIso(form.ends_date, form.ends_time || '23:59') : '',
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      },
    });
    open.value = false;
    notify.success('Баннер сохранён', form.is_active ? 'Гости увидят его при следующем открытии меню' : 'Он выключен — включите «Показывать», когда будет готов');
    await load();
  } catch (e) {
    notify.error(e, 'Не удалось сохранить баннер');
  } finally {
    saving.value = false;
  }
}

async function remove(b: Banner) {
  const ok = await confirm({ title: `Удалить баннер «${b.title}»?`, description: 'Гости перестанут его видеть. Вернуть нельзя.', confirmLabel: 'Удалить', danger: true });
  if (!ok) return;
  try {
    await useAuthFetch(`/admin/promos/${b.id}`, { method: 'DELETE' });
    notify.success('Баннер удалён');
    await load();
  } catch (e) {
    notify.error(e, 'Не удалось удалить');
  }
}

async function toggleActive(b: Banner) {
  try {
    await useAuthFetch('/admin/promos', { method: 'POST', body: { id: b.id, is_active: !b.is_active } });
    await load();
  } catch (e) {
    notify.error(e, 'Не удалось переключить');
  }
}
</script>

<template>
  <div>
    <PageHeader
      title="Баннеры"
      icon="i-heroicons-photo"
      description="Акции и новинки в QR-меню: карусель над меню, экран AI-помощника или экран заказа. По нажатию открывается блюдо, раздел меню или ссылка."
    >
      <UButton icon="i-heroicons-plus" color="cta" @click="edit()">Новый баннер</UButton>
      <UButton icon="i-heroicons-arrow-path" color="white" :loading="loading" aria-label="Обновить" @click="load" />
    </PageHeader>

    <LoadError v-if="loadError && !rows" :message="loadError" @retry="load" />
    <div v-else-if="!rows" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <USkeleton v-for="i in 3" :key="i" class="h-64 rounded-2xl" />
    </div>
    <div v-else-if="!rows.length" class="panel-box">
      <EmptyState
        icon="i-heroicons-photo"
        title="Баннеров пока нет"
        description="Баннер — широкая картинка 2:1 с заголовком над меню. Например, «Сет недели» или «Новое летнее меню»."
        action-label="Сделать первый баннер"
        @action="edit()"
      />
    </div>
    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div v-for="b in rows" :key="b.id" class="panel-box flex flex-col overflow-hidden">
        <button type="button" class="relative aspect-[2/1] w-full overflow-hidden bg-brand-50 text-left" @click="edit(b)">
          <img v-if="b.image_url" :src="b.image_url" alt="" class="h-full w-full object-cover" loading="lazy" @error="hideBrokenImage" />
          <div v-else class="flex h-full items-center justify-center p-4 text-center text-lg font-semibold text-brand-300">{{ b.title }}</div>
          <UBadge :color="state(b).color" variant="solid" size="xs" class="absolute left-3 top-3">{{ state(b).label }}</UBadge>
        </button>
        <div class="flex flex-1 flex-col p-4">
          <div class="font-semibold">{{ b.title }}</div>
          <div v-if="b.text" class="mt-0.5 line-clamp-2 text-sm text-slate-600">{{ b.text }}</div>
          <div class="mt-2 text-xs text-slate-500">
            {{ PLACEMENTS[b.placement] ?? PLACEMENTS.menu }} · {{ restName(b.restaurant_id) }}<template v-if="b.ends_at"> · до {{ formatDayTime(b.ends_at) }}</template>
          </div>
          <div class="mt-auto flex items-center gap-2 pt-3">
            <UToggle :model-value="b.is_active" :aria-label="`Показывать: ${b.title}`" @update:model-value="toggleActive(b)" />
            <span class="text-xs text-slate-500">Показывать</span>
            <div class="flex-1" />
            <UButton size="xs" color="white" icon="i-heroicons-pencil-square" @click="edit(b)">Изменить</UButton>
            <UButton size="xs" color="red" variant="ghost" icon="i-heroicons-trash" :aria-label="`Удалить ${b.title}`" @click="remove(b)" />
          </div>
        </div>
      </div>
    </div>

    <UModal v-model="open" prevent-close :ui="{ width: 'sm:max-w-3xl' }" @close-prevented="requestClose">
      <div class="flex max-h-[90vh] flex-col">
        <div class="flex items-center justify-between border-b border-brand-50 px-6 py-4">
          <h2 class="text-lg font-semibold">{{ form.id ? 'Баннер' : 'Новый баннер' }}</h2>
          <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" aria-label="Закрыть" @click="requestClose" />
        </div>
        <div class="grid flex-1 gap-6 overflow-y-auto px-6 py-5 md:grid-cols-[1fr_260px]">
          <div class="space-y-4">
            <UFormGroup label="Картинка" help="Широкая 2:1, например 1200×600. Без мелкого текста — заголовок наложится сверху.">
              <UploadBox accept="image" compact @uploaded="(url: string) => (form.image_url = url)" />
              <UInput v-model="form.image_url" class="mt-2" size="sm" placeholder="или ссылка на картинку" />
            </UFormGroup>
            <UFormGroup label="Заголовок" required :help="`${form.title.length} / 60`">
              <UInput v-model="form.title" :maxlength="60" />
            </UFormGroup>
            <UFormGroup label="Текст" help="Одно короткое предложение, можно оставить пустым">
              <UInput v-model="form.text" :maxlength="140" />
            </UFormGroup>
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormGroup label="Где показывать"><USelect v-model="form.placement" :options="PLACEMENT_OPTIONS" /></UFormGroup>
              <UFormGroup label="Ресторан"><USelect v-model="form.restaurant_id" :options="restaurantOptions" /></UFormGroup>
              <UFormGroup label="По нажатию"><USelect v-model="form.link" :options="LINK_OPTIONS" /></UFormGroup>
              <UFormGroup v-if="form.link === 'product'" label="Блюдо">
                <USelectMenu v-model="form.product_id" :options="productOptions" value-attribute="value" option-attribute="label" searchable searchable-placeholder="Название блюда" placeholder="Выберите блюдо" />
              </UFormGroup>
              <UFormGroup v-else-if="form.link === 'category'" label="Раздел меню">
                <USelectMenu v-model="form.category_id" :options="groupOptions" value-attribute="value" option-attribute="label" searchable placeholder="Выберите раздел" />
              </UFormGroup>
              <UFormGroup v-else-if="form.link === 'url'" label="Ссылка"><UInput v-model="form.link_url" type="url" placeholder="https://" /></UFormGroup>
            </div>
            <div>
              <div class="mb-1 text-sm font-medium">Когда показывать <span class="font-normal text-slate-500">({{ tzLabel() }}; пусто — сразу и без конца)</span></div>
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <span class="w-6 text-sm text-slate-500">с</span>
                  <UInput v-model="form.starts_date" type="date" class="min-w-0 flex-1" aria-label="Показывать с — дата" />
                  <UInput v-model="form.starts_time" type="time" class="w-32 shrink-0" aria-label="Показывать с — время" />
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-6 text-sm text-slate-500">до</span>
                  <UInput v-model="form.ends_date" type="date" class="min-w-0 flex-1" aria-label="Показывать до — дата" />
                  <UInput v-model="form.ends_time" type="time" class="w-32 shrink-0" aria-label="Показывать до — время" />
                </div>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-6">
              <label class="flex items-center gap-3 text-sm"><UToggle v-model="form.is_active" /> Показывать</label>
              <UFormGroup label="Порядок" class="w-32"><UInput v-model.number="form.sort_order" type="number" /></UFormGroup>
            </div>
          </div>

          <!-- Превью «как у гостя» -->
          <div>
            <div class="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">Как увидит гость</div>
            <div class="rounded-[28px] bg-cream p-3 ring-1 ring-brand-100">
              <div class="relative aspect-[2/1] overflow-hidden rounded-2xl bg-brand-500">
                <img v-if="form.image_url" :src="form.image_url" alt="" class="h-full w-full object-cover" @error="hideBrokenImage" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div class="absolute bottom-2 left-3 right-3 text-white">
                  <div class="truncate text-sm font-semibold">{{ form.title || 'Заголовок баннера' }}</div>
                  <div v-if="form.text" class="truncate text-[11px] opacity-90">{{ form.text }}</div>
                </div>
              </div>
              <div class="mt-3 space-y-1.5">
                <div class="h-2.5 w-2/3 rounded bg-brand-100" />
                <div class="h-2.5 w-1/2 rounded bg-brand-100" />
              </div>
            </div>
            <p class="mt-2 text-xs text-slate-500">{{ PLACEMENTS[form.placement] }}</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center justify-end gap-2 border-t border-brand-50 px-6 py-3">
          <span v-if="errors.length" class="mr-auto text-xs text-amber-700">{{ errors[0] }}</span>
          <UButton color="white" @click="requestClose">Отмена</UButton>
          <UButton color="cta" :loading="saving" @click="save">Сохранить</UButton>
        </div>
      </div>
    </UModal>
  </div>
</template>
