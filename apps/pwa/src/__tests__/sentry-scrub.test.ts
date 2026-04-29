/*
 * Proves the Sentry beforeSend scrubber redacts every PII field.
 * Mitigates T-02-01-03 (Sentry breadcrumbs leaking health data + emails).
 */
import { describe, it, expect } from 'vitest';
import { makeBeforeSend, scrubPII } from '../composables/useSentryScrub';

describe('Sentry PII scrubber', () => {
  it('redacts top-level PII keys to "[redacted]"', () => {
    const input = {
      extra: {
        user: {
          email: 'foo@bar.com',
          discordId: '12345',
          health: { hr: 60, steps: 8000 },
          displayName: 'PlayerOne',
        },
      },
    };
    const out = makeBeforeSend()(structuredClone(input));
    const user = (out.extra as { user: Record<string, unknown> }).user;
    expect(user.email).toBe('[redacted]');
    expect(user.discordId).toBe('[redacted]');
    expect(user.health).toBe('[redacted]');
    // Non-PII fields preserved.
    expect(user.displayName).toBe('PlayerOne');
  });

  it('recurses into nested objects', () => {
    const input = {
      extra: {
        path: {
          a: {
            b: { hr: 70, otherKey: 'safe' },
          },
        },
      },
    };
    const out = makeBeforeSend()(structuredClone(input));
    const b = (
      (out.extra as { path: { a: { b: Record<string, unknown> } } }).path.a.b
    );
    expect(b.hr).toBe('[redacted]');
    expect(b.otherKey).toBe('safe');
  });

  it('scrubs arrays of objects', () => {
    const arr = [{ email: 'a@b.com', name: 'x' }, { email: 'c@d.com', name: 'y' }];
    const out = scrubPII(arr) as { email: string; name: string }[];
    expect(out[0]?.email).toBe('[redacted]');
    expect(out[0]?.name).toBe('x');
    expect(out[1]?.email).toBe('[redacted]');
  });

  it('handles null and primitives without throwing', () => {
    expect(scrubPII(null)).toBeNull();
    expect(scrubPII(42)).toBe(42);
    expect(scrubPII('hello')).toBe('hello');
  });

  it('caps recursion at depth 5', () => {
    let x: unknown = { hr: 1 };
    for (let i = 0; i < 10; i += 1) x = { nested: x };
    // Should not throw or stack overflow.
    expect(() => scrubPII(x)).not.toThrow();
  });
});
