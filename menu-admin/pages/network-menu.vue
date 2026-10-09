<script setup lang="ts">
import type { NetworkCell, NetworkItem, NetworkMenu, NetworkPoint } from '~/types/api';
import { useAuthStore } from '~/stores/auth';
import { useMenuStore } from '~/stores/menu';

useHead({ title: 'Меню сети — Фуджи' });

const notify = useNotify();
const confirm = useConfirm();
const menu = useMenuStore();
const auth = useAuthStore();
const route = useRoute();
const isAdmin = computed(() => auth.hasRole('admin'));

const data = ref<NetworkMenu | null>(null);
const loading = ref(false);
const loadError = ref('');
async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    data.value = await useAuthFetch<NetworkMenu>('/admin/network-menu', {}, { restaurant: false });
  } catch (e) {
    loadError.value = getErrorMessage(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);

// В меню сети — только точки, подключённые к iiko. Остальные — одной строкой ниже карточек точек.
const byName = (a: NetworkPoint, b: NetworkPoint) => a.name.localeCompare(b.name, 'ru');
const points = computed<NetworkPoint[]>(() => (data.value?.points ?? []).filter((p) => p.connected).sort(byName));
const offline = computed<NetworkPoint[]>(() => (data.value?.points ?? []).filter((p) => !p.connected && !p.isDisabled).sort(byName));
const shortName = (p: NetworkPoint) => p.name.replace(/^Фуджи\s+/i, '');
const multi = computed(() => points.value.length > 1);
const BAR_MODE = { none: 'Одна iiko · без кассы бара', same: 'Одна iiko · кухня и бар', separate: 'Две iiko · бар отдельно' } as const;

// ---------- фильтры
type Chip = '' | 'partial' | 'stop' | 'hidden' | 'noPhoto';
// Кухня и бар — два меню точки: бар уходит на свою кассу
type Section = '' | 'kitchen' | 'bar';
const section = ref<Section>('');
const q = ref('');
const group = ref('');
const chip = ref<Chip>((['stop', 'hidden', 'noPhoto'] as Chip[]).includes(route.query.chip as Chip) ? (route.query.chip as Chip) : '');
const pointFilter = ref('');
const items = computed(() => data.value?.items ?? []);
const groupOptions = computed(() => [
  { value: '', label: 'Все разделы' },
  ...[...new Set(items.value.map((i) => i.group).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'ru')).map((g) => ({ value: g, label: g })),
]);
const pointOptions = computed(() => [{ value: '', label: 'Все точки' }, ...points.value.map((p) => ({ value: p.slug, label: shortName(p) }))]);

const cellsOf = (it: NetworkItem) => points.value.map((p) => it.points[p.slug]).filter(Boolean) as NetworkCell[];
const isPartial = (it: NetworkItem) => points.value.some((p) => !it.points[p.slug] || it.points[p.slug]!.hidden);
const hasStop = (it: NetworkItem) => cellsOf(it).some((c) => c.stop && !c.hidden);
const hasHidden = (it: NetworkItem) => cellsOf(it).some((c) => c.hidden);
const isBar = (it: NetworkItem) => cellsOf(it).some((c) => c.source && c.source !== 'main');
const isKitchen = (it: NetworkItem) => cellsOf(it).some((c) => !c.source || c.source === 'main');
const inSection = (it: NetworkItem) => !section.value || (section.value === 'bar' ? isBar(it) : isKitchen(it));

const count = (fn: (it: NetworkItem) => boolean) => items.value.filter((it) => inSection(it) && fn(it)).length;
const sections = computed(() => [
  { value: '' as Section, label: 'Всё меню', n: items.value.length },
  { value: 'kitchen' as Section, label: 'Кухня', n: items.value.filter(isKitchen).length },
  { value: 'bar' as Section, label: 'Бар', n: items.value.filter(isBar).length },
]);
// Сколько блюд кухни и бара у точки
const pointSplit = (p: NetworkPoint) => {
  let kitchen = 0;
  let bar = 0;
  for (const it of items.value) {
    const c = it.points[p.slug];
    if (!c) continue;
    if (c.source && c.source !== 'main') bar++;
    else kitchen++;
  }
  return { kitchen, bar };
};
const chips = computed(() => [
  { value: '' as Chip, label: 'Все', n: count(() => true) },
  ...(multi.value ? [{ value: 'partial' as Chip, label: 'Не на всех точках', n: count(isPartial) }] : []),
  { value: 'stop' as Chip, label: 'На стопе в iiko', n: count(hasStop) },
  { value: 'hidden' as Chip, label: 'Скрыты от гостей', n: count(hasHidden) },
  { value: 'noPhoto' as Chip, label: 'Без фото', n: count((it) => !it.image) },
].filter((c) => !c.value || c.n || chip.value === c.value));

const filtered = computed(() => {
  const query = q.value.trim().toLowerCase();
  return items.value.filter((it) => {
    if (query && !it.name.toLowerCase().includes(query)) return false;
    if (group.value && it.group !== group.value) return false;
    if (pointFilter.value && !it.points[pointFilter.value]) return false;
    if (chip.value === 'partial' && !isPartial(it)) return false;
    if (chip.value === 'stop' && !hasStop(it)) return false;
    if (chip.value === 'hidden' && !hasHidden(it)) return false;
    if (chip.value === 'noPhoto' && it.image) return false;
    if (!inSection(it)) return false;
    return true;
  });
});
const PAGE = 60;
const shown = ref(PAGE);
watch([q, group, chip, section, pointFilter], () => (shown.value = PAGE));
const visibleRows = computed(() => filtered.value.slice(0, shown.value));
function resetFilters() {
  q.value = '';
  group.value = '';
  chip.value = '';
  section.value = '';
  pointFilter.value = '';
}

// ---------- сводка по строке: на скольких точках гости видят блюдо и цены
function summary(it: NetworkItem) {
  const cells = cellsOf(it);
  const live = cells.filter((c) => !c.hidden && !c.stop);
  const prices = cells.filter((c) => !c.hidden && c.price).map((c) => c.price);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const price = !prices.length ? '—' : min === max ? formatRub(min) : `${formatRub(min)} – ${formatRub(max)}`;
  let status: { label: string; cls: string };
  if (!live.length && cells.some((c) => c.stop && !c.hidden)) status = { label: 'на стопе', cls: 'bg-red-50 text-red-700 ring-red-200' };
  else if (!live.length) status = { label: 'скрыто от гостей', cls: 'bg-slate-100 text-slate-500 ring-slate-200' };
  else if (multi.value) status = { label: `в меню: ${live.length} из ${points.value.length}`, cls: live.length === points.value.length ? 'bg-green-50 text-green-800 ring-green-200' : 'bg-amber-50 text-amber-800 ring-amber-200' };
  else status = { label: 'в меню', cls: 'bg-green-50 text-green-800 ring-green-200' };
  return { price, status };
}

// ---------- точки: перевыгрузка меню и настройки iiko
const syncing = ref('');
async function syncPoint(p: NetworkPoint) {
  const ok = await confirm({
    title: `Обновить меню «${shortName(p)}» из iiko?`,
    description: 'Блюда, цены и стоп-лист кухни и бара заново загрузятся из iiko. Фото, описания и скрытые позиции сохранятся. Займёт до минуты.',
    confirmLabel: 'Обновить',
  });
  if (!ok) return;
  syncing.value = p.slug;
  try {
    await useAuthFetch('/admin/menu/sync', { method: 'POST', query: { restaurant: p.slug } }, { restaurant: false });
    menu.invalidate();
    notify.success(`Меню «${shortName(p)}» обновлено из iiko`);
    await load();
  } catch (e) {
    notify.error(e, 'Не удалось обновить меню');
  } finally {
    syncing.value = '';
  }
}
const setupPoint = ref<NetworkPoint | null>(null);

// ---------- общая карточка блюда
const editItem = ref<NetworkItem | null>(null);
const editTab = ref<'card' | 'availability'>('card');
function openItem(it: NetworkItem, tab: 'card' | 'availability' = 'card') {
  editTab.value = tab;
  editItem.value = it;
}
</script>

<template>
  <div>
    <PageHeader
      title="Меню сети"
      icon="i-heroicons-table-cells"
      description="Одна карточка блюда — на всех точках: фото, описание, метка, КБЖУ. Блюда, цены и стоп-лист приходят из iiko каждой точки (кухня и бар). Нажмите на блюдо, чтобы заполнить карточку; на «в меню: N из M» — чтобы отметить, на каких точках его видят гости."
    >
      <UButton icon="i-heroicons-arrow-path" color="white" :loading="loading" aria-label="Обновить" @click="load" />
    </PageHeader>

    <!-- Точки -->
    <div v-if="data" class="mb-4 space-y-2">
      <div v-if="points.length" class="panel-box overflow-hidden">
        <div class="border-b border-brand-50 px-4 py-2.5 text-xs text-slate-500">Точки, подключённые к iiko</div>
        <ul class="divide-y divide-brand-50">
          <li v-for="p in points" :key="p.id" class="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
            <div class="min-w-[180px] flex-1">
              <div class="font-semibold">{{ shortName(p) }}</div>
              <div class="text-xs text-slate-500">{{ BAR_MODE[p.barMode ?? 'none'] }}</div>
            </div>
            <div class="w-40 text-sm">
              <span>кухня <b>{{ pointSplit(p).kitchen }}</b></span>
              <span v-if="p.barMode !== 'none' || pointSplit(p).bar" class="ml-3">бар <b>{{ pointSplit(p).bar }}</b></span>
            </div>
            <div class="w-24 text-sm" :class="p.stopCount ? 'text-red-700' : 'text-slate-500'">стоп: <b>{{ p.stopCount }}</b></div>
            <div class="w-40 text-xs text-slate-500">из iiko: {{ p.menuUpdatedAt ? formatAgo(p.menuUpdatedAt) : '—' }}</div>
            <div v-if="isAdmin" class="flex gap-2">
              <UButton size="xs" color="white" icon="i-heroicons-arrow-path" :loading="syncing === p.slug" @click="syncPoint(p)">Обновить из iiko</UButton>
              <UButton size="xs" color="white" icon="i-heroicons-cog-6-tooth" @click="setupPoint = p">Настройки iiko</UButton>
            </div>
          </li>
        </ul>
      </div>
      <p v-if="offline.length" class="text-xs text-slate-500">
        <UIcon name="i-heroicons-information-circle" class="-mb-0.5 h-4 w-4" />
        Не подключены к iiko и не показаны: {{ offline.map(shortName).join(', ') }}. Точка появится здесь, когда её подключат к ключу API в iikoWeb.
      </p>
    </div>

    <div class="panel-box mb-4 space-y-3 p-3 sm:p-4">
      <div class="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <UInput v-model="q" icon="i-heroicons-magnifying-glass" placeholder="Найти блюдо" class="md:w-72" />
        <USelect v-model="group" :options="groupOptions" class="md:w-56" aria-label="Раздел" />
        <USelect v-if="multi" v-model="pointFilter" :options="pointOptions" class="md:w-56" aria-label="Точка" />
      </div>
      <div class="inline-flex rounded-xl bg-cream p-1 ring-1 ring-brand-100" role="tablist" aria-label="Кухня или бар">
        <button
          v-for="t in sections"
          :key="t.value"
          type="button"
          role="tab"
          :aria-selected="section === t.value"
          class="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition"
          :class="section === t.value ? 'bg-white text-slate-900 shadow-sm ring-1 ring-brand-100' : 'text-slate-500 hover:text-slate-800'"
          @click="section = t.value"
        >
          {{ t.label }}
          <span class="text-xs text-slate-400">{{ t.n }}</span>
        </button>
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
          <span class="rounded-full px-1.5 text-xs" :class="chip === c.value ? 'bg-white/20' : 'bg-blush'">{{ c.n }}</span>
        </button>
      </div>
    </div>

    <LoadError v-if="loadError && !data" :message="loadError" @retry="load" />
    <div v-else class="panel-box overflow-hidden">
      <TableSkeleton v-if="!data" thumb :rows="8" />
      <EmptyState v-else-if="!points.length" icon="i-heroicons-table-cells" title="Ни одна точка не подключена к iiko" description="Подключите точку к ключу API в iikoWeb — её меню появится здесь." />
      <EmptyState v-else-if="!items.length" icon="i-heroicons-table-cells" title="Меню ещё не выгружено" description="Нажмите «Обновить из iiko» у точки." />
      <EmptyState v-else-if="!filtered.length" compact icon="i-heroicons-magnifying-glass" title="Ничего не нашлось">
        <UButton color="white" icon="i-heroicons-x-mark" @click="resetFilters">Сбросить фильтры</UButton>
      </EmptyState>
      <template v-else>
        <div class="hidden grid-cols-[minmax(0,1fr)_170px_150px_120px] gap-3 bg-cream px-4 py-2.5 text-xs text-slate-500 md:grid">
          <span>Блюдо</span><span>Гости видят</span><span>Цена</span><span />
        </div>
        <ul class="divide-y divide-brand-50">
          <li v-for="it in visibleRows" :key="it.key">
            <div
              role="button"
              tabindex="0"
              class="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 hover:bg-cream/60 md:grid-cols-[minmax(0,1fr)_170px_150px_120px]"
              @click="openItem(it)"
              @keydown.enter.prevent="openItem(it)"
            >
              <div class="flex min-w-0 items-center gap-3">
                <div class="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-brand-50">
                  <img v-if="it.image" :src="thumbUrl(it.image)" alt="" class="h-full w-full object-cover" loading="lazy" @error="hideBrokenImage" />
                  <UIcon v-else name="i-heroicons-photo" class="m-2.5 h-5 w-5 text-brand-200" />
                </div>
                <div class="min-w-0">
                  <div class="truncate font-medium">{{ it.name }}</div>
                  <div class="flex items-center gap-1.5 truncate text-xs text-slate-500">
                    <span class="truncate">{{ it.group || 'Без раздела' }}</span>
                    <UBadge v-if="isBar(it)" color="amber" variant="subtle" size="xs">бар</UBadge>
                  </div>
                </div>
              </div>
              <div class="hidden md:block">
                <button type="button" class="rounded-full px-2 py-0.5 text-xs ring-1 hover:ring-2" :class="summary(it).status.cls" title="Доступность по точкам" @click.stop="openItem(it, 'availability')">{{ summary(it).status.label }}</button>
              </div>
              <div class="hidden font-semibold md:block">{{ summary(it).price }}</div>
              <div class="flex justify-end">
                <UButton size="xs" color="white" icon="i-heroicons-pencil-square" @click.stop="openItem(it)">Карточка</UButton>
              </div>
              <!-- мобильная сводка -->
              <div class="col-span-2 flex items-center gap-2 pl-[3.25rem] text-xs md:hidden">
                <button type="button" class="rounded-full px-2 py-0.5 ring-1" :class="summary(it).status.cls" @click.stop="openItem(it, 'availability')">{{ summary(it).status.label }}</button>
                <span class="font-semibold">{{ summary(it).price }}</span>
              </div>
            </div>

          </li>
        </ul>
        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-brand-50 px-4 py-3 text-xs text-slate-500">
          <span>Показано {{ visibleRows.length }} из {{ filtered.length }}<template v-if="multi">. Блюда точек сведены по названию — у каждой точки свои ID и цены в iiko</template>.</span>
          <UButton v-if="filtered.length > shown" size="xs" color="white" @click="shown += PAGE">Показать ещё</UButton>
        </div>
      </template>
    </div>

    <NetworkCardEditor :item="editItem" :points="points" :tab="editTab" @close="editItem = null" @saved="load" />
    <PointIikoSetup :point="setupPoint" @close="setupPoint = null" @saved="load" />
  </div>
</template>
