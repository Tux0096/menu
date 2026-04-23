import VuexPersistence from 'vuex-persist';
import axios from 'axios';

export default async ({ store, $config }) => {
  try {
    const res = await axios.get(`${$config.FRONT_API_URL}/api/v1/setting/STORE_VERSION`);
    const STORE_VERSION = res.data || 1;
    store.commit('setStoreVersion', STORE_VERSION);
    new VuexPersistence({
      key: `vuex-${STORE_VERSION}`,
      modules: [
        'cart',
        'user',
        'address',
        'auth',
        'terminal',
      ],
    }).plugin(store);
  } catch (e) {
    console.log(e);
  }
};
