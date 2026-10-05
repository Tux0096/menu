<script setup lang="ts">
withDefaults(defineProps<{ status: string; size?: 'xs' | 'sm' | 'md' }>(), { size: 'sm' });
</script>

<template>
  <UBadge :color="tableStatus(status).color" variant="subtle" :size="size" class="whitespace-nowrap">
    {{ tableStatus(status).label }}
  </UBadge>
</template>
