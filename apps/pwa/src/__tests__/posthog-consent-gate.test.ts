/*
 * Proves PostHog cannot fire any capture event before optIn() is called.
 * Mitigates T-02-01-02 (PostHog autocapture leaking PII before consent).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const optInMock = vi.fn();
const optOutMock = vi.fn();
const captureMock = vi.fn();
const hasOptedInMock = vi.fn(() => false);
const initMock = vi.fn();

vi.mock('posthog-js', () => ({
  default: {
    init: initMock,
    opt_in_capturing: optInMock,
    opt_out_capturing: optOutMock,
    has_opted_in_capturing: hasOptedInMock,
    capture: captureMock,
  },
}));

beforeEach(() => {
  optInMock.mockClear();
  captureMock.mockClear();
  initMock.mockClear();
  hasOptedInMock.mockClear();
});

describe('PostHog consent gate', () => {
  it('initializes with opt_out_capturing_by_default: true', async () => {
    // Provide env so init runs.
    import.meta.env.VITE_POSTHOG_KEY = 'test-key';
    import.meta.env.VITE_POSTHOG_HOST = 'https://posthog.test';
    const { usePosthog, __resetPosthogForTests } = await import('../composables/usePosthog');
    __resetPosthogForTests();

    usePosthog();

    expect(initMock).toHaveBeenCalledOnce();
    const initOpts = initMock.mock.calls[0]?.[1];
    expect(initOpts).toMatchObject({
      autocapture: false,
      capture_pageview: false,
      opt_out_capturing_by_default: true,
    });
  });

  it('does not call posthog.capture before optIn()', async () => {
    const { usePosthog, __resetPosthogForTests } = await import('../composables/usePosthog');
    __resetPosthogForTests();
    usePosthog();
    // Initial state: no capture calls.
    expect(captureMock).not.toHaveBeenCalled();
    expect(optInMock).not.toHaveBeenCalled();
  });

  it('hasOptedIn() returns false by default', async () => {
    hasOptedInMock.mockReturnValue(false);
    const { usePosthog, __resetPosthogForTests } = await import('../composables/usePosthog');
    __resetPosthogForTests();
    const ph = usePosthog();
    expect(ph.hasOptedIn()).toBe(false);
  });

  it('optIn() invokes posthog.opt_in_capturing()', async () => {
    const { usePosthog, __resetPosthogForTests } = await import('../composables/usePosthog');
    __resetPosthogForTests();
    const ph = usePosthog();
    ph.optIn();
    expect(optInMock).toHaveBeenCalledOnce();
  });
});
