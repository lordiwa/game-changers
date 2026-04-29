import posthog from 'posthog-js';

/*
 * PostHog client — initialized but opt-out by default.
 * Plan 04 calls usePosthog().optIn() ONLY after basic_profile consent grant.
 *
 * Threat: T-02-01-02 (PostHog autocapture leaking PII before consent).
 * Mitigation: opt_out_capturing_by_default + autocapture: false.
 */
let initialized = false;

export function usePosthog() {
  if (!initialized && typeof window !== 'undefined') {
    const key = import.meta.env.VITE_POSTHOG_KEY;
    const host = import.meta.env.VITE_POSTHOG_HOST;
    if (key && host) {
      posthog.init(key, {
        api_host: host,
        persistence: 'memory',
        autocapture: false,
        capture_pageview: false,
        opt_out_capturing_by_default: true,
      });
    }
    initialized = true;
  }
  return {
    optIn: () => posthog.opt_in_capturing(),
    optOut: () => posthog.opt_out_capturing(),
    hasOptedIn: () => posthog.has_opted_in_capturing(),
    capture: (event: string, props?: Record<string, unknown>) => posthog.capture(event, props),
  };
}

// Test-only: reset module state between tests so init can be re-asserted.
export function __resetPosthogForTests() {
  initialized = false;
}
