/*
 * Plan 02-02 Task 1 — anonUpgrade unit tests.
 *
 * Asserts (T-02-02-09):
 *   - The uid before upgrade equals the uid after upgrade (NEVER createUser).
 *   - getAuth().updateUser is called with the same uid.
 *   - Non-anonymous callers are rejected with NOT_ANONYMOUS.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const updateUserMock = vi.fn(async (_uid: string, _props: Record<string, unknown>) => undefined);
const createUserMock = vi.fn();

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    updateUser: (uid: string, props: Record<string, unknown>) => updateUserMock(uid, props),
    createUser: () => createUserMock(),
  }),
}));

vi.mock('firebase-functions/v2/https', () => ({
  HttpsError: class HttpsError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  onCall: (_opts: unknown, handler: (req: unknown) => unknown) => handler,
}));

beforeEach(() => {
  updateUserMock.mockClear();
  createUserMock.mockClear();
});

describe('anonUpgrade', () => {
  it('preserves the anonymous uid across email upgrade (ADR-008)', async () => {
    const { anonUpgrade } = await import('../anonUpgrade.js');
    const uidBefore = 'anon-uid-stable';
    const result = await (anonUpgrade as unknown as (req: unknown) => Promise<{ uid: string; isAnonymous: boolean }>)({
      auth: {
        uid: uidBefore,
        token: { firebase: { sign_in_provider: 'anonymous' } },
      },
      data: { method: 'email', email: 'gg@example.com', password: 'verysecret' },
    });

    // Critical: the SAME uid before and after upgrade.
    const uidAfter = result.uid;
    expect(uidAfter).toBe(uidBefore);
    expect(result.isAnonymous).toBe(false);

    // updateUser used; createUser NEVER called (would mint a new uid).
    expect(updateUserMock).toHaveBeenCalledWith(uidBefore, {
      email: 'gg@example.com',
      password: 'verysecret',
    });
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it('rejects when caller is not anonymous (NOT_ANONYMOUS)', async () => {
    const { anonUpgrade } = await import('../anonUpgrade.js');
    await expect(
      (anonUpgrade as unknown as (req: unknown) => Promise<unknown>)({
        auth: {
          uid: 'already-real',
          token: { firebase: { sign_in_provider: 'password' } },
        },
        data: { method: 'email', email: 'gg@example.com', password: 'verysecret' },
      }),
    ).rejects.toMatchObject({ code: 'failed-precondition', message: 'NOT_ANONYMOUS' });
  });

  it('rejects when unauthenticated (AUTH_REQUIRED)', async () => {
    const { anonUpgrade } = await import('../anonUpgrade.js');
    await expect(
      (anonUpgrade as unknown as (req: unknown) => Promise<unknown>)({
        data: { method: 'email', email: 'a@b.c', password: 'longenough' },
      }),
    ).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('phone-method upgrade also preserves uid', async () => {
    const { anonUpgrade } = await import('../anonUpgrade.js');
    const uidBefore = 'anon-uid-phone';
    const result = await (anonUpgrade as unknown as (req: unknown) => Promise<{ uid: string }>)({
      auth: { uid: uidBefore, token: { firebase: { sign_in_provider: 'anonymous' } } },
      data: { method: 'phone', phone: '+593991234567' },
    });
    expect(result.uid).toBe(uidBefore);
    expect(updateUserMock).toHaveBeenCalledWith(uidBefore, { phoneNumber: '+593991234567' });
  });
});
