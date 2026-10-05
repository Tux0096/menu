<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';
import { useUiStore } from '~/stores/ui';

const ui = useUiStore();
const auth = useAuthStore();
const route = useRoute();
const current = computed(() => findNavItem(route.path));
watch(() => route.fullPath, () => (ui.mobileNavOpen = false));
</script>

<template>
  <div class="panel">
    <!-- Десктоп: постоянное меню -->
    <div class="sticky top-0 hidden h-screen lg:block">
      <AppSidebar />
    </div>

    <div class="flex min-w-0 flex-1 flex-col">
      <!-- Планшет и телефон: верхняя панель с кнопкой меню -->
      <header class="sticky top-0 z-30 flex items-center gap-3 border-b border-brand-100 bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <UButton color="gray" variant="ghost" icon="i-heroicons-bars-3" aria-label="Открыть меню" @click="ui.mobileNavOpen = true" />
        <NuxtLink :to="homeFor(auth.role)" class="flex items-center gap-2">
          <img src="/logo.svg" alt="Фуджи" width="32" height="32" class="h-8 w-8 rounded-lg" />
          <span class="font-semibold">Фуджи</span>
        </NuxtLink>
        <span v-if="current && current.to !== '/'" class="ml-auto truncate text-sm text-slate-500">{{ current.label }}</span>
      </header>

      <main class="panel-content">
        <slot />
      </main>
    </div>

    <USlideover v-model="ui.mobileNavOpen" side="left" :ui="{ width: 'w-72 max-w-[85vw]' }">
      <AppSidebar drawer />
    </USlideover>

    <ConfirmDialog />
    <UNotifications />
  </div>
</template>
