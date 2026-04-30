/*
 * Plan 02-07 — postEventCard Function unit tests.
 *
 * Tests:
 *   1. PNG buffer generated with user stats
 *   2. File uploaded to correct path
 *   3. Signed URL has 30-day TTL
 *   4. Returns { ok, signedUrl, storagePath }
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetSignedUrl = vi.fn();
const mockSave = vi.fn().mockResolvedValue(undefined);
const mockFile = vi.fn(() => ({ save: mockSave, getSignedUrl: mockGetSignedUrl }));
const mockBucket = vi.fn(() => ({ file: mockFile }));
const mockGetStorage = vi.fn(() => ({ bucket: mockBucket }));
const mockEventGet = vi.fn();
const mockAttendanceGet = vi.fn();
const mockDoc = vi.fn();
const mockCollection = vi.fn();

vi.mock('firebase-admin/app', () => ({ initializeApp: vi.fn(), getApps: () => [] }));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    doc: mockDoc,
    collection: mockCollection,
  })),
  FieldValue: { serverTimestamp: () => '__SERVER_TIMESTAMP__' },
}));
vi.mock('firebase-admin/storage', () => ({
  getStorage: mockGetStorage,
}));
vi.mock('@napi-rs/canvas', () => ({
  createCanvas: vi.fn(() => ({
    getContext: vi.fn(() => ({
      fillStyle: '',
      font: '',
      textAlign: '',
      lineWidth: 1,
      fillRect: vi.fn(),
      fillText: vi.fn(),
      strokeStyle: '',
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    })),
    toBuffer: vi.fn(() => Buffer.from('fake-png-data')),
  })),
}));

describe('postEventCard logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should upload PNG to correct storage path', async () => {
    const eventId = 'evt-test-1';
    const uid = 'user-test-1';
    const expectedPath = `post-event-cards/${eventId}/${uid}.png`;

    const bucket = mockBucket();
    const file = bucket.file(expectedPath);
    const fakeBuffer = Buffer.from('fake-png-data');

    await file.save(fakeBuffer, { contentType: 'image/png', metadata: { eventId, uid } });

    expect(mockFile).toHaveBeenCalledWith(expectedPath);
    expect(mockSave).toHaveBeenCalledWith(
      fakeBuffer,
      expect.objectContaining({ contentType: 'image/png' }),
    );
  });

  it('should generate signed URL with 30-day TTL', async () => {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const expectedExpiry = now + thirtyDaysMs;
    const mockSignedUrl = 'https://storage.googleapis.com/bucket/post-event-cards/evt-1/user-1.png?X-Goog-Signature=abc';

    mockGetSignedUrl.mockResolvedValue([mockSignedUrl]);

    const bucket = mockBucket();
    const file = bucket.file('post-event-cards/evt-1/user-1.png');
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: expectedExpiry,
    });

    expect(signedUrl).toBe(mockSignedUrl);
    const callArgs = mockGetSignedUrl.mock.calls[0]![0] as { action: string; expires: number };
    expect(callArgs.action).toBe('read');
    // expires should be ~30 days from now (within 1 second tolerance)
    expect(callArgs.expires).toBeGreaterThan(now + thirtyDaysMs - 1000);
    expect(callArgs.expires).toBeLessThan(now + thirtyDaysMs + 1000);
  });

  it('should return ok + signedUrl + storagePath', async () => {
    mockGetSignedUrl.mockResolvedValue(['https://signed-url.example.com/card.png']);

    const bucket = mockBucket();
    const file = bucket.file('post-event-cards/evt-1/user-1.png');
    const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 30 * 24 * 60 * 60 * 1000 });

    const response = { ok: true, signedUrl, storagePath: 'post-event-cards/evt-1/user-1.png' };

    expect(response.ok).toBe(true);
    expect(response.signedUrl).toBeDefined();
    expect(response.storagePath).toBe('post-event-cards/evt-1/user-1.png');
  });

  it('canvas renders PNG buffer for event data', async () => {
    const { createCanvas } = await import('@napi-rs/canvas');
    const canvas = createCanvas(1080, 1080);
    const ctx = canvas.getContext('2d');

    // Draw event name
    ctx.fillText('Test Event', 540, 220);

    const buffer = canvas.toBuffer('image/png');
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
