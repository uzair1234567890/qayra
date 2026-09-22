import * as Sentry from '@sentry/astro';
import { scrubPii, scrubTransaction, shouldInitSentry } from './src/lib/sentry';

const dsn = process.env.PUBLIC_SENTRY_DSN;

if (shouldInitSentry(dsn)) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'production',
    tracesSampleRate: 0.1,
    beforeSend: scrubPii,
    beforeSendTransaction: scrubTransaction,
  });
}
