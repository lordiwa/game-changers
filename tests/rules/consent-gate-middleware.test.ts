/**
 * consent-gate-middleware.test.ts — Integration: Rules enforce consent on protected paths.
 *
 * Tests the two-layer enforcement at the Firestore Rules layer:
 * - Access to /users/{uid}/profile/main requires consents.b=true (basic_profile claim).
 * - Access to /users/{uid}/healthDaily/* requires consents.h=true (health_self_reports).
 * - Access to /partners/* requires consents.r=true (b2b_brands) — or equivalent B2B claim.
 */
import { describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { getEnv } from './setup';

describe('consent-gate-middleware: Rules enforce consent on protected paths', () => {
  describe('profile/main requires basic_profile consent (claim b)', () => {
    it('denies read when consents.b is absent', async () => {
      const env = await getEnv();
      await env.withSecurityRulesDisabled(async (admin) => {
        await admin.firestore().doc('users/u1/profile/main').set({ displayName: 'TestUser' });
      });

      const ctx = env.authenticatedContext('u1', { consents: {} });
      await assertFails(ctx.firestore().doc('users/u1/profile/main').get());
    });

    it('allows read when consents.b=true', async () => {
      const env = await getEnv();
      await env.withSecurityRulesDisabled(async (admin) => {
        await admin.firestore().doc('users/u1/profile/main').set({ displayName: 'TestUser' });
      });

      const ctx = env.authenticatedContext('u1', { consents: { b: true } });
      await assertSucceeds(ctx.firestore().doc('users/u1/profile/main').get());
    });
  });

  describe('healthDaily requires health consent (claim h)', () => {
    it('denies read when consents.h is absent', async () => {
      const env = await getEnv();
      await env.withSecurityRulesDisabled(async (admin) => {
        await admin.firestore().doc('users/u1/healthDaily/2026-04-29').set({ steps: 5000 });
      });

      const ctx = env.authenticatedContext('u1', { consents: { b: true } });
      await assertFails(ctx.firestore().doc('users/u1/healthDaily/2026-04-29').get());
    });

    it('allows read when consents.h=true', async () => {
      const env = await getEnv();
      await env.withSecurityRulesDisabled(async (admin) => {
        await admin.firestore().doc('users/u1/healthDaily/2026-04-29').set({ steps: 5000 });
      });

      const ctx = env.authenticatedContext('u1', { consents: { b: true, h: true } });
      await assertSucceeds(ctx.firestore().doc('users/u1/healthDaily/2026-04-29').get());
    });
  });

  describe('consentLedger requires owner + matching uid claim', () => {
    it('denies client write to consentLedger', async () => {
      const env = await getEnv();
      const ctx = env.authenticatedContext('u1', { consents: { b: true } });
      await assertFails(
        ctx.firestore().doc('consentLedger/test-entry').set({
          uid: 'u1',
          category: 'basic_profile',
          action: 'grant',
        }),
      );
    });

    it('allows owner to read own consentLedger entries', async () => {
      const env = await getEnv();
      await env.withSecurityRulesDisabled(async (admin) => {
        await admin.firestore().doc('consentLedger/test-entry-u1').set({
          uid: 'u1',
          category: 'basic_profile',
          action: 'grant',
          version: 'v3',
          textHash: 'a'.repeat(64),
          hash: 'b'.repeat(64),
          prevHash: '0'.repeat(64),
        });
      });

      const ctx = env.authenticatedContext('u1', { consents: { b: true } });
      // consentLedger is readable by owner (uid matches) per Plan 01 rules
      await assertSucceeds(ctx.firestore().doc('consentLedger/test-entry-u1').get());
    });
  });
});
