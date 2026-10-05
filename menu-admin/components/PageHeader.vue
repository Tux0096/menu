<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';
// Единая шапка страницы: хлебные крошки, заголовок, описание «что здесь делать», кнопки справа.
// Крошки строятся из меню (utils/navigation.ts); для вложенных страниц передайте crumbs.
const props = defineProps<{
  title: string;
  /** Что здесь делать — одна-две фразы простым языком */
  description?: string;
  /** @deprecated используйте description */
  subtitle?: string;
  icon?: string;
  crumbs?: { label: string; to?: string }[];
  hideCrumbs?: boolean;
}>();

const route = useRoute();
const auth = useAuthStore();

const links = computed(() => {
  if (props.crumbs) return props.crumbs;
  const item = findNavItem(route.path);
  if (!item || item.to === homeFor(auth.role)) return [];
  const out: { label: string; to?: string }[] = [];
  const group = navGroupTitle(item.group);
  if (group && group !== item.label) out.push({ label: group });
  if (route.path === item.to) out.push({ label: item.label });
  else out.push({ label: item.label, to: item.to }, { label: props.title });
  return out;
});
const text = computed(() => props.description ?? props.subtitle);
</script>

<template>
  <div class="mb-6">
    <nav v-if="!hideCrumbs && links.length" class="mb-2 flex flex-wrap items-center gap-1 text-xs text-slate-500" aria-label="Хлебные крошки">
      <NuxtLink :to="homeFor(auth.role)" class="hover:text-brand-500">{{ findNavItem(homeFor(auth.role))?.label ?? 'Сводка' }}</NuxtLink>
      <template v-for="(l, i) in links" :key="i">
        <UIcon name="i-heroicons-chevron-right-20-solid" class="h-3.5 w-3.5 text-slate-300" />
        <NuxtLink v-if="l.to" :to="l.to" class="hover:text-brand-500">{{ l.label }}</NuxtLink>
        <span v-else :class="i === links.length - 1 && 'text-slate-700'">{{ l.label }}</span>
      </template>
    </nav>
    <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div class="flex min-w-0 items-start gap-3">
        <div v-if="icon" class="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blush sm:flex">
          <UIcon :name="icon" class="h-6 w-6 text-brand-500" />
        </div>
        <div class="min-w-0">
          <h1 class="text-2xl font-semibold tracking-tight text-brand-500">
            {{ title }}
            <slot name="title-extra" />
          </h1>
          <p v-if="text" class="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">{{ text }}</p>
        </div>
      </div>
      <div v-if="$slots.default" class="flex flex-wrap items-center gap-2 md:shrink-0 md:justify-end">
        <slot />
      </div>
    </div>
  </div>
</template>
