<script setup lang="ts">
import type { Restaurant, Staff, StaffRole } from '~/types/api';

useHead({ title: 'Сотрудники — Фуджи' });

const notify = useNotify();

const rows = ref<Staff[] | null>(null);
const rests = ref<Restaurant[]>([]);
const loadError = ref('');
const loading = ref(false);
async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    const [s, r] = await Promise.all([useAuthFetch<Staff[]>('/admin/staff'), useAuthFetch<Restaurant[]>('/admin/restaurants')]);
    rows.value = s;
    rests.value = r;
  } catch (e) {
    loadError.value = getErrorMessage(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);

const q = ref('');
const role = ref<'' | StaffRole>('');
const ROLE_ORDER: StaffRole[] = ['waiter', 'manager', 'marketing', 'admin'];
const roleChips = computed(() => [
  { value: '' as const, label: 'Все', n: rows.value?.length ?? 0 },
  ...ROLE_ORDER.map((r) => ({ value: r, label: ROLE_LABELS[r], n: (rows.value ?? []).filter((u) => u.role === r).length })),
]);
const filtered = computed(() => {
  const query = q.value.trim().toLowerCase();
  return (rows.value ?? []).filter((u) => (!role.value || u.role === role.value) && (!query || `${u.name} ${u.login}`.toLowerCase().includes(query)));
});
const restName = (id: string | null) => (id ? rests.value.find((r) => r.id === id)?.name ?? '—' : 'Все рестораны');

const columns = [
  { key: 'name', label: 'Сотрудник' },
  { key: 'role', label: 'Роль' },
  { key: 'restaurant', label: 'Ресторан' },
  { key: 'pin', label: 'PIN' },
  { key: 'isActive', label: 'Статус' },
];

// ---------- форма
const open = ref(false);
const saving = ref(false);
const form = reactive({
  id: undefined as string | undefined,
  name: '',
  login: '',
  role: 'waiter' as StaffRole,
  restaurantId: '',
  password: '',
  pin: '',
  clearPin: false,
  isActive: true,
  hasPin: false,
});
const { takeSnapshot, requestClose } = useModalCloseGuard(open, () => form);
const roleOptions = ROLE_ORDER.map((r) => ({ value: r, label: ROLE_LABELS[r] }));
const restaurantOptions = computed(() => [{ value: '', label: 'Все рестораны' }, ...rests.value.map((r) => ({ value: r.id, label: r.name }))]);

function edit(u?: Staff) {
  Object.assign(form, {
    id: u?.id,
    name: u?.name ?? '',
    login: u?.login ?? '',
    role: u?.role ?? 'waiter',
    restaurantId: u?.restaurantId ?? '',
    password: '',
    pin: '',
    clearPin: false,
    isActive: u ? u.isActive !== false : true,
    hasPin: Boolean(u?.hasPin),
  });
  open.value = true;
  takeSnapshot();
}

const error = computed(() => {
  if (!form.name.trim()) return 'Впишите имя';
  if (!form.login.trim()) return 'Впишите логин';
  if (!form.id && !form.password) return 'Задайте пароль';
  if (form.pin && !/^\d{4,6}$/.test(form.pin)) return 'PIN — 4–6 цифр';
  if (form.role === 'waiter' && !form.id && !form.pin) return 'Официанту нужен PIN — по нему он входит в приложение';
  return '';
});

async function save() {
  if (error.value) {
    notify.error(error.value);
    return;
  }
  saving.value = true;
  try {
    const body: Record<string, unknown> = {
      id: form.id,
      name: form.name.trim(),
      login: form.login.trim(),
      role: form.role,
      restaurantId: form.restaurantId,
      isActive: form.isActive,
      clearPin: form.clearPin,
    };
    if (form.password) body.password = form.password;
    if (form.pin) body.pin = form.pin;
    await useAuthFetch('/admin/staff', { method: 'POST', body });
    open.value = false;
    notify.success('Сотрудник сохранён', form.pin ? 'Передайте PIN лично — повторно его не показать' : undefined);
    await load();
  } catch (e) {
    notify.error(e, 'Не удалось сохранить');
  } finally {
    saving.value = false;
  }
}

function randomPin() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  form.pin = String(100000 + (a[0]! % 900000));
}
</script>

<template>
  <div>
    <PageHeader
      title="Сотрудники"
      icon="i-heroicons-users"
      description="Кто и куда входит. Официанты — в приложение «Фуджи Официант» по PIN; управляющие, маркетинг и администраторы — в эту админку по логину и паролю."
    >
      <UButton icon="i-heroicons-user-plus" color="cta" @click="edit()">Добавить сотрудника</UButton>
      <UButton icon="i-heroicons-arrow-path" color="white" :loading="loading" aria-label="Обновить" @click="load" />
    </PageHeader>

    <div class="panel-box mb-4 flex flex-col gap-2 p-3 sm:p-4 md:flex-row md:items-center">
      <UInput v-model="q" icon="i-heroicons-magnifying-glass" placeholder="Имя или логин" class="md:w-72" />
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="c in roleChips"
          :key="c.value"
          type="button"
          class="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ring-1 transition"
          :class="role === c.value ? 'bg-brand-500 text-white ring-brand-500' : 'bg-white text-slate-600 ring-brand-100 hover:ring-brand-200'"
          @click="role = c.value"
        >
          {{ c.label }} <span class="rounded-full px-1.5 text-xs" :class="role === c.value ? 'bg-white/20' : 'bg-blush'">{{ c.n }}</span>
        </button>
      </div>
    </div>

    <LoadError v-if="loadError && !rows" :message="loadError" @retry="load" />
    <div v-else class="panel-box overflow-hidden">
      <TableSkeleton v-if="!rows" :rows="6" />
      <EmptyState v-else-if="!filtered.length" compact icon="i-heroicons-users" title="Никого не нашлось" />
      <UTable v-else :rows="filtered" :columns="columns" @select="edit">
        <template #name-data="{ row }">
          <div class="font-medium">{{ row.name }}</div>
          <div class="text-xs text-slate-500">{{ row.login }}</div>
        </template>
        <template #role-data="{ row }">
          <UBadge :color="row.role === 'admin' ? 'cta' : row.role === 'waiter' ? 'gray' : 'sky'" variant="subtle">{{ ROLE_LABELS[row.role as StaffRole] ?? row.role }}</UBadge>
        </template>
        <template #restaurant-data="{ row }"><span class="text-sm">{{ restName(row.restaurantId) }}</span></template>
        <template #pin-data="{ row }"><span class="text-sm">{{ row.hasPin ? '●●●●' : '—' }}</span></template>
        <template #isActive-data="{ row }">
          <UBadge :color="row.isActive ? 'green' : 'gray'" variant="subtle">{{ row.isActive ? 'Активен' : 'Отключён' }}</UBadge>
        </template>
      </UTable>
    </div>

    <UModal v-model="open" prevent-close :ui="{ width: 'sm:max-w-xl' }" @close-prevented="requestClose">
      <div class="p-6">
        <h2 class="mb-4 text-lg font-semibold">{{ form.id ? form.name || 'Сотрудник' : 'Новый сотрудник' }}</h2>
        <form class="space-y-4" @submit.prevent="save">
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormGroup label="Имя" required><UInput v-model="form.name" autofocus /></UFormGroup>
            <UFormGroup label="Логин" required><UInput v-model="form.login" autocomplete="off" /></UFormGroup>
            <UFormGroup label="Роль"><USelect v-model="form.role" :options="roleOptions" /></UFormGroup>
            <UFormGroup label="Ресторан"><USelect v-model="form.restaurantId" :options="restaurantOptions" /></UFormGroup>
          </div>
          <p class="rounded-xl bg-cream p-3 text-xs text-slate-600">{{ ROLE_INFO[form.role] }}</p>
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormGroup :label="form.id ? 'Новый пароль' : 'Пароль'" :required="!form.id" :help="form.id ? 'Пусто — не менять' : undefined">
              <UInput v-model="form.password" type="password" autocomplete="new-password" />
            </UFormGroup>
            <UFormGroup label="PIN для приложения официанта" :help="form.hasPin ? 'Задан. Пусто — не менять' : '4–6 цифр, у каждого свой'">
              <UInput v-model="form.pin" inputmode="numeric" :maxlength="6" autocomplete="off" :placeholder="form.hasPin ? 'PIN задан' : ''" :disabled="form.clearPin">
                <template #trailing>
                  <UButton size="2xs" color="gray" variant="link" :padded="false" :disabled="form.clearPin" @click="randomPin">случайный</UButton>
                </template>
              </UInput>
            </UFormGroup>
          </div>
          <div class="flex flex-wrap gap-6">
            <label v-if="form.hasPin" class="flex items-center gap-3 text-sm"><UCheckbox v-model="form.clearPin" /> Сбросить PIN</label>
            <label class="flex items-center gap-3 text-sm"><UToggle v-model="form.isActive" /> Активен — может входить</label>
          </div>
          <div class="flex flex-wrap items-center justify-end gap-2 pt-2">
            <span v-if="error" class="mr-auto text-xs text-amber-700">{{ error }}</span>
            <UButton color="white" @click="requestClose">Отмена</UButton>
            <UButton type="submit" color="cta" :loading="saving">Сохранить</UButton>
          </div>
        </form>
      </div>
    </UModal>
  </div>
</template>
