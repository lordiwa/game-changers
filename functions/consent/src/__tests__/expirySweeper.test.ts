/**
 * expirySweeper.test.ts — Unit tests for the consent expiry sweeper.
 *
 * Tests: expired consents get status='expired', ledger + audit entries created,
 *        source: 'expiry-sweeper', claims updated.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase-admin/app', () => ({ initializeApp: vi.fn() }));

const mockGetUser = vi.fn();
const mockSetCustomUserClaims = vi.fn();
vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    getUser: mockGetUser,
    setCustomUserClaims: mockSetCustomUserClaims,
  }),
}));

// Track transaction calls to verify 3-doc writes.
const txUpdate = vi.fn();
const txSet = vi.fn();
const mockRunTransaction = vi.fn(async (fn: (tx: unknown) => Promise<void>) => {
  await fn({ update: txUpdate, set: txSet });
});

const expiredConsentData = {
  status: 'granted',
  category: 'event_participation',
  version: 'v3',
  textHash: 'h'.repeat(64),
  expiresAt: new Date('2025-01-01'), // In the past.
};

const expiredDocRef = {
  path: 'users/user-abc/consents/event_participation',
  update: vi.fn(),
};

const mockCollectionGroupGet = vi.fn().mockResolvedValue({
  empty: false,
  size: 1,
  docs: [
    {
      ref: expiredDocRef,
      data: () => expiredConsentData,
    },
  ],
});

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collectionGroup: vi.fn(() => ({
      where: vi.fn().mockReturnThis(),
      limit: vi.fn(() => ({ get: mockCollectionGroupGet })),
    })),
    collection: vi.fn((path: string) => {
      if (path === 'consentLedger' || path.includes('notifications')) {
        return {
          doc: vi.fn(() => ({ set: vi.fn() })),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
          })),
        };
      }
      if (path.includes('notifications')) {
        return { doc: vi.fn(() => ({ set: vi.fn() })) };
      }
      return {
        doc: vi.fn(() => ({ set: vi.fn() })),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
        })),
      };
    }),
    runTransaction: mockRunTransaction,
  }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
  Timestamp: class {},
}));

vi.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: (_opts: unknown, handler: () => Promise<void>) => ({ handler }),
}));

import { sweepPage } from '../expirySweeper.js';

describe('consentExpirySweeper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ customClaims: { consents: { e: true } } });
    mockSetCustomUserClaims.mockResolvedValue(undefined);
    mockCollectionGroupGet.mockResolvedValue({
      empty: false,
      size: 1,
      docs: [{ ref: expiredDocRef, data: () => expiredConsentData }],
    });
  });

  it('marks expired consents with status=expired via transaction', async () => {
    const now = new Date('2026-04-29T03:00:00Z');
    await sweepPage(now);

    // Transaction must have been called.
    expect(mockRunTransaction).toHaveBeenCalledOnce();

    // txUpdate called on the consent doc with status: 'expired'.
    expect(txUpdate).toHaveBeenCalledWith(
      expiredDocRef,
      expect.objectContaining({ status: 'expired' }),
    );
  });

  it('writes ledger entry with source: expiry-sweeper', async () => {
    const now = new Date('2026-04-29T03:00:00Z');
    await sweepPage(now);

    // txSet called at least 3 times: ledger + audit + notification.
    expect(txSet).toHaveBeenCalledTimes(3);

    // Find the ledger call — it should have source: 'expiry-sweeper'.
    const calls = txSet.mock.calls;
    const ledgerCall = calls.find(([, data]) => (data as Record<string, unknown>)['source'] === 'expiry-sweeper' && (data as Record<string, unknown>)['action'] === 'expire');
    expect(ledgerCall).toBeDefined();
    expect(ledgerCall![1]).toMatchObject({
      uid: 'user-abc',
      category: 'event_participation',
      action: 'expire',
      source: 'expiry-sweeper',
    });
  });

  it('writes audit entry with source: expiry-sweeper', async () => {
    const now = new Date('2026-04-29T03:00:00Z');
    await sweepPage(now);

    const calls = txSet.mock.calls;
    const auditCall = calls.find(([, data]) => (data as Record<string, unknown>)['action'] === 'consent_expired');
    expect(auditCall).toBeDefined();
    expect(auditCall![1]).toMatchObject({
      uid: 'user-abc',
      action: 'consent_expired',
      source: 'expiry-sweeper',
    });
  });

  it('refreshes custom claims by removing the bitmap key', async () => {
    const now = new Date('2026-04-29T03:00:00Z');
    await sweepPage(now);

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith(
      'user-abc',
      expect.objectContaining({
        consents: {}, // 'e' key removed for event_participation
      }),
    );
  });

  it('writes notification doc for PWA re-consent prompt', async () => {
    const now = new Date('2026-04-29T03:00:00Z');
    await sweepPage(now);

    const calls = txSet.mock.calls;
    const notifCall = calls.find(([, data]) => (data as Record<string, unknown>)['type'] === 'consent_expired');
    expect(notifCall).toBeDefined();
    expect(notifCall![1]).toMatchObject({
      type: 'consent_expired',
      category: 'event_participation',
    });
  });

  it('returns early when no expired consents', async () => {
    mockCollectionGroupGet.mockResolvedValueOnce({ empty: true, size: 0, docs: [] });
    const now = new Date('2026-04-29T03:00:00Z');
    await sweepPage(now);

    expect(mockRunTransaction).not.toHaveBeenCalled();
    expect(mockSetCustomUserClaims).not.toHaveBeenCalled();
  });
});
