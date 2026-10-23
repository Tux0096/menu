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
      // Inter — свои файлы (public/fonts), без Google Fonts
      style: [{ innerHTML: `@font-face { font-family: 'Inter'; font-style: normal; font-weight: 400; font-display: swap; src: url('/admin/fonts/inter-cyrillic-400.woff2') format('woff2'); unicode-range: U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116; }
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 400; font-display: swap; src: url('/admin/fonts/inter-latin-400.woff2') format('woff2'); unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 500; font-display: swap; src: url('/admin/fonts/inter-cyrillic-500.woff2') format('woff2'); unicode-range: U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116; }
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 500; font-display: swap; src: url('/admin/fonts/inter-latin-500.woff2') format('woff2'); unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 600; font-display: swap; src: url('/admin/fonts/inter-cyrillic-600.woff2') format('woff2'); unicode-range: U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116; }
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 600; font-display: swap; src: url('/admin/fonts/inter-latin-600.woff2') format('woff2'); unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 700; font-display: swap; src: url('/admin/fonts/inter-cyrillic-700.woff2') format('woff2'); unicode-range: U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116; }
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 700; font-display: swap; src: url('/admin/fonts/inter-latin-700.woff2') format('woff2'); unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }` }],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/admin/logo.svg' },
        { rel: 'preload', href: '/admin/fonts/inter-cyrillic-400.woff2', as: 'font', type: 'font/woff2', crossorigin: '' },
        { rel: 'preload', href: '/admin/fonts/inter-latin-400.woff2', as: 'font', type: 'font/woff2', crossorigin: '' },
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
