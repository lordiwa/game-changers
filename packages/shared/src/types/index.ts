import type { z } from 'zod';
import {
  ConsentCategorySchema,
  ConsentDocSchema,
  ConsentLedgerEntrySchema,
  ChallengeProgressSchema,
  EventSchema,
  DiscordIdentitySchema,
  AuthStateSchema,
} from '../schemas/index.js';

export type ConsentCategory = z.infer<typeof ConsentCategorySchema>;
export type ConsentDoc = z.infer<typeof ConsentDocSchema>;
export type ConsentLedgerEntry = z.infer<typeof ConsentLedgerEntrySchema>;
export type ChallengeProgress = z.infer<typeof ChallengeProgressSchema>;
export type Event = z.infer<typeof EventSchema>;
export type DiscordIdentity = z.infer<typeof DiscordIdentitySchema>;
export type AuthState = z.infer<typeof AuthStateSchema>;

// Bitmap key map (single-letter custom-claim keys per RESEARCH §1).
// Duplicated in functions/shared/ConsentEnforcement.ts — Plan 04 unifies if duplication
// becomes a maintenance burden, but keeping a copy here lets the PWA detect claim shape
// without pulling firebase-admin.
export const CLAIM_BITMAP_KEYS: Record<ConsentCategory, string> = {
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

// Progressive consent layers 0-4 (mirrors functions/consent/src/grant.ts LAYER_TO_CATEGORIES).
// Kept in shared so the PWA can render the correct layer without importing firebase-admin.
export const LAYER_TO_CATEGORIES: Record<number, ConsentCategory[]> = {
  0: ['basic_profile'],
  1: ['event_participation', 'gaming_habits'],
  2: ['health_self_reports'],
  3: ['wearable_data'],
  4: ['b2b_insurers', 'b2b_healthcare', 'b2b_brands', 'cross_border', 'research'],
};
