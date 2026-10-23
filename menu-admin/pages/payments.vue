<script setup lang="ts">
import type { PaySettings } from '~/types/api';
import { useRestaurantStore } from '~/stores/restaurant';

useHead({ title: 'Оплата — Фуджи' });

const restaurants = useRestaurantStore();
const notify = useNotify();
const confirm = useConfirm();

const settings = ref<PaySettings | null>(null);
const loadError = ref('');
const form = reactive({
  onlineEnabled: false,
  publicId: '',
  apiSecret: '',
  clearSecret: false,
  iikoPaymentTypeId: '',
  iikoCashTypeId: '',
  iikoCardTypeId: '',
  receiptTaxation: '' as string,
  receiptVat: '' as string,
});

// Система налогообложения для чека (CloudKassir) и ставки НДС
const TAXATION = [
  { value: '', label: 'Не задана — чек не отправляется' },
  { value: '0', label: '0 — общая (ОСН)' },
  { value: '1', label: '1 — упрощённая, доходы (УСН)' },
  { value: '2', label: '2 — упрощённая, доходы минус расходы' },
  { value: '3', label: '3 — единый налог на вменённый доход' },
  { value: '4', label: '4 — единый сельскохозяйственный налог' },
  { value: '5', label: '5 — патентная' },
];
const vatOptions = computed(() => [
  { value: '', label: 'Без НДС' },
  ...(settings.value?.receipt?.vatRates ?? [0, 10, 20]).map((v) => ({ value: String(v), label: v === 0 ? '0%' : v > 100 ? `${v - 100}% (расчётная)` : `${v}%` })),
]);

function fill(p: PaySettings) {
  settings.value = p;
  Object.assign(form, {
    onlineEnabled: p.onlineEnabled,
    // В форме — собственный ключ точки; общий ключ сервера виден в подсказке и в форму не копируется
    publicId: p.ownPublicId ?? (p.publicIdSource === 'shared' ? '' : p.publicId ?? ''),
    apiSecret: '',
    clearSecret: false,
    iikoPaymentTypeId: p.iikoPaymentTypeId ?? '',
    iikoCashTypeId: p.iikoCashTypeId ?? '',
    iikoCardTypeId: p.iikoCardTypeId ?? '',
    receiptTaxation: p.receipt?.taxation == null ? '' : String(p.receipt.taxation),
    receiptVat: p.receipt?.vat == null ? '' : String(p.receipt.vat),
  });
  snapshot.value = JSON.stringify(form);
}
const snapshot = ref('');
const dirty = computed(() => snapshot.value !== '' && JSON.stringify(form) !== snapshot.value);
useLeaveGuard(dirty);

async function load() {
  loadError.value = '';
  try {
    fill(await useAuthFetch<PaySettings>('/admin/payments'));
  } catch (e) {
    loadError.value = getErrorMessage(e);
  }
}
onMounted(load);
watch(() => restaurants.slug, async (_, prev) => {
  if (dirty.value) {
    const ok = await confirm({ title: 'Изменения оплаты не сохранены', description: `Они относились к прошлому ресторану и пропадут.`, confirmLabel: 'Понятно' });
    if (!ok && prev) return;
  }
  settings.value = null;
  load();
});

const status = computed(() => {
  const p = settings.value;
  if (!p) return null;
  if (p.ready) return { color: 'green', label: 'Онлайн-оплата работает', icon: 'i-heroicons-check-circle' } as const;
  if (p.onlineEnabled) return { color: 'amber', label: 'Включена, но не хватает ключей', icon: 'i-heroicons-exclamation-triangle' } as const;
  return { color: 'gray', label: 'Онлайн-оплата выключена', icon: 'i-heroicons-pause-circle' } as const;
});

const error = computed(() => {
  if (!form.onlineEnabled) return '';
  const s = settings.value;
  if (!form.publicId.trim() && !s?.sharedPublicId) return 'Для онлайн-оплаты нужен Public ID';
  const hasSecret = (s?.hasOwnSecret && !form.clearSecret) || Boolean(form.apiSecret.trim()) || Boolean(s?.hasSharedSecret); // пароль точки или общий
  if (!hasSecret) return 'Для онлайн-оплаты нужен пароль API';
  return '';
});

// Живые тестовые ключи в форме (до сохранения) тоже предупреждаем
const formTestKey = computed(() => /^(test_|pk_test)/i.test(form.publicId.trim()));
const sourceLabel = (src?: string) => (src === 'restaurant' ? 'ключи этой точки' : src === 'shared' ? 'общие ключи сервера' : 'не заданы');

const resetting = ref(false);
async function resetKeys() {
  const ok = await confirm({
    title: 'Сбросить ключи точки?',
    description: 'Public ID и пароль API этой точки будут удалены — точка начнёт платить по общим ключам сервера.',
    confirmLabel: 'Сбросить',
  });
  if (!ok) return;
  resetting.value = true;
  try {
    fill(await useAuthFetch<PaySettings>('/admin/payments/reset-keys', { method: 'POST', body: {} }));
    notify.success('Ключи точки сброшены — используются общие');
  } catch (e) {
    notify.error(e, 'Не удалось сбросить ключи');
  } finally {
    resetting.value = false;
  }
}

const saving = ref(false);
async function save() {
  if (error.value) {
    notify.error(error.value);
    return;
  }
  saving.value = true;
  try {
    fill(
      await useAuthFetch<PaySettings>('/admin/payments', {
        method: 'POST',
        body: {
          onlineEnabled: form.onlineEnabled,
          publicId: form.publicId.trim(),
          apiSecret: form.apiSecret.trim(),
          clearSecret: form.clearSecret,
          iikoPaymentTypeId: form.iikoPaymentTypeId.trim(),
          iikoCashTypeId: form.iikoCashTypeId.trim(),
          iikoCardTypeId: form.iikoCardTypeId.trim(),
          receiptTaxation: form.receiptTaxation === '' ? null : Number(form.receiptTaxation),
          receiptVat: form.receiptVat === '' ? null : Number(form.receiptVat),
        },
      }),
    );
    notify.success('Настройки оплаты сохранены');
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
      :title="`Оплата${restaurants.current ? ` — ${restaurants.current.name}` : ''}`"
      icon="i-heroicons-credit-card"
      description="Гость выбирает в меню: онлайн, картой официанту или наличными — и за кого платит (весь стол, свой заказ или отмеченные гости)."
    />

    <LoadError v-if="loadError && !settings" :message="loadError" @retry="load" />
    <div v-else-if="!settings" class="max-w-3xl space-y-4">
      <USkeleton class="h-40 rounded-2xl" />
      <USkeleton class="h-56 rounded-2xl" />
    </div>
    <form v-else class="max-w-3xl space-y-5" @submit.prevent="save">
      <!-- Как устроено -->
      <div class="panel-box p-5">
        <div class="mb-3 flex items-start justify-between gap-3">
          <h2 class="panel-section-title">Как идут деньги</h2>
          <UBadge v-if="status" :color="status.color" variant="subtle" class="whitespace-nowrap">{{ status.label }}</UBadge>
        </div>
        <ul class="space-y-2 text-sm text-slate-600">
          <li class="flex gap-2"><UIcon name="i-heroicons-device-phone-mobile" class="mt-0.5 h-4 w-4 shrink-0 text-cta-500" /><span><b class="text-brand-500">Онлайн</b> гость оплачивает только кухню — через CloudPayments. Заказ кухни в iiko закрывается сам.</span></li>
          <li class="flex gap-2"><UIcon name="i-heroicons-beaker" class="mt-0.5 h-4 w-4 shrink-0 text-cta-500" /><span><b class="text-brand-500">Бар</b> (крепкий алкоголь, касса ООО «Регион Стандарт») — только картой или наличными официанту: официанту приходит «бар — принять оплату».</span></li>
          <li class="flex gap-2"><UIcon name="i-heroicons-banknotes" class="mt-0.5 h-4 w-4 shrink-0 text-cta-500" /><span><b class="text-brand-500">Официанту</b>: в приложении «Наличными» или «Картой» — оплата вносится в iiko и счёт закрывается (кухня и бар).</span></li>
        </ul>
      </div>

      <!-- CloudPayments -->
      <div class="panel-box space-y-4 p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="panel-section-title">Онлайн-оплата CloudPayments</h2>
            <p class="text-xs text-slate-500">Ключи — в кабинете CloudPayments → Сайты. Статус оплаты сервер проверяет сам; для надёжности можно добавить уведомления Check/Pay/Fail/Refund на <code>/api/v1/payments/cloudpayments/{check|pay|fail|refund}</code> (подпись HMAC проверяется по паролю API).</p>
          </div>
          <UToggle v-model="form.onlineEnabled" aria-label="Принимать оплату онлайн" />
        </div>
        <div class="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
          <div>
            Сейчас используются: <b class="text-brand-500">{{ sourceLabel(settings.publicIdSource) }}</b>
            <template v-if="settings.publicId"> (Public ID <code>{{ settings.publicId }}</code>)</template>
          </div>
          <div v-if="settings.publicIdSource === 'restaurant' && settings.sharedPublicId" class="mt-1">
            Общий Public ID сервера: <code>{{ settings.sharedPublicId }}</code> — ключи точки его перекрывают.
          </div>
        </div>
        <UAlert
          v-for="w in settings.warnings ?? []" :key="w" color="amber" variant="subtle"
          icon="i-heroicons-exclamation-triangle" :title="w"
        />
        <UAlert
          v-if="formTestKey && !(settings.warnings ?? []).length" color="amber" variant="subtle"
          icon="i-heroicons-exclamation-triangle" title="Public ID похож на тестовый (test_ / pk_test) — настоящие платежи с ним не пройдут"
        />
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormGroup label="Public ID точки" :help="settings.sharedPublicId ? 'Пусто — берётся общий ключ сервера' : undefined">
            <UInput v-model="form.publicId" autocomplete="off" :placeholder="settings.sharedPublicId ? `общий: ${settings.sharedPublicId}` : 'pk_…'" />
          </UFormGroup>
          <UFormGroup label="Пароль для API (API Secret)" :help="settings.hasOwnSecret ? 'Задан для точки. Пусто — не менять' : settings.hasSharedSecret ? 'Не задан для точки — берётся общий пароль сервера' : 'Хранится только на сервере, в браузер не возвращается'">
            <UInput v-model="form.apiSecret" type="password" autocomplete="new-password" :placeholder="settings.hasOwnSecret ? '••••••••' : 'из кабинета CloudPayments'" :disabled="form.clearSecret" />
          </UFormGroup>
        </div>
        <label v-if="settings.hasOwnSecret" class="flex items-center gap-3 text-sm"><UCheckbox v-model="form.clearSecret" /> Удалить сохранённый пароль API точки</label>
        <div v-if="settings.publicIdSource === 'restaurant' || settings.hasOwnSecret">
          <UButton color="white" icon="i-heroicons-arrow-uturn-left" :loading="resetting" :disabled="dirty" @click="resetKeys">Сбросить ключи точки (использовать общие)</UButton>
          <p v-if="dirty" class="mt-1 text-xs text-slate-500">Сначала сохраните или отмените изменения.</p>
        </div>
        <UFormGroup label="Тип оплаты «Онлайн» в iiko кухни" help="ID, необязательно. Пусто — тип с названием «Онлайн»">
          <UInput v-model="form.iikoPaymentTypeId" autocomplete="off" placeholder="авто" />
        </UFormGroup>
      </div>

      <!-- Чек 54-ФЗ -->
      <div class="panel-box space-y-4 p-5">
        <div>
          <h2 class="panel-section-title">Чек 54-ФЗ (CloudKassir)</h2>
          <p class="text-xs text-slate-500">
            Позиции счёта передаются в виджет CloudPayments, чек пробивает CloudKassir.
            <b v-if="settings.receipt?.available" class="text-emerald-700">Включено на сервере.</b>
            <b v-else class="text-amber-700">Выключено на сервере (CLOUDPAYMENTS_RECEIPT=on) — настройки ниже пока не применяются.</b>
          </p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormGroup label="Система налогообложения" help="Без неё чек не отправляется">
            <USelect v-model="form.receiptTaxation" :options="TAXATION" option-attribute="label" value-attribute="value" />
          </UFormGroup>
          <UFormGroup label="Ставка НДС">
            <USelect v-model="form.receiptVat" :options="vatOptions" option-attribute="label" value-attribute="value" />
          </UFormGroup>
        </div>
      </div>

      <!-- Официанту -->
      <div class="panel-box space-y-4 p-5">
        <div>
          <h2 class="panel-section-title">Оплата официанту</h2>
          <p class="text-xs text-slate-500">Типы оплат находятся в iiko сами («Наличные», «Банковские карты»). ID нужен, только если выбирается не тот.</p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormGroup label="Тип «Наличные» в iiko"><UInput v-model="form.iikoCashTypeId" autocomplete="off" placeholder="авто" /></UFormGroup>
          <UFormGroup label="Тип «Карта» в iiko"><UInput v-model="form.iikoCardTypeId" autocomplete="off" placeholder="авто" /></UFormGroup>
        </div>
      </div>

      <div class="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-brand-100 backdrop-blur">
        <span v-if="error" class="text-sm text-amber-700">{{ error }}</span>
        <span v-else-if="dirty" class="text-sm text-slate-500">Есть несохранённые изменения</span>
        <div class="flex-1" />
        <UButton color="white" :disabled="!dirty || saving" @click="fill(settings!)">Отменить</UButton>
        <UButton type="submit" color="cta" :loading="saving" :disabled="!dirty">Сохранить</UButton>
      </div>
    </form>
  </div>
</template>
