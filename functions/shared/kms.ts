/*
 * Cloud KMS encryption helpers for Discord OAuth refresh tokens (Plan 03)
 * and any other secret-grade material persisted in Firestore.
 *
 * Key path is fixed by infra: projects/${PROJECT_ID}/locations/southamerica-east1/keyRings/gc/cryptoKeys/discord-tokens
 *
 * Threat: T-02-01-08 (key path is not a secret — IAM gates access; key MATERIAL never leaves KMS).
 */
import { KeyManagementServiceClient } from '@google-cloud/kms';

const PROJECT_ID = process.env['GCP_PROJECT'] ?? process.env['GOOGLE_CLOUD_PROJECT'] ?? '';
const KEY_NAME = `projects/${PROJECT_ID}/locations/southamerica-east1/keyRings/gc/cryptoKeys/discord-tokens`;

let client: KeyManagementServiceClient | null = null;
function getClient(): KeyManagementServiceClient {
  if (!client) client = new KeyManagementServiceClient();
  return client;
}

export async function kmsEncrypt(plaintext: string): Promise<string> {
  const [resp] = await getClient().encrypt({
    name: KEY_NAME,
    plaintext: Buffer.from(plaintext, 'utf8'),
  });
  if (!resp.ciphertext) throw new Error('kms encrypt returned no ciphertext');
  const buf = resp.ciphertext as Uint8Array | Buffer | string;
  return Buffer.isBuffer(buf)
    ? buf.toString('base64')
    : Buffer.from(buf as Uint8Array).toString('base64');
}

export async function kmsDecrypt(ciphertextBase64: string): Promise<string> {
  const [resp] = await getClient().decrypt({
    name: KEY_NAME,
    ciphertext: Buffer.from(ciphertextBase64, 'base64'),
  });
  if (!resp.plaintext) throw new Error('kms decrypt returned no plaintext');
  const buf = resp.plaintext as Uint8Array | Buffer | string;
  return Buffer.isBuffer(buf)
    ? buf.toString('utf8')
    : Buffer.from(buf as Uint8Array).toString('utf8');
}

export const KMS_KEY_NAME = KEY_NAME;
