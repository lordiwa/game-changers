/**
 * useChallenges.ts — VueFire bindings for challenge collections + user enrollments.
 *
 * Architecture (Pitfall #2 compliance):
 *   - Challenge list: useCollection (allowed — challenges are public, bounded collection)
 *   - User enrollment: useDocument (one doc per challenge per user)
 *   - Leaderboard: useDocument on /leaderboards/{period}_{cohort} ONLY — see Leaderboard.vue
 *   - NO onSnapshot on challengeProgress — that is server-only (leaderboardCompute)
 *
 * No onSnapshot import in this file — ESLint rule from Plan 01 enforces this.
 */
import { computed } from 'vue';
import { collection, doc, query, where, orderBy } from 'firebase/firestore';
import { useCollection, useDocument } from 'vuefire';
import { db, auth } from '../firebase.js';
import type { Challenge, ChallengeEnrollment } from '@gamechangers/shared';

export function useChallenges() {
  const now = new Date();

  // Active challenges (endsAt > now), sorted by end date ascending.
  // NOTE: Firestore allows inequality on only ONE field per query, so we filter
  // archived with == false instead of != true. createChallenge writes
  // archived: false at creation; seasonRollover flips it to true on archival.
  const challengesQuery = query(
    collection(db, 'challenges'),
    where('archived', '==', false),
    where('endsAt', '>', now),
    orderBy('endsAt', 'asc'),
  );

  const challenges = useCollection<Challenge>(challengesQuery);

  return { challenges };
}

export function useChallenge(challengeId: string) {
  const challengeRef = doc(db, 'challenges', challengeId);
  const challenge = useDocument<Challenge>(challengeRef);
  return { challenge };
}

export function useChallengeEnrollment(challengeId: string) {
  const uid = auth.currentUser?.uid;

  if (!uid) {
    return { enrollment: null };
  }

  const enrollmentRef = doc(db, 'users', uid, 'challengeEnrollments', challengeId);
  const enrollment = useDocument<ChallengeEnrollment>(enrollmentRef);
  return { enrollment };
}

export function useUserEnrollments() {
  const uid = auth.currentUser?.uid;

  if (!uid) {
    return { enrollments: null };
  }

  const enrollmentsQuery = query(
    collection(db, 'users', uid, 'challengeEnrollments'),
    orderBy('enrolledAt', 'desc'),
  );

  const enrollments = useCollection<ChallengeEnrollment>(enrollmentsQuery);
  return { enrollments };
}

export function useLeaderboard(period: 'weekly' | 'monthly' | 'season', cohort: 'global' | 'quito' | 'guayaquil' | 'cuenca') {
  // CRITICAL (Pitfall #2): subscribes to ONE aggregate doc — NEVER the challengeProgress collection.
  // leaderboardCompute (Cloud Function) writes this doc every 15 minutes.
  const docId = `${period}_${cohort}`;
  const leaderboardRef = doc(db, 'leaderboards', docId);
  const leaderboard = useDocument(leaderboardRef);

  const rows = computed(() => (leaderboard.value as Record<string, unknown>)?.['rows'] ?? []);
  const updatedAt = computed(() => (leaderboard.value as Record<string, unknown>)?.['updatedAt']);

  return { leaderboard, rows, updatedAt };
}
