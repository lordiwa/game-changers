/*
 * Baseline test: deny-all default works.
 * Threat: T-02-01-01 — proves the catch-all match /{document=**} { allow ...: if false; }
 * blocks unauthenticated reads on every protected collection.
 */
import { describe, it } from 'vitest';
import { assertFails } from '@firebase/rules-unit-testing';
import { getEnv } from './setup';

describe('baseline deny-all default', () => {
  it('unauth read of /users/{uid}/profile/main is denied', async () => {
    const env = await getEnv();
    const ctx = env.unauthenticatedContext();
    await assertFails(ctx.firestore().doc('users/u1/profile/main').get());
  });

  it('unauth read of /users/{uid}/healthDaily/{date} is denied', async () => {
    const env = await getEnv();
    const ctx = env.unauthenticatedContext();
    await assertFails(ctx.firestore().doc('users/u1/healthDaily/2026-04-28').get());
  });

  it('unauth read of /users/{uid}/consents/{category} is denied', async () => {
    const env = await getEnv();
    const ctx = env.unauthenticatedContext();
    await assertFails(ctx.firestore().doc('users/u1/consents/basic_profile').get());
  });

  it('unauth read of /auditLog/{id} is denied', async () => {
    const env = await getEnv();
    const ctx = env.unauthenticatedContext();
    await assertFails(ctx.firestore().doc('auditLog/x').get());
  });

  it('unauth read of /partners/foo is denied', async () => {
    const env = await getEnv();
    const ctx = env.unauthenticatedContext();
    await assertFails(ctx.firestore().doc('partners/foo').get());
  });

  it('unauth read of an unknown collection is denied (catch-all)', async () => {
    const env = await getEnv();
    const ctx = env.unauthenticatedContext();
    await assertFails(ctx.firestore().doc('unknown/doc').get());
  });
});
