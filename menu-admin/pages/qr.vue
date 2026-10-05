<script setup lang="ts">
import type { Restaurant, TableQr } from '~/types/api';
import { useRestaurantStore } from '~/stores/restaurant';

useHead({ title: 'QR-коды столов — Фуджи' });

const restaurants = useRestaurantStore();
const notify = useNotify();

const tables = ref<TableQr[] | null>(null);
const loadError = ref('');
const loading = ref(false);
const count = ref<number>(restaurants.current?.tables_count ?? 20);

async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    tables.value = await useAuthFetch<TableQr[]>('/admin/tables');
    count.value = restaurants.current?.tables_count || tables.value.length;
  } catch (e) {
    loadError.value = getErrorMessage(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);
watch(() => restaurants.slug, () => {
  tables.value = null;
  load();
});

const saving = ref(false);
async function saveCount() {
  const r = restaurants.current;
  const n = Math.round(Number(count.value));
  if (!r || !n || n < 1 || n > 200) {
    notify.error('Число столов — от 1 до 200');
    return;
  }
  saving.value = true;
  try {
    await useAuthFetch<Restaurant>(`/admin/restaurants/${r.id}`, { method: 'PATCH', body: { tablesCount: n } });
    await restaurants.load(true);
    notify.success('Число столов сохранено');
    await load();
  } catch (e) {
    notify.error(e, 'Не удалось сохранить');
  } finally {
    saving.value = false;
  }
}

async function copy(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    notify.success('Ссылка скопирована');
  } catch {
    notify.error('Браузер не дал скопировать — выделите ссылку вручную');
  }
}
const print = () => window.print();
</script>

<template>
  <div>
    <div class="no-print">
      <PageHeader
        :title="`QR-коды столов${restaurants.current ? ` — ${restaurants.current.name}` : ''}`"
        icon="i-heroicons-qr-code"
        description="Наклейки на столы: гость сканирует код и попадает в меню своего стола. Печатайте на листе A4 — по 6–8 кодов, размер кода не меньше 3 см."
      >
        <UButton icon="i-heroicons-printer" color="cta" :disabled="!tables?.length" @click="print">Печать</UButton>
      </PageHeader>

      <div class="panel-box mb-4 flex flex-wrap items-end gap-3 p-3 sm:p-4">
        <UFormGroup label="Столов в зале" class="w-40">
          <UInput v-model.number="count" type="number" min="1" max="200" />
        </UFormGroup>
        <UButton color="white" :loading="saving" @click="saveCount">Сохранить</UButton>
        <p class="text-xs text-slate-500 sm:ml-2 sm:max-w-md">Столы нумеруются с 1. Номер на наклейке совпадает с номером стола в iiko — по нему заказ попадает на нужный стол.</p>
      </div>
    </div>

    <LoadError v-if="loadError && !tables" :message="loadError" @retry="load" />
    <div v-else-if="!tables" class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      <USkeleton v-for="i in 10" :key="i" class="h-60 rounded-2xl" />
    </div>
    <div v-else class="qr-grid grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      <div v-for="t in tables" :key="t.table" class="qr-card panel-box flex flex-col items-center p-4 text-center">
        <div class="text-sm font-semibold">Стол №{{ t.table }}</div>
        <img :src="t.qr" :alt="`QR стол ${t.table}`" class="my-2 h-36 w-36" loading="lazy" />
        <div class="text-xs">Отсканируйте, чтобы открыть меню</div>
        <div class="no-print mt-2 flex gap-1">
          <UButton size="xs" color="white" icon="i-heroicons-clipboard" @click="copy(t.url)">Ссылка</UButton>
          <UButton size="xs" color="white" icon="i-heroicons-arrow-top-right-on-square" :to="t.url" target="_blank" aria-label="Открыть меню стола" />
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@media print {
  aside,
  header,
  .no-print {
    display: none !important;
  }
  .panel-content {
    padding: 0 !important;
    max-width: none !important;
  }
  .qr-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }
  .qr-card {
    break-inside: avoid;
    box-shadow: none !important;
  }
}
</style>
