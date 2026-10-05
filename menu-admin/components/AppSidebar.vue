<script setup lang="ts">
import type { NavItem } from '~/utils/navigation';
import { useAuthStore } from '~/stores/auth';
import { useMenuStore } from '~/stores/menu';
import { useRestaurantStore } from '~/stores/restaurant';
import { useUiStore } from '~/stores/ui';

// Боковое меню. На десктопе — постоянная колонка (можно свернуть до иконок), на планшете/телефоне —
// выезжающая панель (layouts/default.vue передаёт drawer=true).
const props = withDefaults(defineProps<{ drawer?: boolean }>(), { drawer: false });

const auth = useAuthStore();
const menu = useMenuStore();
const restaurants = useRestaurantStore();
const ui = useUiStore();
const route = useRoute();
const confirm = useConfirm();

const collapsed = computed(() => !props.drawer && ui.sidebarCollapsed);

const groups = computed(() => {
  const role = auth.role;
  const visible = NAV_ITEMS.filter((i) => !i.hidden && role && i.roles.includes(role));
  return NAV_GROUPS.map((g) => ({ ...g, items: visible.filter((i) => i.group === g.key) })).filter((g) => g.items.length);
});

const activeTo = computed(() => findNavItem(route.path)?.to);
const badgeValue = (item: NavItem) => (item.badge === 'stopList' ? menu.stopCount : 0);

onMounted(() => {
  if (auth.role && ['admin', 'marketing'].includes(auth.role)) menu.load().catch(() => undefined);
});

const restaurantOptions = computed(() =>
  restaurants.list.map((r) => ({ value: r.slug, label: r.is_disabled ? `${r.name} (скоро)` : r.name })),
);

// Смена ресторана: всё на странице перечитывается (страницы следят за restaurants.slug)
const changeRestaurant = (slug: string) => {
  restaurants.select(slug);
  menu.invalidate();
  if (auth.role && ['admin', 'marketing'].includes(auth.role)) menu.load().catch(() => undefined);
};

const logout = async () => {
  const ok = await confirm({ title: 'Выйти из админки?', confirmLabel: 'Выйти' });
  if (!ok) return;
  auth.logout();
  await navigateTo('/login');
};

const initials = computed(() => {
  const name = auth.admin?.name || auth.admin?.login || '';
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
});
</script>

<template>
  <aside
    class="flex h-full shrink-0 flex-col bg-brand-500 text-white transition-[width] duration-200"
    :class="drawer ? 'w-72' : collapsed ? 'w-[72px]' : 'w-64'"
  >
    <!-- Логотип -->
    <NuxtLink :to="homeFor(auth.role)" class="flex items-center gap-3 px-4 pb-4 pt-5" :class="collapsed && 'justify-center px-0'">
      <img src="/logo.svg" alt="Фуджи" width="40" height="40" class="h-10 w-10 shrink-0 rounded-xl shadow-sm ring-1 ring-white/10" />
      <div v-if="!collapsed" class="min-w-0 leading-tight">
        <div class="truncate text-[15px] font-semibold tracking-tight">Фуджи</div>
        <div class="text-xs text-brand-200">QR-меню · админка</div>
      </div>
    </NuxtLink>

    <!-- Ресторан: все разделы показывают данные выбранного -->
    <div v-if="!collapsed && restaurants.list.length" class="px-3 pb-3">
      <label class="mb-1 block px-1 text-[11px] font-medium uppercase tracking-wider text-brand-300" for="sidebar-restaurant">Ресторан</label>
      <USelect
        id="sidebar-restaurant"
        :model-value="restaurants.slug"
        :options="restaurantOptions"
        :disabled="restaurants.list.length < 2"
        size="sm"
        @update:model-value="changeRestaurant"
      />
    </div>

    <nav class="flex-1 overflow-y-auto px-3 pb-4" aria-label="Разделы">
      <div v-for="group in groups" :key="group.key" class="mt-3 first:mt-0">
        <div v-if="group.title && !collapsed && !(group.items.length === 1 && group.items[0]!.label === group.title)" class="px-3 pb-1.5 pt-2 text-[11px] font-medium uppercase tracking-wider text-brand-300">
          {{ group.title }}
        </div>
        <div v-else-if="group.title" class="mx-3 my-2 border-t border-white/10" :class="!collapsed && 'mt-3'" />
        <ul class="space-y-0.5">
          <li v-for="item in group.items" :key="item.to">
            <UTooltip :text="item.label" :prevent="!collapsed" :popper="{ placement: 'right' }" class="w-full">
              <NuxtLink
                :to="item.to"
                class="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition"
                :class="[
                  activeTo === item.to ? 'bg-white font-medium text-brand-500 shadow-sm' : 'text-brand-100 hover:bg-white/10 hover:text-white',
                  collapsed && 'justify-center px-0',
                ]"
                :aria-current="activeTo === item.to ? 'page' : undefined"
                @click="ui.mobileNavOpen = false"
              >
                <UIcon
                  :name="item.icon"
                  class="h-5 w-5 shrink-0"
                  :class="activeTo === item.to ? 'text-cta-500' : 'text-brand-200 group-hover:text-white'"
                />
                <template v-if="!collapsed">
                  <span class="flex-1 truncate">{{ item.label }}</span>
                  <span
                    v-if="badgeValue(item)"
                    class="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white"
                    :title="`В стоп-листе: ${badgeValue(item)}`"
                  >{{ badgeValue(item) }}</span>
                </template>
                <span
                  v-else-if="badgeValue(item)"
                  class="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-red-500"
                />
              </NuxtLink>
            </UTooltip>
          </li>
        </ul>
      </div>
    </nav>

    <!-- Пользователь -->
    <div class="border-t border-white/10 p-3">
      <div class="flex items-center gap-3" :class="collapsed && 'flex-col'">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold">
          {{ initials || '?' }}
        </div>
        <div v-if="!collapsed && auth.admin" class="min-w-0 flex-1 leading-tight">
          <div class="truncate text-sm font-medium">{{ auth.admin.name || auth.admin.login }}</div>
          <div class="text-xs text-brand-200">{{ ROLE_LABELS[auth.admin.role] ?? auth.admin.role }}</div>
        </div>
        <UTooltip text="Выйти">
          <UButton
            color="white"
            variant="ghost"
            icon="i-heroicons-arrow-right-on-rectangle"
            class="text-brand-100 hover:bg-white/10 hover:text-white"
            aria-label="Выйти"
            @click="logout"
          />
        </UTooltip>
      </div>
      <UButton
        v-if="!drawer"
        block
        color="white"
        variant="ghost"
        size="xs"
        class="mt-2 text-brand-200 hover:bg-white/10 hover:text-white"
        :icon="collapsed ? 'i-heroicons-chevron-double-right' : 'i-heroicons-chevron-double-left'"
        :aria-label="collapsed ? 'Развернуть меню' : 'Свернуть меню'"
        @click="ui.toggleSidebar()"
      >
        <span v-if="!collapsed">Свернуть меню</span>
      </UButton>
    </div>
  </aside>
</template>
