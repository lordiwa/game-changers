/*
 * Plan 02-03 Task 1 — TDD RED: HMAC round-trip test.
 *
 * Asserts:
 *   1. callFunction generates a valid HMAC-SHA256 signature that passes verifyHmacSha256.
 *   2. A tampered body fails verification.
 *   3. The Authorization header uses the HMAC-SHA256 format: `HMAC-SHA256 t=<ts> sig=<sig>`.
 *
 * This test is the functional complement to the TOS audit grep check on functionClient.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as crypto from 'node:crypto';
import { verifyHmacSha256 } from '@gamechangers/functions-shared/hmac';

const TEST_SECRET = 'test-hmac-secret-for-bot-to-function';

// Capture fetch calls to inspect the signature.
let lastFetchArgs: { url: string; init: RequestInit } | null = null;

beforeEach(() => {
  lastFetchArgs = null;
  process.env['BOT_TO_FUNCTION_HMAC'] = TEST_SECRET;

  // Mock fetch to capture the request before returning a mock response.
  globalThis.fetch = vi.fn(async (url: string, init: RequestInit) => {
    lastFetchArgs = { url: url as string, init };
    return {
      ok: true,
      json: async () => ({ ok: true, data: { test: 'result' } }),
    } as Response;
  });
});

describe('callFunction — HMAC-signed bot→Function client', () => {
  it('sends a valid HMAC-SHA256 signature that verifyHmacSha256 accepts', async () => {
    const { callFunction } = await import('../lib/functionClient.js');
    await callFunction('https://example.test/fn', { foo: 'bar' });

    expect(lastFetchArgs).not.toBeNull();
    const authHeader = (lastFetchArgs!.init.headers as Record<string, string>)['Authorization'];
    expect(authHeader).toMatch(/^HMAC-SHA256 t=\d+ sig=[a-f0-9]{64}$/);

    // Extract the body and sig, verify using verifyHmacSha256.
    const body = lastFetchArgs!.init.body as string;
    const sigMatch = /sig=([a-f0-9]+)/.exec(authHeader);
    expect(sigMatch).not.toBeNull();
    const sig = sigMatch![1]!;

    const valid = verifyHmacSha256(body, sig, TEST_SECRET);
    expect(valid).toBe(true);
  });

  it('fails verification when body is tampered', () => {
    const secret = TEST_SECRET;
    const body = JSON.stringify({ botTimestamp: 1234, payload: { test: true } });
    const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
    const tamperedBody = body + ' ';
    const valid = verifyHmacSha256(tamperedBody, sig, secret);
    expect(valid).toBe(false);
  });

  it('Authorization header format is exactly HMAC-SHA256 t=<ts> sig=<sig>', async () => {
    const { callFunction } = await import('../lib/functionClient.js');
    await callFunction('https://example.test/fn2', { cmd: 'test' });

    const authHeader = (lastFetchArgs!.init.headers as Record<string, string>)['Authorization'];
    // Must start with "HMAC-SHA256 t=" followed by epoch seconds (10 digits), space, "sig=", 64-char hex.
    expect(authHeader).toMatch(/^HMAC-SHA256 t=\d{10} sig=[a-f0-9]{64}$/);
  });

  it('returns { ok: false, error } on HTTP error responses', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    })) as unknown as typeof fetch;

    const { callFunction } = await import('../lib/functionClient.js');
    const result = await callFunction('https://example.test/fn3', {});
    expect(result).toEqual({ ok: false, error: 'HTTP 503' });
  });
});
