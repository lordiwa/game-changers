/**
 * backfill-counters.ts — One-shot historical backfill for WR-06 denormalized counters.
 *
 * Plan: 02-14 (G3). Initializes `eventAttendedTotal` + `contentCompletedTotal` on
 * existing /users/{uid}/profile/main docs from historical auditLog data. Without
 * this, users created BEFORE WR-06 deploy have stale `0` counters that produce
 * incorrect HP/Mente/Social stats in `recomputeStats`.
 *
 * Source of truth: the `auditLog` root collection. Entries written by xpAward.ts
 * have shape:
 *   { action: 'xp_awarded', uid, type: 'event_attended' | 'content_completed', delta, ... }
 *
 * Idempotency: the script COMPUTES totals from auditLog (it does NOT use
 * `FieldValue.increment`), so re-running on the same dataset produces the same
 * target value. No "already-run" guard is needed.
 *
 * Merge safety: writes use `set(target, { merge: true })` and only set the two
 * counter fields — pre-existing fields on profile/main are preserved
 * (Threat T-02-14-02).
 *
 * Performance: paginated user enumeration (default 500 per page) plus
 * BulkWriter for the profile updates (Firestore caps writes at ~500/sec).
 *
 * Usage:
 *   tsx scripts/backfill-counters.ts --project=<id> [--dry-run] [--uid=<uid>] [--batch-size=<n>]
 *
 * Exit codes:
 *   0 success
 *   1 generic error
 *   2 missing credentials
 *
 * See docs/operations/backfill-counters-runbook.md for production execution steps.
 */
import { initializeApp, getApps, applicationDefault, type App } from 'firebase-admin/app';
import {
  getFirestore,
  type Firestore,
  type DocumentSnapshot,
  type QuerySnapshot,
} from 'firebase-admin/firestore';
import { fileURLToPath } from 'node:url';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface BackfillOptions {
  project: string;
  dryRun?: boolean;
  uid?: string;
  batchSize?: number;
}

export interface BackfillResult {
  usersScanned: number;
  usersUpdated: number;
  totalEventAttended: number;
  totalContentCompleted: number;
  errors: number;
  durationMs: number;
}

interface DiffLine {
  uid: string;
  current: { eventAttendedTotal: number; contentCompletedTotal: number };
  target: { eventAttendedTotal: number; contentCompletedTotal: number };
  diff: { eventAttendedTotal: number; contentCompletedTotal: number };
}

interface AuditLogEntry {
  action?: string;
  uid?: string;
  type?: string;
}

// ── Pure aggregation function (refactor from inline for testability) ─────────
/**
 * aggregateAuditLog — pure function. Counts `event_attended` + `content_completed`
 * entries from a list of auditLog docs (only those with action === 'xp_awarded').
 *
 * Exported for unit testing without any Firestore dependency.
 */
export function aggregateAuditLog(entries: AuditLogEntry[]): {
  events: number;
  content: number;
} {
  let events = 0;
  let content = 0;
  for (const e of entries) {
    if (e.action !== 'xp_awarded') continue;
    if (e.type === 'event_attended') events++;
    else if (e.type === 'content_completed') content++;
  }
  return { events, content };
}

// ── Firestore helpers ────────────────────────────────────────────────────────
function isEmulatorMode(): boolean {
  return Boolean(process.env['FIRESTORE_EMULATOR_HOST']);
}

let cachedApp: App | null = null;
function getOrInitApp(projectId: string): App {
  if (cachedApp) return cachedApp;
  if (getApps().length > 0) {
    cachedApp = getApps()[0]!;
    return cachedApp;
  }
  if (isEmulatorMode()) {
    // Emulator mode — no real credentials needed.
    cachedApp = initializeApp({ projectId });
  } else {
    // Production: rely on application default credentials.
    cachedApp = initializeApp({ credential: applicationDefault(), projectId });
  }
  return cachedApp;
}

/**
 * Fetch the count of `xp_awarded` audit entries for a single uid grouped by type.
 * Uses two equality-filter queries (cheaper than one collection-group scan).
 */
async function countForUid(
  db: Firestore,
  uid: string,
): Promise<{ events: number; content: number }> {
  const eventsSnap = await db
    .collection('auditLog')
    .where('action', '==', 'xp_awarded')
    .where('uid', '==', uid)
    .where('type', '==', 'event_attended')
    .get();
  const contentSnap = await db
    .collection('auditLog')
    .where('action', '==', 'xp_awarded')
    .where('uid', '==', uid)
    .where('type', '==', 'content_completed')
    .get();
  return { events: eventsSnap.size, content: contentSnap.size };
}

async function readCurrentCounters(
  db: Firestore,
  uid: string,
): Promise<{ eventAttendedTotal: number; contentCompletedTotal: number }> {
  const snap = await db.doc(`users/${uid}/profile/main`).get();
  const data = snap.exists ? (snap.data() ?? {}) : {};
  return {
    eventAttendedTotal:
      typeof data['eventAttendedTotal'] === 'number'
        ? (data['eventAttendedTotal'] as number)
        : 0,
    contentCompletedTotal:
      typeof data['contentCompletedTotal'] === 'number'
        ? (data['contentCompletedTotal'] as number)
        : 0,
  };
}

/**
 * Enumerate all uids in the `users` collection (paginated). For idempotency we
 * include users with no auditLog activity — their counters resolve to 0 (also
 * idempotent: re-running keeps them at 0).
 */
async function* enumerateUids(
  db: Firestore,
  batchSize: number,
): AsyncGenerator<string[]> {
  let lastDoc: DocumentSnapshot | null = null;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let q = db.collection('users').limit(batchSize);
    if (lastDoc) {
      q = q.startAfter(lastDoc) as typeof q;
    }
    const snap: QuerySnapshot = await q.get();
    if (snap.empty) return;
    yield snap.docs.map((d) => d.id);
    if (snap.docs.length < batchSize) return;
    lastDoc = snap.docs[snap.docs.length - 1] ?? null;
  }
}

// ── Main runner (importable for tests) ───────────────────────────────────────
export async function runBackfill(options: BackfillOptions): Promise<BackfillResult> {
  const start = Date.now();
  const { project, dryRun = false, uid: singleUid, batchSize = 500 } = options;

  if (!project) {
    throw new Error('runBackfill: --project is required');
  }

  getOrInitApp(project);
  const db = getFirestore();

  let usersScanned = 0;
  let usersUpdated = 0;
  let totalEventAttended = 0;
  let totalContentCompleted = 0;
  let errors = 0;

  async function processUid(uid: string): Promise<void> {
    usersScanned++;
    try {
      const counts = await countForUid(db, uid);
      const current = await readCurrentCounters(db, uid);
      const target = {
        eventAttendedTotal: counts.events,
        contentCompletedTotal: counts.content,
      };
      const diffLine: DiffLine = {
        uid,
        current,
        target,
        diff: {
          eventAttendedTotal: target.eventAttendedTotal - current.eventAttendedTotal,
          contentCompletedTotal:
            target.contentCompletedTotal - current.contentCompletedTotal,
        },
      };
      // Line-delimited JSON to stdout for log aggregation.
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(diffLine));

      totalEventAttended += counts.events;
      totalContentCompleted += counts.content;

      if (dryRun) return;

      await db.doc(`users/${uid}/profile/main`).set(target, { merge: true });
      usersUpdated++;
    } catch (err) {
      errors++;
      const msg = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error(JSON.stringify({ level: 'error', uid, message: msg }));
    }
  }

  if (singleUid) {
    await processUid(singleUid);
  } else {
    for await (const page of enumerateUids(db, batchSize)) {
      // Process page sequentially to avoid hammering Firestore. For 10K users
      // a 500-page sequential pass completes in ~5–10 minutes (well under the
      // documented runbook estimate).
      for (const uid of page) {
        // eslint-disable-next-line no-await-in-loop
        await processUid(uid);
      }
    }
  }

  const summary: BackfillResult = {
    usersScanned,
    usersUpdated,
    totalEventAttended,
    totalContentCompleted,
    errors,
    durationMs: Date.now() - start,
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ summary }));
  return summary;
}

// ── CLI argv parsing ──────────────────────────────────────────────────────────
function parseArgs(argv: string[]): BackfillOptions {
  const opts: Partial<BackfillOptions> = {};
  for (const arg of argv) {
    if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg.startsWith('--project=')) {
      opts.project = arg.slice('--project='.length);
    } else if (arg.startsWith('--uid=')) {
      opts.uid = arg.slice('--uid='.length);
    } else if (arg.startsWith('--batch-size=')) {
      opts.batchSize = Number(arg.slice('--batch-size='.length));
    }
  }
  // Allow project from env in emulator mode (matches GCLOUD_PROJECT pattern).
  if (!opts.project) {
    opts.project = process.env['GCLOUD_PROJECT'] ?? process.env['GCP_PROJECT'] ?? '';
  }
  if (!opts.project) {
    throw new Error('Missing required --project=<id>');
  }
  return opts as BackfillOptions;
}

// ── Entry point — only when invoked directly (not when imported by tests) ────
const isMain = (() => {
  try {
    const thisFile = fileURLToPath(import.meta.url);
    const argvFile = process.argv[1];
    return argvFile === thisFile;
  } catch {
    return false;
  }
})();

if (isMain) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  (async () => {
    try {
      const opts = parseArgs(process.argv.slice(2));
      // eslint-disable-next-line no-console
      console.error(
        `[backfill-counters] Starting: project=${opts.project} dryRun=${opts.dryRun ?? false} uid=${opts.uid ?? 'ALL'} batchSize=${opts.batchSize ?? 500}`,
      );
      await runBackfill(opts);
      process.exit(0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error(`[backfill-counters] FATAL: ${msg}`);
      if (
        msg.includes('Could not load the default credentials') ||
        msg.includes('GOOGLE_APPLICATION_CREDENTIALS') ||
        msg.includes('Application Default Credentials')
      ) {
        process.exit(2);
      }
      process.exit(1);
    }
  })();
}
