<script setup lang="ts">
import type { AdminProduct } from '~/types/api';
import { useAuthStore } from '~/stores/auth';
import { useMenuStore } from '~/stores/menu';
import { useRestaurantStore } from '~/stores/restaurant';

useHead({ title: 'Блюда и стоп-лист — Фуджи' });

const auth = useAuthStore();
const menu = useMenuStore();
const restaurants = useRestaurantStore();
const route = useRoute();
const router = useRouter();
const notify = useNotify();
const confirm = useConfirm();

const isAdmin = computed(() => auth.hasRole('admin'));

const loadError = ref('');
async function load(opts: { force?: boolean } = {}) {
  loadError.value = '';
  try {
    await menu.load(opts);
  } catch (e) {
    loadError.value = getErrorMessage(e);
  }
}
onMounted(() => load());
watch(() => restaurants.slug, () => {
  selected.value = [];
  load({ force: true });
});

// ---------- перевыгрузка из iiko
const syncing = ref(false);
async function syncFromIiko() {
  const ok = await confirm({
    title: 'Перевыгрузить меню из iiko?',
    description: 'Блюда и цены заново загрузятся из внешнего меню iiko. Правки админки (фото, описания, стоп-лист) сохранятся. Займёт до минуты.',
    confirmLabel: 'Перевыгрузить',
  });
  if (!ok) return;
  syncing.value = true;
  try {
    await menu.sync();
    notify.success('Меню перевыгружено из iiko');
  } catch (e) {
    notify.error(e, 'Не удалось выгрузить меню');
  } finally {
    syncing.value = false;
  }
}

// ---------- фильтры (часть — в адресе, чтобы сводка вела сразу на нужный список)
type Chip = '' | 'stop' | 'hidden' | 'noPrice' | 'noPhoto' | 'recommended';
const q = ref('');
const group = ref('');
const source = ref('');
const chip = ref<Chip>(route.query.stop ? 'stop' : route.query.noPrice ? 'noPrice' : '');
watch(chip, (v) => router.replace({ query: v === 'stop' ? { stop: '1' } : v === 'noPrice' ? { noPrice: '1' } : {} }));

const products = computed(() => menu.data?.products ?? []);
const groups = computed(() => [...new Set(products.value.map((p) => p.group).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru')));
const groupOptions = computed(() => [{ value: '', label: 'Все категории' }, ...groups.value.map((g) => ({ value: g, label: g }))]);
const hasBar = computed(() => products.value.some((p) => (p.source || 'main') !== 'main'));

const count = (fn: (p: AdminProduct) => boolean) => products.value.filter(fn).length;
const chips = computed(() => [
  { value: '' as Chip, label: 'Все', n: count((p) => !p.isHidden) },
  { value: 'stop' as Chip, label: 'Стоп-лист', n: count((p) => !p.isHidden && Boolean(p.isInStopList)) },
  { value: 'noPhoto' as Chip, label: 'Без фото', n: count((p) => !p.isHidden && !p.image) },
  { value: 'noPrice' as Chip, label: 'Без цены', n: count((p) => !p.isHidden && !p.price) },
  { value: 'recommended' as Chip, label: 'Рекомендуем', n: count((p) => Boolean(p.isRecommended)) },
  { value: 'hidden' as Chip, label: 'Скрытые', n: count((p) => p.isHidden) },
]);

const filtered = computed(() => {
  const query = q.value.trim().toLowerCase();
  return products.value.filter((p) => {
    if (chip.value === 'hidden' ? !p.isHidden : p.isHidden) return false;
    if (chip.value === 'stop' && !p.isInStopList) return false;
    if (chip.value === 'noPhoto' && p.image) return false;
    if (chip.value === 'noPrice' && p.price) return false;
    if (chip.value === 'recommended' && !p.isRecommended) return false;
    if (group.value && p.group !== group.value) return false;
    if (source.value && (source.value === 'bar' ? (p.source || 'main') === 'main' : (p.source || 'main') !== 'main')) return false;
    if (query && !p.name.toLowerCase().includes(query) && !String(p.sku || '').toLowerCase().includes(query)) return false;
    return true;
  });
});
const hasFilters = computed(() => Boolean(q.value || group.value || source.value || chip.value));
function resetFilters() {
  q.value = '';
  group.value = '';
  source.value = '';
  chip.value = '';
}

// ---------- страницы
const PAGE_SIZE = 50;
const page = ref(1);
watch(filtered, () => {
  if ((page.value - 1) * PAGE_SIZE >= filtered.value.length) page.value = 1;
});
const pageRows = computed(() => filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE));

const columns = computed(() => [
  { key: 'name', label: 'Блюдо' },
  { key: 'group', label: 'Категория' },
  { key: 'price', label: 'Цена' },
  ...(isAdmin.value ? [{ key: 'stop', label: 'Стоп-лист' }] : []),
  { key: 'hidden', label: 'Скрыть' },
  { key: 'recommended', label: 'Рекомендуем' },
]);

// ---------- переключатели в строке
const busy = ref<Set<string>>(new Set());
async function setFlag(p: AdminProduct, patch: Record<string, unknown>, okText?: string) {
  busy.value.add(p.id);
  try {
    await useAuthFetch('/admin/menu/override', { method: 'POST', body: { productId: p.id, product_name: p.name, ...patch } });
    await menu.load({ force: true });
    if (okText) notify.success(okText);
  } catch (e) {
    notify.error(e, 'Не удалось сохранить');
  } finally {
    busy.value.delete(p.id);
  }
}
const toggleStop = (p: AdminProduct) =>
  setFlag(p, { is_stopped: !p.isInStopList }, p.isInStopList ? `«${p.name}» снова можно заказать` : `«${p.name}» в стоп-листе`);
async function toggleHidden(p: AdminProduct) {
  if (!p.isHidden) {
    const ok = await confirm({
      title: `Скрыть «${p.name}» из меню?`,
      description: 'Гости и официанты перестанут видеть блюдо. Вернуть можно на вкладке «Скрытые».',
      confirmLabel: 'Скрыть',
    });
    if (!ok) return;
  }
  await setFlag(p, { is_hidden: !p.isHidden }, p.isHidden ? 'Блюдо снова в меню' : 'Блюдо скрыто');
}
const toggleRecommended = (p: AdminProduct) => setFlag(p, { is_recommended: !p.isRecommended });

// ---------- массовые действия
const selected = ref<AdminProduct[]>([]);
const acting = ref(false);
async function bulk(patch: Record<string, unknown>, text: string) {
  acting.value = true;
  let failed = 0;
  for (const p of selected.value) {
    try {
      await useAuthFetch('/admin/menu/override', { method: 'POST', body: { productId: p.id, product_name: p.name, ...patch } });
    } catch {
      failed++;
    }
  }
  try {
    await menu.load({ force: true });
  } catch {
    // список перечитается при следующем открытии
  }
  acting.value = false;
  if (failed) notify.error(`Не сохранилось: ${failed} из ${selected.value.length}`, 'Часть блюд не обновилась');
  else notify.success(text);
  selected.value = [];
}

// ---------- карточка блюда
const editId = ref<string | null>(null);
function open(row: AdminProduct) {
  if (row.isHidden) return;
  editId.value = String(row.id);
}
</script>

<template>
  <div>
    <PageHeader
      title="Блюда и стоп-лист"
      icon="i-heroicons-book-open"
      description="То, что гость видит в QR-меню, а официант — в приложении. Блюда и цены приходят из iiko сами; здесь — фото, описание, метки, порядок и стоп-лист. Нажмите на блюдо, чтобы открыть карточку."
    >
      <UButton v-if="isAdmin" icon="i-heroicons-arrow-down-tray" color="white" :loading="syncing" @click="syncFromIiko">Перевыгрузить из iiko</UButton>
      <UButton icon="i-heroicons-arrow-path" color="white" :loading="menu.loading && !syncing" aria-label="Обновить" @click="load({ force: true })" />
    </PageHeader>

    <div class="panel-box mb-4 space-y-3 p-3 sm:p-4">
      <div class="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <UInput v-model="q" icon="i-heroicons-magnifying-glass" placeholder="Название или артикул" class="md:w-72" />
        <USelect v-model="group" :options="groupOptions" class="md:w-56" aria-label="Категория" />
        <div v-if="hasBar" class="flex gap-1 rounded-xl bg-blush/70 p-1" role="group" aria-label="Кухня или бар">
          <button
            v-for="s in [{ v: '', l: 'Все' }, { v: 'main', l: 'Кухня' }, { v: 'bar', l: 'Бар' }]"
            :key="s.v"
            type="button"
            class="rounded-lg px-3 py-1 text-sm transition"
            :class="source === s.v ? 'bg-white font-medium shadow-sm' : 'text-slate-600 hover:text-brand-500'"
            @click="source = s.v"
          >
            {{ s.l }}
          </button>
        </div>
        <div class="flex-1" />
        <span v-if="menu.data" class="text-xs text-slate-500">выгрузка iiko: {{ menu.data.fetchedAt ? formatAgo(menu.data.fetchedAt) : 'не было' }}</span>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="c in chips"
          :key="c.value"
          type="button"
          class="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ring-1 transition"
          :class="chip === c.value ? 'bg-brand-500 text-white ring-brand-500' : 'bg-white text-slate-600 ring-brand-100 hover:ring-brand-200'"
          @click="chip = c.value"
        >
          {{ c.label }}
          <span
            class="rounded-full px-1.5 text-xs"
            :class="chip === c.value ? 'bg-white/20' : c.value === 'stop' && c.n ? 'bg-red-50 text-red-600' : 'bg-blush'"
          >{{ c.n }}</span>
        </button>
      </div>
    </div>

    <LoadError v-if="loadError && !menu.data" :message="loadError" @retry="load({ force: true })" />

    <div v-else class="panel-box overflow-hidden">
      <TableSkeleton v-if="!menu.data" thumb :rows="8" />
      <EmptyState
        v-else-if="!filtered.length && chip === 'stop' && !q && !group"
        icon="i-heroicons-check-badge"
        title="Стоп-лист пуст"
        description="Сейчас можно заказать всё меню."
      >
        <UButton color="white" @click="chip = ''">Показать все блюда</UButton>
      </EmptyState>
      <EmptyState
        v-else-if="!filtered.length && hasFilters"
        icon="i-heroicons-magnifying-glass"
        title="Ничего не нашлось"
        description="Попробуйте другое название или сбросьте фильтры."
      >
        <UButton color="white" icon="i-heroicons-x-mark" @click="resetFilters">Сбросить фильтры</UButton>
      </EmptyState>
      <EmptyState
        v-else-if="!filtered.length"
        icon="i-heroicons-book-open"
        title="Меню пока пустое"
        description="Блюда появятся после выгрузки из внешнего меню iiko."
      >
        <UButton v-if="isAdmin" color="cta" icon="i-heroicons-arrow-down-tray" :loading="syncing" @click="syncFromIiko">Выгрузить из iiko</UButton>
      </EmptyState>

      <template v-else>
        <UTable v-model="selected" :rows="pageRows" :columns="columns" @select="open">
          <template #name-data="{ row }">
            <div class="flex items-center gap-3">
              <div class="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-brand-50">
                <img v-if="row.image" :src="thumbUrl(row.image)" alt="" class="h-full w-full object-cover" loading="lazy" @error="hideBrokenImage" />
                <div v-else class="flex h-full items-center justify-center"><UIcon name="i-heroicons-photo" class="h-5 w-5 text-brand-200" /></div>
                <div v-if="row.video" class="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 text-[10px] text-white">▶</div>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1 font-medium" :class="row.isInStopList && 'text-slate-400 line-through'">
                  <span class="max-w-[280px] truncate">{{ row.name }}</span>
                </div>
                <div class="flex flex-wrap items-center gap-1 text-xs text-slate-500">
                  <UBadge v-if="row.badge" size="xs" color="cta" variant="subtle">{{ BADGES[row.badge] ?? row.badge }}</UBadge>
                  <UBadge v-if="hasBar && row.source && row.source !== 'main'" size="xs" color="violet" variant="subtle">{{ sourceLabel(row.source) }}</UBadge>
                  <span v-if="row.priority">приоритет {{ row.priority }}</span>
                  <span v-if="row.weight">{{ row.weight }}</span>
                  <span v-if="row.sku">· арт. {{ row.sku }}</span>
                </div>
              </div>
            </div>
          </template>
          <template #group-data="{ row }">
            <span class="block max-w-[200px] truncate text-xs text-slate-600">{{ row.group || '—' }}</span>
          </template>
          <template #price-data="{ row }">
            <span v-if="row.price" class="whitespace-nowrap">{{ formatRub(row.price) }}</span>
            <UBadge v-else-if="!row.isHidden" color="amber" variant="subtle" size="xs">нет цены</UBadge>
          </template>
          <template #stop-data="{ row }">
            <div @click.stop>
              <UToggle v-if="!row.isHidden" :model-value="Boolean(row.isInStopList)" color="red" :disabled="busy.has(row.id)" :aria-label="`Стоп-лист: ${row.name}`" @update:model-value="toggleStop(row)" />
            </div>
          </template>
          <template #hidden-data="{ row }">
            <div @click.stop>
              <UToggle :model-value="row.isHidden" :disabled="busy.has(row.id)" :aria-label="`Скрыть: ${row.name}`" @update:model-value="toggleHidden(row)" />
            </div>
          </template>
          <template #recommended-data="{ row }">
            <div @click.stop>
              <UToggle v-if="!row.isHidden" :model-value="Boolean(row.isRecommended)" :disabled="busy.has(row.id)" :aria-label="`Рекомендуем: ${row.name}`" @update:model-value="toggleRecommended(row)" />
            </div>
          </template>
        </UTable>
        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-brand-50 px-4 py-3 text-xs text-slate-500">
          <span>
            {{ filtered.length }} {{ pluralize(filtered.length, ['блюдо', 'блюда', 'блюд']) }}
            <template v-if="filtered.length > PAGE_SIZE"> · показаны {{ (page - 1) * PAGE_SIZE + 1 }}–{{ Math.min(page * PAGE_SIZE, filtered.length) }}</template>
            · галочками можно выбрать несколько
          </span>
          <UPagination v-if="filtered.length > PAGE_SIZE" v-model="page" :page-count="PAGE_SIZE" :total="filtered.length" size="sm" />
        </div>
      </template>
    </div>

    <p class="mt-3 text-xs text-slate-500">
      Стоп-лист: блюдо остаётся в меню, но заказать его нельзя. Скрыть: блюдо пропадает из QR-меню и у официанта.
      Правки действуют поверх выгрузки iiko и не теряются при обновлении меню. В iiko ничего не меняется.
    </p>

    <!-- Массовые действия -->
    <div v-if="selected.length" class="sticky bottom-4 z-20 mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-brand-500 px-4 py-3 text-white shadow-xl">
      <span class="mr-2 text-sm font-medium">Выбрано: {{ selected.length }}</span>
      <template v-if="isAdmin">
        <UButton color="red" icon="i-heroicons-no-symbol" :loading="acting" @click="bulk({ is_stopped: true }, 'Добавлено в стоп-лист')">В стоп-лист</UButton>
        <UButton color="white" variant="soft" class="bg-white/10 text-white hover:bg-white/20" icon="i-heroicons-check" :loading="acting" @click="bulk({ is_stopped: false }, 'Снято со стопа')">
          Снять со стопа
        </UButton>
      </template>
      <UButton
        v-if="chip !== 'hidden'"
        color="white"
        variant="soft"
        class="bg-white/10 text-white hover:bg-white/20"
        icon="i-heroicons-eye-slash"
        :loading="acting"
        @click="bulk({ is_hidden: true }, 'Скрыто из меню')"
      >
        Скрыть
      </UButton>
      <UButton v-else color="cta" icon="i-heroicons-eye" :loading="acting" @click="bulk({ is_hidden: false }, 'Снова в меню')">Вернуть в меню</UButton>
      <div class="flex-1" />
      <UButton color="white" variant="link" class="text-brand-100" @click="selected = []">Снять выбор</UButton>
    </div>

    <ProductEditor :product-id="editId" @close="editId = null" />
  </div>
</template>
