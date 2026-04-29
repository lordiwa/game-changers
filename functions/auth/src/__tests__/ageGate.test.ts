/*
 * Plan 02-02 Task 1 — verifyAge unit tests.
 *
 * Asserts (D-14, AUTH-12, T-02-02-04..07):
 *   - <16 → HttpsError failed-precondition AGE_UNDER_16 + auditLog `age_gate_rejected`.
 *   - 16-17 → ageVerified:true, isMinor:true, parentalConsentRequired:true.
 *   - 18+ → ageVerified:true, isMinor:false.
 *   - Birth date is written to /private/identity (NOT /profile/main).
 *   - Custom claims are set server-side (T-02-02-04 spoofing mitigation).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const setCustomUserClaimsMock = vi.fn(async (_uid: string, _claims: Record<string, unknown>) => undefined);
const getUserMock = vi.fn(async (_uid: string) => ({ customClaims: {} }));
vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    setCustomUserClaims: (uid: string, claims: Record<string, unknown>) =>
      setCustomUserClaimsMock(uid, claims),
    getUser: (uid: string) => getUserMock(uid),
  }),
}));

const docs: Record<string, Record<string, unknown>> = {};
const auditWrites: Array<Record<string, unknown>> = [];

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    doc: (path: string) => ({
      async set(data: Record<string, unknown>) {
        docs[path] = { ...(docs[path] ?? {}), ...data };
      },
    }),
    collection: (path: string) => ({
      doc: () => {
        const fullPath = `${path}/auto-${Math.random().toString(36).slice(2, 10)}`;
        return {
          path: fullPath,
          async set(data: Record<string, unknown>) {
            if (path === 'auditLog') auditWrites.push(data);
            docs[fullPath] = data;
          },
        };
      },
    }),
  }),
  FieldValue: {
    serverTimestamp: () => '__SERVER_TIMESTAMP__',
  },
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

function birthDateForAge(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  // step 1 day back to be safely past the birthday boundary
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

beforeEach(() => {
  for (const k of Object.keys(docs)) delete docs[k];
  auditWrites.length = 0;
  setCustomUserClaimsMock.mockClear();
  getUserMock.mockClear();
});

describe('verifyAge', () => {
  it('rejects birthDate making user 15 with AGE_UNDER_16 + audit log entry', async () => {
    const { verifyAge } = await import('../ageGate.js');
    await expect(
      (verifyAge as unknown as (req: unknown) => Promise<unknown>)({
        auth: { uid: 'kid-uid', token: {} },
        data: { birthDate: birthDateForAge(15) },
      }),
    ).rejects.toMatchObject({ code: 'failed-precondition', message: 'AGE_UNDER_16' });

    expect(auditWrites.length).toBe(1);
    const entry = auditWrites[0]!;
    expect(entry['action']).toBe('age_gate_rejected');
    expect(entry['uid']).toBe('kid-uid');

    // No claims set, no /private/identity doc written for under-16.
    expect(setCustomUserClaimsMock).not.toHaveBeenCalled();
    expect(docs['users/kid-uid/private/identity']).toBeUndefined();
    // CRITICAL: no /profile/main write either (PII never lands in main profile).
    expect(docs['users/kid-uid/profile/main']).toBeUndefined();
  });

  it('17-year-old → isMinor:true, ageVerified:true, parentalConsentRequired:true', async () => {
    const { verifyAge } = await import('../ageGate.js');
    const result = await (verifyAge as unknown as (req: unknown) => Promise<{ ageVerified: boolean; isMinor: boolean; parentalConsentRequired: boolean }>)({
      auth: { uid: 'teen-uid', token: {} },
      data: { birthDate: birthDateForAge(17) },
    });
    expect(result.ageVerified).toBe(true);
    expect(result.isMinor).toBe(true);
    expect(result.parentalConsentRequired).toBe(true);

    // Server-side claims set.
    expect(setCustomUserClaimsMock).toHaveBeenCalledOnce();
    const claims = setCustomUserClaimsMock.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(claims['ageVerified']).toBe(true);
    expect(claims['isMinor']).toBe(true);

    // Birth date persisted in /private/identity ONLY.
    expect(docs['users/teen-uid/private/identity']?.['birthDate']).toBe(birthDateForAge(17));
    expect(docs['users/teen-uid/profile/main']).toBeUndefined();

    // Audit shape.
    const passEntry = auditWrites.find((a) => a['action'] === 'age_gate_passed');
    expect(passEntry).toBeDefined();
  });

  it('25-year-old → isMinor:false, ageVerified:true', async () => {
    const { verifyAge } = await import('../ageGate.js');
    const result = await (verifyAge as unknown as (req: unknown) => Promise<{ ageVerified: boolean; isMinor: boolean }>)({
      auth: { uid: 'adult-uid', token: {} },
      data: { birthDate: birthDateForAge(25) },
    });
    expect(result.ageVerified).toBe(true);
    expect(result.isMinor).toBe(false);
    const claims = setCustomUserClaimsMock.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(claims['isMinor']).toBe(false);
  });

  it('rejects without auth (AUTH_REQUIRED)', async () => {
    const { verifyAge } = await import('../ageGate.js');
    await expect(
      (verifyAge as unknown as (req: unknown) => Promise<unknown>)({
        data: { birthDate: '2000-01-01' },
      }),
    ).rejects.toMatchObject({ code: 'unauthenticated' });
  });
});
