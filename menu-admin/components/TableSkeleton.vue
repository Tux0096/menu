<script setup lang="ts">
// Скелетон строк таблицы / списка на время первой загрузки
withDefaults(defineProps<{ rows?: number; thumb?: boolean }>(), { rows: 6, thumb: false });
</script>

<template>
  <div class="divide-y divide-brand-50" aria-busy="true" aria-label="Загрузка">
    <div v-for="i in rows" :key="i" class="flex items-center gap-4 px-4 py-3.5">
      <USkeleton v-if="thumb" class="h-11 w-11 shrink-0 rounded-lg" />
      <div class="flex-1 space-y-2">
        <USkeleton class="h-3.5" :style="{ width: `${40 + ((i * 17) % 35)}%` }" />
        <USkeleton class="h-3 w-1/4" />
      </div>
      <USkeleton class="hidden h-6 w-20 rounded-full sm:block" />
    </div>
  </div>
</template>
