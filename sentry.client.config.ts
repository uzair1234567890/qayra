import * as Sentry from '@sentry/astro';
import { scrubPii, scrubTransaction, shouldInitSentry } from './src/lib/sentry';

const dsn = import.meta.env.PUBLIC_SENTRY_DSN;

if (shouldInitSentry(dsn)) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    beforeSend: scrubPii,
    beforeSendTransaction: scrubTransaction,
  });
}
