<script setup lang="ts">
// «Меню точки» объединено с «Меню сети»: карточки блюд, цены и наличие по точкам — там
const route = useRoute();
await navigateTo({ path: '/network-menu', query: route.query.stop ? { chip: 'stop' } : {} }, { replace: true });
</script>

<template>
  <div />
</template>
