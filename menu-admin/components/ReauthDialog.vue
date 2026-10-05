<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

// Глобальная модалка повторного входа (composables/useReauth.ts). Открывается на 401 — ждущие запросы
// повторяются после входа, форма на странице не теряется. Здесь же: подхват токена из соседней вкладки
// (событие 'storage') и предупреждение за 15 минут до истечения токена (exp из JWT).
const auth = useAuthStore();
const state = useReauthState();
const route = useRoute();
const toast = useToast();

const password = ref('');
const loginName = ref('');
const loading = ref(false);
const error = ref('');

// логин текущего админа менять нельзя — войти под другим можно через «Выйти»
const knownLogin = computed(() => auth.admin?.login ?? '');

watch(
  () => state.value.open,
  (open) => {
    if (!open) return;
    password.value = '';
    error.value = '';
    loginName.value = knownLogin.value;
  },
);

async function submit() {
  error.value = '';
  const login = (knownLogin.value || loginName.value).trim();
  if (!login || !password.value) {
    error.value = 'Введите логин и пароль';
    return;
  }
  loading.value = true;
  try {
    await auth.login(login, password.value);
    password.value = '';
    toast.remove('session-expiring');
    finishReauth();
  } catch (e) {
    const status = httpStatusOf(e);
    error.value = status === 401 || status === 400 ? 'Неверный пароль' : getErrorMessage(e);
  } finally {
    loading.value = false;
  }
}

// ---------- токен из соседней вкладки (pinia-plugin-persistedstate хранит store 'auth' в localStorage)
function onStorage(e: StorageEvent) {
  if (e.key !== 'auth' || !e.newValue) return;
  try {
    const saved = JSON.parse(e.newValue) as { token?: string; admin?: typeof auth.admin };
    if (!saved.token || saved.token === auth.token) return;
    auth.$patch({ token: saved.token, admin: saved.admin ?? auth.admin });
    toast.remove('session-expiring');
    if (state.value.open) finishReauth();
  } catch {
    // чужой формат — игнорируем
  }
}

// ---------- предупреждение за 15 минут до истечения
const WARN_BEFORE_MS = 15 * 60_000;
let warnedFor = '';
let timer: ReturnType<typeof setInterval> | undefined;

function checkExpiry() {
  const token = auth.token;
  if (!token || route.path === '/login' || state.value.open || warnedFor === token) return;
  const exp = tokenExpiresAt(token);
  if (!exp) return;
  const left = exp - Date.now();
  if (left > WARN_BEFORE_MS || left <= 0) return;
  warnedFor = token;
  const min = Math.max(1, Math.round(left / 60_000));
  toast.add({
    id: 'session-expiring',
    title: 'Сессия скоро закончится',
    description: `Через ${min} мин. понадобится ввести пароль ещё раз. Продлите сессию сейчас — несохранённые изменения не потеряются.`,
    color: 'amber',
    icon: 'i-heroicons-clock',
    timeout: 0,
    actions: [{ label: 'Продлить', click: () => requestReauth('manual') }],
  });
}

onMounted(() => {
  window.addEventListener('storage', onStorage);
  checkExpiry();
  timer = setInterval(checkExpiry, 30_000);
});
onBeforeUnmount(() => {
  window.removeEventListener('storage', onStorage);
  if (timer) clearInterval(timer);
});
</script>

<template>
  <UModal :model-value="state.open" prevent-close :ui="{ width: 'sm:max-w-sm' }">
    <div class="p-6">
      <div class="mb-4 flex gap-4">
        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blush text-brand-500">
          <UIcon name="i-heroicons-lock-closed" class="h-6 w-6" />
        </div>
        <div class="min-w-0">
          <h3 class="text-base font-semibold text-brand-500">
            {{ state.reason === 'manual' ? 'Продлить сессию' : 'Сессия закончилась' }}
          </h3>
          <p class="mt-1 text-sm text-slate-600">
            Введите пароль — продолжите с того же места, введённые данные не пропадут.
          </p>
        </div>
      </div>
      <form class="space-y-3" @submit.prevent="submit">
        <UFormGroup label="Логин">
          <UInput v-model="loginName" :disabled="Boolean(knownLogin)" autocomplete="username" icon="i-heroicons-user" />
        </UFormGroup>
        <UFormGroup label="Пароль">
          <UInput v-model="password" type="password" autocomplete="current-password" icon="i-heroicons-lock-closed" autofocus />
        </UFormGroup>
        <UAlert v-if="error" color="red" variant="soft" :title="error" icon="i-heroicons-exclamation-triangle" />
        <div class="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <UButton v-if="state.reason === 'manual'" color="white" block class="sm:w-auto" @click="abandonReauth(false)">Позже</UButton>
          <UButton v-else color="white" block class="sm:w-auto" @click="abandonReauth(true)">Выйти</UButton>
          <UButton type="submit" color="cta" block class="sm:w-auto" :loading="loading">Войти</UButton>
        </div>
      </form>
    </div>
  </UModal>
</template>
