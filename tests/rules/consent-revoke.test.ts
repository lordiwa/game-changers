/**
 * consent-revoke.test.ts — Asserts consent read/write Rules for revoke scenarios.
 *
 * - Owner can read own consents.
 * - Client cannot write (update) a consent doc to set status=revoked — only Functions can.
 * - Non-owner cannot read another user's consents.
 */
import { describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { getEnv } from './setup';

describe('consent-revoke: read/write Rules', () => {
  it('owner can read own consent document', async () => {
    const env = await getEnv();

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

  it('client cannot update consent doc to revoked status', async () => {
    const env = await getEnv();

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

    const ctx = env.authenticatedContext('user-abc', { consents: { b: true, e: true } });
    await assertFails(
      ctx.firestore().doc('users/user-abc/consents/event_participation').update({
        status: 'revoked',
        revokedAt: new Date(),
      }),
    );
  });

  it('non-owner cannot read another user consent', async () => {
    const env = await getEnv();

    await env.withSecurityRulesDisabled(async (admin) => {
      await admin.firestore().doc('users/user-xyz/consents/basic_profile').set({
        category: 'basic_profile',
        status: 'granted',
        version: 'v3',
        textHash: 'a'.repeat(64),
        grantedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        layer: 0,
      });
    });

    const ctx = env.authenticatedContext('user-abc', { consents: { b: true } });
    await assertFails(ctx.firestore().doc('users/user-xyz/consents/basic_profile').get());
  });

  it('unauthenticated user cannot read any consent doc', async () => {
    const env = await getEnv();
    const ctx = env.unauthenticatedContext();
    await assertFails(ctx.firestore().doc('users/user-abc/consents/basic_profile').get());
  });
});
