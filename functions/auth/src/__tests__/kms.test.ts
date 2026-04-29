/*
 * Plan 02-02 Task 1 — KMS round-trip tests for Discord refresh-token encryption.
 *
 * Asserts (T-02-02-02):
 *   - kmsEncrypt(plaintext) → ciphertext is base64-encoded and != plaintext.
 *   - kmsDecrypt(ciphertext) returns the original plaintext.
 *   - A tampered ciphertext fails to decrypt.
 *
 * Uses a stub @google-cloud/kms client (deterministic XOR with a fixed key) so the
 * round-trip is exercised end-to-end without real KMS calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const KEY = Buffer.from('gamechangers-fake-kms-key-256bit-x'.repeat(2).slice(0, 32), 'utf8');
function xorBytes(buf: Buffer): Buffer {
  const out = Buffer.alloc(buf.length);
  for (let i = 0; i < buf.length; i++) {
    out[i] = (buf[i] ?? 0) ^ (KEY[i % KEY.length] ?? 0);
  }
  return out;
}

vi.mock('@google-cloud/kms', () => ({
  KeyManagementServiceClient: class FakeKms {
    async encrypt({ plaintext }: { plaintext: Buffer }) {
      // Add a 4-byte authenticity tag so tampered bytes fail decrypt.
      const tag = Buffer.from('GCv1');
      const body = xorBytes(plaintext);
      return [{ ciphertext: Buffer.concat([tag, body]) }];
    }
    async decrypt({ ciphertext }: { ciphertext: Buffer }) {
      const tag = ciphertext.subarray(0, 4).toString('utf8');
      if (tag !== 'GCv1') throw new Error('TAMPERED');
      const body = ciphertext.subarray(4);
      return [{ plaintext: xorBytes(body) }];
    }
  },
}));

beforeEach(() => {
  process.env['GCP_PROJECT'] = 'test-project';
});

describe('kms round-trip', () => {
  it('encrypts then decrypts back to the original plaintext', async () => {
    const { kmsEncrypt, kmsDecrypt } = await import('@gamechangers/functions-shared/kms');
    const plaintext = 'discord-refresh-token-DnIcl9p2';
    const ct = await kmsEncrypt(plaintext);
    expect(ct).not.toBe(plaintext);
    // base64 alphabet only
    expect(/^[A-Za-z0-9+/=]+$/.test(ct)).toBe(true);
    const back = await kmsDecrypt(ct);
    expect(back).toBe(plaintext);
  });

  it('tampered ciphertext fails to decrypt', async () => {
    const { kmsEncrypt, kmsDecrypt } = await import('@gamechangers/functions-shared/kms');
    const ct = await kmsEncrypt('payload');
    // flip bytes within the auth tag prefix
    const buf = Buffer.from(ct, 'base64');
    buf[0] = ((buf[0] ?? 0) ^ 0xff) & 0xff;
    const tampered = buf.toString('base64');
    await expect(kmsDecrypt(tampered)).rejects.toThrow();
  });
});
