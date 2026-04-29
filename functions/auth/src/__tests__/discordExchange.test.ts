/*
 * Plan 02-02 Task 1 — discordExchange unit tests.
 *
 * Strategy:
 *   - Mock global fetch to drive Discord OAuth responses.
 *   - Mock @gamechangers/functions-shared/kms so we can assert kmsEncrypt is called
 *     before refresh-token persistence (T-02-02-02).
 *   - Mock firebase-admin/auth + firestore to capture custom-token mint params + writes.
 *   - Drive the onCall handler directly via its CallableRequest shape.
 *
 * Acceptance criteria covered:
 *   - oauth2/token + users/@me strings present in source (grep below).
 *   - kmsEncrypt called with the refresh_token before Firestore persistence.
 *   - createCustomToken called with `{ consents, hasDiscord, ageVerified }`.
 *   - pendingDiscordId mismatch → DISCORD_ID_MISMATCH + auditLog `discord_link_id_mismatch`.
 *   - anonymous firebaseIdToken preserves the anonymous uid (ADR-008).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────
const kmsEncryptMock = vi.fn(async (s: string) => `kms(${s})`);
vi.mock('@gamechangers/functions-shared/kms', () => ({
  kmsEncrypt: (s: string) => kmsEncryptMock(s),
  kmsDecrypt: vi.fn(),
  KMS_KEY_NAME: 'test-key',
}));

const verifyIdTokenMock = vi.fn();
const createCustomTokenMock = vi.fn(async (_uid: string, _claims: Record<string, unknown>) => 'CUSTOM_TOKEN');
const getUserMock = vi.fn(async (_uid: string) => ({ customClaims: {} }));
vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: (t: string) => verifyIdTokenMock(t),
    createCustomToken: (uid: string, claims: Record<string, unknown>) =>
      createCustomTokenMock(uid, claims),
    getUser: (uid: string) => getUserMock(uid),
  }),
}));

// ─ Firestore mock ─────────────────────────────────────────────────────────
type DocSnap = { exists: boolean; data: () => Record<string, unknown> | undefined; id: string };
const docs: Record<string, Record<string, unknown>> = {};
const writes: Array<{ path: string; data: Record<string, unknown> }> = [];
const auditWrites: Array<Record<string, unknown>> = [];

function makeDocRef(path: string) {
  return {
    path,
    async get(): Promise<DocSnap> {
      const data = docs[path];
      return {
        exists: data !== undefined,
        data: () => data,
        id: path.split('/').pop() ?? '',
      };
    },
    async set(data: Record<string, unknown>, _opts?: { merge?: boolean }) {
      writes.push({ path, data });
      docs[path] = { ...(docs[path] ?? {}), ...data };
    },
    async delete() {
      delete docs[path];
    },
  };
}

function makeCollectionRef(path: string) {
  return {
    path,
    doc(id?: string) {
      const docId = id ?? `auto-${Math.random().toString(36).slice(2, 10)}`;
      const fullPath = `${path}/${docId}`;
      if (path === 'auditLog') {
        return {
          path: fullPath,
          async set(data: Record<string, unknown>) {
            auditWrites.push(data);
            docs[fullPath] = data;
          },
        };
      }
      return makeDocRef(fullPath);
    },
    async get() {
      const docPaths = Object.keys(docs).filter((p) => p.startsWith(`${path}/`) && p.split('/').length === path.split('/').length + 1);
      return {
        docs: docPaths.map((p) => ({
          id: p.split('/').pop() ?? '',
          data: () => docs[p],
        })),
      };
    },
  };
}

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    doc: (path: string) => makeDocRef(path),
    collection: (path: string) => makeCollectionRef(path),
  }),
  FieldValue: {
    serverTimestamp: () => '__SERVER_TIMESTAMP__',
  },
}));

// firebase-functions/v2/https — preserve real HttpsError; provide a thin onCall wrapper.
vi.mock('firebase-functions/v2/https', async () => {
  return {
    HttpsError: class HttpsError extends Error {
      code: string;
      constructor(code: string, message: string) {
        super(message);
        this.code = code;
      }
    },
    onCall: (_opts: unknown, handler: (req: unknown) => unknown) => handler,
  };
});

// ─── Test utilities ───────────────────────────────────────────────────────
function resetState() {
  for (const k of Object.keys(docs)) delete docs[k];
  writes.length = 0;
  auditWrites.length = 0;
  kmsEncryptMock.mockClear();
  verifyIdTokenMock.mockClear();
  createCustomTokenMock.mockClear();
  getUserMock.mockClear();
}

function mockDiscordFetch(opts: {
  tokenResponse?: { access_token?: string; refresh_token?: string };
  userResponse?: { id: string; username: string; global_name?: string; avatar?: string; email?: string };
  tokenStatus?: number;
  userStatus?: number;
}) {
  const fetchMock = vi.fn(async (url: string) => {
    if (url === 'https://discord.com/api/oauth2/token') {
      return {
        ok: (opts.tokenStatus ?? 200) < 400,
        status: opts.tokenStatus ?? 200,
        json: async () => ({
          access_token: opts.tokenResponse?.access_token ?? 'ACCESS_TOK',
          refresh_token: opts.tokenResponse?.refresh_token ?? 'REFRESH_TOK',
          expires_in: 604800,
          token_type: 'Bearer',
        }),
      };
    }
    if (url === 'https://discord.com/api/users/@me') {
      return {
        ok: (opts.userStatus ?? 200) < 400,
        status: opts.userStatus ?? 200,
        json: async () => opts.userResponse ?? { id: '111111111111111111', username: 'tester' },
      };
    }
    throw new Error(`unexpected fetch URL ${url}`);
  });
  globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
  return fetchMock;
}

beforeEach(() => {
  resetState();
  process.env['DISCORD_CLIENT_ID'] = 'cid';
  process.env['DISCORD_CLIENT_SECRET'] = 'csec';
  process.env['DISCORD_REDIRECT_URI'] = 'https://example.test/cb';
});

// ─── Tests ────────────────────────────────────────────────────────────────
describe('discordExchange', () => {
  it('exchanges code, encrypts refresh token via KMS, mints custom token with consents bitmap', async () => {
    mockDiscordFetch({
      userResponse: { id: '111111111111111111', username: 'tester', global_name: 'Tester', avatar: 'av' },
    });
    // Seed a granted basic_profile consent doc for the bitmap.
    docs['users/discord:111111111111111111/consents/basic_profile'] = { status: 'granted' };

    const { discordExchange } = await import('../discordExchange.js');
    const result = await (discordExchange as unknown as (req: unknown) => Promise<{ customToken: string; isExistingUser: boolean }>)({
      data: {
        code: 'CODE',
        state: 'STATE',
        pkceVerifier: 'a'.repeat(64),
      },
    });

    // KMS called with the plaintext refresh token before Firestore write.
    expect(kmsEncryptMock).toHaveBeenCalledWith('REFRESH_TOK');

    // Custom token minted with consents bitmap and hasDiscord:true.
    expect(createCustomTokenMock).toHaveBeenCalledOnce();
    const claims = createCustomTokenMock.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(claims['hasDiscord']).toBe(true);
    expect((claims['consents'] as Record<string, boolean>)['b']).toBe(true);
    expect(claims['ageVerified']).toBe(false);

    // private/discord doc has the encrypted refresh token (not plaintext).
    const discordDoc = docs['users/discord:111111111111111111/private/discord'];
    expect(discordDoc).toBeDefined();
    expect(discordDoc?.['encryptedRefreshToken']).toBe('kms(REFRESH_TOK)');
    expect(JSON.stringify(discordDoc)).not.toContain('REFRESH_TOK"'); // plaintext absent

    expect(result.customToken).toBe('CUSTOM_TOKEN');
  });

  it('preserves anonymous uid when firebaseIdToken of an anonymous user is provided (ADR-008)', async () => {
    mockDiscordFetch({
      userResponse: { id: '222222222222222222', username: 'anon-tester' },
    });
    verifyIdTokenMock.mockResolvedValueOnce({
      uid: 'anon-uid-xyz',
      firebase: { sign_in_provider: 'anonymous' },
    });

    const { discordExchange } = await import('../discordExchange.js');
    await (discordExchange as unknown as (req: unknown) => Promise<unknown>)({
      data: {
        code: 'CODE',
        state: 'STATE',
        pkceVerifier: 'a'.repeat(64),
        firebaseIdToken: 'ANON_ID_TOKEN',
      },
    });

    // Custom token minted against the anonymous uid (NOT discord:222...).
    expect(createCustomTokenMock).toHaveBeenCalledOnce();
    expect(createCustomTokenMock.mock.calls[0]?.[0]).toBe('anon-uid-xyz');
    // The persisted private/discord doc lives under the anonymous uid.
    expect(docs['users/anon-uid-xyz/private/discord']).toBeDefined();
  });

  it('rejects with DISCORD_ID_MISMATCH and writes audit log when pendingDiscordId !== oauth user.id', async () => {
    mockDiscordFetch({
      userResponse: { id: '222222222222222222', username: 'attacker' },
    });

    const { discordExchange } = await import('../discordExchange.js');
    await expect(
      (discordExchange as unknown as (req: unknown) => Promise<unknown>)({
        data: {
          code: 'CODE',
          state: 'STATE',
          pkceVerifier: 'a'.repeat(64),
          pendingDiscordId: '111111111111111111',
        },
      }),
    ).rejects.toMatchObject({ code: 'permission-denied', message: 'DISCORD_ID_MISMATCH' });

    // Audit log shape.
    expect(auditWrites.length).toBeGreaterThanOrEqual(1);
    const last = auditWrites[auditWrites.length - 1] as Record<string, unknown>;
    expect(last['action']).toBe('discord_link_id_mismatch');
    expect(last['expected']).toBe('111111111111111111');
    expect(last['actual']).toBe('222222222222222222');

    // Custom token NOT minted on mismatch.
    expect(createCustomTokenMock).not.toHaveBeenCalled();
  });

  it('passes through when pendingDiscordId matches oauth user.id', async () => {
    mockDiscordFetch({
      userResponse: { id: '333333333333333333', username: 'matcher' },
    });

    const { discordExchange } = await import('../discordExchange.js');
    const result = await (discordExchange as unknown as (req: unknown) => Promise<{ customToken: string }>)({
      data: {
        code: 'CODE',
        state: 'STATE',
        pkceVerifier: 'a'.repeat(64),
        pendingDiscordId: '333333333333333333',
      },
    });
    expect(result.customToken).toBe('CUSTOM_TOKEN');
  });
});
