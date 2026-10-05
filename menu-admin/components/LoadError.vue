<script setup lang="ts">
// Ошибка загрузки раздела: понятный текст (из error.message API) и кнопка «Повторить».
defineProps<{ message: string; title?: string }>();
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <div class="panel-box flex flex-col items-center px-6 py-12 text-center">
    <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
      <UIcon name="i-heroicons-exclamation-triangle" class="h-7 w-7 text-red-500" />
    </div>
    <h3 class="text-base font-semibold text-brand-500">{{ title || 'Не получилось загрузить данные' }}</h3>
    <p class="mt-1.5 max-w-md text-sm text-slate-500">{{ message }}</p>
    <UButton class="mt-5" color="white" icon="i-heroicons-arrow-path" @click="emit('retry')">Повторить</UButton>
  </div>
</template>
