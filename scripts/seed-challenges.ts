/**
 * scripts/seed-challenges.ts — Idempotent seed script for challenge documents.
 *
 * Reads challenge-types.json + active season JSON, then for each (type × tier × cluster)
 * combination defined in the season file, calls the createChallenge Function via Admin SDK.
 *
 * Usage (against emulator):
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 pnpm tsx scripts/seed-challenges.ts
 *
 * Usage (against production — requires service account):
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/sa.json pnpm tsx scripts/seed-challenges.ts
 *
 * Idempotent: skips any challengeId that already exists in Firestore.
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Initialize Admin SDK ─────────────────────────────────────────────────────
const credPath = process.env['GOOGLE_APPLICATION_CREDENTIALS'];
const app = credPath
  ? initializeApp({ credential: cert(credPath) })
  : initializeApp();  // Uses FIRESTORE_EMULATOR_HOST or ADC

const db = getFirestore(app);

// ── Load data files ──────────────────────────────────────────────────────────
const challengeTypesPath = join(
  __dirname,
  '../functions/challenges/data/challenge-types.json',
);
const seasonId = process.env['SEASON_ID'] ?? '2026-q2';
const seasonPath = join(
  __dirname,
  `../functions/challenges/data/seasons/${seasonId}.json`,
);

interface TierConfig {
  target: number;
  durationDays: number;
  xp: number;
  badgeId: string;
}

interface ChallengeType {
  name: { es: string; en: string };
  description: { es: string; en: string };
  metric: string;
  unit: string;
  acceptablePhotoEvidence: boolean;
  tiers: Record<string, TierConfig>;
}

interface SeasonChallenge {
  typeKey: string;
  tier: string;
  visibility: string;
  cluster?: string;
  challengeId: string;
}

interface Season {
  id: string;
  name: { es: string; en: string };
  startsAt: string;
  endsAt: string;
  challenges: SeasonChallenge[];
}

const challengeTypes = JSON.parse(readFileSync(challengeTypesPath, 'utf-8')) as Record<string, ChallengeType>;
const season = JSON.parse(readFileSync(seasonPath, 'utf-8')) as Season;

// ── Seed function ─────────────────────────────────────────────────────────────
async function seedChallenges() {
  console.log(`[seed-challenges] Seeding season ${season.id} (${season.challenges.length} challenges)`);
  let created = 0;
  let skipped = 0;

  for (const sc of season.challenges) {
    const typeConfig = challengeTypes[sc.typeKey];
    if (!typeConfig) {
      console.warn(`[seed-challenges] Unknown typeKey: ${sc.typeKey} — skipping`);
      continue;
    }

    const tierConfig = typeConfig.tiers[sc.tier];
    if (!tierConfig) {
      console.warn(`[seed-challenges] Unknown tier: ${sc.tier} for type ${sc.typeKey} — skipping`);
      continue;
    }

    const challengeId = sc.challengeId;
    const challengeRef = db.doc(`challenges/${challengeId}`);

    // Idempotency: skip if already exists
    const existing = await challengeRef.get();
    if (existing.exists) {
      console.log(`[seed-challenges] Skipping ${challengeId} (already exists)`);
      skipped++;
      continue;
    }

    // Build tier map (all 3 tiers from typeConfig)
    const tierMap: Record<string, { target: number; reward: { xp: number; badgeId: string } }> = {};
    for (const [tierKey, t] of Object.entries(typeConfig.tiers)) {
      tierMap[tierKey] = {
        target: t.target,
        reward: { xp: t.xp, badgeId: t.badgeId },
      };
    }

    const challengeDoc = {
      id: challengeId,
      type: sc.typeKey,
      name: typeConfig.name,
      description: typeConfig.description,
      tier: tierMap,
      metric: typeConfig.metric,
      unit: typeConfig.unit,
      acceptablePhotoEvidence: typeConfig.acceptablePhotoEvidence,
      startsAt: new Date(season.startsAt),
      endsAt: new Date(season.endsAt),
      season: season.id,
      visibility: sc.visibility ?? 'public',
      ...(sc.cluster ? { cluster: sc.cluster } : {}),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await challengeRef.set(challengeDoc);
    console.log(`[seed-challenges] Created ${challengeId}`);
    created++;
  }

  console.log(`[seed-challenges] Done: ${created} created, ${skipped} skipped`);
}

seedChallenges().catch((err: unknown) => {
  console.error('[seed-challenges] Fatal error:', err);
  process.exit(1);
});
