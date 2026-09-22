// Sentry helpers shared between sentry.client.config.ts and sentry.server.config.ts.
// `shouldInitSentry` gates whether Sentry.init runs — with no DSN (or a placeholder),
// the integration loads but never connects.

const PII_KEYS = [
  'email',
  'phone',
  'pincode',
  'line1',
  'line2',
  'name',
  'address',
];

function stripKeys(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const next: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (PII_KEYS.includes(k)) continue;
    next[k] = typeof v === 'object' && v !== null ? stripKeys(v) : v;
  }
  return next;
}

export function scrubPii(event: any): any {
  if (event?.request?.data) {
    event.request.data = stripKeys(event.request.data);
  }
  if (event?.contexts) {
    event.contexts = stripKeys(event.contexts);
  }
  if (Array.isArray(event?.breadcrumbs)) {
    event.breadcrumbs = event.breadcrumbs.map((b: any) =>
      b?.data ? { ...b, data: stripKeys(b.data) } : b,
    );
  }
  return event;
}

const QUERY_PII = ['email', 'phone', 'otp'];

export function scrubTransaction(txn: any): any {
  const url: string | undefined = txn?.request?.url;
  if (typeof url === 'string') {
    let next = url;
    for (const key of QUERY_PII) {
      const re = new RegExp(`([?&])${key}=[^&]*`, 'g');
      next = next.replace(re, `$1${key}=REDACTED`);
    }
    txn.request.url = next;
  }
  return txn;
}

export function shouldInitSentry(dsn: string | undefined): boolean {
  if (!dsn) return false;
  if (dsn.startsWith('placeholder')) return false;
  return true;
}
