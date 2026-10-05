<script setup lang="ts">
import type { AiChip } from '~/types/api';

useHead({ title: 'AI-подсказки — Фуджи' });

const notify = useNotify();
const confirm = useConfirm();

const rows = ref<AiChip[] | null>(null);
const loadError = ref('');
const loading = ref(false);
async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    rows.value = await useAuthFetch<AiChip[]>('/admin/chips');
  } catch (e) {
    loadError.value = getErrorMessage(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);

const columns = [
  { key: 'label', label: 'Чип' },
  { key: 'query', label: 'Что ищет помощник' },
  { key: 'sort_order', label: 'Порядок' },
  { key: 'is_active', label: 'Показывать' },
  { key: 'actions', label: '' },
];

const open = ref(false);
const saving = ref(false);
const form = reactive({ id: undefined as AiChip['id'], emoji: '', label: '', query: '', sort_order: 0, is_active: true });
const { takeSnapshot, requestClose } = useModalCloseGuard(open, () => form);

function edit(c?: AiChip) {
  Object.assign(form, {
    id: c?.id,
    emoji: c?.emoji ?? '',
    label: c?.label ?? '',
    query: c?.query ?? '',
    sort_order: c?.sort_order ?? (rows.value?.length ?? 0) * 10,
    is_active: c ? c.is_active : true,
  });
  open.value = true;
  takeSnapshot();
}

async function save() {
  if (!form.label.trim()) {
    notify.error('Впишите текст чипа');
    return;
  }
  saving.value = true;
  try {
    await useAuthFetch('/admin/chips', {
      method: 'POST',
      body: { ...form, label: form.label.trim(), query: form.query.trim() || form.label.trim(), sort_order: Number(form.sort_order) || 0 },
    });
    open.value = false;
    notify.success('Подсказка сохранена');
    await load();
  } catch (e) {
    notify.error(e, 'Не удалось сохранить');
  } finally {
    saving.value = false;
  }
}

async function toggle(c: AiChip) {
  try {
    await useAuthFetch('/admin/chips', { method: 'POST', body: { id: c.id, is_active: !c.is_active } });
    await load();
  } catch (e) {
    notify.error(e, 'Не удалось переключить');
  }
}

async function remove(c: AiChip) {
  const ok = await confirm({ title: `Удалить подсказку «${c.label}»?`, confirmLabel: 'Удалить', danger: true });
  if (!ok) return;
  try {
    await useAuthFetch(`/admin/chips/${c.id}`, { method: 'DELETE' });
    notify.success('Подсказка удалена');
    await load();
  } catch (e) {
    notify.error(e, 'Не удалось удалить');
  }
}
</script>

<template>
  <div>
    <PageHeader
      title="AI-подсказки"
      icon="i-heroicons-sparkles"
      description="Чипы на экране AI-помощника в QR-меню: «Что-нибудь острое», «Сет на компанию». Гость нажимает — помощник ищет блюда по запросу."
    >
      <UButton icon="i-heroicons-plus" color="cta" @click="edit()">Новая подсказка</UButton>
      <UButton icon="i-heroicons-arrow-path" color="white" :loading="loading" aria-label="Обновить" @click="load" />
    </PageHeader>

    <LoadError v-if="loadError && !rows" :message="loadError" @retry="load" />
    <div v-else class="panel-box overflow-hidden">
      <TableSkeleton v-if="!rows" :rows="5" />
      <EmptyState
        v-else-if="!rows.length"
        icon="i-heroicons-sparkles"
        title="Подсказок пока нет"
        description="Без подсказок гость видит пустую строку запроса. Добавьте 4–6 популярных запросов."
        action-label="Добавить подсказку"
        @action="edit()"
      />
      <UTable v-else :rows="rows" :columns="columns" @select="edit">
        <template #label-data="{ row }">
          <span class="inline-flex items-center gap-1.5 rounded-full bg-blush px-3 py-1 text-sm">{{ row.emoji }} {{ row.label }}</span>
        </template>
        <template #query-data="{ row }"><span class="text-sm text-slate-600">{{ row.query }}</span></template>
        <template #is_active-data="{ row }">
          <div @click.stop><UToggle :model-value="row.is_active" :aria-label="`Показывать: ${row.label}`" @update:model-value="toggle(row)" /></div>
        </template>
        <template #actions-data="{ row }">
          <div class="flex justify-end" @click.stop>
            <UButton size="xs" color="red" variant="ghost" icon="i-heroicons-trash" :aria-label="`Удалить ${row.label}`" @click="remove(row)" />
          </div>
        </template>
      </UTable>
    </div>

    <UModal v-model="open" prevent-close :ui="{ width: 'sm:max-w-lg' }" @close-prevented="requestClose">
      <div class="p-6">
        <h2 class="mb-4 text-lg font-semibold">{{ form.id ? 'Подсказка' : 'Новая подсказка' }}</h2>
        <form class="space-y-4" @submit.prevent="save">
          <div class="grid gap-4 sm:grid-cols-[96px_1fr]">
            <UFormGroup label="Эмодзи"><UInput v-model="form.emoji" :maxlength="4" placeholder="🌶" /></UFormGroup>
            <UFormGroup label="Текст чипа" required help="2–4 слова"><UInput v-model="form.label" :maxlength="40" autofocus /></UFormGroup>
          </div>
          <UFormGroup label="Что ищет помощник" help="Пусто — как текст чипа. Например: «острые роллы и супы»">
            <UInput v-model="form.query" :maxlength="200" />
          </UFormGroup>
          <div class="flex flex-wrap items-end gap-6">
            <UFormGroup label="Порядок" class="w-32"><UInput v-model.number="form.sort_order" type="number" /></UFormGroup>
            <label class="flex items-center gap-3 pb-2 text-sm"><UToggle v-model="form.is_active" /> Показывать</label>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <UButton color="white" @click="requestClose">Отмена</UButton>
            <UButton type="submit" color="cta" :loading="saving">Сохранить</UButton>
          </div>
        </form>
      </div>
    </UModal>
  </div>
</template>
