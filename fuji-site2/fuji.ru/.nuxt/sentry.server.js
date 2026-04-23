/** @type {import('@nuxt/types').Module} */
export default function (ctx, inject) {
  const sentry = process.sentry || null
  if (!sentry) {
    return
  }
  inject('sentry', sentry)
  ctx.$sentry = sentry
}
