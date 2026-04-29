/*
 * Sentry beforeSend scrubber. Redacts any property whose key matches PII_REGEX
 * to '[redacted]' before the event leaves the device.
 *
 * Threat: T-02-01-03 (Sentry breadcrumbs leaking health data + emails).
 * Mitigation: ASVS V7 — sensitive data must not appear in error reports.
 */
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

// Returns a Sentry beforeSend handler. Typed loosely (any) because @sentry/vue
// event shape varies across SDK versions; the scrubber only cares about extra/user/contexts.
export function makeBeforeSend(): (event: any) => any {
  return (event: any) => {
    if (event.extra) event.extra = scrubPII(event.extra) as Record<string, unknown>;
    if (event.user) event.user = scrubPII(event.user) as Record<string, unknown>;
    if (event.contexts) event.contexts = scrubPII(event.contexts) as Record<string, unknown>;
    return event;
  };
}
