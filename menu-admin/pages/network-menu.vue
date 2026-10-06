<script setup lang="ts">
import type { NetworkCell, NetworkItem, NetworkMenu, NetworkPoint } from '~/types/api';
import { useMenuStore } from '~/stores/menu';

useHead({ title: 'Меню сети — Фуджи' });

const notify = useNotify();
const menu = useMenuStore();

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

// Точки: сначала с меню, потом без (меню не выгружено или точка не подключена к iiko)
const points = computed<NetworkPoint[]>(() =>
  [...(data.value?.points ?? [])].sort((a, b) => Number(b.products > 0) - Number(a.products > 0) || a.name.localeCompare(b.name, 'ru')),
);
const withMenu = computed(() => points.value.filter((p) => p.products > 0));
const shortName = (p: NetworkPoint) => p.name.replace(/^Фуджи\s+/i, '');

// ---------- фильтры
type Chip = '' | 'partial' | 'stop' | 'hidden';
const q = ref('');
const group = ref('');
const chip = ref<Chip>('');
const pointFilter = ref('');
const items = computed(() => data.value?.items ?? []);
const groupOptions = computed(() => [
  { value: '', label: 'Все разделы' },
  ...[...new Set(items.value.map((i) => i.group).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'ru')).map((g) => ({ value: g, label: g })),
]);
const pointOptions = computed(() => [{ value: '', label: 'Все точки' }, ...withMenu.value.map((p) => ({ value: p.slug, label: shortName(p) }))]);

const cellsOf = (it: NetworkItem) => withMenu.value.map((p) => it.points[p.slug]).filter(Boolean) as NetworkCell[];
const isPartial = (it: NetworkItem) => withMenu.value.some((p) => !it.points[p.slug] || it.points[p.slug]!.hidden);
const hasStop = (it: NetworkItem) => cellsOf(it).some((c) => c.stop);
const hasHidden = (it: NetworkItem) => cellsOf(it).some((c) => c.hidden);

const count = (fn: (it: NetworkItem) => boolean) => items.value.filter(fn).length;
const chips = computed(() => [
  { value: '' as Chip, label: 'Все позиции', n: items.value.length },
  { value: 'partial' as Chip, label: 'Есть не на всех точках', n: count(isPartial) },
  { value: 'stop' as Chip, label: 'На стопе в iiko', n: count(hasStop) },
  { value: 'hidden' as Chip, label: 'Скрыты где-то', n: count(hasHidden) },
]);

const filtered = computed(() => {
  const query = q.value.trim().toLowerCase();
  return items.value.filter((it) => {
    if (query && !it.name.toLowerCase().includes(query)) return false;
    if (group.value && it.group !== group.value) return false;
    if (pointFilter.value && !it.points[pointFilter.value]) return false;
    if (chip.value === 'partial' && !isPartial(it)) return false;
    if (chip.value === 'stop' && !hasStop(it)) return false;
    if (chip.value === 'hidden' && !hasHidden(it)) return false;
    return true;
  });
});
const PAGE = 60;
const shown = ref(PAGE);
watch([q, group, chip, pointFilter], () => (shown.value = PAGE));
const visibleRows = computed(() => filtered.value.slice(0, shown.value));

// ---------- позиция на точке: показать / скрыть
const busy = ref<Set<string>>(new Set());
async function toggle(it: NetworkItem, p: NetworkPoint) {
  const cell = it.points[p.slug];
  if (!cell) return;
  const id = `${it.key}|${p.slug}`;
  busy.value.add(id);
  try {
    await useAuthFetch('/admin/network-menu/availability', {
      method: 'POST',
      body: { restaurant: p.slug, productId: cell.productId, productName: it.name, available: cell.hidden },
    }, { restaurant: false });
    cell.hidden = !cell.hidden;
    menu.invalidate();
    notify.success(cell.hidden ? `«${it.name}» скрыта на ${shortName(p)}` : `«${it.name}» снова в меню на ${shortName(p)}`);
  } catch (e) {
    notify.error(e, 'Не удалось переключить');
  } finally {
    busy.value.delete(id);
  }
}

function cellTone(c: NetworkCell | undefined) {
  if (!c) return { cls: 'bg-slate-50 text-slate-300', label: 'нет в iiko' };
  if (c.hidden) return { cls: 'bg-slate-100 text-slate-500 line-through', label: 'скрыто' };
  if (c.stop) return { cls: 'bg-red-50 text-red-700 ring-1 ring-red-200', label: 'стоп iiko' };
  return { cls: 'bg-green-50 text-green-800 ring-1 ring-green-200', label: 'в меню' };
}

// ---------- карточка позиции на всех точках
const editItem = ref<NetworkItem | null>(null);
</script>

<template>
  <div>
    <PageHeader
      title="Меню сети"
      icon="i-heroicons-table-cells"
      description="Все позиции всех точек в одной таблице. У каждой точки своё меню и свои цены из iiko: здесь видно, где позиция есть, где на стопе и где скрыта. Нажмите на ячейку, чтобы убрать позицию с точки или вернуть её; на название — чтобы заполнить карточку сразу для всех точек."
    >
      <UButton icon="i-heroicons-arrow-path" color="white" :loading="loading" aria-label="Обновить" @click="load" />
    </PageHeader>

    <!-- Точки -->
    <div v-if="data" class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div v-for="p in points" :key="p.id" class="panel-box p-4" :class="!p.products && 'opacity-80'">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="truncate font-semibold">{{ shortName(p) }}</div>
            <div class="text-xs text-slate-500">
              {{ p.products ? `${p.products} ${pluralize(p.products, ['позиция', 'позиции', 'позиций'])}` : 'меню не выгружено' }}
              <template v-if="p.stopCount"> · на стопе {{ p.stopCount }}</template>
            </div>
          </div>
          <UBadge :color="p.connected ? 'green' : 'amber'" variant="subtle" size="xs" class="shrink-0">
            {{ p.connected ? 'iiko подключена' : 'не подключена к iiko' }}
          </UBadge>
        </div>
        <div class="mt-2 text-xs text-slate-500">
          Меню: {{ p.menuUpdatedAt ? formatAgo(p.menuUpdatedAt) : '—' }} · стоп-лист: {{ p.stopUpdatedAt ? formatAgo(p.stopUpdatedAt) : '—' }}
        </div>
        <p v-if="!p.connected" class="mt-2 text-xs text-amber-700">
          Точка не подключена к ключу iiko — меню и стоп-лист не обновляются. Подключите её в iikoWeb → API-ключ.
        </p>
      </div>
    </div>

    <div class="panel-box mb-4 space-y-3 p-3 sm:p-4">
      <div class="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <UInput v-model="q" icon="i-heroicons-magnifying-glass" placeholder="Название позиции" class="md:w-72" />
        <USelect v-model="group" :options="groupOptions" class="md:w-56" aria-label="Раздел" />
        <USelect v-model="pointFilter" :options="pointOptions" class="md:w-56" aria-label="Точка" />
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
      <EmptyState v-else-if="!withMenu.length" icon="i-heroicons-table-cells" title="Меню ещё не выгружено ни на одной точке" description="Меню приходит из внешнего меню iiko. Проверьте подключение точек к ключу iiko." />
      <EmptyState v-else-if="!filtered.length" compact icon="i-heroicons-magnifying-glass" title="Ничего не нашлось">
        <UButton color="white" icon="i-heroicons-x-mark" @click="(q = ''), (group = ''), (chip = ''), (pointFilter = '')">Сбросить фильтры</UButton>
      </EmptyState>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-cream text-left text-xs text-slate-500">
            <tr>
              <th class="sticky left-0 z-10 min-w-[260px] bg-cream px-4 py-3 font-medium">Позиция</th>
              <th v-for="p in withMenu" :key="p.slug" class="min-w-[120px] px-2 py-3 text-center font-medium">
                {{ shortName(p) }}
                <div v-if="!p.connected" class="font-normal text-amber-600">не обновляется</div>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-brand-50">
            <tr v-for="it in visibleRows" :key="it.key" class="hover:bg-cream/60">
              <td class="sticky left-0 z-10 bg-white px-4 py-2">
                <button type="button" class="flex w-full items-center gap-3 text-left" @click="editItem = it">
                  <div class="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-brand-50">
                    <img v-if="it.image" :src="thumbUrl(it.image)" alt="" class="h-full w-full object-cover" loading="lazy" @error="hideBrokenImage" />
                  </div>
                  <div class="min-w-0">
                    <div class="truncate font-medium hover:text-cta-600">{{ it.name }}</div>
                    <div class="truncate text-xs text-slate-500">{{ it.group || 'Без раздела' }}</div>
                  </div>
                </button>
              </td>
              <td v-for="p in withMenu" :key="p.slug" class="px-2 py-2 text-center">
                <UTooltip
                  :text="it.points[p.slug] ? (it.points[p.slug]!.hidden ? 'Скрыта на этой точке — нажмите, чтобы вернуть' : 'Нажмите, чтобы скрыть на этой точке') : 'Этой позиции нет в меню iiko точки'"
                >
                  <button
                    type="button"
                    class="w-full rounded-lg px-2 py-1.5 text-xs transition"
                    :class="[cellTone(it.points[p.slug]).cls, !it.points[p.slug] && 'cursor-default']"
                    :disabled="!it.points[p.slug] || busy.has(`${it.key}|${p.slug}`)"
                    @click="toggle(it, p)"
                  >
                    <div v-if="it.points[p.slug]?.price" class="font-semibold">{{ formatRub(it.points[p.slug]!.price) }}</div>
                    <div>{{ cellTone(it.points[p.slug]).label }}</div>
                  </button>
                </UTooltip>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="data && filtered.length" class="flex flex-wrap items-center justify-between gap-3 border-t border-brand-50 px-4 py-3 text-xs text-slate-500">
        <span>Показано {{ visibleRows.length }} из {{ filtered.length }}. Позиции сопоставлены по названию — у точек разные ID и цены в iiko.</span>
        <UButton v-if="filtered.length > shown" size="xs" color="white" @click="shown += PAGE">Показать ещё</UButton>
      </div>
    </div>

    <p class="mt-3 text-xs text-slate-500">
      «Нет в iiko» — позиции нет во внешнем меню iiko этой точки: её добавляют в iiko (меню iiko отсюда не меняется).
      «Стоп iiko» — закончилась на кассе: стоп ставят и снимают в iiko. «Скрыто» — убрано из QR-меню этой точки здесь, в админке.
    </p>

    <NetworkCardEditor :item="editItem" :points="withMenu" @close="editItem = null" @saved="load" />
  </div>
</template>
