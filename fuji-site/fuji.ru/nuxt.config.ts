import type { NuxtConfig } from '@nuxt/types';
import axios from 'axios';
import dotenv from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

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
    target: 'static',
    ssr: false,

    cache: false,
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
    loadingIndicator: {
      name: 'chasing-dots',
      color: '#993ca6',
      background: '#993ca6',
    },
    router: {
      middleware: ['onPageChange'],
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
      { src: '~/plugins/appUpdate.js' },
      { src: '~/plugins/websocket.client.js', mode: 'client' },
      { src: '~/plugins/push-notifications.ts' },
      { src: '~/plugins/capacitor-plugin-safe-area.js' },
      '~/plugins/vue-mask.js',
      '~/plugins/error-handler.js',
      { src: '~/plugins/firebase.js', mode: 'client' },
      { src: '~/plugins/zone-delivery.js', mode: 'client' },
      '~/plugins/ipx.js',
    ],

    // Auto import components: https://go.nuxtjs.dev/config-components
    components: true,

    // Modules for dev and build (recommended): https://go.nuxtjs.dev/config-modules
    buildModules: [
      '@nuxtjs/svg-sprite',
      ['@nuxtjs/google-analytics', { id: GOOGLE_COUNTER_ID }],
      '@nuxtjs/style-resources',
      '@nuxt/typescript-build',
      ['@nuxtjs/dotenv', { filename: `.env.${process.env.NODE_ENV}` }],
      '@nuxtjs/device',
      ['@nuxtjs/date-fns', { defaultLocale: 'ru' }],

    ],

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
      'portal-vue/nuxt',
      '@nuxtjs/recaptcha',
      '@nuxtjs/sentry',
    ],
    sentry: {
      dsn: 'https://e32c4532d7b316c5ea356431b5de69ac@o4506154115072000.ingest.sentry.io/4506154142203904',
    },
    recaptcha: {
      hideBadge: true, // Hide badge element (v3 & v2 via size=invisible)
      // language: String,   // Recaptcha language (v2)
      mode: 'base', // Mode: 'base', 'enterprise'
      siteKey: process.env.RECAPTCHA_SITE_KEY, // Site key for requests
      version: 3, // Version

    },

    // Axios module configuration: https://go.nuxtjs.dev/config-axios
    axios: {},
    proxy: {},

    serverMiddleware: [],

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
