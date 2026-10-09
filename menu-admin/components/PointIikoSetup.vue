<script setup lang="ts">
import type { IikoSetup, NetworkPoint } from '~/types/api';
import { useRestaurantStore } from '~/stores/restaurant';

// Карточка точки: сколько iiko — одна (кухня и бар в одной iiko) или две (бар в отдельной iiko со своим ключом).
// Ключи iiko в админку не вводятся: они в секретах сервера, здесь выбирается только их код.
const props = defineProps<{ point: NetworkPoint | null }>();
const emit = defineEmits<{ close: []; saved: [] }>();

const notify = useNotify();
const confirm = useConfirm();
const restaurants = useRestaurantStore();

const open = computed({
  get: () => Boolean(props.point),
  set: (v: boolean) => {
    if (!v) emit('close');
  },
});
const q = () => ({ query: { restaurant: props.point!.slug } });

const setup = ref<IikoSetup | null>(null);
const loadError = ref('');
const mode = ref<'one' | 'two'>('one');
const form = reactive({ creds: '', organizationId: '', externalMenuId: '' });

watch(
  () => props.point,
  async (p) => {
    setup.value = null;
    loadError.value = '';
    if (!p) return;
    try {
      const s = await useAuthFetch<IikoSetup>('/admin/iiko-setup', q(), { restaurant: false });
      setup.value = s;
      mode.value = s.mode;
      Object.assign(form, { creds: s.bar?.creds ?? '', organizationId: s.bar?.organizationId ?? '', externalMenuId: s.bar?.externalMenuId ?? '' });
      await loadOptions();
    } catch (e) {
      loadError.value = getErrorMessage(e);
    }
  },
  { immediate: true },
);

// Организации и внешние меню, доступные выбранному ключу
const orgs = ref<{ id: string; name: string }[]>([]);
const menus = ref<{ id: string; name: string }[]>([]);
const optionsLoading = ref(false);
const optionsError = ref('');
async function loadOptions() {
  if (mode.value !== 'two') return;
  optionsLoading.value = true;
  optionsError.value = '';
  try {
    const d = await useAuthFetch<{ orgs: { id: string; name: string }[]; menus: { id: string; name: string }[] }>(
      '/admin/sources/options', { query: { creds: form.creds, restaurant: props.point!.slug } }, { restaurant: false },
    );
    orgs.value = d.orgs;
    menus.value = d.menus;
  } catch (e) {
    optionsError.value = getErrorMessage(e);
    orgs.value = [];
    menus.value = [];
  } finally {
    optionsLoading.value = false;
  }
}
watch(() => form.creds, loadOptions);
watch(mode, loadOptions);

const kitchenOrg = computed(() => setup.value?.restaurant.organizationId ?? '');
const orgOptions = computed(() => [
  { value: '', label: optionsLoading.value ? 'Загрузка…' : 'Выберите организацию бара' },
  ...orgs.value.map((o) => ({ value: o.id, label: o.id === kitchenOrg.value ? `${o.name} — это iiko кухни` : o.name })),
]);
const menuOptions = computed(() => [
  { value: '', label: 'Автоматически — меню со словом «бар»' },
  ...menus.value.map((m) => ({ value: m.id, label: m.name })),
]);
const credsOptions = computed(() => (setup.value?.creds ?? []).map((c) => ({ value: c.code, label: c.label })));

const changed = computed(() => {
  const s = setup.value;
  if (!s) return false;
  if (mode.value !== s.mode) return true;
  if (mode.value === 'one') return false;
  return form.creds !== (s.bar?.creds ?? '') || form.organizationId !== (s.bar?.organizationId ?? '') || form.externalMenuId !== (s.bar?.externalMenuId ?? '');
});

const saving = ref(false);
async function save() {
  if (!props.point || !setup.value) return;
  if (mode.value === 'two' && !form.organizationId) {
    notify.error('Выберите организацию бара в iiko');
    return;
  }
  if (mode.value === 'one' && setup.value.mode === 'two') {
    const ok = await confirm({
      title: 'Оставить одну iiko?',
      description: 'Меню бара из второй iiko уберётся из QR-меню точки. Если у бара своя касса в той же iiko — выберите её в разделе «Кассы».',
      confirmLabel: 'Оставить одну',
      danger: true,
    });
    if (!ok) return;
  }
  saving.value = true;
  try {
    const s = await useAuthFetch<IikoSetup>('/admin/iiko-setup', {
      method: 'POST', ...q(),
      body: { mode: mode.value, creds: form.creds, organizationId: form.organizationId || null, externalMenuId: form.externalMenuId || null },
    }, { restaurant: false });
    setup.value = s;
    notify.success('Сохранено, меню точки перевыгружено из iiko');
    emit('saved');
    emit('close');
  } catch (e) {
    notify.error(e, 'Не удалось сохранить');
  } finally {
    saving.value = false;
  }
}

function toCashdesks() {
  if (props.point) restaurants.select(props.point.slug);
  emit('close');
  navigateTo('/cashdesks');
}
const shortName = (p: NetworkPoint) => p.name.replace(/^Фуджи\s+/i, '');
</script>

<template>
  <USlideover v-model="open" :ui="{ width: 'w-screen max-w-xl' }">
    <div v-if="point" class="flex h-full flex-col">
      <div class="flex items-start gap-3 border-b border-brand-50 px-5 py-4">
        <div class="min-w-0 flex-1">
          <div class="text-xs text-slate-500">Карточка точки</div>
          <h2 class="truncate text-lg font-semibold">{{ shortName(point) }}</h2>
        </div>
        <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" aria-label="Закрыть" @click="emit('close')" />
      </div>

      <div class="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <LoadError v-if="loadError" :message="loadError" />
        <TableSkeleton v-else-if="!setup" :rows="3" />
        <template v-else>
          <section class="space-y-3">
            <h3 class="panel-section-title">Сколько iiko на точке</h3>
            <button
              v-for="opt in [
                { value: 'one', title: 'Одна iiko', text: 'Кухня и бар в одной iiko. Меню кухни и бара выгружается из неё. Если бар пробивается на своей кассе (другое юрлицо) — выберите эту кассу в разделе «Кассы».' },
                { value: 'two', title: 'Две iiko', text: 'Бар работает в отдельной iiko (своя организация и ключ API). Меню бара выгружается из неё, заказы алкоголя уходят туда же.' },
              ] as const"
              :key="opt.value"
              type="button"
              class="flex w-full items-start gap-3 rounded-xl p-3 text-left ring-1 transition"
              :class="mode === opt.value ? 'bg-cream ring-2 ring-brand-500' : 'ring-brand-100 hover:ring-brand-200'"
              @click="mode = opt.value"
            >
              <span class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ring-2" :class="mode === opt.value ? 'ring-brand-500' : 'ring-slate-300'">
                <span v-if="mode === opt.value" class="h-2 w-2 rounded-full bg-brand-500" />
              </span>
              <span>
                <span class="block font-semibold">{{ opt.title }}</span>
                <span class="block text-sm text-slate-600">{{ opt.text }}</span>
              </span>
            </button>
          </section>

          <section v-if="mode === 'one'" class="rounded-xl bg-cream p-3 text-sm text-slate-600">
            {{ setup.sameIikoBar ? 'Касса бара в этой iiko выбрана — алкоголь уходит на неё отдельным заказом.' : 'Отдельной кассы бара нет — всё уходит на кассу кухни.' }}
            <UButton size="xs" color="white" class="ml-1 mt-2" icon="i-heroicons-calculator" @click="toCashdesks">Кассы точки</UButton>
          </section>

          <section v-else class="space-y-4">
            <h3 class="panel-section-title">iiko бара</h3>
            <UFormGroup label="Ключ API iiko">
              <template #help>
                Ключи добавляются в секреты GitHub с именем <span class="mono">IIKO_НАЗВАНИЕ_API_LOGIN</span> (латиницей, например
                <span class="mono">IIKO_LENINGRADSKAYA_BAR_API_LOGIN</span>) и появляются здесь под этим названием после деплоя.
                Сам ключ в админку не вводится и здесь не показывается целиком.
              </template>
              <USelect v-model="form.creds" :options="credsOptions" />
            </UFormGroup>
            <UFormGroup label="Организация бара" :error="optionsError || undefined">
              <USelect v-model="form.organizationId" :options="orgOptions" :disabled="optionsLoading" />
            </UFormGroup>
            <UFormGroup label="Меню бара в iiko" help="Внешнее меню iiko, из которого берутся позиции и цены бара.">
              <USelect v-model="form.externalMenuId" :options="menuOptions" :disabled="optionsLoading" />
            </UFormGroup>
          </section>
        </template>
      </div>

      <div class="flex items-center justify-end gap-2 border-t border-brand-50 px-5 py-3">
        <UButton color="white" @click="emit('close')">Отмена</UButton>
        <UButton :loading="saving" :disabled="!changed" @click="save">Сохранить</UButton>
      </div>
    </div>
  </USlideover>
</template>
