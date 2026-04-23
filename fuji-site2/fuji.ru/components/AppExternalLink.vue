<template>
  <a
    aria-label="Ссылка на социальные сети"
    rel="nofollow noopener noreferrer"
    target="_blank"
    @click="$emit('click')"
  >
    <slot />
  </a>
</template>
