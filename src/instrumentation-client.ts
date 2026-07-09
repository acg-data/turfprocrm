/**
 * Client-side Sentry. Loaded lazily and only when NEXT_PUBLIC_SENTRY_DSN is
 * set, so the SDK stays out of the critical path in unconfigured environments.
 */
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
    });
  });
}

export {};
