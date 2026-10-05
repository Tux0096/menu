<template>
  <div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-500 px-4 py-10">
    <!-- мягкие тёплые пятна на фоне -->
    <div class="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cta-500/20 blur-3xl" />
    <div class="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-accent-500/25 blur-3xl" />
    <div class="relative w-full max-w-sm">
      <slot />
    </div>
    <ConfirmDialog />
    <UNotifications />
  </div>
</template>
