<script setup lang="ts">
import type { StopListItem, StopListPoint } from '~/types/api';

useHead({ title: 'Стоп-листы iiko — Фуджи' });

const data = ref<StopListPoint[] | null>(null);
const loading = ref(false);
const loadError = ref('');
async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    data.value = await useAuthFetch<StopListPoint[]>('/admin/stop-lists', {}, { restaurant: false });
  } catch (e) {
    loadError.value = getErrorMessage(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);

const shortName = (p: StopListPoint) => p.name.replace(/^Фуджи\s+/i, '');
const active = ref('');
watch(data, (d) => {
  if (d && !d.some((p) => p.slug === active.value)) active.value = (d.find((p) => p.items.length) ?? d[0])?.slug ?? '';
});
const point = computed(() => data.value?.find((p) => p.slug === active.value) ?? null);

const q = ref('');
const onlyMenu = ref(false);
const rows = computed(() => {
  const query = q.value.trim().toLowerCase();
  return (point.value?.items ?? []).filter((i) => (!onlyMenu.value || i.inMenu)
    && (!query || `${i.name ?? ''} ${i.sku ?? ''}`.toLowerCase().includes(query)));
});
const kind = (i: StopListItem) => (i.inMenu ? 'Блюдо меню' : i.type === 'Modifier' ? 'Модификатор' : i.type === 'Goods' ? 'Товар / ингредиент' : i.type === 'Dish' ? 'Блюдо (нет в QR-меню)' : 'Не из меню');
</script>

<template>
  <div>
    <PageHeader
      title="Стоп-листы iiko"
      icon="i-heroicons-no-symbol"
      description="Что сейчас на стопе в iiko по каждой точке — как на кассе. Стоп ставят и снимают в iiko (iikoFront), здесь только смотреть. Блюда меню из стоп-листа гость видит, но заказать не может."
    >
      <UButton icon="i-heroicons-arrow-path" color="white" :loading="loading" aria-label="Обновить" @click="load" />
    </PageHeader>

    <LoadError v-if="loadError && !data" :message="loadError" @retry="load" />
    <template v-else>
      <!-- Точки -->
      <div class="mb-4 flex flex-wrap gap-2">
        <template v-if="data">
          <button
            v-for="p in data"
            :key="p.slug"
            type="button"
            class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm ring-1 transition"
            :class="active === p.slug ? 'bg-brand-500 text-white ring-brand-500' : 'bg-white ring-brand-100 hover:ring-brand-200'"
            @click="active = p.slug"
          >
            {{ shortName(p) }}
            <span class="rounded-full px-1.5 text-xs" :class="active === p.slug ? 'bg-white/20' : p.stopCount ? 'bg-red-50 text-red-600' : 'bg-blush'">{{ p.stopCount }}</span>
            <UIcon v-if="!p.connected" name="i-heroicons-exclamation-triangle" class="h-4 w-4 text-amber-500" />
          </button>
        </template>
        <USkeleton v-else class="h-10 w-full rounded-xl" />
      </div>

      <div v-if="point" class="panel-box mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-sm">
        <UBadge :color="point.connected ? 'green' : 'amber'" variant="subtle">{{ point.connected ? 'iiko подключена' : 'не подключена к iiko' }}</UBadge>
        <span>На стопе: <b>{{ point.stopCount }}</b></span>
        <span class="text-slate-500">Обновлено: {{ point.stopUpdatedAt ? formatDayTime(point.stopUpdatedAt) : 'не было' }}</span>
        <span class="text-slate-500">Обновляется сам: по сигналу iiko и раз в 10 минут</span>
        <p v-if="!point.connected" class="w-full text-xs text-amber-700">
          Точка не подключена к ключу iiko — стоп-лист не обновляется, показан последний полученный. Подключите точку к API-ключу в iikoWeb.
        </p>
      </div>

      <div class="panel-box mb-4 flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:p-4">
        <UInput v-model="q" icon="i-heroicons-magnifying-glass" placeholder="Название или артикул" class="sm:w-80" />
        <label class="flex items-center gap-2 text-sm"><UToggle v-model="onlyMenu" /> Только блюда QR-меню</label>
      </div>

      <div class="panel-box overflow-hidden">
        <TableSkeleton v-if="!data" :rows="6" />
        <EmptyState
          v-else-if="!point?.items.length"
          icon="i-heroicons-check-badge"
          title="Стоп-лист пуст"
          :description="point?.connected ? 'На этой точке сейчас всё можно заказать.' : 'Точка не подключена к iiko — стоп-лист не получен.'"
        />
        <EmptyState v-else-if="!rows.length" compact icon="i-heroicons-magnifying-glass" title="Ничего не нашлось" />
        <div v-else class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="bg-cream text-left text-xs text-slate-500">
              <tr>
                <th class="px-4 py-3 font-medium">Позиция</th>
                <th class="px-3 py-3 font-medium">Что это</th>
                <th class="px-3 py-3 font-medium">Остаток</th>
                <th class="px-4 py-3 font-medium">На стопе с</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-brand-50">
              <tr v-for="i in rows" :key="i.productId">
                <td class="px-4 py-2.5">
                  <div class="font-medium">{{ i.name || 'Позиция без названия' }}</div>
                  <div class="text-xs text-slate-500">
                    <template v-if="i.sku">арт. {{ i.sku }} · </template>
                    <template v-if="i.price">{{ formatRub(i.price) }} · </template>
                    <span class="mono">{{ i.productId.slice(0, 8) }}</span>
                  </div>
                </td>
                <td class="px-3 py-2.5">
                  <UBadge :color="i.inMenu ? 'cta' : 'gray'" variant="subtle" size="xs">{{ kind(i) }}</UBadge>
                </td>
                <td class="px-3 py-2.5">
                  <UBadge v-if="i.stopped" color="red" variant="subtle" size="xs">закончилось</UBadge>
                  <span v-else class="text-xs">осталось {{ i.balance }}</span>
                </td>
                <td class="px-4 py-2.5 text-xs text-slate-500">{{ i.dateAdd ? formatDayTime(i.dateAdd) : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p class="mt-3 text-xs text-slate-500">
        В стоп-листе iiko бывают не только блюда, но и ингредиенты и модификаторы — они влияют на блюда, в которых используются.
        «Осталось N» — блюдо с ограниченным остатком: гость может заказать, пока остаток не закончится.
      </p>
    </template>
  </div>
</template>
