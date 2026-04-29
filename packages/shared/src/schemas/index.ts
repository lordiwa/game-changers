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

// Immutable hash-chain ledger entry written by consentGrant / consentRevoke / expirySweeper.
// prevHash = '0'.repeat(64) for the genesis entry per user per category.
// hash = sha256(prevHash + JSON.stringify(payload) + uid + timestampMs).
export const ConsentLedgerEntrySchema = z.object({
  uid: z.string(),
  category: ConsentCategorySchema,
  action: z.enum(['grant', 'revoke', 'expire']),
  version: z.string(),
  textHash: z.string(),
  timestampMs: z.number().int(),
  prevHash: z.string().length(64),
  hash: z.string().length(64),
  source: z.enum(['user', 'expiry-sweeper', 'dpo-admin']).optional(),
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

// Plan 02-02 — Discord identity persisted in /users/{uid}/private/discord.
// Refresh token is KMS-encrypted (see functions/shared/kms.ts).
export const DiscordIdentitySchema = z.object({
  discordId: z.string().regex(/^\d{17,20}$/),
  username: z.string(),
  globalName: z.string().optional(),
  avatar: z.string().optional(),
  email: z.string().email().optional(),
  guildRoles: z.array(z.string()).optional(),
});

// Plan 02-02 — derived auth state surfaced to the PWA composable / Pinia store.
export const AuthStateSchema = z.object({
  uid: z.string(),
  isAnonymous: z.boolean(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  hasDiscord: z.boolean(),
  ageVerified: z.boolean(),
  isMinor: z.boolean(),
});
