<script setup lang="ts">
import type { AlcoholRules } from '~/types/api';
import { useRestaurantStore } from '~/stores/restaurant';

useHead({ title: 'Алкоголь — Фуджи' });

const restaurants = useRestaurantStore();
const notify = useNotify();
const confirm = useConfirm();

const rules = ref<AlcoholRules | null>(null);
const loadError = ref('');
const ZONES = [
  { value: 'Europe/Kaliningrad', label: 'Калининград (UTC+2)' }, { value: 'Europe/Moscow', label: 'Москва (UTC+3)' },
  { value: 'Europe/Samara', label: 'Самара (UTC+4)' }, { value: 'Asia/Yekaterinburg', label: 'Екатеринбург (UTC+5)' },
  { value: 'Asia/Omsk', label: 'Омск (UTC+6)' }, { value: 'Asia/Novosibirsk', label: 'Новосибирск (UTC+7)' },
  { value: 'Asia/Krasnoyarsk', label: 'Красноярск (UTC+7)' }, { value: 'Asia/Irkutsk', label: 'Иркутск (UTC+8)' },
  { value: 'Asia/Vladivostok', label: 'Владивосток (UTC+10)' },
];
const TEXT_MAX = 500;

const form = reactive({
  enabled: true,
  limitHours: false,
  from: '10:00',
  to: '23:00',
  tz: 'Europe/Samara',
  text: '',
  requireAgeConfirm: true,
  requireDocCheck: false,
});

const snapshot = ref('');
const dirty = computed(() => snapshot.value !== '' && JSON.stringify(form) !== snapshot.value);
useLeaveGuard(dirty);

function fill(r: AlcoholRules) {
  rules.value = r;
  Object.assign(form, {
    enabled: r.enabled,
    limitHours: Boolean(r.from && r.to),
    // Часы по умолчанию для включённого переключателя — типичные для зала
    from: r.from || '10:00',
    to: r.to || '23:00',
    tz: r.tz,
    text: r.text,
    requireAgeConfirm: r.requireAgeConfirm,
    requireDocCheck: r.requireDocCheck,
  });
  snapshot.value = JSON.stringify(form);
}

async function load() {
  loadError.value = '';
  try {
    fill(await useAuthFetch<AlcoholRules>('/admin/alcohol'));
  } catch (e) {
    loadError.value = getErrorMessage(e);
  }
}
onMounted(load);
watch(() => restaurants.slug, async (_, prev) => {
  if (dirty.value) {
    const ok = await confirm({ title: 'Изменения правил не сохранены', description: 'Они относились к прошлому ресторану и пропадут.', confirmLabel: 'Понятно' });
    if (!ok && prev) return;
  }
  rules.value = null;
  load();
});

const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;
const error = computed(() => {
  if (form.enabled && form.limitHours && (!TIME_RE.test(form.from) || !TIME_RE.test(form.to))) return 'Укажите время продажи в формате ЧЧ:ММ';
  if (form.text.length > TEXT_MAX) return `Текст правил — не длиннее ${TEXT_MAX} символов`;
  return '';
});

// Как увидит гость: свой текст или собранный из настроек (так же считает сервер)
const hoursText = computed(() => (form.limitHours ? `с ${form.from} до ${form.to}` : 'круглосуточно'));
const guestText = computed(() => {
  if (!form.enabled) return 'На этой точке алкоголь не продаётся';
  return form.text.trim()
    || `Алкоголь — с 18 лет${form.requireDocCheck ? ' при предъявлении документа' : ''}${form.limitHours ? `, ${hoursText.value}` : ''}`;
});
const status = computed(() => {
  if (!form.enabled) return { color: 'red', label: 'Алкоголь не продаётся' } as const;
  return form.limitHours ? { color: 'green', label: `Продаём ${hoursText.value}` } as const : { color: 'green', label: 'Продаём круглосуточно' } as const;
});

const saving = ref(false);
async function save() {
  if (error.value) {
    notify.error(error.value);
    return;
  }
  if (!form.enabled && !(await confirm({
    title: 'Выключить продажу алкоголя?',
    description: 'Гости не смогут добавить алкоголь в корзину, а заказы с алкоголем сервер отклонит. Позиции в меню останутся видны.',
    confirmLabel: 'Выключить',
    danger: true,
  }))) return;
  saving.value = true;
  try {
    fill(await useAuthFetch<AlcoholRules>('/admin/alcohol', {
      method: 'POST',
      body: {
        enabled: form.enabled,
        from: form.limitHours ? form.from : '',
        to: form.limitHours ? form.to : '',
        tz: form.tz,
        text: form.text.trim(),
        requireAgeConfirm: form.requireAgeConfirm,
        requireDocCheck: form.requireDocCheck,
      },
    }));
    notify.success('Правила продажи алкоголя сохранены');
  } catch (e) {
    notify.error(e, 'Не удалось сохранить');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div>
    <PageHeader
      :title="`Алкоголь${restaurants.current ? ` — ${restaurants.current.name}` : ''}`"
      icon="i-heroicons-shield-check"
      description="Алкоголь на точках продаётся по-разному. Правила видят гость (в карточке блюда) и официант (над заказом); сервер не примет заказ алкоголя вне правил."
    />

    <LoadError v-if="loadError && !rules" :message="loadError" @retry="load" />
    <div v-else-if="!rules" class="max-w-3xl space-y-4">
      <USkeleton class="h-32 rounded-2xl" />
      <USkeleton class="h-56 rounded-2xl" />
    </div>
    <form v-else class="max-w-3xl space-y-5" @submit.prevent="save">
      <!-- Продажа -->
      <div class="panel-box space-y-4 p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-[14rem] flex-1">
            <h2 class="panel-section-title">Продажа алкоголя</h2>
            <p class="text-xs text-slate-500">Алкоголем считаются позиции разделов «Вино», «Крепкий алкоголь», «Пиво», «Коктейли» и т. п. (по названию раздела и блюда).</p>
          </div>
          <div class="flex items-center gap-3">
            <UBadge :color="status.color" variant="subtle" class="whitespace-nowrap">{{ status.label }}</UBadge>
            <UToggle v-model="form.enabled" aria-label="Алкоголь продаётся на этой точке" />
          </div>
        </div>

        <div v-if="form.enabled" class="space-y-3 border-t border-brand-50 pt-4">
          <label class="flex items-center gap-3 text-sm"><UToggle v-model="form.limitHours" aria-label="Ограничить часы продажи" /> Ограничить часы продажи</label>
          <div v-if="form.limitHours" class="flex flex-wrap items-end gap-4">
            <label class="text-xs text-slate-500">С
              <input v-model="form.from" type="time" class="mt-1 block h-9 rounded-lg px-2 text-sm text-slate-800 ring-1 ring-brand-100" aria-label="Начало продажи, часы:минуты">
            </label>
            <label class="text-xs text-slate-500">До
              <input v-model="form.to" type="time" class="mt-1 block h-9 rounded-lg px-2 text-sm text-slate-800 ring-1 ring-brand-100" aria-label="Конец продажи, часы:минуты">
            </label>
            <div class="text-xs text-slate-500">Часовой пояс точки
              <USelect v-model="form.tz" :options="ZONES" class="mt-1 w-56" aria-label="Часовой пояс" />
            </div>
          </div>
          <p class="text-xs text-slate-500">Окно «18:00–02:00» работает через полночь. Вне часов гость видит позицию, но добавить её не может; официант получает предупреждение.</p>
        </div>
      </div>

      <!-- 18+ и документ -->
      <div class="panel-box space-y-4 p-5">
        <div>
          <h2 class="panel-section-title">Возраст гостя</h2>
          <p class="text-xs text-slate-500">Подтверждение гостя — только тап, документ он не загружает: проверка остаётся за официантом.</p>
        </div>
        <label class="flex items-start gap-3 text-sm">
          <UToggle v-model="form.requireAgeConfirm" class="mt-0.5" aria-label="Требовать подтверждение 18+" />
          <span><b class="text-brand-500">Спрашивать «Вам есть 18 лет?»</b> при первом добавлении алкоголя. Без подтверждения сервер не примет алкоголь в корзину.</span>
        </label>
        <label class="flex items-start gap-3 text-sm">
          <UToggle v-model="form.requireDocCheck" class="mt-0.5" aria-label="Просить официанта проверить документ" />
          <span><b class="text-brand-500">Просить официанта проверить документ</b> — над заказом с алкоголем он увидит «Проверьте документ».</span>
        </label>
      </div>

      <!-- Текст -->
      <div class="panel-box space-y-3 p-5">
        <div>
          <h2 class="panel-section-title">Текст правил</h2>
          <p class="text-xs text-slate-500">Показывается гостю в карточке алкоголя и официанту над заказом. Пусто — текст соберётся из настроек выше.</p>
        </div>
        <UFormGroup :help="`${form.text.length} / ${TEXT_MAX}`">
          <textarea
            v-model="form.text" rows="3" :maxlength="TEXT_MAX" aria-label="Текст правил"
            class="block w-full rounded-lg px-3 py-2 text-sm text-slate-800 ring-1 ring-brand-100 focus:ring-2 focus:ring-brand-300"
            placeholder="Алкоголь продаём с 18 лет при предъявлении документа, с 10:00 до 23:00"
          />
        </UFormGroup>
        <div class="rounded-xl bg-cream/60 p-3 text-sm">
          <div class="mb-1 text-xs text-slate-500">Так увидит гость</div>
          <div class="flex items-start gap-2"><span class="rounded bg-brand-500 px-1.5 py-0.5 text-xs font-bold text-white">18+</span><span class="text-slate-700">{{ guestText }}</span></div>
        </div>
      </div>

      <div class="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-brand-100 backdrop-blur">
        <span v-if="error" class="text-sm text-amber-700">{{ error }}</span>
        <span v-else-if="dirty" class="text-sm text-slate-500">Есть несохранённые изменения</span>
        <div class="flex-1" />
        <UButton color="white" :disabled="!dirty || saving" @click="fill(rules!)">Отменить</UButton>
        <UButton type="submit" color="cta" :loading="saving" :disabled="!dirty">Сохранить</UButton>
      </div>
    </form>
  </div>
</template>
