// Single barrel export for the shared functions package.
export * from './types.js';
// Re-export ConsentEnforcement runtime helpers explicitly to avoid name conflict
// with `ConsentCategory` (canonical source is `@gamechangers/shared` via types.js).
export {
  CONSENT_CATEGORIES,
  CLAIM_BITMAP_KEYS,
  HOT_PATH_CATEGORIES,
  consentGate,
} from './ConsentEnforcement.js';
