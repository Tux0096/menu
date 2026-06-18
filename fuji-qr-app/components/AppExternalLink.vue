<template>
  <a
    rel="nofollow noopener noreferrer"
    target="_blank"
    @click="$emit('click')"
  >
    <slot />
  </a>
</template>
