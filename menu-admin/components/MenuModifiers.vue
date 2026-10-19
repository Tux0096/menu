<script setup lang="ts">
// Модификаторы меню сети (соусы, основа вока, добавки к бургеру…): своё название группы и варианта, картинка варианта.
// Приходят из внешнего меню iiko; настройки общие для всех точек и привязаны к названию в iiko — перевыгрузка их не затирает.
// Пустое название — гость видит название из iiko без служебных пометок («мод+», «ЗАЛ», «- »).
interface ModItem { key: string; iikoName: string; title: string; auto: string; image: string | null; iikoImage: string | null; price: number }
interface ModGroup { key: string; iikoName: string; title: string; auto: string; min: number; max: number; dishes: string[]; dishCount: number; items: ModItem[] }

const notify = useNotify();
const confirm = useConfirm();
const { upload } = useUpload();
const imageAccept = IMAGE_TYPES.join(',');

const list = ref<ModGroup[] | null>(null);
const initial = ref('');
const loadError = ref('');
const route = useRoute();
// Из карточки блюда («Открыть модификаторы») — сразу с поиском по блюду
const q = ref(typeof route.query.q === 'string' ? route.query.q : '');
const noPhoto = ref(false);
async function load() {
  loadError.value = '';
  try {
    list.value = await useAuthFetch<ModGroup[]>('/admin/network-menu/modifiers', {}, { restaurant: false });
    initial.value = snapshot();
  } catch (e) {
    loadError.value = getErrorMessage(e);
  }
}
onMounted(load);
const snapshot = () => JSON.stringify((list.value ?? []).map((g) => [g.key, g.title, g.items.map((i) => [i.key, i.title])]));
const dirty = computed(() => Boolean(list.value) && snapshot() !== initial.value);
const emit = defineEmits<{ 'update:dirty': [boolean] }>();
watch(dirty, (v) => emit('update:dirty', v), { immediate: true });
useLeaveGuard(dirty);

const hasPhoto = (i: ModItem) => Boolean(i.image || i.iikoImage);
const filtered = computed(() => {
  const s = q.value.trim().toLowerCase();
  return (list.value ?? []).filter((g) => (!s || [g.iikoName, g.title, g.auto, ...g.dishes, ...g.items.flatMap((i) => [i.iikoName, i.title])]
    .some((x) => String(x || '').toLowerCase().includes(s)))
    && (!noPhoto.value || g.items.some((i) => !hasPhoto(i))));
});
const visibleItems = (g: ModGroup) => (noPhoto.value ? g.items.filter((i) => !hasPhoto(i)) : g.items);
const withoutImages = computed(() => (list.value ?? []).reduce((n, g) => n + g.items.filter((i) => !i.image && !i.iikoImage).length, 0));

const saving = ref(false);
async function save() {
  if (!list.value) return;
  saving.value = true;
  try {
    await useAuthFetch('/admin/network-menu/modifiers', {
      method: 'PUT',
      body: {
        groups: list.value.map((g) => ({ iikoName: g.iikoName, title: g.title })),
        items: list.value.flatMap((g) => g.items.map((i) => ({ iikoName: i.iikoName, title: i.title }))),
      },
    }, { restaurant: false });
    initial.value = snapshot();
    notify.success('Названия модификаторов сохранены', 'Гости увидят их, когда откроют или обновят меню');
  } catch (e) {
    notify.error(e, 'Не удалось сохранить');
  } finally {
    saving.value = false;
  }
}
async function reset() {
  if (dirty.value && !(await confirm({ title: 'Отменить изменения?', description: 'Названия вернутся к сохранённым.', confirmLabel: 'Отменить изменения' }))) return;
  await load();
}

const imageSaving = ref('');
async function setImage(i: ModItem, image: string | null) {
  imageSaving.value = i.key;
  try {
    await useAuthFetch('/admin/network-menu/modifiers/image', { method: 'POST', body: { name: i.iikoName, image } }, { restaurant: false });
    // Вариант с тем же названием в других группах — тоже с этой картинкой
    for (const g of list.value ?? []) for (const x of g.items) if (x.key === i.key) x.image = image;
    notify.success(image ? `Картинка «${i.title || i.auto}» сохранена` : `У «${i.title || i.auto}» картинка снята`);
  } catch (e) {
    notify.error(e, 'Не удалось сохранить картинку');
  } finally {
    imageSaving.value = '';
  }
}
async function pickImage(i: ModItem, e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  imageSaving.value = i.key;
  try {
    await setImage(i, await upload(file));
  } catch (err) {
    notify.error(err, `Не удалось загрузить ${file.name}`);
    imageSaving.value = '';
  }
}
// Название варианта общее для сети — один и тот же вариант в других группах меняется вместе
function setItemTitle(i: ModItem, title: string) {
  for (const g of list.value ?? []) for (const x of g.items) if (x.key === i.key) x.title = title;
}
const rule = (g: ModGroup) => [
  g.min > 0 && g.max === 1 ? 'обязательно, 1 вариант' : g.min > 0 ? `обязательно, от ${g.min}` : 'по желанию',
  g.max > 1 ? `до ${g.max}` : null,
].filter(Boolean).join(' · ');
</script>

<template>
  <div class="space-y-4">
    <div class="panel-box flex flex-wrap items-center gap-3 px-4 py-3">
      <UInput v-model="q" icon="i-heroicons-magnifying-glass" placeholder="Найти соус, блюдо, группу" class="w-full sm:w-72" />
      <div class="min-w-[200px] flex-1 text-sm text-slate-600">
        Соусы, основа вока, добавки — из iiko. Здесь — понятные гостю названия и картинки. Общие для всех точек.
        <span v-if="withoutImages" class="text-amber-700">Без картинки: {{ withoutImages }} (у гостя — первая буква).</span>
      </div>
      <label v-if="withoutImages" class="flex items-center gap-2 text-sm"><UToggle v-model="noPhoto" /> Только без фото</label>
      <UButton color="white" :disabled="!dirty || saving" @click="reset">Отменить</UButton>
      <UButton :loading="saving" :disabled="!dirty" icon="i-heroicons-check" @click="save">Сохранить</UButton>
    </div>

    <LoadError v-if="loadError" :message="loadError" />
    <TableSkeleton v-else-if="!list" :rows="6" />
    <EmptyState v-else-if="!list.length" title="Модификаторов нет" description="В меню точек нет блюд с выбором (соус, основа, добавки). Они приходят из внешнего меню iiko." />
    <EmptyState v-else-if="!filtered.length" compact title="Ничего не нашлось" />

    <section v-for="g in filtered" :key="g.key" class="panel-box overflow-hidden">
      <div class="flex flex-wrap items-start gap-3 border-b border-brand-50 px-4 py-3">
        <div class="min-w-[220px] flex-1 space-y-1">
          <UInput v-model="g.title" :placeholder="g.auto" maxlength="120" :aria-label="`Название группы ${g.iikoName}`" />
          <div class="text-xs text-slate-500">
            в iiko: «{{ g.iikoName }}» · {{ rule(g) }} · в блюдах ({{ g.dishCount }}): {{ g.dishes.join(', ') }}{{ g.dishCount > g.dishes.length ? '…' : '' }}
          </div>
        </div>
      </div>
      <ul class="grid gap-x-6 gap-y-1 p-3 sm:grid-cols-2">
        <li v-for="i in visibleItems(g)" :key="i.key" class="flex items-center gap-3 rounded-lg px-1 py-1.5">
          <div class="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-cream ring-1 ring-brand-100">
            <img v-if="i.image || i.iikoImage" :src="thumbUrl(i.image || i.iikoImage, 160)" alt="" class="h-full w-full object-cover" />
            <span v-else class="text-sm text-slate-400">{{ (i.title || i.auto).slice(0, 1) }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <UInput :model-value="i.title" size="sm" :placeholder="i.auto" maxlength="120" :aria-label="`Название варианта ${i.iikoName}`" @update:model-value="(v: string) => setItemTitle(i, v)" />
            <div class="mt-0.5 truncate text-[11px] text-slate-500">
              {{ i.price ? `+${i.price} ₽` : 'без доплаты' }}<template v-if="i.title"> · в iiko: «{{ i.iikoName }}»</template>
            </div>
          </div>
          <label
            class="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-300 hover:bg-slate-50"
            :class="imageSaving === i.key ? 'pointer-events-none opacity-60' : ''"
            :title="i.image ? 'Заменить картинку' : 'Загрузить картинку'"
          >
            <input type="file" :accept="imageAccept" class="hidden" @change="pickImage(i, $event)">
            <UIcon name="i-heroicons-photo" class="h-4 w-4" />{{ i.image ? 'Заменить' : 'Фото' }}
          </label>
          <UButton v-if="i.image" size="2xs" color="gray" variant="ghost" icon="i-heroicons-x-mark" :loading="imageSaving === i.key" aria-label="Убрать картинку" @click="setImage(i, null)" />
        </li>
      </ul>
    </section>
  </div>
</template>
