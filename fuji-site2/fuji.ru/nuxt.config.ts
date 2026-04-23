import type { NuxtConfig } from '@nuxt/types';
import axios from 'axios';
import dotenv from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

import { generateRobots } from './lib/common';

const robots = generateRobots(process.env.IS_DEV_SERVER === 'true');

const __dirname = dirname(fileURLToPath(import.meta.url));

const pathEnv = resolve(__dirname, `.env.${process.env.NODE_ENV}`);

dotenv.config({ path: pathEnv });

const isDev = process.env.NODE_ENV !== 'production';
const { FRONT_API_URL } = process.env;

interface CounterIDs {
  YANDEX_COUNTER_ID: string;
  GOOGLE_COUNTER_ID: string;

}

async function fetchCounterIDs(): Promise<CounterIDs> {
  try {
    const responseMetrika = await axios.get(`${FRONT_API_URL}/api/v1/setting/YANDEX_COUNTER_ID`);
    const responseGoogle = await axios.get(`${FRONT_API_URL}/api/v1/setting/GOOGLE_COUNTER_ID`);
    return ({
      YANDEX_COUNTER_ID: responseMetrika.data,
      GOOGLE_COUNTER_ID: responseGoogle.data,
    });
  } catch (error) {
    console.error('Failed to fetch counter IDs:', error);
    return {
      YANDEX_COUNTER_ID: '',
      GOOGLE_COUNTER_ID: '',
    };
  }
}

export default async (): Promise<NuxtConfig> => {
  const { YANDEX_COUNTER_ID, GOOGLE_COUNTER_ID } = await fetchCounterIDs();

  return {
    target: 'server',
    ssr: true,

    server: {
      port: process.env.FRONT_SERVER_PORT,
      host: isDev ? process.env.FRONT_DEV_DOMAIN : process.env.FRONT_PROD_DOMAIN,
      timing: false,
    },
    publicRuntimeConfig: {
      FRONT_API_URL: process.env.FRONT_API_URL,
      WS_URL: process.env.WS_URL,
    },
    // Global page headers: https://go.nuxtjs.dev/config-head
    head: {
      htmlAttrs: {
        lang: 'ru',
      },
      meta: [

        {
          name: 'viewport',
          content: 'initial-scale=1, user-scalable=no, width=device-width, height=device-height, viewport-fit=cover',
        },
        { charset: 'utf-8' },
      ],
      link: [
        { rel: 'preconnect', href: process.env.FRONT_API_URL },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
      script: [
        { src: '/assets/libs/lordicon.js', async: true },
      ],
    },
    loading: { color: '#993ca6', height: '4px' },
    router: {
      middleware: ['cities', 'onPageChange', 'terminal'],
      extendRoutes(routes, resolve) {
        routes.push({
          name: 'terminal',
          path: '/terminal',
          component: resolve(__dirname, 'pages/terminal/index.vue'),
          meta: { layout: 'terminal' },
        });
        routes.push({
          name: 'terminal-city',
          path: '/:city/terminal',
          component: resolve(__dirname, 'pages/terminal/index.vue'),
          meta: { layout: 'terminal' },
        });
        routes.push({
          name: 'terminal-cart',
          path: '/terminal/cart',
          component: resolve(__dirname, 'pages/terminal/cart.vue'),
          meta: { layout: 'terminal' },
        });
        routes.push({
          name: 'terminal-city-cart',
          path: '/:city/terminal/cart',
          component: resolve(__dirname, 'pages/terminal/cart.vue'),
          meta: { layout: 'terminal' },
        });
        routes.push({
          name: 'terminal-complete',
          path: '/terminal/complete',
          component: resolve(__dirname, 'pages/terminal/complete.vue'),
          meta: { layout: 'terminal' },
        });
        routes.push({
          name: 'terminal-city-complete',
          path: '/:city/terminal/complete',
          component: resolve(__dirname, 'pages/terminal/complete.vue'),
          meta: { layout: 'terminal' },
        });
        // ── Menu (электронное меню) routes ────────────────────────────────
        routes.push({
          name: 'menu-index',
          path: '/menu',
          component: resolve(__dirname, 'pages/menu/index.vue'),
          meta: { layout: 'menu-select' },
        });
        routes.push({
          name: 'menu-restaurant',
          path: '/menu/:slug',
          component: resolve(__dirname, 'pages/menu/_slug/index.vue'),
          meta: { layout: 'menu' },
        });
        routes.push({
          name: 'menu-restaurant-cart',
          path: '/menu/:slug/cart',
          component: resolve(__dirname, 'pages/menu/_slug/cart.vue'),
          meta: { layout: 'menu' },
        });
        // ─────────────────────────────────────────────────────────────────
        routes.push({
          name: 'city-index',
          path: '/:city',
          component: resolve(__dirname, 'pages/index'),
        });
        routes.push({
          name: 'city-catalog',
          path: '/:city/catalog',
          component: resolve(__dirname, 'pages/catalog'),
        });
        routes.push({
          name: 'city-catalog-search',
          path: '/:city/catalog/search',
          component: resolve(__dirname, 'pages/catalog/search'),
        });
        routes.push({
          name: 'city-catalog-section',
          path: '/:city/catalog/:section',
          component: resolve(__dirname, 'pages/catalog/_section'),
        });
        routes.push({
          name: 'city-catalog-detail-product',
          path: '/:city/catalog/:section_id/:product_id',
          component: resolve(__dirname, 'pages/catalog/_section/_product_id'),
        });
        routes.push({
          name: 'city-about',
          path: '/:city/about',
          component: resolve(__dirname, 'pages/about'),
        });
        routes.push({
          name: 'city-legal',
          path: '/:city/legal',
          component: resolve(__dirname, 'pages/legal'),
        });
        routes.push({
          name: 'city-cart',
          path: '/:city/cart',
          component: resolve(__dirname, 'pages/cart'),
        });
        routes.push({
          name: 'city-checkout',
          path: '/:city/checkout',
          component: resolve(__dirname, 'pages/checkout'),
        });
        routes.push({
          name: 'city-complete',
          path: '/:city/complete',
          component: resolve(__dirname, 'pages/complete'),
        });
        routes.push({
          name: 'city-complete-error',
          path: '/:city/complete-error',
          component: resolve(__dirname, 'pages/complete-error'),
        });
        routes.push({
          name: 'city-delivery',
          path: '/:city/delivery',
          alias: '/delivery',
          component: resolve(__dirname, 'pages/delivery'),
        });
        routes.push({
          name: 'city-restaurant',
          path: '/:city/restaurant',
          alias: '/restaurant',
          component: resolve(__dirname, 'pages/restaurant'),
        });
        routes.push({
          name: 'city-vacancies',
          path: '/:city/vacancies',
          alias: '/vacancies',
          component: resolve(__dirname, 'pages/vacancies'),
        });
        routes.push({
          name: 'city-promo',
          path: '/:city/promo',
          component: resolve(__dirname, 'pages/promo'),
        });
        routes.push({
          name: 'city-rule',
          path: '/:city/rule',
          component: resolve(__dirname, 'pages/rule'),
        });
        routes.push({
          name: 'city-legal-information',
          path: '/:city/legal-information',
          component: resolve(__dirname, 'pages/legal-information'),
        });
        routes.push({
          name: 'city-personal',
          path: '/:city/personal',
          component: resolve(__dirname, 'pages/personal'),
        });
        routes.push({
          name: 'city-personal-address',
          path: '/:city/personal/address',
          component: resolve(__dirname, 'pages/personal/address'),
        });
        routes.push({
          name: 'city-personal-favorite',
          path: '/:city/personal/favorite',
          component: resolve(__dirname, 'pages/personal/favorite'),
        });
        routes.push({
          name: 'city-personal-history',
          path: '/:city/personal/history',
          component: resolve(__dirname, 'pages/personal/history'),
        });
        routes.push({
          name: 'city-push-notifications-rules',
          path: '/:city/push-notifications-rules',
          component: resolve(__dirname, 'pages/push-notifications-rules'),
        });
        routes.push({
          name: 'city-receive-advertising-information',
          path: '/:city/receive-advertising-information',
          component: resolve(__dirname, 'pages/receive-advertising-information'),
        });
        routes.push({
          name: 'city-oferta',
          path: '/:city/oferta',
          component: resolve(__dirname, 'pages/oferta'),
        });
        routes.push({
          name: 'city-oferta-app-1',
          path: '/:city/oferta/app-1',
          component: resolve(__dirname, 'pages/oferta/app-1'),
        });
        routes.push({
          name: 'city-loyalty-program',
          path: '/:city/loyalty-program',
          component: resolve(__dirname, 'pages/loyalty-program'),
        });
        routes.push({
          name: 'city-loyalty-program-app-1',
          path: '/:city/loyalty-program/app-1',
          component: resolve(__dirname, 'pages/loyalty-program/app-1'),
        });
        routes.push({
          name: 'city-user-agreement',
          path: '/:city/user-agreement',
          component: resolve(__dirname, 'pages/user-agreement'),
        });
        routes.push({
          name: 'new-year-promo',
          path: '/:city/new-year-promo',
          component: resolve(__dirname, 'pages/new-year-promo'),
        });
        routes.push({
          name: 'fm-promos',
          path: '/:city/advent',
          component: resolve(__dirname, 'pages/advent'),
        });
        routes.push({
          name: 'happy-hours',
          path: '/:city/happy-hours',
          component: resolve(__dirname, 'pages/happy-hours'),
        });
        routes.push({
          name: 'promotions',
          path: '/:city/personal/promotions',
          component: resolve(__dirname, 'pages/personal/promotions'),
        });
        routes.push({
          name: 'promotions-detail',
          path: '/:city/personal/promotions/:id',
          component: resolve(__dirname, 'pages/personal/promotions/_id'),
        });
        routes.push({
          name: 'advent-2025',
          path: '/:city/advent-2025',
          component: resolve(__dirname, 'pages/advent-2025/index.vue'),
        });
        routes.push({
          name: 'advent-2025-legal',
          path: '/:city/advent-2025/legal',
          component: resolve(__dirname, 'pages/advent-2025/legal.vue'),
        });
      },

    },
    css: [
      '@/assets/scss/main.scss',
    ],

    plugins: [
      { src: '~/plugins/nuxt-instance.js' }, // должен идти первым
      '~/plugins/directives.js',
      { src: '~/plugins/vue-notification-ssr.js', mode: 'server' },
      { src: '~/plugins/vue-notification-client.js', mode: 'client' },
      { src: '~/plugins/yandex-smartcaptcha.js', mode: 'client' },
      { src: '~/plugins/vue-awesome-swiper', mode: 'client' },
      '~/plugins/axios.js',
      '~/plugins/common.js',
      { src: '~/plugins/vuex-persist', mode: 'client' },
      { src: '~/plugins/vue2-touch-events.js', mode: 'client' },
      { src: '~/plugins/websocket.client.js', mode: 'client' },
      { src: '~/plugins/push-notifications.ts' },
      '~/plugins/vue-mask.js',
      '~/plugins/error-handler.js',
      { src: '~/plugins/firebase.js', mode: 'client' },
      { src: '~/plugins/zone-delivery.js', mode: 'client' },
      '~/plugins/ipx.js',
      { src: '~/plugins/terminal-init.server.js', mode: 'server' },
      { src: '~/plugins/terminal-init.client.js', mode: 'client' },
    ],

    // Auto import components: https://go.nuxtjs.dev/config-components
    components: true,

    // Modules for dev and build (recommended): https://go.nuxtjs.dev/config-modules
    buildModules: [
      'nuxt-delay-hydration',
      '@nuxtjs/svg-sprite',
      ['@nuxtjs/google-analytics', { id: GOOGLE_COUNTER_ID }],
      '@nuxtjs/style-resources',
      '@nuxt/typescript-build',
      ['@nuxtjs/dotenv', { filename: `.env.${process.env.NODE_ENV}` }],
      '@nuxtjs/device',
      ['@nuxtjs/date-fns', { defaultLocale: 'ru' }],
    ],

    delayHydration: {
      mode: 'init',
      // debug: process.env.NODE_ENV === 'development',
      replayClick: true,
    },

    styleResources: {
      scss: [
        '~/assets/scss/_colors.scss',
        '~/assets/scss/_vars.scss',
        '~/assets/scss/_mixins.scss',
      ],
    },

    // Modules: https://go.nuxtjs.dev/config-modules
    modules: [
      '@nuxt/image',
      '@nuxtjs/axios',
      'nuxt-client-init-module',
      [
        '@rkaliev/nuxtjs-yandex-metrika',
        {
          id: YANDEX_COUNTER_ID,
          clickmap: true,
          trackLinks: true,
          accurateTrackBounce: true,
          webvisor: true,
          ecommerce: 'dataLayer',
        },
      ],
      'cookie-universal-nuxt',
      '@nuxt/image',
      '@nuxtjs/sitemap',
      'portal-vue/nuxt',
      '@nuxtjs/recaptcha',
      '@nuxtjs/sentry',
      '@nuxtjs/robots',
      '@nuxtjs/device',
      'nuxt-ssr-cache',
      [
        'nuxt-compress',
        {
          gzip: {
            threshold: 8192,
          },
          brotli: {
            threshold: 8192,
          },
          cache: true,
        },
      ],
    ],
    cache: {
      useHostPrefix: false,
      pages: process.env.NODE_ENV === 'production' ? [
        '.*',
      ] : [],
      key(route, context) {
        const catalogVersion = context.req.catalogVersion || 'default';
        return `${route}:${catalogVersion}`;
      },
      store: {
        type: 'memory',
        max: 100,
        ttl: 60 * 30,
      },
    },
    sentry: {
      dsn: process.env.NODE_ENV === 'production' ? 'https://90f55d69ae23c58155ca4e99f8361daf@o4506154115072000.ingest.us.sentry.io/4506942274994177' : '',
    },
    robots,
    recaptcha: {
      hideBadge: true, // Hide badge element (v3 & v2 via size=invisible)
      // language: String,   // Recaptcha language (v2)
      mode: 'base', // Mode: 'base', 'enterprise'
      siteKey: process.env.RECAPTCHA_SITE_KEY, // Site key for requests
      version: 3, // Version

    },

    // Axios module configuration: https://go.nuxtjs.dev/config-axios
    sitemap: {
      hostname: process.env.FRONT_SERVER_URL,
      exclude: [
        '/complete-error',
        '/complete',
        '/checkout',
        '/account',
        '/cart',
        '/personal',
        '/personal/*',
        '/_icons',
      ],
      routes: async () => {
        const result = [];
        const [g, p] = await Promise.all([
          axios.get(`${process.env.FRONT_API_URL}/api/v1/catalog/group`),
          axios.get(`${process.env.FRONT_API_URL}/api/v1/catalog/product`),
        ]);

        const groups = g.data
          .filter((group) => group.isIncludedInMenu)
          .filter((group) => {
            const { additionalInfo } = group;
            if (additionalInfo?.isServiceGroup) {
              return false;
            }
            return group?.isIncludedInMenu;
          });

        const products = p.data;

        result.push(...groups.map((group) => `/catalog/${group.slug}`));
        result.push(
          ...products.map((product) => {
            const group = groups.find((el) => el.id === product.parentGroup);
            if (!group) {
              return '';
            }
            return `/catalog/${group.slug}/${product.slug}`;
          }),
        );
        return result;
      },
    },

    // Axios module configuration: https://go.nuxtjs.dev/config-axios
    // axios: {
    //   proxy: true,
    // },
    // proxy: {
    //   '/api': process.env.FRONT_API_URL,
    // },

    // PWA module configuration: https://go.nuxtjs.dev/pwa
    pwa: {
      manifest: {
        name: 'Фуджи',
        short_name: 'Фуджи',
        description: 'Фуджи',
        lang: 'ru',
        start_url: '/?homescreen=1',
        background_color: '#e41d2d',
        theme_color: '#e41d2d',
        display: 'standalone',
      },
      icon: {
        source: '[srcDir]/[staticDir]/icon.png',
      },
    },

    serverMiddleware: [
      '~/server-middleware/index.js',
      '~/middleware/cache-headers.js',
      '~/server-middleware/catalogVersion.js',
      '~/server-middleware/fileHandler.js',
    ],

    image: {
      provider: 'ipx',
      ipx: {
        baseURL: `${process.env.FRONT_API_URL}/_ipx`,
      },

    },

    // Build Configuration: https://go.nuxtjs.dev/config-build
    build: {
      extractCSS: true,

      splitChunks: {
        layouts: true,
      },
      filenames: {
        chunk: () => (!isDev ? '[name].[id].[contenthash].js' : '[name].js'),
      },
      extend(extendConfig) {
        extendConfig.node = {
          fs: 'empty',
        };
      },
    },

  };
};
