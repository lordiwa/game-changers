import { z } from 'zod';

export const ConsentCategorySchema = z.enum([
  'basic_profile',
  'event_participation',
  'health_self_reports',
  'wearable_data',
  'gaming_habits',
  'b2b_insurers',
  'b2b_healthcare',
  'b2b_brands',
  'cross_border',
  'research',
]);

export const ConsentDocSchema = z.object({
  category: ConsentCategorySchema,
  status: z.enum(['granted', 'revoked', 'expired']),
  version: z.string(), // e.g. 'v3' — references consentTexts/{category}/{version}
  textHash: z.string(),
  grantedAt: z.date().nullable(),
  expiresAt: z.date().nullable(),
});

// Phase 2 downstream plans will expand these stubs as they ship the actual schemas.
// Locked here so the public surface is stable across PWA, Functions, and bot.
export const ChallengeProgressSchema = z.object({
  uid: z.string(),
  challengeId: z.string(),
  progress: z.number().min(0),
  updatedAt: z.date(),
});

export const EventSchema = z.object({
  eventId: z.string(),
  tier: z.enum(['meetup', 'general', 'club']),
  startsAt: z.date(),
  capacity: z.number().int().positive(),
});
