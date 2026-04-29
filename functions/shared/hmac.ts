/*
 * HMAC-SHA256 verification with timing-safe comparison.
 * Used by the Open Wearables webhook (Plan 08) and Discord interactions endpoint (Plan 03).
 *
 * Threat: T-02-01-10 (timing attack on signature comparison).
 * Mitigation: never use === on signature bytes; always crypto.timingSafeEqual.
 */
import * as crypto from 'node:crypto';

export function verifyHmacSha256(
  rawBody: string | Buffer,
  signature: string,
  secret: string,
): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'))
    .digest('hex');

  let sigBuf: Buffer;
  let expBuf: Buffer;
  try {
    sigBuf = Buffer.from(signature, 'hex');
    expBuf = Buffer.from(expected, 'hex');
  } catch {
    return false;
  }

  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}
