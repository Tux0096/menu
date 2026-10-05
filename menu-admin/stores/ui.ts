import { defineStore } from 'pinia';

// Настройки интерфейса конкретного браузера: свёрнутый сайдбар. Не критично — только удобство.
export const useUiStore = defineStore('ui', {
  state: () => ({
    sidebarCollapsed: false,
    mobileNavOpen: false,
  }),

  actions: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    },
  },

  persist: {
    pick: ['sidebarCollapsed'],
  },
});
