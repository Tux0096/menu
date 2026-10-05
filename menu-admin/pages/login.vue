<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

definePageMeta({ layout: 'auth' });
useHead({ title: 'Вход — Фуджи' });

const auth = useAuthStore();
const route = useRoute();

const form = reactive({ login: '', password: '' });
const loading = ref(false);
const error = ref('');

const submit = async () => {
  error.value = '';
  if (!form.login || !form.password) {
    error.value = 'Введите логин и пароль';
    return;
  }
  loading.value = true;
  try {
    await auth.login(form.login.trim(), form.password);
    const home = homeFor(auth.role);
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : home;
    await navigateTo(redirect.startsWith('/') && canAccess(redirect, auth.role) ? redirect : home);
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    error.value = status === 401 || status === 400 ? 'Неверный логин или пароль' : getErrorMessage(e);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div>
    <div class="mb-6 flex flex-col items-center text-center text-white">
      <img src="/logo.svg" alt="Фуджи" width="112" height="112" class="mb-3 h-28 w-28 rounded-3xl shadow-lg ring-1 ring-white/10" />
      <div class="text-sm text-brand-200">Админка QR-меню</div>
    </div>
    <UCard :ui="{ body: { padding: 'p-6 sm:p-7' } }">
      <form class="space-y-4" @submit.prevent="submit">
        <UFormGroup label="Логин">
          <UInput v-model="form.login" autocomplete="username" icon="i-heroicons-user" size="lg" autofocus />
        </UFormGroup>
        <UFormGroup label="Пароль">
          <UInput v-model="form.password" type="password" autocomplete="current-password" icon="i-heroicons-lock-closed" size="lg" />
        </UFormGroup>
        <UAlert v-if="error" color="red" variant="soft" :title="error" icon="i-heroicons-exclamation-triangle" />
        <UButton type="submit" block size="lg" color="cta" :loading="loading">Войти</UButton>
      </form>
    </UCard>
    <p class="mt-4 text-center text-xs text-brand-200">
      Официанты работают в приложении «Фуджи Официант» на телефоне.<br />Нет доступа или забыли пароль — напишите администратору сети.
    </p>
  </div>
</template>
