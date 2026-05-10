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
  bio?: string;            // free-text up to ~140 chars; optional
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

// ── ContentArticle — CMS-managed article document at /content/{id} ────────────
// Authored in Markdown, synced to Firestore by scripts/cms-publish.ts.
// Public read allowed (Firestore Rules); no auth required to read articles.
export interface WellnessAssessmentQuestion {
  id: string;
  text: { es: string; en: string };
  scale: number[];                  // e.g. [0, 1, 2, 3, 4] for PSS-4 Likert
}

export interface WellnessAssessmentScoringBand {
  range: [number, number];
  message_es: string;
  message_en: string;
}

export interface WellnessAssessmentSchema {
  type: 'pss4' | 'custom';
  questions: WellnessAssessmentQuestion[];
  scoring: {
    low: WellnessAssessmentScoringBand;
    moderate: WellnessAssessmentScoringBand;
    high: WellnessAssessmentScoringBand;
  };
}

export interface ContentArticle {
  id: string;                                     // slug, e.g. 'movimiento-stretching-gamer'
  title: { es: string; en: string };
  slug: { es: string; en: string };
  body: { es: string; en: string };               // Markdown content
  pillar: 'movimiento' | 'mente' | 'nutricion' | 'comunidad' | 'data';
  contentType: 'article' | 'video' | 'quiz';
  gameClusters: ('free-fire' | 'dota' | 'minecraft' | 'lol' | 'valorant' | 'general')[];
  estReadMinutes: number;                          // for XP estimation
  embeddedMedia?: { provider: 'youtube' | 'tiktok'; videoId: string };
  publishedAt: unknown;                            // Firestore Timestamp (unknown for portability)
  status: 'draft' | 'published' | 'archived';
  authorName: string;
  coverImage?: string;
  assessment?: {
    schema: WellnessAssessmentSchema;
    requiresConsent: 'health_self_reports';
  };
}

// Pub/Sub message published to xp-events when a user completes an article (CONT-05).
// Consumed by xpAward Cloud Function (Plan 05).
export interface ContentCompletedMessage {
  type: 'content_completed';
  uid: string;
  contentId: string;
  durationSec: number;   // total time spent or video watched seconds
}

// ── XpEventMessage — Pub/Sub message shapes published to xp-events topic ──
export type XpEventMessage =
  | { type: 'event_attended'; uid: string; eventId: string; walkIn?: boolean }
  | { type: 'challenge_progress'; uid: string; challengeId: string; value: number; metric?: string }
  | { type: 'challenge_completed'; uid: string; challengeId: string; tier: ChallengeTier; xpReward: number; badgeId: string }
  | { type: 'content_completed'; uid: string; contentId: string; durationSec: number }
  | { type: 'club_leadership'; uid: string; clubId: string }     // Phase 3 — dormant in Phase 2
  | { type: 'referral'; uid: string; referredUid: string }
  | { type: 'wellness_survey_completed'; uid: string; surveyId: string };

// ── Challenge domain types (Plan 02-08) ─────────────────────────────────────
export type ChallengeType = 'movement' | 'streak' | 'social' | 'mental' | 'hybrid';
export type ChallengeTier = 'bronce' | 'plata' | 'oro';
export type ChallengeMetric =
  | 'steps'
  | 'minutes_meditated'
  | 'events_attended'
  | 'sleep_hours'
  | 'days_active'
  | 'social_interactions'
  | 'custom';
export type ChallengeSource = 'manual' | 'pedometer' | 'wearable' | 'photo';

export interface ChallengeTierConfig {
  target: number;
  reward: { xp: number; badgeId: string };
}

export interface Challenge {
  id: string;
  type: ChallengeType;
  name: { es: string; en: string };
  description: { es: string; en: string };
  tier: Record<ChallengeTier, ChallengeTierConfig>;
  metric: ChallengeMetric;
  unit: string;
  startsAt: unknown;   // Firestore Timestamp
  endsAt: unknown;     // Firestore Timestamp
  season: string;      // e.g. '2026-q2'
  visibility: 'public' | 'club_only' | 'sponsored';
  cluster?: 'free-fire' | 'dota' | 'minecraft' | 'lol' | 'general';
  acceptablePhotoEvidence: boolean;
}

export interface ChallengeEnrollment {
  uid: string;
  challengeId: string;
  tier: ChallengeTier;
  enrolledAt: unknown;        // Firestore Timestamp
  optInLeaderboard: boolean;
  anonymousLeaderboard: boolean;  // CHLG-08
  progress: number;               // accumulated metric value
  completedAt?: unknown;          // Firestore Timestamp — set on completion
}

export interface ChallengeProgressEntry {
  challengeId: string;
  source: ChallengeSource;
  value: number;
  unit: string;
  recordedAt: unknown;   // Firestore Timestamp
  evidence?: string;     // Storage path for photo
  status: 'ok' | 'flagged' | 'rejected';
}

export interface LeaderboardRow {
  uid: string;
  displayName: string;
  anonymous: boolean;
  rank: number;
  value: number;
  tier: string;
}

export interface LeaderboardAggregate {
  period: 'weekly' | 'monthly' | 'season';
  cohort: 'global' | 'quito' | 'guayaquil' | 'cuenca';
  updatedAt: unknown;  // Firestore Timestamp
  rows: LeaderboardRow[];
  rowCount: number;
}

// Source → Consent category mapping (RESEARCH §7)
// Duplicated here for PWA composables; server canonical in functions/challenges/src/logProgress.ts.
export const SOURCE_TO_CONSENT: Record<ChallengeSource, string> = {
  manual: 'health_self_reports',
  pedometer: 'health_self_reports',
  wearable: 'wearable_data',
  photo: 'event_participation',
};

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
