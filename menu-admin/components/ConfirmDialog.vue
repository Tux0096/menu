<script setup lang="ts">
const state = useConfirmState();
const open = computed({
  get: () => state.value.open,
  set: (v: boolean) => {
    if (!v) resolveConfirm(false);
  },
});
</script>

<template>
  <UModal v-model="open" :ui="{ width: 'sm:max-w-md' }">
    <div class="p-6">
      <div class="flex gap-4">
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          :class="state.danger ? 'bg-red-50 text-red-600' : 'bg-blush text-brand-500'"
        >
          <UIcon :name="state.danger ? 'i-heroicons-exclamation-triangle' : 'i-heroicons-question-mark-circle'" class="h-6 w-6" />
        </div>
        <div class="min-w-0">
          <h3 class="text-base font-semibold text-brand-500">{{ state.title }}</h3>
          <p v-if="state.description" class="mt-1 text-sm text-slate-600">{{ state.description }}</p>
        </div>
      </div>
      <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UButton color="white" block class="sm:w-auto" @click="resolveConfirm(false)">{{ state.cancelLabel || 'Отмена' }}</UButton>
        <UButton :color="state.danger ? 'red' : 'primary'" block class="sm:w-auto" autofocus @click="resolveConfirm(true)">
          {{ state.confirmLabel || 'Да' }}
        </UButton>
      </div>
    </div>
  </UModal>
</template>
