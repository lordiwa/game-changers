/**
 * contentCompleted.test.ts — Unit tests for the contentCompleted HTTPS callable.
 *
 * Cases covered:
 *   1. With consent + valid input: writes contentCompletion doc, publishes to xp-events.
 *   2. Re-call with same contentId after first completion: returns alreadyAwarded: true.
 *   3. Anti-cheat: durationSec < estReadMinutes * 60 * 0.5 → rejected (flaggedRecords written).
 *   4. Without gaming_habits consent: throws permission-denied and does not publish.
 *
 * NOTE: vi.mock factories are hoisted by vitest to the top of the file (before any variable
 * declarations). Therefore all mock factories must be self-contained — no references to
 * variables declared in the outer module scope. We use vi.hoisted() to share state between
 * the hoisted factories and the test bodies.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── vi.hoisted — declare shared mock state that both factories and tests can access ──
const {
  mockPublishMessage,
  mockTopic,
  mockContentDocGet,
  mockCompletionDocSet,
  mockCompletionDocGet,
  mockFlaggedSet,
  mockConsentGate,
  capturedHandlerRef,
} = vi.hoisted(() => {
  const mockPublishMessage = vi.fn().mockResolvedValue('msg-id-123');
  const mockTopic = vi.fn((name: string) => ({ publishMessage: mockPublishMessage, name }));
  const mockContentDocGet = vi.fn();
  const mockCompletionDocSet = vi.fn().mockResolvedValue(undefined);
  const mockCompletionDocGet = vi.fn();
  const mockFlaggedSet = vi.fn().mockResolvedValue(undefined);
  const mockConsentGate = vi.fn();
  // Use an object wrapper so the reference is mutable from within the mock factory
  const capturedHandlerRef: { fn: ((req: unknown) => Promise<unknown>) | null } = { fn: null };
  return {
    mockPublishMessage,
    mockTopic,
    mockContentDocGet,
    mockCompletionDocSet,
    mockCompletionDocGet,
    mockFlaggedSet,
    mockConsentGate,
    capturedHandlerRef,
  };
});

// ── Mock firebase-admin/app ──────────────────────────────────────────────────
vi.mock('firebase-admin/app', () => ({ initializeApp: vi.fn(), getApps: () => [] }));

// ── Mock @google-cloud/pubsub ──────────────────────────────────────────────
// Factory must be self-contained — use the hoisted mockTopic reference.
vi.mock('@google-cloud/pubsub', () => ({
  PubSub: class MockPubSub {
    topic(name: string) { return mockTopic(name); }
  },
}));

// ── Mock firebase-admin/firestore ─────────────────────────────────────────────
// doc() call pattern per handler execution:
//   call 1 (odd)  → content doc   (get returns estReadMinutes)
//   call 2 (even) → completion doc (get checks idempotency; set writes completion)
// flaggedRecords collection is accessed via collection('...').doc().set()
let _docCallCount = 0;
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    doc: (..._args: unknown[]) => {
      _docCallCount++;
      if (_docCallCount % 2 === 1) {
        return { get: mockContentDocGet };
      }
      return { get: mockCompletionDocGet, set: mockCompletionDocSet };
    },
    collection: () => ({ doc: () => ({ set: mockFlaggedSet }) }),
  }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}));

// ── Mock @gamechangers/functions-shared ───────────────────────────────────────
vi.mock('@gamechangers/functions-shared', () => ({
  consentGate: (...args: unknown[]) => mockConsentGate(...args),
}));

// ── Mock firebase-functions/v2/https ─────────────────────────────────────────
// Capture handler passed to onCall so tests can invoke it directly.
vi.mock('firebase-functions/v2/https', () => ({
  onCall: (_opts: unknown, handler: (request: unknown) => Promise<unknown>) => {
    capturedHandlerRef.fn = handler;
    return { handler };
  },
  HttpsError: class HttpsError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
      this.name = 'HttpsError';
    }
  },
}));

// ── Import module under test (after all mocks are registered) ─────────────────
import '../contentCompleted.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeRequest(data: unknown, uid = 'user-test') {
  return { auth: { uid }, data };
}

function getHandler() {
  if (!capturedHandlerRef.fn) throw new Error('Handler not captured — import may have failed');
  return capturedHandlerRef.fn;
}

/** Set up content doc with given estReadMinutes (always exists) */
function setupContentDoc(estReadMinutes = 5) {
  mockContentDocGet.mockResolvedValue({
    exists: true,
    data: () => ({ estReadMinutes, status: 'published' }),
  });
}

/** Completion doc does not exist yet (first-time completion) */
function setupNoCompletion() {
  mockCompletionDocGet.mockResolvedValue({ exists: false, data: () => undefined });
}

/** Completion doc already exists at >= 80% (idempotency case) */
function setupExistingCompletion(completionPercent = 85) {
  mockCompletionDocGet.mockResolvedValue({
    exists: true,
    data: () => ({ completionPercent }),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('contentCompleted', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _docCallCount = 0;
    mockConsentGate.mockResolvedValue(undefined); // consent granted by default
  });

  it('with consent + valid input: writes completion doc and publishes to xp-events', async () => {
    // estReadMinutes=5 → min acceptable duration = 5*60*0.5 = 150s
    // durationSec=300 passes anti-cheat; completionPercent=85 passes threshold
    setupContentDoc(5);
    setupNoCompletion();

    const handler = getHandler();
    const result = await handler(
      makeRequest({ contentId: 'article-1', completionPercent: 85, durationSec: 300 }),
    ) as { ok: boolean; xpAwarded?: number };

    expect(result.ok).toBe(true);
    // xpDelta = min(50, min(floor(300/10), floor((5*60)/10))) = min(50, min(30,30)) = 30
    expect(result.xpAwarded).toBe(30);

    // Pub/Sub: must publish to xp-events with content_completed message
    expect(mockTopic).toHaveBeenCalledWith('xp-events');
    expect(mockPublishMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        json: expect.objectContaining({
          type: 'content_completed',
          uid: 'user-test',
          contentId: 'article-1',
          durationSec: 300,
        }),
      }),
    );

    // Completion doc must be written with correct fields
    expect(mockCompletionDocSet).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'user-test',
        contentId: 'article-1',
        completionPercent: 85,
        durationSec: 300,
        xpDelta: 30,
      }),
    );
  });

  it('re-call with same contentId after completion returns alreadyAwarded: true without re-publishing', async () => {
    setupContentDoc(5);
    setupExistingCompletion(85); // already completed

    const handler = getHandler();
    const result = await handler(
      makeRequest({ contentId: 'article-1', completionPercent: 90, durationSec: 300 }),
    ) as { ok: boolean; alreadyAwarded?: boolean };

    expect(result.ok).toBe(true);
    expect(result.alreadyAwarded).toBe(true);

    // Must NOT publish to Pub/Sub again (idempotency guarantee)
    expect(mockPublishMessage).not.toHaveBeenCalled();
    // Must NOT write completion doc again
    expect(mockCompletionDocSet).not.toHaveBeenCalled();
  });

  it('anti-cheat: durationSec=1 for 5-min article is rejected with failed-precondition', async () => {
    // estReadMinutes=5 → min = 5*60*0.5 = 150s; durationSec=1 < 150 → rejected
    setupContentDoc(5);
    setupNoCompletion();

    const handler = getHandler();
    await expect(
      handler(makeRequest({ contentId: 'article-1', completionPercent: 85, durationSec: 1 })),
    ).rejects.toMatchObject({ code: 'failed-precondition' });

    // Pub/Sub must NOT fire
    expect(mockPublishMessage).not.toHaveBeenCalled();

    // flaggedRecords must be written
    expect(mockFlaggedSet).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'user-test',
        contentId: 'article-1',
        durationSec: 1,
        reason: 'suspicious_duration',
        status: 'rejected',
      }),
    );
  });

  it('without gaming_habits consent: consentGate throws and Pub/Sub is not called', async () => {
    mockConsentGate.mockRejectedValue(
      Object.assign(new Error('Consent not granted for gaming_habits'), {
        code: 'permission-denied',
      }),
    );

    const handler = getHandler();
    await expect(
      handler(makeRequest({ contentId: 'article-1', completionPercent: 85, durationSec: 300 })),
    ).rejects.toMatchObject({ code: 'permission-denied' });

    expect(mockPublishMessage).not.toHaveBeenCalled();
    expect(mockCompletionDocSet).not.toHaveBeenCalled();
  });
});
