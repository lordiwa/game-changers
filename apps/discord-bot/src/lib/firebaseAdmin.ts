/*
 * Plan 02-03 — Firebase Admin SDK (VIEWER-ONLY) for the Discord bot.
 *
 * CRITICAL security constraints (ADR-001 §IAM):
 *   - The service account used here is `gw-bot-viewer@<project>.iam.gserviceaccount.com`
 *   - It has `roles/firebase.viewer` ONLY — write attempts fail at IAM layer.
 *   - This provides defense-in-depth: even if a bug passes `set()/update()/delete()` calls,
 *     they fail at GCP IAM, and the TOS audit workflow catches any write code via grep.
 *
 * What the bot reads via this viewer SA (only 2 things):
 *   1. /leaderboards/{period} aggregate doc (for /leaderboard command)
 *   2. /users/_lookup/discord/{discordId} reverse-index (for /perfil command)
 *
 * Runtime assertion: on startup, the service-account client_email is checked to confirm
 * it belongs to the viewer-only naming convention. This catches misconfiguration early.
 */
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import * as fs from 'node:fs';

// Naming convention for the viewer-only bot service account.
// The TOS audit workflow also checks this SA's IAM roles.
const VIEWER_SA_SUFFIX = '@gw-bot-viewer.iam.gserviceaccount.com';

let _app: App | null = null;
let _db: Firestore | null = null;

/**
 * Returns a Firestore instance backed by the viewer-only bot service account.
 * Initializes once; subsequent calls return the cached instance.
 *
 * @throws If the service-account credentials do not match the viewer-only naming convention.
 */
export function getReadOnlyDb(): Firestore {
  if (_db) return _db;

  if (getApps().length === 0) {
    const credPath = process.env['GOOGLE_APPLICATION_CREDENTIALS'];

    if (credPath) {
      // Running on VM — load the service-account JSON from the known path.
      const raw = fs.readFileSync(credPath, 'utf8');
      const saJson = JSON.parse(raw) as { client_email?: string };

      // Runtime assertion: fail loud on misconfiguration — do NOT silently run with wrong SA.
      const clientEmail = saJson['client_email'] ?? '';
      if (!clientEmail.endsWith(VIEWER_SA_SUFFIX)) {
        throw new Error(
          `[firebaseAdmin] Startup assertion FAILED: service-account client_email "${clientEmail}" ` +
          `does not end with "${VIEWER_SA_SUFFIX}". ` +
          `The bot MUST use the viewer-only service account per ADR-001. ` +
          `Check GOOGLE_APPLICATION_CREDENTIALS points to the correct SA JSON.`,
        );
      }

      _app = initializeApp({ credential: cert(saJson as Parameters<typeof cert>[0]) });
    } else {
      // CI/test environment — Application Default Credentials.
      _app = initializeApp();
    }
  } else {
    _app = getApps()[0]!;
  }

  _db = getFirestore(_app);
  return _db;
}
