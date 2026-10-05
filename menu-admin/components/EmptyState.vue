<script setup lang="ts">
// Пустое состояние: что здесь будет, почему пусто и что сделать дальше.
withDefaults(
  defineProps<{
    icon?: string;
    title: string;
    description?: string;
    actionLabel?: string;
    actionTo?: string;
    actionIcon?: string;
    compact?: boolean;
  }>(),
  { icon: 'i-heroicons-inbox', compact: false },
);
const emit = defineEmits<{ action: [] }>();
</script>

<template>
  <div class="flex flex-col items-center text-center" :class="compact ? 'px-4 py-8' : 'px-6 py-14'">
    <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blush">
      <UIcon :name="icon" class="h-7 w-7 text-accent-500" />
    </div>
    <h3 class="text-base font-semibold text-brand-500">{{ title }}</h3>
    <p v-if="description" class="mt-1.5 max-w-md text-sm text-slate-500">{{ description }}</p>
    <div v-if="actionLabel || $slots.default" class="mt-5 flex flex-wrap justify-center gap-2">
      <UButton v-if="actionLabel" color="cta" :to="actionTo" :icon="actionIcon ?? 'i-heroicons-plus'" @click="!actionTo && emit('action')">
        {{ actionLabel }}
      </UButton>
      <slot />
    </div>
  </div>
</template>
