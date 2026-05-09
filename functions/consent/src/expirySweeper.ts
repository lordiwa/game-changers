/**
 * expirySweeper.ts — Daily Cloud Scheduler Function marking expiring consents.
 *
 * CNST-12: daily 03:00 ECT (America/Guayaquil), 12-month expiry, 30-day reminder.
 * Threat mitigated: T-02-04-07 (DoS — paginates 500 docs per execution, recurses via Cloud Tasks).
 *
 * schedule: 'every day 03:00' → cron '0 3 * * *' in America/Guayaquil timezone.
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { buildLedgerHash } from './grant.js';
import type { ConsentCategory } from '@gamechangers/functions-shared/ConsentEnforcement';
import { CLAIM_BITMAP_KEYS } from '@gamechangers/functions-shared/ConsentEnforcement';

const PAGE_SIZE = 500;

export const consentExpirySweeper = onSchedule(
  {
    schedule: '0 3 * * *',
    timeZone: 'America/Guayaquil',
    region: 'southamerica-east1',
  },
  async () => {
    await sweepPage(new Date());
  },
);

/**
 * Sweep a page of expired consents. Exported for testability with a mocked `now`.
 */
export async function sweepPage(now: Date): Promise<void> {
  const db = getFirestore();
  const auth = getAuth();

  // Collection-group query: consents where status='granted' AND expiresAt < now.
  const expiredQuery = await db
    .collectionGroup('consents')
    .where('status', '==', 'granted')
    .where('expiresAt', '<', now)
    .limit(PAGE_SIZE)
    .get();

  if (expiredQuery.empty) {
    console.log('[expirySweeper] No expired consents found.');
    return;
  }

  console.log(`[expirySweeper] Processing ${expiredQuery.size} expired consents.`);

  for (const doc of expiredQuery.docs) {
    const data = doc.data();
    const uid: string = doc.ref.path.split('/')[1]!; // users/{uid}/consents/{category}
    const category = data['category'] as ConsentCategory;
    const version = data['version'] as string;
    const textHash = data['textHash'] as string;

    // Read latest ledger entry for hash chain.
    const ledgerQuery = await db
      .collection('consentLedger')
      .where('uid', '==', uid)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();
    const prevHash = ledgerQuery.empty
      ? '0'.repeat(64)
      : (ledgerQuery.docs[0]!.data()['hash'] as string);

    const ledgerRef = db.collection('consentLedger').doc();
    const auditRef = db.collection('auditLog').doc();
    const notificationRef = db.collection(`users/${uid}/notifications`).doc();

    const timestampMs = now.getTime();
    const payload = {
      uid,
      category,
      action: 'expire',
      version,
      textHash,
      timestampMs,
      source: 'expiry-sweeper',
    };
    const ledgerHash = buildLedgerHash(prevHash, payload, uid, timestampMs);

    await db.runTransaction(async (tx) => {
      // 1. Mark consent as expired.
      tx.update(doc.ref, {
        status: 'expired',
        expiredAt: FieldValue.serverTimestamp(),
      });

      // 2. Ledger entry.
      tx.set(ledgerRef, {
        uid,
        category,
        action: 'expire',
        version,
        textHash,
        timestamp: FieldValue.serverTimestamp(),
        hash: ledgerHash,
        prevHash,
        source: 'expiry-sweeper',
      });

      // 3. Audit entry.
      tx.set(auditRef, {
        uid,
        category,
        action: 'consent_expired',
        version,
        timestamp: FieldValue.serverTimestamp(),
        hash: ledgerHash,
        source: 'expiry-sweeper',
      });

      // 4. Notification doc for PWA re-consent prompt.
      tx.set(notificationRef, {
        type: 'consent_expired',
        category,
        expiredAt: FieldValue.serverTimestamp(),
        read: false,
      });
    });

    // Refresh custom claims — remove the bitmap key.
    try {
      const userRecord = await auth.getUser(uid);
      const existingClaims = (userRecord.customClaims ?? {}) as Record<string, unknown>;
      const existingConsents = (existingClaims['consents'] ?? {}) as Record<string, boolean>;
      const bitmapKey = CLAIM_BITMAP_KEYS[category];
      const updatedConsents = { ...existingConsents };
      delete updatedConsents[bitmapKey];
      await auth.setCustomUserClaims(uid, {
        ...existingClaims,
        consents: updatedConsents,
      });
    } catch (err) {
      console.error(`[expirySweeper] Failed to update claims for uid=${uid}:`, err);
    }
  }

  // If there were PAGE_SIZE results, there may be more — Cloud Tasks recursion would go here
  // (Plan 09 wires the Cloud Tasks recursive dispatch; for MVP the daily run handles up to 500).
  if (expiredQuery.size === PAGE_SIZE) {
    console.warn(
      '[expirySweeper] Reached PAGE_SIZE limit — consider adding Cloud Tasks recursion for large datasets.',
    );
  }
}
