import { defineStore } from 'pinia';
import type { Restaurant } from '~/types/api';

// Выбранный ресторан: все запросы админки идут с ?restaurant=<slug> (menu-api: staffRestaurant).
// Сотрудник, привязанный к одному ресторану, видит только его.
export const useRestaurantStore = defineStore('restaurant', {
  state: () => ({
    slug: '' as string,
    list: [] as Restaurant[],
    loaded: false as boolean,
  }),

  getters: {
    current: (state): Restaurant | null => state.list.find((r) => r.slug === state.slug) ?? state.list[0] ?? null,
  },

  actions: {
    async load(force = false) {
      if (this.loaded && !force) return;
      const list = await useAuthFetch<Restaurant[]>('/staff/restaurants', {}, { restaurant: false });
      const auth = useAuthStore();
      const own = auth.admin?.restaurantId;
      this.list = own ? list.filter((r) => r.id === own) : list;
      if (!this.list.some((r) => r.slug === this.slug)) {
        // по умолчанию — ресторан, подключённый к iiko (у остальных меню пустое)
        const connected = this.list.find((r) => !r.is_disabled && r.organization_id);
        this.slug = (connected ?? this.list.find((r) => !r.is_disabled) ?? this.list[0])?.slug ?? '';
      }
      this.loaded = true;
    },

    select(slug: string) {
      this.slug = slug;
    },
  },

  persist: {
    pick: ['slug'],
  },
});
