import Vue from 'vue'
import Router from 'vue-router'
import { normalizeURL, decode } from 'ufo'
import { interopDefault } from './utils'
import scrollBehavior from './router.scrollBehavior.js'

const _5b4be908 = () => interopDefault(import('..\\node_modules\\@nuxtjs\\svg-sprite\\dist\\runtime\\components\\icons-list.vue' /* webpackChunkName: "" */))
const _78e58288 = () => interopDefault(import('..\\pages\\about.vue' /* webpackChunkName: "pages/about" */))
const _4e94d76d = () => interopDefault(import('..\\pages\\advent.vue' /* webpackChunkName: "pages/advent" */))
const _3841a4d1 = () => interopDefault(import('..\\pages\\advent-2025\\index.vue' /* webpackChunkName: "pages/advent-2025/index" */))
const _ea240b16 = () => interopDefault(import('..\\pages\\cart.vue' /* webpackChunkName: "pages/cart" */))
const _223021ae = () => interopDefault(import('..\\pages\\catalog\\index.vue' /* webpackChunkName: "pages/catalog/index" */))
const _3712a31b = () => interopDefault(import('..\\pages\\checkout.vue' /* webpackChunkName: "pages/checkout" */))
const _711954e4 = () => interopDefault(import('..\\pages\\complete.vue' /* webpackChunkName: "pages/complete" */))
const _5d943589 = () => interopDefault(import('..\\pages\\complete-error.vue' /* webpackChunkName: "pages/complete-error" */))
const _08896ac9 = () => interopDefault(import('..\\pages\\delivery.vue' /* webpackChunkName: "pages/delivery" */))
const _0043a9c5 = () => interopDefault(import('..\\pages\\happy-hours\\index.vue' /* webpackChunkName: "pages/happy-hours/index" */))
const _45b64bb4 = () => interopDefault(import('..\\pages\\legal.vue' /* webpackChunkName: "pages/legal" */))
const _28918113 = () => interopDefault(import('..\\pages\\legal-information.vue' /* webpackChunkName: "pages/legal-information" */))
const _22f1036c = () => interopDefault(import('..\\pages\\loyalty-program\\index.vue' /* webpackChunkName: "pages/loyalty-program/index" */))
const _7a2f74ce = () => interopDefault(import('..\\pages\\menu\\index.vue' /* webpackChunkName: "pages/menu/index" */))
const _26d742e1 = () => interopDefault(import('..\\pages\\new-year-promo.vue' /* webpackChunkName: "pages/new-year-promo" */))
const _2260b008 = () => interopDefault(import('..\\pages\\oferta\\index.vue' /* webpackChunkName: "pages/oferta/index" */))
const _62c7b3cd = () => interopDefault(import('..\\pages\\personal\\index.vue' /* webpackChunkName: "pages/personal/index" */))
const _70e89e38 = () => interopDefault(import('..\\pages\\promo\\index.vue' /* webpackChunkName: "pages/promo/index" */))
const _6a6957f4 = () => interopDefault(import('..\\pages\\push-notifications-rules.vue' /* webpackChunkName: "pages/push-notifications-rules" */))
const _b3d29b58 = () => interopDefault(import('..\\pages\\receive-advertising-information.vue' /* webpackChunkName: "pages/receive-advertising-information" */))
const _99619b5c = () => interopDefault(import('..\\pages\\restaurant.vue' /* webpackChunkName: "pages/restaurant" */))
const _8fe86f5e = () => interopDefault(import('..\\pages\\rule.vue' /* webpackChunkName: "pages/rule" */))
const _34e18a11 = () => interopDefault(import('..\\pages\\terminal\\index.vue' /* webpackChunkName: "pages/terminal/index" */))
const _a604bcc6 = () => interopDefault(import('..\\pages\\user-agreement.vue' /* webpackChunkName: "pages/user-agreement" */))
const _644ac9d4 = () => interopDefault(import('..\\pages\\vacancies.vue' /* webpackChunkName: "pages/vacancies" */))
const _354ad990 = () => interopDefault(import('..\\pages\\advent-2025\\legal.vue' /* webpackChunkName: "pages/advent-2025/legal" */))
const _60da2508 = () => interopDefault(import('..\\pages\\catalog\\search.vue' /* webpackChunkName: "pages/catalog/search" */))
const _33793f7d = () => interopDefault(import('..\\pages\\loyalty-program\\app-1.vue' /* webpackChunkName: "pages/loyalty-program/app-1" */))
const _33c1692f = () => interopDefault(import('..\\pages\\oferta\\app-1.vue' /* webpackChunkName: "pages/oferta/app-1" */))
const _6c72f92f = () => interopDefault(import('..\\pages\\personal\\address.vue' /* webpackChunkName: "pages/personal/address" */))
const _341f1df1 = () => interopDefault(import('..\\pages\\personal\\favorite.vue' /* webpackChunkName: "pages/personal/favorite" */))
const _58f41c62 = () => interopDefault(import('..\\pages\\personal\\history.vue' /* webpackChunkName: "pages/personal/history" */))
const _2297f4c6 = () => interopDefault(import('..\\pages\\personal\\promotions\\index.vue' /* webpackChunkName: "pages/personal/promotions/index" */))
const _2a61b59e = () => interopDefault(import('..\\pages\\terminal\\cart.vue' /* webpackChunkName: "pages/terminal/cart" */))
const _adee7b6c = () => interopDefault(import('..\\pages\\terminal\\complete.vue' /* webpackChunkName: "pages/terminal/complete" */))
const _cec54566 = () => interopDefault(import('..\\pages\\index.vue' /* webpackChunkName: "pages/index" */))
const _6fd0cb45 = () => interopDefault(import('..\\pages\\personal\\promotions\\_id.vue' /* webpackChunkName: "pages/personal/promotions/_id" */))
const _79cab7c8 = () => interopDefault(import('..\\pages\\catalog\\_section\\index.vue' /* webpackChunkName: "pages/catalog/_section/index" */))
const _ea98c388 = () => interopDefault(import('..\\pages\\menu\\_slug\\index.vue' /* webpackChunkName: "pages/menu/_slug/index" */))
const _2fa45fa6 = () => interopDefault(import('..\\pages\\menu\\_slug\\cart.vue' /* webpackChunkName: "pages/menu/_slug/cart" */))
const _2cb25480 = () => interopDefault(import('..\\pages\\catalog\\_section\\_product_id.vue' /* webpackChunkName: "pages/catalog/_section/_product_id" */))
const _2d8a4d35 = () => interopDefault(import('..\\pages\\index' /* webpackChunkName: "" */))
const _bd121088 = () => interopDefault(import('..\\pages\\catalog' /* webpackChunkName: "" */))
const _53156638 = () => interopDefault(import('..\\pages\\catalog\\search' /* webpackChunkName: "" */))
const _4945a43c = () => interopDefault(import('..\\pages\\catalog\\_section' /* webpackChunkName: "" */))
const _6b6e5430 = () => interopDefault(import('..\\pages\\catalog\\_section\\_product_id' /* webpackChunkName: "" */))
const _2d1447f0 = () => interopDefault(import('..\\pages\\about' /* webpackChunkName: "" */))
const _2db0871c = () => interopDefault(import('..\\pages\\legal' /* webpackChunkName: "" */))
const _4bc7be5d = () => interopDefault(import('..\\pages\\cart' /* webpackChunkName: "" */))
const _3392abfa = () => interopDefault(import('..\\pages\\checkout' /* webpackChunkName: "" */))
const _66e08df6 = () => interopDefault(import('..\\pages\\complete' /* webpackChunkName: "" */))
const _9562b91e = () => interopDefault(import('..\\pages\\complete-error' /* webpackChunkName: "" */))
const _889f0e9e = () => interopDefault(import('..\\pages\\delivery' /* webpackChunkName: "" */))
const _30dd268c = () => interopDefault(import('..\\pages\\restaurant' /* webpackChunkName: "" */))
const _c50dd588 = () => interopDefault(import('..\\pages\\vacancies' /* webpackChunkName: "" */))
const _2deeed72 = () => interopDefault(import('..\\pages\\promo' /* webpackChunkName: "" */))
const _4bceda39 = () => interopDefault(import('..\\pages\\rule' /* webpackChunkName: "" */))
const _240343fb = () => interopDefault(import('..\\pages\\legal-information' /* webpackChunkName: "" */))
const _b5f4fa06 = () => interopDefault(import('..\\pages\\personal' /* webpackChunkName: "" */))
const _41bd2a17 = () => interopDefault(import('..\\pages\\personal\\address' /* webpackChunkName: "" */))
const _7d2dffd9 = () => interopDefault(import('..\\pages\\personal\\favorite' /* webpackChunkName: "" */))
const _85351a92 = () => interopDefault(import('..\\pages\\personal\\history' /* webpackChunkName: "" */))
const _27589948 = () => interopDefault(import('..\\pages\\push-notifications-rules' /* webpackChunkName: "" */))
const _4e8d3dbc = () => interopDefault(import('..\\pages\\receive-advertising-information' /* webpackChunkName: "" */))
const _e4e753a4 = () => interopDefault(import('..\\pages\\oferta' /* webpackChunkName: "" */))
const _51c39a17 = () => interopDefault(import('..\\pages\\oferta\\app-1' /* webpackChunkName: "" */))
const _429b64a0 = () => interopDefault(import('..\\pages\\loyalty-program' /* webpackChunkName: "" */))
const _308ec765 = () => interopDefault(import('..\\pages\\loyalty-program\\app-1' /* webpackChunkName: "" */))
const _d24d8cf6 = () => interopDefault(import('..\\pages\\user-agreement' /* webpackChunkName: "" */))
const _5fc3c66e = () => interopDefault(import('..\\pages\\new-year-promo' /* webpackChunkName: "" */))
const _7593d755 = () => interopDefault(import('..\\pages\\advent' /* webpackChunkName: "" */))
const _f330cff6 = () => interopDefault(import('..\\pages\\happy-hours' /* webpackChunkName: "" */))
const _079a332d = () => interopDefault(import('..\\pages\\personal\\promotions' /* webpackChunkName: "" */))
const _01d3772d = () => interopDefault(import('..\\pages\\personal\\promotions\\_id' /* webpackChunkName: "" */))

const emptyFn = () => {}

Vue.use(Router)

export const routerOptions = {
  mode: 'history',
  base: '/',
  linkActiveClass: 'nuxt-link-active',
  linkExactActiveClass: 'nuxt-link-exact-active',
  scrollBehavior,

  routes: [{
    path: "/_icons",
    component: _5b4be908,
    name: "icons-list"
  }, {
    path: "/about",
    component: _78e58288,
    name: "about"
  }, {
    path: "/advent",
    component: _4e94d76d,
    name: "advent"
  }, {
    path: "/advent-2025",
    component: _3841a4d1,
    name: "advent-2025"
  }, {
    path: "/cart",
    component: _ea240b16,
    name: "cart"
  }, {
    path: "/catalog",
    component: _223021ae,
    name: "catalog"
  }, {
    path: "/checkout",
    component: _3712a31b,
    name: "checkout"
  }, {
    path: "/complete",
    component: _711954e4,
    name: "complete"
  }, {
    path: "/complete-error",
    component: _5d943589,
    name: "complete-error"
  }, {
    path: "/delivery",
    component: _08896ac9,
    name: "delivery"
  }, {
    path: "/happy-hours",
    component: _0043a9c5,
    name: "happy-hours"
  }, {
    path: "/legal",
    component: _45b64bb4,
    name: "legal"
  }, {
    path: "/legal-information",
    component: _28918113,
    name: "legal-information"
  }, {
    path: "/loyalty-program",
    component: _22f1036c,
    name: "loyalty-program"
  }, {
    path: "/menu",
    component: _7a2f74ce,
    name: "menu"
  }, {
    path: "/new-year-promo",
    component: _26d742e1,
    name: "new-year-promo"
  }, {
    path: "/oferta",
    component: _2260b008,
    name: "oferta"
  }, {
    path: "/personal",
    component: _62c7b3cd,
    name: "personal"
  }, {
    path: "/promo",
    component: _70e89e38,
    name: "promo"
  }, {
    path: "/push-notifications-rules",
    component: _6a6957f4,
    name: "push-notifications-rules"
  }, {
    path: "/receive-advertising-information",
    component: _b3d29b58,
    name: "receive-advertising-information"
  }, {
    path: "/restaurant",
    component: _99619b5c,
    name: "restaurant"
  }, {
    path: "/rule",
    component: _8fe86f5e,
    name: "rule"
  }, {
    path: "/terminal",
    component: _34e18a11,
    name: "terminal"
  }, {
    path: "/user-agreement",
    component: _a604bcc6,
    name: "user-agreement"
  }, {
    path: "/vacancies",
    component: _644ac9d4,
    name: "vacancies"
  }, {
    path: "/advent-2025/legal",
    component: _354ad990,
    name: "advent-2025-legal"
  }, {
    path: "/catalog/search",
    component: _60da2508,
    name: "catalog-search"
  }, {
    path: "/loyalty-program/app-1",
    component: _33793f7d,
    name: "loyalty-program-app-1"
  }, {
    path: "/oferta/app-1",
    component: _33c1692f,
    name: "oferta-app-1"
  }, {
    path: "/personal/address",
    component: _6c72f92f,
    name: "personal-address"
  }, {
    path: "/personal/favorite",
    component: _341f1df1,
    name: "personal-favorite"
  }, {
    path: "/personal/history",
    component: _58f41c62,
    name: "personal-history"
  }, {
    path: "/personal/promotions",
    component: _2297f4c6,
    name: "personal-promotions"
  }, {
    path: "/terminal/cart",
    component: _2a61b59e,
    name: "terminal-cart"
  }, {
    path: "/terminal/complete",
    component: _adee7b6c,
    name: "terminal-complete"
  }, {
    path: "/",
    component: _cec54566,
    name: "index"
  }, {
    path: "/personal/promotions/:id",
    component: _6fd0cb45,
    name: "personal-promotions-id"
  }, {
    path: "/catalog/:section",
    component: _79cab7c8,
    name: "catalog-section"
  }, {
    path: "/menu/:slug",
    component: _ea98c388,
    name: "menu-slug"
  }, {
    path: "/menu/:slug/cart",
    component: _2fa45fa6,
    name: "menu-slug-cart"
  }, {
    path: "/catalog/:section/:product_id",
    component: _2cb25480,
    name: "catalog-section-product_id"
  }, {
    path: "/terminal",
    component: _34e18a11,
    meta: {"layout":"terminal"},
    name: "terminal"
  }, {
    path: "/:city/terminal",
    component: _34e18a11,
    meta: {"layout":"terminal"},
    name: "terminal-city"
  }, {
    path: "/terminal/cart",
    component: _2a61b59e,
    meta: {"layout":"terminal"},
    name: "terminal-cart"
  }, {
    path: "/:city/terminal/cart",
    component: _2a61b59e,
    meta: {"layout":"terminal"},
    name: "terminal-city-cart"
  }, {
    path: "/terminal/complete",
    component: _adee7b6c,
    meta: {"layout":"terminal"},
    name: "terminal-complete"
  }, {
    path: "/:city/terminal/complete",
    component: _adee7b6c,
    meta: {"layout":"terminal"},
    name: "terminal-city-complete"
  }, {
    path: "/menu",
    component: _7a2f74ce,
    meta: {"layout":"menu-select"},
    name: "menu-index"
  }, {
    path: "/menu/:slug",
    component: _ea98c388,
    meta: {"layout":"menu"},
    name: "menu-restaurant"
  }, {
    path: "/menu/:slug/cart",
    component: _2fa45fa6,
    meta: {"layout":"menu"},
    name: "menu-restaurant-cart"
  }, {
    path: "/:city",
    component: _2d8a4d35,
    name: "city-index"
  }, {
    path: "/:city/catalog",
    component: _bd121088,
    name: "city-catalog"
  }, {
    path: "/:city/catalog/search",
    component: _53156638,
    name: "city-catalog-search"
  }, {
    path: "/:city/catalog/:section",
    component: _4945a43c,
    name: "city-catalog-section"
  }, {
    path: "/:city/catalog/:section_id/:product_id",
    component: _6b6e5430,
    name: "city-catalog-detail-product"
  }, {
    path: "/:city/about",
    component: _2d1447f0,
    name: "city-about"
  }, {
    path: "/:city/legal",
    component: _2db0871c,
    name: "city-legal"
  }, {
    path: "/:city/cart",
    component: _4bc7be5d,
    name: "city-cart"
  }, {
    path: "/:city/checkout",
    component: _3392abfa,
    name: "city-checkout"
  }, {
    path: "/:city/complete",
    component: _66e08df6,
    name: "city-complete"
  }, {
    path: "/:city/complete-error",
    component: _9562b91e,
    name: "city-complete-error"
  }, {
    path: "/:city/delivery",
    component: _889f0e9e,
    alias: "/delivery",
    name: "city-delivery"
  }, {
    path: "/:city/restaurant",
    component: _30dd268c,
    alias: "/restaurant",
    name: "city-restaurant"
  }, {
    path: "/:city/vacancies",
    component: _c50dd588,
    alias: "/vacancies",
    name: "city-vacancies"
  }, {
    path: "/:city/promo",
    component: _2deeed72,
    name: "city-promo"
  }, {
    path: "/:city/rule",
    component: _4bceda39,
    name: "city-rule"
  }, {
    path: "/:city/legal-information",
    component: _240343fb,
    name: "city-legal-information"
  }, {
    path: "/:city/personal",
    component: _b5f4fa06,
    name: "city-personal"
  }, {
    path: "/:city/personal/address",
    component: _41bd2a17,
    name: "city-personal-address"
  }, {
    path: "/:city/personal/favorite",
    component: _7d2dffd9,
    name: "city-personal-favorite"
  }, {
    path: "/:city/personal/history",
    component: _85351a92,
    name: "city-personal-history"
  }, {
    path: "/:city/push-notifications-rules",
    component: _27589948,
    name: "city-push-notifications-rules"
  }, {
    path: "/:city/receive-advertising-information",
    component: _4e8d3dbc,
    name: "city-receive-advertising-information"
  }, {
    path: "/:city/oferta",
    component: _e4e753a4,
    name: "city-oferta"
  }, {
    path: "/:city/oferta/app-1",
    component: _51c39a17,
    name: "city-oferta-app-1"
  }, {
    path: "/:city/loyalty-program",
    component: _429b64a0,
    name: "city-loyalty-program"
  }, {
    path: "/:city/loyalty-program/app-1",
    component: _308ec765,
    name: "city-loyalty-program-app-1"
  }, {
    path: "/:city/user-agreement",
    component: _d24d8cf6,
    name: "city-user-agreement"
  }, {
    path: "/:city/new-year-promo",
    component: _5fc3c66e,
    name: "new-year-promo"
  }, {
    path: "/:city/advent",
    component: _7593d755,
    name: "fm-promos"
  }, {
    path: "/:city/happy-hours",
    component: _f330cff6,
    name: "happy-hours"
  }, {
    path: "/:city/personal/promotions",
    component: _079a332d,
    name: "promotions"
  }, {
    path: "/:city/personal/promotions/:id",
    component: _01d3772d,
    name: "promotions-detail"
  }, {
    path: "/:city/advent-2025",
    component: _3841a4d1,
    name: "advent-2025"
  }, {
    path: "/:city/advent-2025/legal",
    component: _354ad990,
    name: "advent-2025-legal"
  }],

  fallback: false
}

export function createRouter (ssrContext, config) {
  const base = (config._app && config._app.basePath) || routerOptions.base
  const router = new Router({ ...routerOptions, base  })

  // TODO: remove in Nuxt 3
  const originalPush = router.push
  router.push = function push (location, onComplete = emptyFn, onAbort) {
    return originalPush.call(this, location, onComplete, onAbort)
  }

  const resolve = router.resolve.bind(router)
  router.resolve = (to, current, append) => {
    if (typeof to === 'string') {
      to = normalizeURL(to)
    }
    return resolve(to, current, append)
  }

  return router
}
