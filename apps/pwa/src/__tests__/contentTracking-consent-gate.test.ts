/**
 * contentTracking-consent-gate.test.ts — Consent gate tests for useContentTracking.
 *
 * Tests:
 *   1. trackView is NO-OP without gaming_habits consent (PostHog NOT called).
 *   2. trackView fires PostHog after gaming_habits consent granted.
 *   3. markComplete is NO-OP without gaming_habits consent (callable NOT called).
 *   4. markComplete is NO-OP when completionPercent < 80.
 *   5. markComplete calls contentCompleted callable with consent AND ≥80% threshold.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, computed } from 'vue';

// ── Mock posthog-js ───────────────────────────────────────────────────────────
const mockPosthogCapture = vi.fn();
vi.mock('posthog-js', () => ({
  default: { capture: mockPosthogCapture, opt_in_capturing: vi.fn() },
}));

// ── Mock firebase/functions ───────────────────────────────────────────────────
const mockContentCompletedCallable = vi.fn();
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(() => mockContentCompletedCallable),
}));

// ── Mock ../firebase ──────────────────────────────────────────────────────────
vi.mock('../firebase', () => ({ firebaseApp: {} }));

// ── Mock ../composables/useConsent ────────────────────────────────────────────
// We control whether gaming_habits consent is granted via this mock.
let mockHasGranted = false;
vi.mock('../composables/useConsent', () => ({
  useConsent: () => ({
    hasGranted: (category: string) =>
      computed(() => category === 'gaming_habits' ? mockHasGranted : false),
  }),
}));

// ── Mock ../composables/usePosthog ────────────────────────────────────────────
vi.mock('../composables/usePosthog', () => ({
  usePosthog: () => ({ capture: mockPosthogCapture }),
}));

import { useContentTracking } from '../composables/useContentTracking';

describe('useContentTracking — consent gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasGranted = false;
    // Clear sessionStorage de-dup
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  });

  describe('trackView', () => {
    it('is NO-OP when gaming_habits consent is NOT granted', async () => {
      mockHasGranted = false;
      const { trackView } = useContentTracking();
      await trackView('article-1');
      expect(mockPosthogCapture).not.toHaveBeenCalled();
    });

    it('fires PostHog capture when gaming_habits consent IS granted', async () => {
      mockHasGranted = true;
      const { trackView } = useContentTracking();
      await trackView('article-1', 'movimiento');
      expect(mockPosthogCapture).toHaveBeenCalledWith('content_viewed', {
        contentId: 'article-1',
        pillar: 'movimiento',
      });
    });

    it('de-duplicates trackView within the same session', async () => {
      mockHasGranted = true;
      const { trackView } = useContentTracking();
      await trackView('article-1');
      await trackView('article-1');
      // Should only fire once
      expect(mockPosthogCapture).toHaveBeenCalledTimes(1);
    });
  });

  describe('markComplete', () => {
    it('is NO-OP when gaming_habits consent is NOT granted', async () => {
      mockHasGranted = false;
      const { markComplete } = useContentTracking();
      await markComplete('article-1', 90, 300);
      expect(mockPosthogCapture).not.toHaveBeenCalled();
      expect(mockContentCompletedCallable).not.toHaveBeenCalled();
    });

    it('is NO-OP when completionPercent < 80', async () => {
      mockHasGranted = true;
      const { markComplete } = useContentTracking();
      await markComplete('article-1', 79, 300);
      expect(mockContentCompletedCallable).not.toHaveBeenCalled();
    });

    it('calls contentCompleted callable when consent granted AND completionPercent >= 80', async () => {
      mockHasGranted = true;
      mockContentCompletedCallable.mockResolvedValue({ data: { ok: true, xpAwarded: 30 } });
      const { markComplete } = useContentTracking();
      await markComplete('article-1', 85, 300);
      expect(mockContentCompletedCallable).toHaveBeenCalledWith({
        contentId: 'article-1',
        completionPercent: 85,
        durationSec: 300,
      });
      expect(mockPosthogCapture).toHaveBeenCalledWith('content_completed', {
        contentId: 'article-1',
        completionPercent: 85,
        durationSec: 300,
      });
    });

    it('calls callable with exactly 80% threshold', async () => {
      mockHasGranted = true;
      mockContentCompletedCallable.mockResolvedValue({ data: { ok: true, xpAwarded: 10 } });
      const { markComplete } = useContentTracking();
      await markComplete('article-1', 80, 300);
      expect(mockContentCompletedCallable).toHaveBeenCalledTimes(1);
    });
  });
});
