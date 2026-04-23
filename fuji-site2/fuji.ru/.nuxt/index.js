import Vue from 'vue'
import Vuex from 'vuex'
import Meta from 'vue-meta'
import ClientOnly from 'vue-client-only'
import NoSsr from 'vue-no-ssr'
import { createRouter } from './router.js'
import NuxtChild from './components/nuxt-child.js'
import NuxtError from '..\\layouts\\error.vue'
import Nuxt from './components/nuxt.js'
import App from './App.js'
import { setContext, getLocation, getRouteData, normalizeError } from './utils'
import { createStore } from './store.js'

/* Plugins */

import nuxt_plugin_plugin_3a8c7170 from 'nuxt_plugin_plugin_3a8c7170' // Source: .\\components\\plugin.js (mode: 'all')
import nuxt_plugin_sentryserver_3d5a5376 from 'nuxt_plugin_sentryserver_3d5a5376' // Source: .\\sentry.server.js (mode: 'server')
import nuxt_plugin_sentryclient_50be3c24 from 'nuxt_plugin_sentryclient_50be3c24' // Source: .\\sentry.client.js (mode: 'client')
import nuxt_plugin_recaptcha_53a41a82 from 'nuxt_plugin_recaptcha_53a41a82' // Source: .\\recaptcha.js (mode: 'all')
import nuxt_plugin_portalvue_6d1ce2a0 from 'nuxt_plugin_portalvue_6d1ce2a0' // Source: .\\portal-vue.js (mode: 'all')
import nuxt_plugin_cookieuniversalnuxt_f3ceb18a from 'nuxt_plugin_cookieuniversalnuxt_f3ceb18a' // Source: .\\cookie-universal-nuxt.js (mode: 'all')
import nuxt_plugin_libpluginMock34a50b8c_8a7277e2 from 'nuxt_plugin_libpluginMock34a50b8c_8a7277e2' // Source: .\\lib.pluginMock.34a50b8c.js (mode: 'client')
import nuxt_plugin_axios_e762e4da from 'nuxt_plugin_axios_e762e4da' // Source: .\\axios.js (mode: 'all')
import nuxt_plugin_image_77558a8e from 'nuxt_plugin_image_77558a8e' // Source: .\\image.js (mode: 'all')
import nuxt_plugin_datefns_a349414e from 'nuxt_plugin_datefns_a349414e' // Source: .\\date-fns.js (mode: 'all')
import nuxt_plugin_deviceplugin_4754e21e from 'nuxt_plugin_deviceplugin_4754e21e' // Source: .\\device.plugin.js (mode: 'all')
import nuxt_plugin_googleanalytics_245ebe9a from 'nuxt_plugin_googleanalytics_245ebe9a' // Source: .\\google-analytics.js (mode: 'client')
import nuxt_plugin_nuxtsvgsprite_acea661e from 'nuxt_plugin_nuxtsvgsprite_acea661e' // Source: .\\nuxt-svg-sprite.js (mode: 'all')
import nuxt_plugin_nuxtinstance_f8718624 from 'nuxt_plugin_nuxtinstance_f8718624' // Source: ..\\plugins\\nuxt-instance.js (mode: 'all')
import nuxt_plugin_directives_521c0486 from 'nuxt_plugin_directives_521c0486' // Source: ..\\plugins\\directives.js (mode: 'all')
import nuxt_plugin_vuenotificationssr_35e856ca from 'nuxt_plugin_vuenotificationssr_35e856ca' // Source: ..\\plugins\\vue-notification-ssr.js (mode: 'server')
import nuxt_plugin_vuenotificationclient_a1ced7f2 from 'nuxt_plugin_vuenotificationclient_a1ced7f2' // Source: ..\\plugins\\vue-notification-client.js (mode: 'client')
import nuxt_plugin_yandexsmartcaptcha_cfd52e40 from 'nuxt_plugin_yandexsmartcaptcha_cfd52e40' // Source: ..\\plugins\\yandex-smartcaptcha.js (mode: 'client')
import nuxt_plugin_vueawesomeswiper_4af85e3f from 'nuxt_plugin_vueawesomeswiper_4af85e3f' // Source: ..\\plugins\\vue-awesome-swiper (mode: 'client')
import nuxt_plugin_axios_5659d192 from 'nuxt_plugin_axios_5659d192' // Source: ..\\plugins\\axios.js (mode: 'all')
import nuxt_plugin_common_17412d76 from 'nuxt_plugin_common_17412d76' // Source: ..\\plugins\\common.js (mode: 'all')
import nuxt_plugin_vuexpersist_13f465a2 from 'nuxt_plugin_vuexpersist_13f465a2' // Source: ..\\plugins\\vuex-persist (mode: 'client')
import nuxt_plugin_vue2touchevents_147d6945 from 'nuxt_plugin_vue2touchevents_147d6945' // Source: ..\\plugins\\vue2-touch-events.js (mode: 'client')
import nuxt_plugin_websocketclient_7138b4a2 from 'nuxt_plugin_websocketclient_7138b4a2' // Source: ..\\plugins\\websocket.client.js (mode: 'client')
import nuxt_plugin_pushnotifications_1a8315e2 from 'nuxt_plugin_pushnotifications_1a8315e2' // Source: ..\\plugins\\push-notifications.ts (mode: 'all')
import nuxt_plugin_vuemask_08817de4 from 'nuxt_plugin_vuemask_08817de4' // Source: ..\\plugins\\vue-mask.js (mode: 'all')
import nuxt_plugin_errorhandler_7194ca70 from 'nuxt_plugin_errorhandler_7194ca70' // Source: ..\\plugins\\error-handler.js (mode: 'all')
import nuxt_plugin_firebase_34d6f55a from 'nuxt_plugin_firebase_34d6f55a' // Source: ..\\plugins\\firebase.js (mode: 'client')
import nuxt_plugin_zonedelivery_73ed2c58 from 'nuxt_plugin_zonedelivery_73ed2c58' // Source: ..\\plugins\\zone-delivery.js (mode: 'client')
import nuxt_plugin_ipx_5cf6d9c8 from 'nuxt_plugin_ipx_5cf6d9c8' // Source: ..\\plugins\\ipx.js (mode: 'all')
import nuxt_plugin_terminalinitserver_78e6109e from 'nuxt_plugin_terminalinitserver_78e6109e' // Source: ..\\plugins\\terminal-init.server.js (mode: 'server')
import nuxt_plugin_terminalinitclient_5dd38629 from 'nuxt_plugin_terminalinitclient_5dd38629' // Source: ..\\plugins\\terminal-init.client.js (mode: 'client')
import nuxt_plugin_libnuxtclientinitpluginclientf204d5ec_e1609976 from 'nuxt_plugin_libnuxtclientinitpluginclientf204d5ec_e1609976' // Source: .\\lib.nuxt-client-init.plugin.client.f204d5ec.js (mode: 'client')

// Component: <ClientOnly>
Vue.component(ClientOnly.name, ClientOnly)

// TODO: Remove in Nuxt 3: <NoSsr>
Vue.component(NoSsr.name, {
  ...NoSsr,
  render (h, ctx) {
    if (process.client && !NoSsr._warned) {
      NoSsr._warned = true

      console.warn('<no-ssr> has been deprecated and will be removed in Nuxt 3, please use <client-only> instead')
    }
    return NoSsr.render(h, ctx)
  }
})

// Component: <NuxtChild>
Vue.component(NuxtChild.name, NuxtChild)
Vue.component('NChild', NuxtChild)

// Component NuxtLink is imported in server.js or client.js

// Component: <Nuxt>
Vue.component(Nuxt.name, Nuxt)

Object.defineProperty(Vue.prototype, '$nuxt', {
  get() {
    const globalNuxt = this.$root ? this.$root.$options.$nuxt : null
    if (process.client && !globalNuxt && typeof window !== 'undefined') {
      return window.$nuxt
    }
    return globalNuxt
  },
  configurable: true
})

Vue.use(Meta, {"keyName":"head","attribute":"data-n-head","ssrAttribute":"data-n-head-ssr","tagIDKeyName":"hid"})

const defaultTransition = {"name":"page","mode":"out-in","appear":false,"appearClass":"appear","appearActiveClass":"appear-active","appearToClass":"appear-to"}

const originalRegisterModule = Vuex.Store.prototype.registerModule

function registerModule (path, rawModule, options = {}) {
  const preserveState = process.client && (
    Array.isArray(path)
      ? !!path.reduce((namespacedState, path) => namespacedState && namespacedState[path], this.state)
      : path in this.state
  )
  return originalRegisterModule.call(this, path, rawModule, { preserveState, ...options })
}

async function createApp(ssrContext, config = {}) {
  const store = createStore(ssrContext)
  const router = await createRouter(ssrContext, config, { store })

  // Add this.$router into store actions/mutations
  store.$router = router

  // Fix SSR caveat https://github.com/nuxt/nuxt.js/issues/3757#issuecomment-414689141
  store.registerModule = registerModule

  // Create Root instance

  // here we inject the router and store to all child components,
  // making them available everywhere as `this.$router` and `this.$store`.
  const app = {
    head: {"htmlAttrs":{"lang":"ru"},"meta":[{"name":"viewport","content":"initial-scale=1, user-scalable=no, width=device-width, height=device-height, viewport-fit=cover"},{"charset":"utf-8"}],"link":[{"rel":"preconnect","href":"http:\u002F\u002Flocalhost:3101"},{"rel":"icon","type":"image\u002Fx-icon","href":"\u002Ffavicon.ico"}],"script":[{"src":"\u002Fassets\u002Flibs\u002Flordicon.js","async":true}],"style":[]},

    store,
    router,
    nuxt: {
      defaultTransition,
      transitions: [defaultTransition],
      setTransitions (transitions) {
        if (!Array.isArray(transitions)) {
          transitions = [transitions]
        }
        transitions = transitions.map((transition) => {
          if (!transition) {
            transition = defaultTransition
          } else if (typeof transition === 'string') {
            transition = Object.assign({}, defaultTransition, { name: transition })
          } else {
            transition = Object.assign({}, defaultTransition, transition)
          }
          return transition
        })
        this.$options.nuxt.transitions = transitions
        return transitions
      },

      err: null,
      dateErr: null,
      error (err) {
        err = err || null
        app.context._errored = Boolean(err)
        err = err ? normalizeError(err) : null
        let nuxt = app.nuxt // to work with @vue/composition-api, see https://github.com/nuxt/nuxt.js/issues/6517#issuecomment-573280207
        if (this) {
          nuxt = this.nuxt || this.$options.nuxt
        }
        nuxt.dateErr = Date.now()
        nuxt.err = err
        // Used in src/server.js
        if (ssrContext) {
          ssrContext.nuxt.error = err
        }
        return err
      }
    },
    ...App
  }

  // Make app available into store via this.app
  store.app = app

  const next = ssrContext ? ssrContext.next : location => app.router.push(location)
  // Resolve route
  let route
  if (ssrContext) {
    route = router.resolve(ssrContext.url).route
  } else {
    const path = getLocation(router.options.base, router.options.mode)
    route = router.resolve(path).route
  }

  // Set context to app.context
  await setContext(app, {
    store,
    route,
    next,
    error: app.nuxt.error.bind(app),
    payload: ssrContext ? ssrContext.payload : undefined,
    req: ssrContext ? ssrContext.req : undefined,
    res: ssrContext ? ssrContext.res : undefined,
    beforeRenderFns: ssrContext ? ssrContext.beforeRenderFns : undefined,
    beforeSerializeFns: ssrContext ? ssrContext.beforeSerializeFns : undefined,
    ssrContext
  })

  function inject(key, value) {
    if (!key) {
      throw new Error('inject(key, value) has no key provided')
    }
    if (value === undefined) {
      throw new Error(`inject('${key}', value) has no value provided`)
    }

    key = '$' + key
    // Add into app
    app[key] = value
    // Add into context
    if (!app.context[key]) {
      app.context[key] = value
    }

    // Add into store
    store[key] = app[key]

    // Check if plugin not already installed
    const installKey = '__nuxt_' + key + '_installed__'
    if (Vue[installKey]) {
      return
    }
    Vue[installKey] = true
    // Call Vue.use() to install the plugin into vm
    Vue.use(() => {
      if (!Object.prototype.hasOwnProperty.call(Vue.prototype, key)) {
        Object.defineProperty(Vue.prototype, key, {
          get () {
            return this.$root.$options[key]
          }
        })
      }
    })
  }

  // Inject runtime config as $config
  inject('config', config)

  if (process.client) {
    // Replace store state before plugins execution
    if (window.__NUXT__ && window.__NUXT__.state) {
      store.replaceState(window.__NUXT__.state)
    }
  }

  // Add enablePreview(previewData = {}) in context for plugins
  if (process.static && process.client) {
    app.context.enablePreview = function (previewData = {}) {
      app.previewData = Object.assign({}, previewData)
      inject('preview', previewData)
    }
  }
  // Plugin execution

  if (typeof nuxt_plugin_plugin_3a8c7170 === 'function') {
    await nuxt_plugin_plugin_3a8c7170(app.context, inject)
  }

  if (process.server && typeof nuxt_plugin_sentryserver_3d5a5376 === 'function') {
    await nuxt_plugin_sentryserver_3d5a5376(app.context, inject)
  }

  if (process.client && typeof nuxt_plugin_sentryclient_50be3c24 === 'function') {
    await nuxt_plugin_sentryclient_50be3c24(app.context, inject)
  }

  if (typeof nuxt_plugin_recaptcha_53a41a82 === 'function') {
    await nuxt_plugin_recaptcha_53a41a82(app.context, inject)
  }

  if (typeof nuxt_plugin_portalvue_6d1ce2a0 === 'function') {
    await nuxt_plugin_portalvue_6d1ce2a0(app.context, inject)
  }

  if (typeof nuxt_plugin_cookieuniversalnuxt_f3ceb18a === 'function') {
    await nuxt_plugin_cookieuniversalnuxt_f3ceb18a(app.context, inject)
  }

  if (process.client && typeof nuxt_plugin_libpluginMock34a50b8c_8a7277e2 === 'function') {
    await nuxt_plugin_libpluginMock34a50b8c_8a7277e2(app.context, inject)
  }

  if (typeof nuxt_plugin_axios_e762e4da === 'function') {
    await nuxt_plugin_axios_e762e4da(app.context, inject)
  }

  if (typeof nuxt_plugin_image_77558a8e === 'function') {
    await nuxt_plugin_image_77558a8e(app.context, inject)
  }

  if (typeof nuxt_plugin_datefns_a349414e === 'function') {
    await nuxt_plugin_datefns_a349414e(app.context, inject)
  }

  if (typeof nuxt_plugin_deviceplugin_4754e21e === 'function') {
    await nuxt_plugin_deviceplugin_4754e21e(app.context, inject)
  }

  if (process.client && typeof nuxt_plugin_googleanalytics_245ebe9a === 'function') {
    await nuxt_plugin_googleanalytics_245ebe9a(app.context, inject)
  }

  if (typeof nuxt_plugin_nuxtsvgsprite_acea661e === 'function') {
    await nuxt_plugin_nuxtsvgsprite_acea661e(app.context, inject)
  }

  if (typeof nuxt_plugin_nuxtinstance_f8718624 === 'function') {
    await nuxt_plugin_nuxtinstance_f8718624(app.context, inject)
  }

  if (typeof nuxt_plugin_directives_521c0486 === 'function') {
    await nuxt_plugin_directives_521c0486(app.context, inject)
  }

  if (process.server && typeof nuxt_plugin_vuenotificationssr_35e856ca === 'function') {
    await nuxt_plugin_vuenotificationssr_35e856ca(app.context, inject)
  }

  if (process.client && typeof nuxt_plugin_vuenotificationclient_a1ced7f2 === 'function') {
    await nuxt_plugin_vuenotificationclient_a1ced7f2(app.context, inject)
  }

  if (process.client && typeof nuxt_plugin_yandexsmartcaptcha_cfd52e40 === 'function') {
    await nuxt_plugin_yandexsmartcaptcha_cfd52e40(app.context, inject)
  }

  if (process.client && typeof nuxt_plugin_vueawesomeswiper_4af85e3f === 'function') {
    await nuxt_plugin_vueawesomeswiper_4af85e3f(app.context, inject)
  }

  if (typeof nuxt_plugin_axios_5659d192 === 'function') {
    await nuxt_plugin_axios_5659d192(app.context, inject)
  }

  if (typeof nuxt_plugin_common_17412d76 === 'function') {
    await nuxt_plugin_common_17412d76(app.context, inject)
  }

  if (process.client && typeof nuxt_plugin_vuexpersist_13f465a2 === 'function') {
    await nuxt_plugin_vuexpersist_13f465a2(app.context, inject)
  }

  if (process.client && typeof nuxt_plugin_vue2touchevents_147d6945 === 'function') {
    await nuxt_plugin_vue2touchevents_147d6945(app.context, inject)
  }

  if (process.client && typeof nuxt_plugin_websocketclient_7138b4a2 === 'function') {
    await nuxt_plugin_websocketclient_7138b4a2(app.context, inject)
  }

  if (typeof nuxt_plugin_pushnotifications_1a8315e2 === 'function') {
    await nuxt_plugin_pushnotifications_1a8315e2(app.context, inject)
  }

  if (typeof nuxt_plugin_vuemask_08817de4 === 'function') {
    await nuxt_plugin_vuemask_08817de4(app.context, inject)
  }

  if (typeof nuxt_plugin_errorhandler_7194ca70 === 'function') {
    await nuxt_plugin_errorhandler_7194ca70(app.context, inject)
  }

  if (process.client && typeof nuxt_plugin_firebase_34d6f55a === 'function') {
    await nuxt_plugin_firebase_34d6f55a(app.context, inject)
  }

  if (process.client && typeof nuxt_plugin_zonedelivery_73ed2c58 === 'function') {
    await nuxt_plugin_zonedelivery_73ed2c58(app.context, inject)
  }

  if (typeof nuxt_plugin_ipx_5cf6d9c8 === 'function') {
    await nuxt_plugin_ipx_5cf6d9c8(app.context, inject)
  }

  if (process.server && typeof nuxt_plugin_terminalinitserver_78e6109e === 'function') {
    await nuxt_plugin_terminalinitserver_78e6109e(app.context, inject)
  }

  if (process.client && typeof nuxt_plugin_terminalinitclient_5dd38629 === 'function') {
    await nuxt_plugin_terminalinitclient_5dd38629(app.context, inject)
  }

  if (process.client && typeof nuxt_plugin_libnuxtclientinitpluginclientf204d5ec_e1609976 === 'function') {
    await nuxt_plugin_libnuxtclientinitpluginclientf204d5ec_e1609976(app.context, inject)
  }

  // Lock enablePreview in context
  if (process.static && process.client) {
    app.context.enablePreview = function () {
      console.warn('You cannot call enablePreview() outside a plugin.')
    }
  }

  // Wait for async component to be resolved first
  await new Promise((resolve, reject) => {
    // Ignore 404s rather than blindly replacing URL in browser
    if (process.client) {
      const { route } = router.resolve(app.context.route.fullPath)
      if (!route.matched.length) {
        return resolve()
      }
    }
    router.replace(app.context.route.fullPath, resolve, (err) => {
      // https://github.com/vuejs/vue-router/blob/v3.4.3/src/util/errors.js
      if (!err._isRouter) return reject(err)
      if (err.type !== 2 /* NavigationFailureType.redirected */) return resolve()

      // navigated to a different route in router guard
      const unregister = router.afterEach(async (to, from) => {
        if (process.server && ssrContext && ssrContext.url) {
          ssrContext.url = to.fullPath
        }
        app.context.route = await getRouteData(to)
        app.context.params = to.params || {}
        app.context.query = to.query || {}
        unregister()
        resolve()
      })
    })
  })

  return {
    store,
    app,
    router
  }
}

export { createApp, NuxtError }
