import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

// Single shared RulesTestEnvironment for the suite. Each test file imports `getEnv()`.
let testEnv: RulesTestEnvironment | null = null;

export async function getEnv(): Promise<RulesTestEnvironment> {
  if (!testEnv) {
    const rulesPath = resolve(__dirname, '..', '..', 'firestore.rules');
    testEnv = await initializeTestEnvironment({
      projectId: 'gamechangers-rules-test',
      firestore: {
        rules: readFileSync(rulesPath, 'utf8'),
        host: '127.0.0.1',
        port: 8080,
      },
    });
  }
  return testEnv;
}

beforeAll(async () => {
  await getEnv();
});

beforeEach(async () => {
  if (testEnv) await testEnv.clearFirestore();
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});
