/*
 * /users/{uid}/healthDaily/{date}: owner read with wearable_data; client write ALWAYS denied.
 * Threat: T-02-01-04 (claim spoofing) — Rules read consents.w from request.auth.token only.
 */
import { describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { getEnv } from './setup';

describe('users/{uid}/healthDaily/{date}', () => {
  it('owner with consents.w=true CAN read', async () => {
    const env = await getEnv();
    await env.withSecurityRulesDisabled(async (admin) => {
      await admin
        .firestore()
        .doc('users/u1/healthDaily/2026-04-28')
        .set({ steps: 8000, hr_avg: 72 });
    });
    const ctx = env.authenticatedContext('u1', { consents: { w: true } });
    await assertSucceeds(ctx.firestore().doc('users/u1/healthDaily/2026-04-28').get());
  });

  it('owner without wearable_data claim is DENIED', async () => {
    const env = await getEnv();
    const ctx = env.authenticatedContext('u1', { consents: { b: true } });
    await assertFails(ctx.firestore().doc('users/u1/healthDaily/2026-04-28').get());
  });

  it('client write is ALWAYS denied even with the claim', async () => {
    const env = await getEnv();
    const ctx = env.authenticatedContext('u1', { consents: { w: true } });
    await assertFails(
      ctx.firestore().doc('users/u1/healthDaily/2026-04-28').set({ steps: 9999 }),
    );
  });
});
