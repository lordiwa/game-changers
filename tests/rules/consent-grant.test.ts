/**
 * consent-grant.test.ts — Asserts clients CANNOT directly write consent docs.
 *
 * The Firestore rule for /users/{uid}/consents/{category} denies client writes.
 * Only the Functions service-account (via Admin SDK bypass) can write consent docs.
 */
import { describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { getEnv } from './setup';

describe('consent-grant: client cannot write consent docs directly', () => {
  it('denies client write to own consent doc', async () => {
    const env = await getEnv();
    // Authenticated user with basic_profile consent (claim b=true)
    const ctx = env.authenticatedContext('user-abc', { consents: { b: true } });

    await assertFails(
      ctx
        .firestore()
        .doc('users/user-abc/consents/event_participation')
        .set({
          category: 'event_participation',
          status: 'granted',
          version: 'v3',
          textHash: 'a'.repeat(64),
          grantedAt: new Date(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          layer: 1,
        }),
    );
  });

  it('denies client write to another user consent doc', async () => {
    const env = await getEnv();
    const ctx = env.authenticatedContext('user-abc', { consents: { b: true } });

    await assertFails(
      ctx
        .firestore()
        .doc('users/user-xyz/consents/basic_profile')
        .set({
          category: 'basic_profile',
          status: 'granted',
          version: 'v3',
          textHash: 'a'.repeat(64),
          grantedAt: new Date(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          layer: 0,
        }),
    );
  });

  it('allows owner to READ own consent doc when it exists', async () => {
    const env = await getEnv();
    // Seed via admin bypass
    await env.withSecurityRulesDisabled(async (admin) => {
      await admin.firestore().doc('users/user-abc/consents/event_participation').set({
        category: 'event_participation',
        status: 'granted',
        version: 'v3',
        textHash: 'a'.repeat(64),
        grantedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        layer: 1,
      });
    });

    const ctx = env.authenticatedContext('user-abc', { consents: { b: true } });
    await assertSucceeds(ctx.firestore().doc('users/user-abc/consents/event_participation').get());
  });
});
