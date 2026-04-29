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

// ── ProfileMain — the primary user profile document at /users/{uid}/profile/main ──
// HP/Stamina/Mente/Social are denormalized here (updated by recomputeStats every 6h).
// These are game stats (0-100), never raw health metrics — DPO confirmed.
export interface ProfileMain {
  displayName: string;
  avatar?: string;
  pronouns?: string;       // free-text per D-17; NEVER required
  city: 'quito' | 'guayaquil' | 'cuenca' | 'other';
  favGames: string[];
  gamingPlatforms: ('pc' | 'console' | 'mobile')[];
  publicVisibility: boolean;
  theme: 'dark' | 'light';   // default 'dark'
  locale: 'es' | 'en';
  dataSaver: boolean;
  level: number;
  xp: number;
  stats: {
    hp: number;       // 0..100; minimum 1 per Pitfall #9 + PROF-12
    stamina: number;  // 0..100
    mente: number;    // 0..100
    social: number;   // 0..100
  };
  createdAt: unknown;  // Firestore Timestamp (typed as unknown for shared/pwa compatibility)
  updatedAt: unknown;  // Firestore Timestamp
  deletedAt?: unknown; // Firestore Timestamp — set on soft-delete
}

// ── Streak — per-track streak entity at /users/{uid}/streaks/{trackId} ──
export interface Streak {
  trackId: 'fitness' | 'social' | 'knowledge' | 'leadership';
  currentDays: number;
  longestDays: number;
  lastEventAt: unknown;   // Firestore Timestamp
  shieldsRemaining: number; // 1 grace per 7-day window per DC-07
  windowStartedAt: unknown; // Firestore Timestamp — Monday of current shield window
}

// ── Badge — per-badge doc at /users/{uid}/badges/{badgeId} ──
export interface Badge {
  badgeId: string;         // e.g. 'caminata-dota-primera-vez'
  earnedAt: unknown;       // Firestore Timestamp
  source: string;          // 'event:abc' | 'challenge:xyz' | 'streak:fitness:30'
  tier?: 'bronce' | 'plata' | 'oro';
  signedClaim: string;     // HMAC-SHA256 of {badgeId, uid, source, earnedAt}
}

// ── XpEventMessage — Pub/Sub message shapes published to xp-events topic ──
export type XpEventMessage =
  | { type: 'event_attended'; uid: string; eventId: string; walkIn?: boolean }
  | { type: 'challenge_progress'; uid: string; challengeId: string; value: number; metric?: string }
  | { type: 'content_completed'; uid: string; contentId: string; durationSec: number }
  | { type: 'club_leadership'; uid: string; clubId: string }     // Phase 3 — dormant in Phase 2
  | { type: 'referral'; uid: string; referredUid: string }
  | { type: 'wellness_survey_completed'; uid: string; surveyId: string };

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
