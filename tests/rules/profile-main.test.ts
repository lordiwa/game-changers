/*
 * /users/{uid}/profile/main: owner R/W gated by basic_profile;
 * immutable fields (discordId, birthDate, createdAt) cannot change on update.
 */
import { describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { getEnv } from './setup';

describe('users/{uid}/profile/main', () => {
  it('owner with consents.b=true CAN read', async () => {
    const env = await getEnv();
    await env.withSecurityRulesDisabled(async (admin) => {
      await admin.firestore().doc('users/u1/profile/main').set({
        discordId: 'd1',
        birthDate: '2008-01-01',
        createdAt: new Date(),
        displayName: 'Player1',
      });
    });
    const ctx = env.authenticatedContext('u1', { consents: { b: true } });
    await assertSucceeds(ctx.firestore().doc('users/u1/profile/main').get());
  });

  it('owner without basic_profile claim is DENIED', async () => {
    const env = await getEnv();
    const ctx = env.authenticatedContext('u1', { consents: {} });
    await assertFails(ctx.firestore().doc('users/u1/profile/main').get());
  });

  it('non-owner with consents.b=true is DENIED', async () => {
    const env = await getEnv();
    const ctx = env.authenticatedContext('u2', { consents: { b: true } });
    await assertFails(ctx.firestore().doc('users/u1/profile/main').get());
  });

  it('owner with consents.b=true CAN create profile/main', async () => {
    const env = await getEnv();
    const ctx = env.authenticatedContext('u1', { consents: { b: true } });
    await assertSucceeds(
      ctx.firestore().doc('users/u1/profile/main').set({
        discordId: 'd1',
        birthDate: '2008-01-01',
        createdAt: new Date(),
        displayName: 'Player1',
      }),
    );
  });

  it('immutable discordId cannot change on update', async () => {
    const env = await getEnv();
    await env.withSecurityRulesDisabled(async (admin) => {
      await admin.firestore().doc('users/u1/profile/main').set({
        discordId: 'd1',
        birthDate: '2008-01-01',
        createdAt: new Date(),
        displayName: 'Player1',
      });
    });
    const ctx = env.authenticatedContext('u1', { consents: { b: true } });
    await assertFails(
      ctx
        .firestore()
        .doc('users/u1/profile/main')
        .update({ discordId: 'CHANGED' }),
    );
  });

  it('mutable displayName CAN change on update', async () => {
    const env = await getEnv();
    await env.withSecurityRulesDisabled(async (admin) => {
      await admin.firestore().doc('users/u1/profile/main').set({
        discordId: 'd1',
        birthDate: '2008-01-01',
        createdAt: new Date(),
        displayName: 'Player1',
      });
    });
    const ctx = env.authenticatedContext('u1', { consents: { b: true } });
    await assertSucceeds(
      ctx
        .firestore()
        .doc('users/u1/profile/main')
        .update({ displayName: 'Player1Updated' }),
    );
  });
});
