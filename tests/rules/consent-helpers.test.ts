/*
 * Verifies the hasConsentClaim() helper in firestore.rules picks the right bitmap key
 * per category. Drives the rule via /users/{uid}/profile/main reads (gated by 'basic_profile').
 */
import { describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { getEnv } from './setup';

describe('hasConsentClaim helper', () => {
  it('returns true when consents.b=true (basic_profile) and the request is owner', async () => {
    const env = await getEnv();
    const ctx = env.authenticatedContext('u1', { consents: { b: true } });
    // Seed via security-rules-bypass so the doc exists for the read assertion.
    await env.withSecurityRulesDisabled(async (admin) => {
      await admin.firestore().doc('users/u1/profile/main').set({
        discordId: null,
        birthDate: null,
        createdAt: new Date(),
      });
    });
    await assertSucceeds(ctx.firestore().doc('users/u1/profile/main').get());
  });

  it('returns false when consents.b is missing (basic_profile)', async () => {
    const env = await getEnv();
    const ctx = env.authenticatedContext('u1', { consents: {} });
    await assertFails(ctx.firestore().doc('users/u1/profile/main').get());
  });

  it('returns false when consents claim is entirely missing', async () => {
    const env = await getEnv();
    const ctx = env.authenticatedContext('u1', {});
    await assertFails(ctx.firestore().doc('users/u1/profile/main').get());
  });
});
