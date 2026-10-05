// https://nuxt.com/docs/api/configuration/nuxt-config
// Админка QR-меню Фуджи. Каркас — админка «Мудрого Пекаря» (SPA, @nuxt/ui, Pinia + persistedstate).
// Отдаётся menu-api по адресу /admin/ (adm.menu.franchise-fuji.ru открывает её с корня), API — /api/v1 того же домена.
export default defineNuxtConfig({
  compatibilityDate: '2025-09-01',
  devtools: { enabled: false },
  ssr: false,

  modules: ['@nuxt/ui', '@pinia/nuxt', 'pinia-plugin-persistedstate/nuxt'],

  css: ['~/assets/css/main.css'],

  app: {
    baseURL: '/admin/',
    head: {
      htmlAttrs: { lang: 'ru' },
      title: 'Фуджи — админка меню',
      meta: [
        { name: 'robots', content: 'noindex, nofollow' },
        { name: 'theme-color', content: '#091027' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/admin/logo.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
      ],
    },
  },

  // Все значения переопределяются переменными окружения NUXT_PUBLIC_*
  runtimeConfig: {
    public: {
      apiBase: '/api/v1', // NUXT_PUBLIC_API_BASE
      menuUrl: 'https://menu.franchise-fuji.ru', // NUXT_PUBLIC_MENU_URL — гостевое меню (ссылки «Открыть у гостя»)
      timezone: 'Europe/Samara', // NUXT_PUBLIC_TIMEZONE
      dashboardRefreshSec: 30, // NUXT_PUBLIC_DASHBOARD_REFRESH_SEC
    },
  },

  // В dev запросы /api и /media уходят в локальный menu-api
  nitro: {
    devProxy: {
      '/api': { target: 'http://localhost:3101/api', changeOrigin: true },
      '/media': { target: 'http://localhost:3101/media', changeOrigin: true },
      '/img': { target: 'http://localhost:3101/img', changeOrigin: true },
    },
  },

  // Иконки встраиваем в сборку (сканируем исходники), а не тянем с api.iconify.design
  icon: {
    clientBundle: {
      scan: {
        globInclude: ['**/*.{vue,ts}'],
        globExclude: ['node_modules', '.nuxt', '.output', 'dist'],
      },
      // иконки, которые Nuxt UI подставляет сам (выпадающие списки, таблицы, пагинация, закрытие тостов)
      icons: [
        'heroicons:arrow-path-20-solid',
        'heroicons:arrows-up-down-20-solid',
        'heroicons:bars-arrow-down-20-solid',
        'heroicons:bars-arrow-up-20-solid',
        'heroicons:check-20-solid',
        'heroicons:chevron-double-left-20-solid',
        'heroicons:chevron-double-right-20-solid',
        'heroicons:chevron-down',
        'heroicons:chevron-down-20-solid',
        'heroicons:chevron-left-20-solid',
        'heroicons:chevron-right-20-solid',
        'heroicons:circle-stack-20-solid',
        'heroicons:magnifying-glass-20-solid',
        'heroicons:minus-20-solid',
        'heroicons:x-mark-20-solid',
      ],
      sizeLimitKb: 512,
    },
  },

  colorMode: {
    preference: 'light',
  },

  ui: {
    // Цвета, которые задаются динамически (:color="…"): статусы, бейджи — иначе tailwind их вырежет
    safelistColors: ['brand', 'accent', 'cta', 'green', 'red', 'amber', 'sky', 'blue', 'orange', 'violet'],
  },

  // Токен — в localStorage (по умолчанию модуль пишет в cookie)
  piniaPluginPersistedstate: {
    storage: 'localStorage',
  },

  typescript: {
    strict: true,
  },
});
