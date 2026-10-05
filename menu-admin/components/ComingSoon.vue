<script setup lang="ts">
defineProps<{ title: string; description: string; items?: string[]; icon?: string }>();
</script>

<template>
  <div>
    <PageHeader :title="title" :icon="icon" :description="description" />
    <div class="panel-box flex flex-col items-center px-6 py-16 text-center">
      <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blush">
        <UIcon name="i-heroicons-clock" class="h-7 w-7 text-cta-500" />
      </div>
      <h2 class="text-lg font-semibold">Раздел скоро появится</h2>
      <p class="mt-2 max-w-lg text-sm text-slate-500">Мы уже работаем над ним. Вот что здесь можно будет делать:</p>
      <ul v-if="items?.length" class="mt-4 space-y-2 text-left text-sm text-slate-600">
        <li v-for="item in items" :key="item" class="flex items-center gap-2">
          <UIcon name="i-heroicons-check-circle" class="h-4 w-4 text-green-600" /> {{ item }}
        </li>
      </ul>
    </div>
  </div>
</template>
