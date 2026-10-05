import { defineStore } from 'pinia';
import type { AdminMenu } from '~/types/api';
import { useRestaurantStore } from '~/stores/restaurant';

// Меню ресторана для админки (GET /admin/menu): выгрузка iiko + правки админки поверх неё.
// Держим в store, чтобы список блюд и карточка блюда не грузили меню дважды, а сайдбар знал размер стоп-листа.
export const useMenuStore = defineStore('menu', {
  state: () => ({
    data: null as AdminMenu | null,
    slug: '' as string,
    loading: false as boolean,
  }),

  getters: {
    stopCount: (state) => state.data?.products.filter((p) => p.isInStopList && !p.isHidden).length ?? 0,
  },

  actions: {
    async load({ force = false, refresh = false } = {}) {
      const slug = useRestaurantStore().slug;
      if (this.data && this.slug === slug && !force && !refresh) return this.data;
      this.loading = true;
      try {
        this.data = await useAuthFetch<AdminMenu>('/admin/menu', { query: refresh ? { refresh: '1' } : {} });
        this.slug = slug;
        return this.data;
      } finally {
        this.loading = false;
      }
    },

    /** Перевыгрузка меню из iiko (только администратор) */
    async sync() {
      this.loading = true;
      try {
        this.data = await useAuthFetch<AdminMenu>('/admin/menu/sync', { method: 'POST' });
        this.slug = useRestaurantStore().slug;
        return this.data;
      } finally {
        this.loading = false;
      }
    },

    invalidate() {
      this.data = null;
    },
  },
});
