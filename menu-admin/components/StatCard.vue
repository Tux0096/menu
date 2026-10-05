<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    icon: string;
    hint?: string;
    loading?: boolean;
    tone?: 'brand' | 'cta' | 'green' | 'red';
    to?: string;
  }>(),
  { tone: 'brand' },
);

// resolveComponent — только в setup: в шаблоне он не находит NuxtLink, и карточка не кликается
const NuxtLink = resolveComponent('NuxtLink');

const TONES = {
  brand: 'bg-blush text-brand-500',
  cta: 'bg-cta-50 text-cta-600',
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-600',
} as const;
</script>

<template>
  <component
    :is="to ? NuxtLink : 'div'"
    :to="to"
    class="panel-box flex items-start gap-4 p-5"
    :class="to && 'transition hover:ring-brand-200 hover:shadow-md'"
  >
    <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" :class="TONES[tone]">
      <UIcon :name="icon" class="h-6 w-6" />
    </div>
    <div class="min-w-0 flex-1">
      <div class="text-sm text-slate-500">{{ label }}</div>
      <USkeleton v-if="loading" class="mt-2 h-7 w-24" />
      <div v-else class="mt-0.5 truncate text-2xl font-semibold tracking-tight">{{ value }}</div>
      <div v-if="hint && !loading" class="mt-1 text-xs text-slate-500">{{ hint }}</div>
      <slot />
    </div>
  </component>
</template>
