/*
 * /partners/**: only callers with partner_id != null && partner_active == true claims.
 * Phase 3 issues these claims; Phase 2 ships the gate.
 */
import { describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { getEnv } from './setup';

describe('partners/{document=**}', () => {
  it('unauthenticated read is DENIED', async () => {
    const env = await getEnv();
    const ctx = env.unauthenticatedContext();
    await assertFails(ctx.firestore().doc('partners/p1/data/x').get());
  });

  it('authenticated user without partner claims is DENIED', async () => {
    const env = await getEnv();
    const ctx = env.authenticatedContext('u1', {});
    await assertFails(ctx.firestore().doc('partners/p1/data/x').get());
  });

  it('partner with partner_id and partner_active=true CAN read', async () => {
    const env = await getEnv();
    await env.withSecurityRulesDisabled(async (admin) => {
      await admin.firestore().doc('partners/p1/data/x').set({ value: 1 });
    });
    const ctx = env.authenticatedContext('partnerUser', {
      partner_id: 'p1',
      partner_active: true,
    });
    await assertSucceeds(ctx.firestore().doc('partners/p1/data/x').get());
  });

  it('inactive partner is DENIED', async () => {
    const env = await getEnv();
    const ctx = env.authenticatedContext('partnerUser', {
      partner_id: 'p1',
      partner_active: false,
    });
    await assertFails(ctx.firestore().doc('partners/p1/data/x').get());
  });
});
