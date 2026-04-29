/*
 * /auditLog/{id}: DPO read only; client write ALWAYS denied.
 * Underpins ASVS V8 + LOPDP audit trail integrity (Threat T-02-01-05).
 */
import { describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { getEnv } from './setup';

describe('auditLog/{id}', () => {
  it('non-DPO authenticated user is DENIED on read', async () => {
    const env = await getEnv();
    await env.withSecurityRulesDisabled(async (admin) => {
      await admin.firestore().doc('auditLog/log1').set({ uid: 'u1', allowed: true });
    });
    const ctx = env.authenticatedContext('u1', {});
    await assertFails(ctx.firestore().doc('auditLog/log1').get());
  });

  it('DPO CAN read auditLog entries', async () => {
    const env = await getEnv();
    await env.withSecurityRulesDisabled(async (admin) => {
      await admin.firestore().doc('auditLog/log1').set({ uid: 'u1', allowed: true });
    });
    const dpo = env.authenticatedContext('dpo1', { role: 'dpo' });
    await assertSucceeds(dpo.firestore().doc('auditLog/log1').get());
  });

  it('client write is ALWAYS denied (even DPO)', async () => {
    const env = await getEnv();
    const dpo = env.authenticatedContext('dpo1', { role: 'dpo' });
    await assertFails(
      dpo.firestore().doc('auditLog/log1').set({ uid: 'u1', allowed: true }),
    );
  });
});
