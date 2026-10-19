<script setup lang="ts">
// Что из внешнего меню iiko не попало к гостям и почему — например, «нет пиццы»: раздел скрыт во внешнем меню
// или у позиций нет цены для организации точки. Исправляется в iikoWeb, после выгрузки (каждые 30 мин) появится у гостей.
interface SyncSection { name: string; hidden: boolean; total: number; shown: number; hiddenItems: number; noPrice: number; examples: string[] }
interface SyncReportRow { restaurant: string; slug: string; source: string; menuName: string | null; at: string; sections: SyncSection[] }

const rows = ref<SyncReportRow[] | null>(null);
const error = ref('');
onMounted(async () => {
  try {
    rows.value = await useAuthFetch<SyncReportRow[]>('/admin/network-menu/sync-report', {}, { restaurant: false });
  } catch (e) {
    error.value = getErrorMessage(e);
  }
});
const issues = computed(() => (rows.value ?? []).reduce((n, r) => n + r.sections.length, 0));
const shortName = (name: string) => name.replace(/^Фуджи\s+/i, '');
function reason(c: SyncSection) {
  if (c.hidden) return `раздел скрыт во внешнем меню iiko (${c.total} поз.)`;
  const parts = [];
  if (c.noPrice) parts.push(`без цены для точки: ${c.noPrice} из ${c.total}${c.examples.length ? ` (${c.examples.join(', ')}${c.noPrice > c.examples.length ? '…' : ''})` : ''}`);
  if (c.hiddenItems) parts.push(`скрыто позиций: ${c.hiddenItems}`);
  if (!c.total) parts.push('в разделе нет позиций');
  return parts.join(' · ');
}
</script>

<template>
  <details v-if="rows && issues" class="panel-box mb-4 overflow-hidden">
    <summary class="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm">
      <UIcon name="i-heroicons-exclamation-triangle" class="h-5 w-5 text-amber-500" />
      <span class="font-medium">Не попало к гостям из iiko: {{ issues }}</span>
      <span class="text-slate-500">— разделы и позиции внешнего меню, которых нет у гостей. Нажмите, чтобы посмотреть</span>
    </summary>
    <div class="space-y-4 border-t border-brand-50 px-4 py-3">
      <p class="rounded-xl bg-cream p-3 text-sm text-slate-600">
        Как исправить в iikoWeb: <b>скрытый раздел</b> — во внешнем меню снимите «Скрыть» у раздела;
        <b>без цены для точки</b> — во внешнем меню задайте цену позиции для организации этой точки
        (или «для всех организаций»). После выгрузки (каждые 30 минут или «Обновить из iiko» у точки) блюда появятся у гостей.
      </p>
      <div v-for="r in rows.filter((x) => x.sections.length)" :key="`${r.slug}-${r.source}`">
        <div class="mb-1 text-sm font-semibold">
          {{ shortName(r.restaurant) }}<span v-if="r.source !== 'main'" class="font-normal text-slate-500"> · бар</span>
          <span class="font-normal text-slate-500"> · меню «{{ r.menuName }}» · {{ formatAgo(r.at) }}</span>
        </div>
        <ul class="space-y-1 text-sm">
          <li v-for="c in r.sections" :key="c.name" class="flex flex-wrap gap-x-2">
            <span class="font-medium">{{ c.name }}</span>
            <span class="text-slate-600">— {{ reason(c) }}</span>
            <span v-if="c.shown" class="text-green-700">у гостей: {{ c.shown }}</span>
          </li>
        </ul>
      </div>
    </div>
  </details>
  <p v-else-if="error" class="mb-4 text-xs text-slate-500">Отчёт выгрузки недоступен: {{ error }}</p>
</template>
