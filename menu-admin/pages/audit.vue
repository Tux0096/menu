<script setup lang="ts">
import type { AuditRow } from '~/types/api';

useHead({ title: 'Журнал изменений — Фуджи' });

// Понятные названия действий (menu-api: audit(…, action, …))
const ACTIONS: Record<string, string> = {
  login: 'Вход',
  'login.pin': 'Вход официанта по PIN',
  'login.iiko': 'Вход через iiko',
  'menu.card.network': 'Карточка блюда (сеть)',
  'menu.availability': 'Показ блюда на точке',
  'menu.categories': 'Разделы меню',
  'menu.category.image': 'Картинка раздела',
  'menu.modifiers': 'Названия модификаторов',
  'menu.modifier.image': 'Картинка модификатора',
  'cashdesk.route': 'Раздел → касса',
  'cashdesk.terminal': 'Касса точки',
  'restaurant.iiko_setup': 'Настройки iiko точки',
  'restaurant.info': 'Карточка точки',
  'qr.signed_required': 'Вход только по QR',
  'table.close_unpaid': 'Стол закрыт без оплаты',
  'waiter.tables': 'Официант выбрал свои столы',
  'menu.override': 'Карточка блюда',
  'menu.override.delete': 'Карточка — как в iiko',
  'menu.sync': 'Перевыгрузка меню из iiko',
  'media.upload': 'Загрузка фото/видео',
  'promos.save': 'Баннер сохранён',
  'promos.delete': 'Баннер удалён',
  'chips.save': 'AI-подсказка сохранена',
  'chips.delete': 'AI-подсказка удалена',
  'staff.save': 'Сотрудник сохранён',
  'restaurant.update': 'Ресторан',
  'payments.save': 'Настройки оплаты',
  'source.save': 'Источник iiko',
  'source.delete': 'Источник iiko удалён',
  'order.edit': 'Заказ изменён официантом',
  'order.send_to_kitchen': 'Заказ отправлен в iiko',
  'table.pay': 'Оплата официанту',
  'table.close': 'Стол закрыт',
};
const actionLabel = (a: string) => ACTIONS[a] ?? a;
// Фильтр по виду действия
const KINDS = [
  { value: '', label: 'Все действия' },
  { value: 'menu', label: 'Меню и карточки', test: (a: string) => a.startsWith('menu.') || a === 'media.upload' },
  { value: 'marketing', label: 'Баннеры и AI-подсказки', test: (a: string) => a.startsWith('promos.') || a.startsWith('chips.') },
  { value: 'orders', label: 'Заказы и столы', test: (a: string) => a.startsWith('order.') || a.startsWith('table.') || a.startsWith('waiter.') },
  { value: 'settings', label: 'Настройки и сотрудники', test: (a: string) => /^(staff|restaurant|payments|source|cashdesk|qr)\./.test(a) },
  { value: 'login', label: 'Входы', test: (a: string) => a.startsWith('login') },
];
const kind = ref('');

const rows = ref<AuditRow[] | null>(null);
const loadError = ref('');
const loading = ref(false);
async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    rows.value = await useAuthFetch<AuditRow[]>('/admin/audit');
  } catch (e) {
    loadError.value = getErrorMessage(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);

const q = ref('');
const hideLogins = ref(true);
const filtered = computed(() => {
  const query = q.value.trim().toLowerCase();
  return (rows.value ?? []).filter((a) => {
    if (hideLogins.value && !kind.value && a.action.startsWith('login')) return false;
    const k = KINDS.find((x) => x.value === kind.value);
    if (k?.test && !k.test(a.action)) return false;
    if (!query) return true;
    return `${a.staff_name ?? ''} ${actionLabel(a.action)} ${a.entity_id ?? ''} ${JSON.stringify(a.payload ?? {})}`.toLowerCase().includes(query);
  });
});

function details(a: AuditRow): string {
  const p = a.payload ?? {};
  const name = (p.product_name ?? p.title ?? p.login ?? p.label) as string | undefined;
  const rest = Object.entries(p)
    .filter(([k, v]) => !['productId', 'product_name', 'title', 'login', 'label', 'id'].includes(k) && v !== '' && v !== null && v !== undefined)
    .slice(0, 4)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`.slice(0, 60));
  return [name, ...rest].filter(Boolean).join(' · ');
}

const columns = [
  { key: 'created_at', label: 'Когда' },
  { key: 'staff_name', label: 'Кто' },
  { key: 'action', label: 'Что сделал' },
  { key: 'details', label: 'Подробности' },
];
</script>

<template>
  <div>
    <PageHeader title="Журнал изменений" icon="i-heroicons-clipboard-document-list" description="Кто и что менял в меню, баннерах, сотрудниках и оплате. Последние 200 записей.">
      <UButton icon="i-heroicons-arrow-path" color="white" :loading="loading" aria-label="Обновить" @click="load" />
    </PageHeader>

    <div class="panel-box mb-4 flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:p-4">
      <UInput v-model="q" icon="i-heroicons-magnifying-glass" placeholder="Сотрудник, действие, блюдо" class="sm:w-80" />
      <USelect v-model="kind" :options="KINDS.map(({ value, label }) => ({ value, label }))" class="sm:w-60" aria-label="Вид действия" />
      <label v-if="!kind" class="flex items-center gap-2 text-sm"><UToggle v-model="hideLogins" /> Скрыть входы</label>
    </div>

    <LoadError v-if="loadError && !rows" :message="loadError" @retry="load" />
    <div v-else class="panel-box overflow-hidden">
      <TableSkeleton v-if="!rows" :rows="8" />
      <EmptyState v-else-if="!filtered.length" compact icon="i-heroicons-clipboard-document-list" title="Записей нет" />
      <UTable v-else :rows="filtered" :columns="columns">
        <template #created_at-data="{ row }"><span class="whitespace-nowrap text-sm">{{ formatDayTime(row.created_at) }}</span></template>
        <template #staff_name-data="{ row }"><span class="text-sm">{{ row.staff_name || '—' }}</span></template>
        <template #action-data="{ row }"><span class="text-sm font-medium">{{ actionLabel(row.action) }}</span></template>
        <template #details-data="{ row }"><span class="block max-w-xl truncate text-xs text-slate-500" :title="JSON.stringify(row.payload ?? {})">{{ details(row) || '—' }}</span></template>
      </UTable>
    </div>
  </div>
</template>
