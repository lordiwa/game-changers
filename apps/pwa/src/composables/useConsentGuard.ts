/**
 * useConsentGuard.ts — Vue Router navigation guard factory for consent enforcement.
 *
 * Usage:
 *   router.beforeEach(useConsentGuard().requireConsent('event_participation'))
 *
 * Or per-route:
 *   beforeEnter: useConsentGuard().requireConsent('health_self_reports')
 *
 * This is the PWA-side enforcement layer — the second layer of the two-layer
 * enforcement system (Layer 1: Firestore Security Rules via custom claim bitmap;
 * Layer 2: this route guard + Cloud Function consentGate).
 */
import { getAuth } from 'firebase/auth';
import type { NavigationGuard } from 'vue-router';
import type { ConsentCategory } from '@gamechangers/shared';
import { LAYER_TO_CATEGORIES } from '@gamechangers/shared';

// Maps category → which layer route to redirect to for consent capture.
const CATEGORY_TO_LAYER_ROUTE: Record<ConsentCategory, string> = {
  basic_profile: '/consent/layer-0',
  event_participation: '/consent/layer-1',
  gaming_habits: '/consent/layer-1',
  health_self_reports: '/consent/layer-2',
  wearable_data: '/consent/layer-3',
  b2b_insurers: '/me/consent',  // Layer 4 is only accessible from settings page
  b2b_healthcare: '/me/consent',
  b2b_brands: '/me/consent',
  cross_border: '/me/consent',
  research: '/me/consent',
};

export function useConsentGuard() {
  /**
   * Returns a Vue Router navigation guard that redirects to the consent layer
   * if the user has not granted the required category.
   *
   * Uses the custom claims bitmap for fast path (no Firestore read).
   * Falls back to allowing navigation if claims are unavailable.
   */
  function requireConsent(category: ConsentCategory): NavigationGuard {
    return async (to, _from, next) => {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        next({ path: '/auth/signin' });
        return;
      }

      try {
        const idTokenResult = await user.getIdTokenResult();
        const consents = (idTokenResult.claims['consents'] as Record<string, boolean>) ?? {};

        // Map category to bitmap key
        const bitmapKeyMap: Record<ConsentCategory, string> = {
          basic_profile: 'b',
          event_participation: 'e',
          health_self_reports: 'h',
          wearable_data: 'w',
          gaming_habits: 'g',
          b2b_insurers: 'i',
          b2b_healthcare: 'c',
          b2b_brands: 'r',
          cross_border: 'x',
          research: 's',
        };

        const bitmapKey = bitmapKeyMap[category];
        if (!consents[bitmapKey]) {
          // Redirect to the appropriate consent layer with return URL
          const returnPath = to.fullPath;
          const layerRoute = CATEGORY_TO_LAYER_ROUTE[category];
          next({ path: layerRoute, query: { return: returnPath } });
          return;
        }
      } catch {
        // Claims unavailable — allow navigation (server-side Function middleware is the authoritative gate)
      }

      next();
    };
  }

  return { requireConsent };
}
