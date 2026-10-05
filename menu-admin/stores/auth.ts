import { defineStore } from 'pinia';
import type { LoginResponse, Staff, StaffRole } from '~/types/api';

// Токен персонала (POST /api/v1/staff/login) в persisted-store вместе с профилем и ролью.
// Официант в админку не входит — у него приложение на телефоне.
export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: '' as string,
    admin: null as Staff | null,
    meLoaded: false as boolean,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    role: (state): StaffRole | null => state.admin?.role ?? null,
  },

  actions: {
    async login(login: string, password: string) {
      const { apiBase } = useRuntimeConfig().public;
      const res = await $fetch<LoginResponse>('/staff/login', {
        baseURL: apiBase,
        method: 'POST',
        body: { login, password },
      });
      if (!res?.token) throw new Error('Токен не получен');
      if (res.staff.role === 'waiter') {
        throw Object.assign(new Error('Официанты работают в приложении «Фуджи Официант» на телефоне — админка им не нужна'), {
          waiter: true,
        });
      }
      this.token = res.token;
      this.admin = res.staff;
      this.meLoaded = true;
    },

    /** Обновляет профиль (роль могли поменять) — один раз за сессию вкладки */
    async ensureMe() {
      if (!this.token || this.meLoaded) return;
      try {
        // При загрузке страницы формы ещё нет — на 401 без модалки: выходим, middleware отправит на /login
        const me = await useAuthFetch<Staff>('/staff/me', {}, { reauth: false, restaurant: false });
        this.admin = { ...(this.admin ?? me), ...me, login: this.admin?.login ?? me.login };
        this.meLoaded = true;
      } catch (e) {
        if (httpStatusOf(e) === 401) this.logout();
        // прочие ошибки — остаёмся с сохранённым профилем
      }
    },

    hasRole(...roles: StaffRole[]): boolean {
      return this.admin ? roles.includes(this.admin.role) : false;
    },

    /** Явный выход (кнопка «Выйти» или отказ от повторного входа). На 401 токен не стирается — см. useReauth */
    logout() {
      this.token = '';
      this.admin = null;
      this.meLoaded = false;
    },
  },

  persist: {
    pick: ['token', 'admin'],
  },
});
