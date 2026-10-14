<script setup lang="ts">
import type { MenuCategory } from '~/types/api';

// Картинки разделов для шторки «Меню» у гостя: общие для всех точек, привязаны к названию раздела из iiko.
// Без своей картинки гость видит стандартную по названию (роллы, пицца, супы…) или значок.
const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const notify = useNotify();
const model = computed({
  get: () => props.open,
  set: (v: boolean) => {
    if (!v) emit('close');
  },
});

const list = ref<MenuCategory[] | null>(null);
const loadError = ref('');
async function load() {
  loadError.value = '';
  try {
    list.value = await useAuthFetch<MenuCategory[]>('/admin/network-menu/categories', {}, { restaurant: false });
  } catch (e) {
    loadError.value = getErrorMessage(e);
  }
}
watch(() => props.open, (v) => { if (v) load(); }, { immediate: true });

const saving = ref('');
async function setImage(c: MenuCategory, image: string | null) {
  saving.value = c.key;
  try {
    await useAuthFetch('/admin/network-menu/categories', { method: 'POST', body: { name: c.name, image } }, { restaurant: false });
    c.image = image;
    notify.success(image ? `Картинка раздела «${c.name}» сохранена` : `У раздела «${c.name}» снова стандартная картинка`);
  } catch (e) {
    notify.error(e, 'Не удалось сохранить');
  } finally {
    saving.value = '';
  }
}

// Стандартные картинки гостевого меню — те же правила, что в menu-web/guest/app.js (CAT_IMAGES)
const DEFAULTS: [string, string][] = [['новин', 'novinki'], ['хит', 'hity'], ['ролл', 'rolly'], ['суш', 'rolly'], ['сет', 'rolly'],
  ['пицц', 'pizza'], ['бенто', 'bento'], ['wok', 'wok'], ['вок', 'wok'], ['лапш', 'wok'], ['бургер', 'burgery'], ['поке', 'poke'],
  ['салат', 'poke'], ['суп', 'supy'], ['горяч', 'goryachee'], ['закуск', 'zakuski'], ['десерт', 'deserty'], ['напит', 'napitki'],
  ['бар', 'napitki'], ['лимонад', 'napitki'], ['чай', 'napitki'], ['кофе', 'napitki'], ['соус', 'sousy']];
function defaultImage(name: string) {
  const n = name.toLowerCase();
  const hit = DEFAULTS.find(([k]) => n.includes(k));
  return hit ? `/ui/cats/${hit[1]}.png` : null;
}
</script>

<template>
  <USlideover v-model="model" :ui="{ width: 'w-screen max-w-2xl' }">
    <div class="flex h-full flex-col">
      <div class="flex items-start gap-3 border-b border-brand-50 px-5 py-4">
        <div class="min-w-0 flex-1">
          <div class="text-xs text-slate-500">Шторка «Меню» у гостя</div>
          <h2 class="text-lg font-semibold">Картинки разделов</h2>
        </div>
        <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" aria-label="Закрыть" @click="emit('close')" />
      </div>
      <div class="flex-1 overflow-y-auto px-5 py-4">
        <p class="mb-4 rounded-xl bg-cream p-3 text-sm text-slate-600">
          Разделы приходят из iiko. Картинка одна на всю сеть и привязана к названию раздела — перевыгрузка меню её не затирает.
          Без своей картинки гость видит стандартную (если она подходит по названию). Лучше PNG без фона, квадрат от 200 px.
        </p>
        <LoadError v-if="loadError" :message="loadError" />
        <TableSkeleton v-else-if="!list" :rows="5" />
        <EmptyState v-else-if="!list.length" title="Разделов пока нет" description="Меню точек ещё не выгружено из iiko." />
        <ul v-else class="divide-y divide-brand-50">
          <li v-for="c in list" :key="c.key" class="flex flex-wrap items-center gap-4 py-3">
            <div class="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-brand-100">
              <img v-if="c.image || defaultImage(c.name)" :src="thumbUrl(c.image || defaultImage(c.name), 160)" alt="" class="h-14 w-14 object-contain" />
              <UIcon v-else name="i-heroicons-photo" class="h-6 w-6 text-slate-300" />
            </div>
            <div class="min-w-[160px] flex-1">
              <div class="font-semibold">{{ c.name }}</div>
              <div class="text-xs text-slate-500">
                {{ c.isBar ? 'Бар' : 'Кухня' }} · точек: {{ c.points }} ·
                {{ c.image ? 'своя картинка' : defaultImage(c.name) ? 'стандартная картинка' : 'без картинки' }}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-44"><UploadBox accept="image" compact @uploaded="(url: string) => setImage(c, url)" /></div>
              <UButton v-if="c.image" size="xs" color="white" :loading="saving === c.key" @click="setImage(c, null)">Стандартная</UButton>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </USlideover>
</template>
