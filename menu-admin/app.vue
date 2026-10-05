<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <!-- Повторный вход на 401 без потери формы — вне layout, чтобы работать на любой странице -->
  <ReauthDialog />
</template>
