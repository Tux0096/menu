<script setup lang="ts">
import type { Feedback } from '~/types/api';
import { useRestaurantStore } from '~/stores/restaurant';

useHead({ title: 'Отзывы — Фуджи' });

const restaurants = useRestaurantStore();
const route = useRoute();

const rows = ref<Feedback[] | null>(null);
const loadError = ref('');
const loading = ref(false);
async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    rows.value = await useAuthFetch<Feedback[]>('/manager/feedback');
  } catch (e) {
    loadError.value = getErrorMessage(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);
watch(() => restaurants.slug, () => {
  rows.value = null;
  load();
});

const q = ref('');
const lowOnly = ref(Boolean(route.query.low));
const filtered = computed(() => {
  const query = q.value.trim().toLowerCase();
  return (rows.value ?? []).filter((f) => {
    if (lowOnly.value && f.rating > 3) return false;
    if (!query) return true;
    return [f.comment, f.guest_name, f.guest_phone, f.waiter_name, f.table_number].some((v) => String(v ?? '').toLowerCase().includes(query));
  });
});
const avg = computed(() => {
  const list = rows.value ?? [];
  return list.length ? list.reduce((s, f) => s + f.rating, 0) / list.length : null;
});
const low = computed(() => (rows.value ?? []).filter((f) => f.rating <= 3).length);

const columns = [
  { key: 'created_at', label: 'Когда' },
  { key: 'rating', label: 'Оценка' },
  { key: 'comment', label: 'Комментарий' },
  { key: 'guest', label: 'Гость' },
  { key: 'waiter_name', label: 'Официант' },
  { key: 'total', label: 'Счёт' },
];
</script>

<template>
  <div>
    <PageHeader title="Отзывы" icon="i-heroicons-chat-bubble-left-right" description="Оценки, которые гости ставят после визита в QR-меню. Оценка 3 и ниже — повод связаться с гостем.">
      <UButton icon="i-heroicons-arrow-path" color="white" :loading="loading" aria-label="Обновить" @click="load" />
    </PageHeader>

    <div class="mb-4 grid gap-4 sm:grid-cols-3">
      <StatCard label="Средняя оценка" icon="i-heroicons-star" :tone="avg !== null && avg < 4 ? 'red' : 'green'" :loading="!rows" :value="avg !== null ? `${avg.toFixed(1).replace('.', ',')} из 5` : '—'" />
      <StatCard label="Отзывов" icon="i-heroicons-chat-bubble-left-right" :loading="!rows" :value="rows?.length ?? '—'" hint="последние 100" />
      <StatCard label="Низких оценок" icon="i-heroicons-face-frown" :tone="low ? 'red' : 'brand'" :loading="!rows" :value="low" hint="3 и ниже" />
    </div>

    <div class="panel-box mb-4 flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:p-4">
      <UInput v-model="q" icon="i-heroicons-magnifying-glass" placeholder="Текст, гость, телефон, официант, стол" class="sm:w-96" />
      <label class="flex items-center gap-2 text-sm"><UToggle v-model="lowOnly" color="red" /> Только низкие (3 и ниже)</label>
    </div>

    <LoadError v-if="loadError && !rows" :message="loadError" @retry="load" />
    <div v-else class="panel-box overflow-hidden">
      <TableSkeleton v-if="!rows" :rows="6" />
      <EmptyState v-else-if="!rows.length" icon="i-heroicons-chat-bubble-left-right" title="Отзывов пока нет" description="После оплаты гость может оценить визит — оценки появятся здесь." />
      <EmptyState v-else-if="!filtered.length" compact icon="i-heroicons-magnifying-glass" title="Ничего не нашлось">
        <UButton color="white" icon="i-heroicons-x-mark" @click="(q = ''), (lowOnly = false)">Сбросить фильтры</UButton>
      </EmptyState>
      <UTable v-else :rows="filtered" :columns="columns">
        <template #created_at-data="{ row }"><span class="whitespace-nowrap text-sm">{{ formatDayTime(row.created_at) }}</span><div class="text-xs text-slate-500">стол №{{ row.table_number }}</div></template>
        <template #rating-data="{ row }">
          <span class="whitespace-nowrap text-amber-500">{{ '★'.repeat(row.rating) }}</span><span class="text-slate-200">{{ '★'.repeat(5 - row.rating) }}</span>
        </template>
        <template #comment-data="{ row }">
          <div class="max-w-md whitespace-normal text-sm">
            <UBadge v-if="row.rating <= 3" color="red" variant="subtle" size="xs" class="mr-1">позвонить гостю</UBadge>{{ row.comment || '—' }}
          </div>
        </template>
        <template #guest-data="{ row }">
          <div class="text-sm">{{ row.guest_name || '—' }}</div>
          <a v-if="row.guest_phone" :href="`tel:${row.guest_phone}`" class="text-xs text-cta-600 hover:underline">{{ formatPhone(row.guest_phone) }}</a>
        </template>
        <template #waiter_name-data="{ row }"><span class="text-sm">{{ row.waiter_name || '—' }}</span></template>
        <template #total-data="{ row }"><span class="whitespace-nowrap">{{ formatRub(row.total) }}</span></template>
      </UTable>
    </div>
  </div>
</template>
