/**
 * useContentTracking.ts — Content consumption tracking composable.
 *
 * Consent gate: ALL tracking requires gaming_habits consent (Layer 1).
 * Assessment submissions require health_self_reports consent (Layer 2).
 *
 * Threats mitigated:
 *   T-02-06-03 (tracking before consent): All PostHog capture calls are gated.
 *   Two-layer enforcement: client gate here + Function consentGate on contentCompleted.
 */
import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp } from '../firebase';
import { useConsent } from './useConsent';
import { usePosthog } from './usePosthog';

const functions = getFunctions(firebaseApp, 'southamerica-east1');

// Lazy callable — created once
let _contentCompletedCallable: ReturnType<typeof httpsCallable> | null = null;
let _submitAssessmentCallable: ReturnType<typeof httpsCallable> | null = null;

function getContentCompletedCallable() {
  if (!_contentCompletedCallable) {
    _contentCompletedCallable = httpsCallable(functions, 'contentCompleted');
  }
  return _contentCompletedCallable;
}

function getSubmitAssessmentCallable() {
  if (!_submitAssessmentCallable) {
    _submitAssessmentCallable = httpsCallable(functions, 'submitWellnessAssessment');
  }
  return _submitAssessmentCallable;
}

// Session-level de-dup key to avoid re-counting same article in the same session.
const SESSION_KEY_PREFIX = 'gc_viewed_';

export function useContentTracking() {
  const { hasGranted } = useConsent();
  const posthog = usePosthog();

  /**
   * Track a content view.
   * - Requires gaming_habits consent.
   * - De-duplicates per session via sessionStorage.
   *
   * @param contentId - The article/content slug.
   * @param pillar - Optional pillar for richer analytics.
   */
  async function trackView(contentId: string, pillar?: string): Promise<void> {
    // Consent gate
    if (!hasGranted('gaming_habits').value) {
      return;
    }

    // Session de-dup
    const sessionKey = `${SESSION_KEY_PREFIX}${contentId}`;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(sessionKey)) {
      return;
    }

    posthog.capture('content_viewed', { contentId, pillar });

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(sessionKey, '1');
    }
  }

  /**
   * Mark content as completed and publish to xp-events Pub/Sub (via Cloud Function).
   * - Requires gaming_habits consent.
   * - Requires completionPercent >= 80.
   *
   * @param contentId - The article slug.
   * @param completionPercent - 0..100, how much the user read/watched.
   * @param durationSec - Total time spent in seconds.
   */
  async function markComplete(
    contentId: string,
    completionPercent: number,
    durationSec: number,
  ): Promise<{ ok: boolean; xpAwarded?: number; alreadyAwarded?: boolean }> {
    // Consent gate — two-layer (client + Function)
    if (!hasGranted('gaming_habits').value) {
      return { ok: false };
    }

    // Threshold check — at least 80% read/watched
    if (completionPercent < 80) {
      return { ok: false };
    }

    const callable = getContentCompletedCallable();
    const result = await callable({ contentId, completionPercent, durationSec });

    posthog.capture('content_completed', { contentId, completionPercent, durationSec });

    return (result.data as { ok: boolean; xpAwarded?: number; alreadyAwarded?: boolean }) ?? { ok: true };
  }

  /**
   * Submit a wellness assessment (PSS-4 or similar).
   * - Requires health_self_reports consent (Layer 2).
   *
   * @param assessmentId - The assessment schema ID (e.g., 'pss4').
   * @param answers - User answers as { questionId: value }.
   */
  async function submitWellnessAssessment(
    assessmentId: string,
    answers: Record<string, number | string>,
  ): Promise<{ ok: boolean; score?: number; interpretation?: string }> {
    // Layer 2 gate
    if (!hasGranted('health_self_reports').value) {
      return { ok: false };
    }

    const callable = getSubmitAssessmentCallable();
    const result = await callable({ assessmentId, answers });

    return (result.data as { ok: boolean; score?: number; interpretation?: string }) ?? { ok: true };
  }

  return {
    trackView,
    markComplete,
    submitWellnessAssessment,
  };
}
