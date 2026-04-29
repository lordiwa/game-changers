/*
 * Server-side Sentry initialization for Cloud Functions. Mirrors the PWA scrubber
 * (apps/pwa/src/composables/useSentryScrub.ts) so the same PII regex applies on both
 * sides of the wire.
 *
 * Threat: T-02-01-03 (Sentry breadcrumbs leaking health data + emails).
 *
 * Each functions/<codebase>/src/sentry-init.ts imports `initSentry` from this module
 * once at codebase boot. DSN comes from a single Functions config secret SENTRY_DSN_FUNCTIONS.
 */
import * as Sentry from '@sentry/node';

const PII_REGEX = /password|email|phone|address|birth|discord_?id|health|metric|value|hr|steps|sleep|consent_text/i;

export function scrubPII(obj: unknown, depth = 0): unknown {
  if (depth > 5 || obj == null) return obj;
  if (Array.isArray(obj)) return obj.map((v) => scrubPII(v, depth + 1));
  if (typeof obj !== 'object') return obj;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj as Record<string, unknown>)) {
    out[k] = PII_REGEX.test(k)
      ? '[redacted]'
      : scrubPII((obj as Record<string, unknown>)[k], depth + 1);
  }
  return out;
}

export function makeBeforeSend(): (event: Sentry.ErrorEvent) => Sentry.ErrorEvent | null {
  return (event) => {
    const e = event as unknown as Record<string, unknown>;
    if (e['extra']) e['extra'] = scrubPII(e['extra']);
    if (e['user']) e['user'] = scrubPII(e['user']);
    if (e['contexts']) e['contexts'] = scrubPII(e['contexts']);
    return event;
  };
}

let initialized = false;

export function initSentry(serviceName: string): void {
  if (initialized) return;
  const dsn = process.env['SENTRY_DSN_FUNCTIONS'];
  if (!dsn) return; // soft-fail: no DSN means we run without Sentry rather than crash.
  Sentry.init({
    dsn,
    serverName: serviceName,
    tracesSampleRate: 0,
    beforeSend: makeBeforeSend(),
  });
  initialized = true;
}
