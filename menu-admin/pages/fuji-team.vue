<script setup lang="ts">
import type { FujiTeamSchema, FujiTeamStatus, FujiTeamTest } from '~/types/api';

useHead({ title: 'Фуджи Тим — Фуджи' });

const notify = useNotify();

const status = ref<FujiTeamStatus | null>(null);
const schema = ref<FujiTeamSchema | null>(null);
const loadError = ref('');
const schemaError = ref('');
const query = ref('');
const saved = ref('');
const test = ref<FujiTeamTest | null>(null);
const testError = ref('');
const testing = ref(false);
const saving = ref(false);
const tableFilter = ref('');
const dirty = computed(() => query.value.trim() !== saved.value.trim());
useLeaveGuard(dirty);

async function load() {
  loadError.value = '';
  try {
    status.value = await useAuthFetch<FujiTeamStatus>('/admin/fuji-team');
    query.value = status.value.query;
    saved.value = status.value.query;
    if (status.value.connected) await loadSchema();
  } catch (e) {
    loadError.value = getErrorMessage(e);
  }
}
async function loadSchema() {
  schemaError.value = '';
  try {
    schema.value = await useAuthFetch<FujiTeamSchema>('/admin/fuji-team/schema');
    // Запроса ещё нет — подставляем подсказку по структуре базы
    if (!query.value.trim() && schema.value.suggestion) query.value = schema.value.suggestion.query;
  } catch (e) {
    schemaError.value = getErrorMessage(e);
  }
}
onMounted(load);

async function runTest() {
  testing.value = true;
  testError.value = '';
  test.value = null;
  try {
    test.value = await useAuthFetch<FujiTeamTest>('/admin/fuji-team/test', { method: 'POST', body: { query: query.value } });
  } catch (e) {
    testError.value = getErrorMessage(e);
  } finally {
    testing.value = false;
  }
}
async function save() {
  saving.value = true;
  try {
    status.value = await useAuthFetch<FujiTeamStatus>('/admin/fuji-team', { method: 'PUT', body: { query: query.value } });
    saved.value = query.value;
    notify.success(status.value.enabled ? 'Сохранено — официанты входят по табельному из «Фуджи Тим»' : 'Сохранено');
  } catch (e) {
    notify.error(getErrorMessage(e));
  } finally {
    saving.value = false;
  }
}

const tables = computed(() => {
  const f = tableFilter.value.trim().toLowerCase();
  return (schema.value?.tables ?? []).filter((t) => !f || t.name.toLowerCase().includes(f) || t.columns.some((c) => c.name.toLowerCase().includes(f)));
});
const ROLE_LABEL: Record<string, string> = { waiter: 'Официанты', manager: 'Управляющие', none: 'Не зал (не войдут)' };
</script>

<template>
  <div>
    <PageHeader
      title="Фуджи Тим"
      icon="i-heroicons-identification"
      description="Вход официантов и администраторов зала на of. по табельному номеру iiko из базы «Фуджи Тим». В iiko при входе не ходим и смену не проверяем; имя сотрудника видит гость («Ваш официант — …»)."
    />

    <LoadError v-if="loadError && !status" :message="loadError" @retry="load" />
    <div v-else-if="!status" class="max-w-4xl space-y-4">
      <USkeleton class="h-28 rounded-2xl" />
      <USkeleton class="h-64 rounded-2xl" />
    </div>
    <div v-else class="max-w-4xl space-y-5">
      <!-- Подключение -->
      <div class="panel-box space-y-2 p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="panel-section-title">Подключение к базе</h2>
          <UBadge v-if="status.connected" color="green" variant="subtle">Подключено · {{ status.host }}</UBadge>
          <UBadge v-else-if="status.configured" color="red" variant="subtle">Нет связи · {{ status.host || 'строка подключения' }}</UBadge>
          <UBadge v-else color="amber" variant="subtle">Не настроено</UBadge>
        </div>
        <p v-if="!status.configured" class="text-sm text-slate-600">
          Добавьте в GitHub репозитория секрет <b>FUJI_TEAM_DATABASE_URL</b> (Settings → Secrets and variables → Actions) со строкой
          <code>postgres://логин:пароль@хост:порт/база</code> — пользователь только на чтение. Если база требует SSL — секрет <b>FUJI_TEAM_SSL</b> = <code>true</code>.
          Затем перезапустите деплой (Actions → Deploy → Run workflow). Пароль хранится только на сервере.
        </p>
        <p v-else-if="!status.connected" class="text-sm text-red-700">{{ status.error }} — проверьте строку подключения и что сервер меню пускают к базе (порт, pg_hba, firewall).</p>
        <p v-else class="text-sm text-slate-600">
          {{ status.enabled ? 'Вход по табельному из «Фуджи Тим» включён.' : 'Осталось задать запрос сотрудников ниже — до этого вход идёт по-старому, через iiko.' }}
        </p>
      </div>

      <!-- Запрос сотрудников -->
      <div v-if="status.connected" class="panel-box space-y-3 p-5">
        <h2 class="panel-section-title">Запрос сотрудников</h2>
        <p class="text-xs text-slate-500">
          Один SELECT с колонками: <b>code</b> — табельный номер iiko (обязательно), <b>name</b> — ФИО, <b>position</b> — должность
          (официант, администратор, менеджер…), <b>restaurant</b> — точка (если нет — сотрудник выбирает её при входе), <b>active</b> — работает (false — уволен).
          Выполняется только на чтение.
        </p>
        <UAlert
          v-if="schema?.suggestion && query === schema.suggestion.query"
          color="green"
          variant="soft"
          icon="i-heroicons-sparkles"
          :title="`Подобрал по структуре базы: таблица ${schema.suggestion.table}`"
          :description="schema.suggestion.note ? `Проверьте: ${schema.suggestion.note}.` : 'Проверьте результат кнопкой «Проверить».'"
        />
        <UTextarea v-model="query" :rows="4" class="font-mono" placeholder="SELECT tab_number AS code, full_name AS name, position, point AS restaurant, NOT fired AS active FROM employees" />
        <div class="flex flex-wrap gap-2">
          <UButton color="white" icon="i-heroicons-play" :loading="testing" :disabled="!query.trim()" @click="runTest">Проверить</UButton>
          <UButton icon="i-heroicons-check" :loading="saving" :disabled="!dirty" @click="save">Сохранить</UButton>
        </div>
        <UAlert v-if="testError" color="red" variant="soft" icon="i-heroicons-exclamation-triangle" :title="testError" />
        <div v-if="test" class="space-y-3 rounded-xl bg-brand-50/50 p-4 text-sm">
          <div>Сотрудников: <b>{{ test.total }}</b>, работают: <b>{{ test.active }}</b>{{ test.duplicates ? ` · повторяющихся табельных: ${test.duplicates}` : '' }}</div>
          <div class="flex flex-wrap gap-2">
            <UBadge v-for="(n, k) in test.roles" :key="k" :color="k === 'none' ? 'gray' : 'green'" variant="subtle">{{ ROLE_LABEL[k] }}: {{ n }}</UBadge>
          </div>
          <div>
            <div class="mb-1 text-xs text-slate-500">Точки</div>
            <div class="flex flex-wrap gap-2">
              <UBadge v-for="p in test.points" :key="p.name" :color="p.name.startsWith('не найдена') || p.name === 'точка не указана' ? 'amber' : 'green'" variant="subtle">{{ p.name }}: {{ p.count }}</UBadge>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="text-slate-500"><tr><th class="py-1 pr-3">Табельный</th><th class="pr-3">ФИО</th><th class="pr-3">Должность</th><th>Точка</th></tr></thead>
              <tbody>
                <tr v-for="(r, i) in test.sample" :key="i" class="border-t border-brand-50"><td class="py-1 pr-3 font-mono">{{ r.code }}</td><td class="pr-3">{{ r.name }}</td><td class="pr-3">{{ r.position }}</td><td>{{ r.restaurant || '—' }}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Структура базы -->
      <div v-if="status.connected" class="panel-box space-y-3 p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="panel-section-title">Структура базы</h2>
          <UInput v-model="tableFilter" icon="i-heroicons-magnifying-glass" placeholder="Таблица или колонка" class="w-64" />
        </div>
        <p class="text-xs text-slate-500">Только названия таблиц и колонок — данные не показываются.</p>
        <UAlert v-if="schemaError" color="red" variant="soft" :title="schemaError" />
        <USkeleton v-else-if="!schema" class="h-32 rounded-xl" />
        <div v-else class="grid gap-3 sm:grid-cols-2">
          <div v-for="t in tables" :key="`${t.schema}.${t.name}`" class="rounded-xl p-3 ring-1 ring-brand-100">
            <div class="mb-1 text-sm font-semibold">{{ t.schema === 'public' ? t.name : `${t.schema}.${t.name}` }}</div>
            <div class="flex flex-wrap gap-1">
              <span v-for="c in t.columns" :key="c.name" class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-2xs text-slate-700" :title="c.type">{{ c.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
