import { NuxtAxiosInstance } from '@nuxtjs/axios';

declare global {
  interface NuxtConfig {
    FRONT_API_URL: string;
    FEATURE_REMARKED_LOYALTY?: boolean | string;
  }
}

declare module 'vuex' {
  interface Store<S> {
    $axios: NuxtAxiosInstance;
    $config: NuxtConfig;
  }
}
