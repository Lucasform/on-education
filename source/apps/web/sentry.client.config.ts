import * as Sentry from '@sentry/nextjs';

const DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ||
  'https://2f184ed2de302069d4b574cab0584ccc@o4511621755109376.ingest.de.sentry.io/4511637443969104';

Sentry.init({
  dsn: DSN,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
  // Session Replay desligado por ora (custo e privacidade de menores). Ligar depois se quiser.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  sendDefaultPii: false,
});
