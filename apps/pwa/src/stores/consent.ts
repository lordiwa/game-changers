/**
 * consent.ts — Pinia store wrapping the useConsent composable.
 *
 * Provides a reactive, globally accessible consent state surface.
 * Views should use this store rather than calling useConsent directly
 * to avoid multiple instances of the same composable.
 */
import { defineStore } from 'pinia';
import { useConsent } from '../composables/useConsent';
import type { ConsentCategory, ConsentDoc } from '@gamechangers/shared';

export const useConsentStore = defineStore('consent', () => {
  const {
    consents,
    hasGranted,
    grant,
    revoke,
    requestExport,
    requestErasure,
    uid,
  } = useConsent();

  return {
    consents,
    hasGranted,
    grant,
    revoke,
    requestExport,
    requestErasure,
    uid,
  };
});
