import type { z } from 'zod';
import {
  ConsentCategorySchema,
  ConsentDocSchema,
  ChallengeProgressSchema,
  EventSchema,
} from '../schemas/index.js';

export type ConsentCategory = z.infer<typeof ConsentCategorySchema>;
export type ConsentDoc = z.infer<typeof ConsentDocSchema>;
export type ChallengeProgress = z.infer<typeof ChallengeProgressSchema>;
export type Event = z.infer<typeof EventSchema>;

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
