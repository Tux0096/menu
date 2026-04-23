const apiMethods = ["VueIntegration","attachErrorHandler","createTracingMixins","init","vueRouterInstrumentation","attachErrorHandler","createTracingMixins","VueIntegration","FunctionToString","Hub","InboundFilters","ModuleMetadata","Scope","addBreadcrumb","addGlobalEventProcessor","addIntegration","addTracingExtensions","captureEvent","captureException","captureMessage","close","configureScope","continueTrace","createTransport","extractTraceparentData","flush","getActiveSpan","getActiveTransaction","getCurrentHub","getHubFromCarrier","lastEventId","makeMain","makeMultiplexedTransport","setContext","setExtra","setExtras","setMeasurement","setTag","setTags","setUser","spanStatusfromHttpCode","startInactiveSpan","startSpan","startSpanManual","startTransaction","trace","withScope","BrowserClient","makeFetchTransport","makeXHRTransport","defaultStackParser","eventFromException","eventFromMessage","exceptionFromError","createUserFeedbackEnvelope","captureUserFeedback","forceLoad","onLoad","showReportDialog","wrap","Replay","BrowserTracing","instrumentOutgoingRequests","makeBrowserOfflineTransport","onProfilingStartRouteTransaction","BrowserProfilingIntegration","GlobalHandlers","TryCatch","Breadcrumbs","LinkedErrors","HttpContext","Dedupe","init","vueRouterInstrumentation"]

/** @type {import('@nuxt/types').Plugin} */
export default function (ctx, inject) {
  const SentryMock = {}
  apiMethods.forEach(key => {
    SentryMock[key] = (...args) => console.warn(`$sentry.${key}() called, but Sentry plugin is disabled. Arguments:`, args)
  })

  // Inject mocked sentry to the context as $sentry (this is used in case sentry is disabled)
  inject('sentry', SentryMock)
  ctx.$sentry = SentryMock
}
