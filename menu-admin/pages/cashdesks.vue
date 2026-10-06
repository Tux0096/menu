<script setup lang="ts">
import type { Cashdesks, CashSection, CashTerminal } from '~/types/api';
import { useRestaurantStore } from '~/stores/restaurant';

useHead({ title: 'Кассы — Фуджи' });

const restaurants = useRestaurantStore();
const notify = useNotify();
const confirm = useConfirm();

const data = ref<Cashdesks | null>(null);
const loading = ref(false);
const loadError = ref('');
async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    data.value = await useAuthFetch<Cashdesks>('/admin/cashdesks');
  } catch (e) {
    loadError.value = getErrorMessage(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);
watch(() => restaurants.slug, () => {
  data.value = null;
  load();
});

const bar = computed(() => data.value?.bars.find((b) => b.code === 'bar') ?? null);
const barOn = computed(() => Boolean(bar.value?.enabled && bar.value.terminalGroupId));
const terminal = (id: string | null | undefined) => data.value?.terminals.find((t) => t.id === id) ?? null;
const cashName = (code: string) => (code === 'main' ? 'Кухня (ИП)' : 'Бар (ООО)');

function status(t: CashTerminal | null) {
  if (!t) return { color: 'gray', label: data.value?.error ? 'нет данных iiko' : 'касса не найдена в iiko' } as const;
  if (!t.enabled) return { color: 'red', label: 'закрыта для облака iiko' } as const;
  if (t.alive === true) return { color: 'green', label: 'на связи' } as const;
  if (t.alive === false) return { color: 'red', label: 'не на связи' } as const;
  return { color: 'amber', label: 'статус неизвестен' } as const;
}

const terminalOptions = computed(() => (data.value?.terminals ?? []).map((t) => ({ value: t.id, label: `${t.name} — ${status(t).label}` })));
const barOptions = computed(() => [{ value: '', label: 'Нет отдельной кассы — всё на кухонную' }, ...terminalOptions.value]);

const saving = ref('');
async function setTerminal(role: 'main' | 'bar', terminalGroupId: string) {
  if (role === 'bar' && !terminalGroupId) {
    const ok = await confirm({
      title: 'Отключить кассу бара?',
      description: 'Крепкий алкоголь будет уходить на кухонную кассу (ИП) — без ЕГАИС и юрлица бара. Делайте так, только если на точке нет алкоголя или он пробивается на этой же кассе.',
      confirmLabel: 'Отключить',
      danger: true,
    });
    if (!ok) return;
  }
  saving.value = role;
  try {
    data.value = await useAuthFetch<Cashdesks>('/admin/cashdesks/terminal', { method: 'POST', body: { role, terminalGroupId: terminalGroupId || null } });
    notify.success(role === 'main' ? 'Касса кухни сохранена' : terminalGroupId ? 'Касса бара сохранена' : 'Касса бара отключена');
  } catch (e) {
    notify.error(e, 'Не удалось сохранить');
  } finally {
    saving.value = '';
  }
}

const routeOptions = (s: CashSection) => [
  { value: '', label: `Авто: ${cashName(s.auto)}` },
  { value: 'main', label: 'Кухня (ИП)' },
  { value: 'bar', label: 'Бар (ООО)' },
];
async function setRoute(s: CashSection, target: string) {
  saving.value = s.id;
  try {
    data.value = await useAuthFetch<Cashdesks>('/admin/cashdesks/route', { method: 'POST', body: { categoryId: s.id, target: target || null } });
    notify.success(`«${s.name}» → ${cashName(target || s.auto)}`);
  } catch (e) {
    notify.error(e, 'Не удалось сохранить');
  } finally {
    saving.value = '';
  }
}

const q = ref('');
const sections = computed(() => {
  const query = q.value.trim().toLowerCase();
  return (data.value?.sections ?? []).filter((s) => !query || s.name.toLowerCase().includes(query));
});
const barCount = computed(() => (data.value?.sections ?? []).filter((s) => s.target === 'bar').reduce((n, s) => n + s.products, 0));
const kitchenCount = computed(() => (data.value?.sections ?? []).filter((s) => s.target !== 'bar').reduce((n, s) => n + s.products, 0));
</script>

<template>
  <div>
    <PageHeader
      :title="`Кассы — ${restaurants.current?.name ?? ''}`"
      icon="i-heroicons-calculator"
      description="Куда уходят заказы из QR-меню. Кухня, пиво и безалкогольное — на кассу кухни (ИП). Крепкий алкоголь — отдельным заказом на тот же стол на кассу бара (ООО, ЕГАИС). Статусы «принят / готовится» приходят с той кассы, куда ушёл заказ."
    >
      <UButton icon="i-heroicons-arrow-path" color="white" :loading="loading" aria-label="Обновить" @click="load" />
    </PageHeader>

    <LoadError v-if="loadError && !data" :message="loadError" @retry="load" />
    <TableSkeleton v-else-if="!data" :rows="4" />
    <template v-else>
      <div v-if="data.error" class="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
        iiko: {{ data.error }}. Список касс недоступен — показаны сохранённые настройки.
      </div>

      <!-- Кассы -->
      <div class="mb-6 grid gap-4 lg:grid-cols-2">
        <div class="panel-box space-y-3 p-4">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-fire" class="h-5 w-5 text-brand-500" />
            <h3 class="font-semibold">Кухня (ИП)</h3>
            <span class="text-xs text-slate-500">· позиций {{ kitchenCount }}</span>
          </div>
          <USelect
            :model-value="data.kitchen.terminalGroupId ?? ''"
            :options="terminalOptions"
            :disabled="!terminalOptions.length || saving === 'main'"
            placeholder="Касса не выбрана"
            @update:model-value="(v: string) => setTerminal('main', v)"
          />
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <UBadge :color="status(terminal(data.kitchen.terminalGroupId)).color" variant="subtle" size="xs">{{ status(terminal(data.kitchen.terminalGroupId)).label }}</UBadge>
            <span class="text-slate-500">Если касса не на связи, заказ уйдёт на другую живую кассу кухни.</span>
          </div>
        </div>

        <div class="panel-box space-y-3 p-4">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-beaker" class="h-5 w-5 text-brand-500" />
            <h3 class="font-semibold">Бар (ООО, крепкий алкоголь)</h3>
            <span v-if="barOn" class="text-xs text-slate-500">· позиций {{ barCount }}</span>
          </div>
          <USelect
            :model-value="barOn ? bar!.terminalGroupId! : ''"
            :options="barOptions"
            :disabled="!terminalOptions.length || saving === 'bar'"
            @update:model-value="(v: string) => setTerminal('bar', v)"
          />
          <div v-if="barOn" class="flex flex-wrap items-center gap-2 text-xs">
            <UBadge :color="status(terminal(bar!.terminalGroupId)).color" variant="subtle" size="xs">{{ status(terminal(bar!.terminalGroupId)).label }}</UBadge>
            <span v-if="status(terminal(bar!.terminalGroupId)).color !== 'green'" class="text-red-700">
              Заказы алкоголя не пройдут: откройте эту кассу для облака iiko и включите iikoFront на барном компьютере.
            </span>
          </div>
          <p v-else class="text-xs text-slate-500">Отдельной кассы нет — все позиции уходят на кухонную кассу.</p>
        </div>
      </div>

      <!-- Все кассы iiko точки -->
      <div v-if="data.terminals.length" class="panel-box mb-6 overflow-hidden">
        <div class="border-b border-brand-50 px-4 py-3 text-sm font-semibold">Кассы точки в iiko</div>
        <ul class="divide-y divide-brand-50 text-sm">
          <li v-for="t in data.terminals" :key="t.id" class="flex flex-wrap items-center gap-2 px-4 py-2.5">
            <span class="font-medium">{{ t.name }}</span>
            <UBadge v-if="t.role" color="cta" variant="subtle" size="xs">{{ cashName(t.role) }}</UBadge>
            <span class="flex-1" />
            <UBadge :color="status(t).color" variant="subtle" size="xs">{{ status(t).label }}</UBadge>
            <span class="mono text-xs text-slate-400">{{ t.id.slice(0, 8) }}</span>
          </li>
        </ul>
      </div>

      <!-- Разделы → касса -->
      <div class="panel-box overflow-hidden">
        <div class="flex flex-col gap-2 border-b border-brand-50 p-3 sm:flex-row sm:items-center sm:p-4">
          <div class="flex-1">
            <div class="text-sm font-semibold">Разделы меню → касса</div>
            <div class="text-xs text-slate-500">
              «Авто» — по названию раздела в iiko (вино, виски, ром, коктейли… — бар). Выберите вручную, если раздел назван иначе.
            </div>
          </div>
          <UInput v-model="q" icon="i-heroicons-magnifying-glass" placeholder="Раздел" class="sm:w-64" />
        </div>
        <EmptyState v-if="!data.sections.length" icon="i-heroicons-book-open" title="Меню точки пустое" description="Выгрузите меню из iiko в разделе «Меню точки»." />
        <EmptyState v-else-if="!barOn" compact icon="i-heroicons-check-circle" title="Все разделы уходят на кухонную кассу" description="Выберите кассу бара выше, чтобы разделить заказ." />
        <EmptyState v-else-if="!sections.length" compact icon="i-heroicons-magnifying-glass" title="Ничего не нашлось" />
        <div v-else class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="bg-cream text-left text-xs text-slate-500">
              <tr>
                <th class="px-4 py-3 font-medium">Раздел</th>
                <th class="px-3 py-3 font-medium">Позиций</th>
                <th class="px-4 py-3 font-medium">Касса</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-brand-50">
              <tr v-for="s in sections" :key="s.id">
                <td class="px-4 py-2.5">
                  <div class="font-medium">{{ s.name }}</div>
                  <div v-if="s.manual" class="text-xs text-slate-500">выбрано вручную</div>
                </td>
                <td class="px-3 py-2.5 text-slate-600">{{ s.products }}</td>
                <td class="px-4 py-2.5">
                  <div class="flex items-center gap-2">
                    <UBadge :color="s.target === 'bar' ? 'amber' : 'gray'" variant="subtle" size="xs" class="w-20 justify-center">
                      {{ s.target === 'bar' ? 'бар' : 'кухня' }}
                    </UBadge>
                    <USelect
                      :model-value="s.manual ?? ''"
                      :options="routeOptions(s)"
                      size="xs"
                      class="w-48"
                      :disabled="saving === s.id"
                      @update:model-value="(v: string) => setRoute(s, v)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p class="mt-3 text-xs text-slate-500">
        Касса меняется сразу для новых отправок, в том числе для позиций, уже лежащих в корзине. Отправленное в iiko не переносится.
        Алкоголь гость оплачивает официанту: онлайн-оплата оформлена на юрлицо кухни.
      </p>
    </template>
  </div>
</template>
