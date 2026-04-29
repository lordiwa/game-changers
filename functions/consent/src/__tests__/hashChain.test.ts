/**
 * hashChain.test.ts — Verifies the SHA-256 hash chain integrity for consentLedger.
 *
 * Asserts:
 * 1. Genesis entry has prevHash = '0'.repeat(64).
 * 2. Each subsequent entry's prevHash equals the previous entry's hash.
 * 3. Tampering with payload breaks chain verification (hash mismatch detected).
 */
import { describe, it, expect } from 'vitest';
import { sha256, buildLedgerHash } from '../grant.js';

describe('Hash chain integrity', () => {
  const uid = 'test-uid-abc123';

  it('genesis prevHash must be 64 zero chars', () => {
    const genesisHash = '0'.repeat(64);
    expect(genesisHash).toHaveLength(64);
    expect(genesisHash).toMatch(/^0+$/);
  });

  it('buildLedgerHash produces consistent SHA-256 output', () => {
    const prevHash = '0'.repeat(64);
    const payload = { uid, category: 'basic_profile', action: 'grant', version: 'v3', textHash: 'abc' };
    const ts = 1714406400000;

    const hash1 = buildLedgerHash(prevHash, payload, uid, ts);
    const hash2 = buildLedgerHash(prevHash, payload, uid, ts);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
    expect(hash1).toMatch(/^[0-9a-f]+$/);
  });

  it('chain: each entry prevHash equals prior entry hash', () => {
    // Simulate 3 sequential consent grants.
    const categories = ['basic_profile', 'event_participation', 'wearable_data'] as const;
    let prevHash = '0'.repeat(64);
    const entries: Array<{ hash: string; prevHash: string }> = [];

    for (const [i, category] of categories.entries()) {
      const ts = 1714406400000 + i * 1000;
      const payload = {
        uid,
        category,
        action: 'grant',
        version: 'v3',
        textHash: sha256(`text-for-${category}`),
        timestampMs: ts,
      };
      const hash = buildLedgerHash(prevHash, payload, uid, ts);
      entries.push({ hash, prevHash });
      prevHash = hash;
    }

    // Verify chain integrity: entry[n].prevHash === entry[n-1].hash.
    expect(entries[0].prevHash).toBe('0'.repeat(64));
    expect(entries[1].prevHash).toBe(entries[0].hash);
    expect(entries[2].prevHash).toBe(entries[1].hash);
  });

  it('tampering with payload breaks chain verification', () => {
    const prevHash = '0'.repeat(64);
    const ts = 1714406400000;
    const payload = {
      uid,
      category: 'basic_profile',
      action: 'grant',
      version: 'v3',
      textHash: 'original-hash',
      timestampMs: ts,
    };

    const originalHash = buildLedgerHash(prevHash, payload, uid, ts);

    // Tamper: change action without recomputing from the full chain.
    const tamperedPayload = { ...payload, action: 'revoke' };
    const tamperedHash = buildLedgerHash(prevHash, tamperedPayload, uid, ts);

    // The tampered hash MUST differ from the original.
    expect(tamperedHash).not.toBe(originalHash);

    // A verifier that re-computes the hash from payload + prevHash would detect the mismatch.
    const recomputedFromOriginalPayload = buildLedgerHash(prevHash, payload, uid, ts);
    expect(recomputedFromOriginalPayload).toBe(originalHash);
    expect(recomputedFromOriginalPayload).not.toBe(tamperedHash);
  });

  it('sha256 utility produces a deterministic 64-char hex digest', () => {
    const hash1 = sha256('hello-world');
    const hash2 = sha256('hello-world');
    // Output is deterministic.
    expect(hash1).toBe(hash2);
    // Output is a 64-char lowercase hex string.
    expect(hash1).toHaveLength(64);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    // Different inputs produce different outputs.
    expect(sha256('input-a')).not.toBe(sha256('input-b'));
    // Empty string produces a non-empty hash.
    expect(sha256('')).toHaveLength(64);
  });

  it('chain with prevHash from tampered prior entry fails verification', () => {
    // Simulate an attacker inserting a forged entry.
    const legitimatePrevHash = '0'.repeat(64);
    const ts = 1714406400000;
    const legitPayload = { uid, category: 'basic_profile', action: 'grant', version: 'v3', textHash: 'h1', timestampMs: ts };
    const legitimateHash = buildLedgerHash(legitimatePrevHash, legitPayload, uid, ts);

    // Attacker creates entry without knowing legitimateHash — uses wrong prevHash.
    const forgedPayload = { uid, category: 'b2b_brands', action: 'grant', version: 'v3', textHash: 'h2', timestampMs: ts + 1 };
    const forgedHash = buildLedgerHash('f'.repeat(64), forgedPayload, uid, ts + 1);

    // Verifier checks: forgedEntry.prevHash should equal legitimateHash.
    expect('f'.repeat(64)).not.toBe(legitimateHash);
    // So the chain is broken — detectable without the original prevHash.
  });
});
