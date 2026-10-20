<script setup lang="ts">
import type { ReservationsResponse } from '~/types/api';
import { useRestaurantStore } from '~/stores/restaurant';

useHead({ title: 'Брони — Фуджи' });

const restaurants = useRestaurantStore();

const data = ref<ReservationsResponse | null>(null);
const loadError = ref('');
const loading = ref(false);
async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    data.value = await useAuthFetch<ReservationsResponse>('/manager/reservations');
  } catch (e) {
    loadError.value = getErrorMessage(e);
  } finally {
    loading.value = false;
  }
}

// Брони и «пришли» меняются в течение дня — перечитываем сами, пока вкладка открыта
const { dashboardRefreshSec } = useRuntimeConfig().public;
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  load();
  timer = setInterval(() => {
    if (!document.hidden && !loading.value) load();
  }, Number(dashboardRefreshSec || 30) * 1000);
});
onBeforeUnmount(() => timer && clearInterval(timer));
watch(() => restaurants.slug, () => {
  data.value = null;
  load();
});

const q = ref('');
const rows = computed(() => {
  const query = q.value.trim().toLowerCase().replace(/ё/g, 'е');
  return (data.value?.items ?? []).filter((r) => !query || r.guestName.toLowerCase().replace(/ё/g, 'е').includes(query));
});
const active = computed(() => (data.value?.items ?? []).filter((r) => r.state !== 'cancelled' && r.state !== 'closed'));

const STATE: Record<string, { label: string; color: 'green' | 'amber' | 'red' | 'gray' }> = {
  arrived: { label: 'Пришли', color: 'green' },
  waiting: { label: 'Ждём', color: 'amber' },
  upcoming: { label: 'Ожидается', color: 'gray' },
  no_show: { label: 'Не пришли', color: 'red' },
  cancelled: { label: 'Отменена', color: 'gray' },
  closed: { label: 'Закрыта', color: 'gray' },
};

const columns = [
  { key: 'point', label: 'Точка' },
  { key: 'time', label: 'Время' },
  { key: 'table', label: 'Стол' },
  { key: 'guest', label: 'Гость' },
  { key: 'guests', label: 'Гостей' },
  { key: 'state', label: 'Статус' },
];
</script>

<template>
  <div>
    <PageHeader title="Брони" icon="i-heroicons-calendar-days" description="Брони столов на сегодня из iiko. Только просмотр: брони создаются и меняются в iiko, ко времени брони стол открывается у официантов сам.">
      <UButton icon="i-heroicons-arrow-path" color="white" :loading="loading" aria-label="Обновить" @click="load" />
    </PageHeader>

    <div class="mb-4 grid gap-4 sm:grid-cols-3">
      <StatCard label="Броней сегодня" icon="i-heroicons-calendar-days" :loading="!data" :value="active.length" />
      <StatCard label="Гости пришли" icon="i-heroicons-check-circle" tone="green" :loading="!data" :value="active.filter((r) => r.state === 'arrived').length" />
      <StatCard label="Не пришли" icon="i-heroicons-x-circle" :tone="active.some((r) => r.state === 'no_show') ? 'red' : 'brand'" :loading="!data" :value="active.filter((r) => r.state === 'no_show').length" />
    </div>

    <div class="panel-box mb-4 p-3 sm:p-4">
      <UInput v-model="q" icon="i-heroicons-magnifying-glass" placeholder="Имя гостя" class="sm:w-96" />
    </div>

    <LoadError v-if="loadError && !data" :message="loadError" @retry="load" />
    <div v-else class="panel-box overflow-hidden">
      <TableSkeleton v-if="!data" :rows="6" />
      <EmptyState v-else-if="!data.items.length" icon="i-heroicons-calendar-days" title="На сегодня броней нет" description="Брони подтягиваются из iiko раз в полторы минуты." />
      <EmptyState v-else-if="!rows.length" compact icon="i-heroicons-magnifying-glass" title="Ничего не нашлось">
        <UButton color="white" icon="i-heroicons-x-mark" @click="q = ''">Сбросить поиск</UButton>
      </EmptyState>
      <UTable v-else :rows="rows" :columns="columns">
        <template #point-data><span class="text-sm">{{ data.restaurant.name }}</span></template>
        <template #time-data="{ row }"><span class="whitespace-nowrap font-medium">{{ row.time }}</span></template>
        <template #table-data="{ row }"><span class="whitespace-nowrap">{{ row.table ? `№${row.table}` : '—' }}</span></template>
        <template #guest-data="{ row }">
          <div class="text-sm">
            {{ row.guestName || '—' }}
            <UBadge v-if="row.sameName" color="amber" variant="subtle" size="xs" class="ml-1">тёзки</UBadge>
          </div>
          <div v-if="row.hasPhone" class="text-xs text-slate-500">{{ row.phoneMasked }}</div>
          <div v-if="row.comment" class="max-w-xs whitespace-normal text-xs text-slate-500">{{ row.comment }}</div>
        </template>
        <template #guests-data="{ row }">{{ row.guests }}</template>
        <template #state-data="{ row }">
          <UBadge :color="STATE[row.state]?.color ?? 'gray'" variant="subtle" class="whitespace-nowrap">{{ STATE[row.state]?.label ?? row.stateLabel }}</UBadge>
          <div v-if="row.conflict" class="text-xs text-amber-600">стол занят прежними гостями</div>
        </template>
      </UTable>
    </div>
  </div>
</template>
