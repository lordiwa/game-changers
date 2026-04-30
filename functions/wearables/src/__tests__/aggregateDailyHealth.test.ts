/**
 * aggregateDailyHealth.test.ts
 *
 * Tests the daily health rollup aggregation logic.
 * Seeds sample docs for one day → asserts healthDaily has correct sum/count/avg.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Firestore ─────────────────────────────────────────────────────────
const mockHealthDailySet = vi.fn().mockResolvedValue(undefined);
const mockAuditSet = vi.fn().mockResolvedValue(undefined);

function buildSampleDoc(metric: string, value: number) {
  return {
    data: () => ({
      metric,
      value,
      recordedAt: { toDate: () => new Date('2026-04-01T10:00:00Z') },
    }),
  };
}

const mockDb = {
  collection: vi.fn().mockImplementation((path: string) => {
    if (path.includes('healthSamples')) {
      return {
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({
          docs: Array.from({ length: 100 }, (_, i) =>
            buildSampleDoc('steps', 500 + i),
          ),
          size: 100,
        }),
      };
    }
    // auditLog
    return { doc: vi.fn().mockReturnValue({ set: mockAuditSet }) };
  }),
  doc: vi.fn().mockImplementation((path: string) => {
    if (path.includes('healthDaily')) return { set: mockHealthDailySet };
    return { set: vi.fn().mockResolvedValue(undefined) };
  }),
};

vi.mock('firebase-admin/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn().mockReturnValue(mockDb),
  FieldValue: { serverTimestamp: vi.fn().mockReturnValue('__ts__') },
  Timestamp: {
    fromDate: vi.fn().mockImplementation((d: Date) => ({ _seconds: d.getTime() / 1000 })),
  },
}));

vi.mock('firebase-functions/v2/https', () => ({
  onRequest: vi.fn().mockImplementation((_opts: unknown, handler: unknown) => handler),
}));

describe('aggregateDailyHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHealthDailySet.mockResolvedValue(undefined);
    mockAuditSet.mockResolvedValue(undefined);
  });

  it('100 step samples for one day → healthDaily doc has correct sum', async () => {
    const { aggregateDailyHealth } = await import('../aggregateDailyHealth.js');

    const req = {
      method: 'POST',
      body: { uid: 'user-123', day: '2026-04-01' },
    };
    const res = {
      statusCode: 200,
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    await (aggregateDailyHealth as unknown as Function)(req, res);

    // healthDaily doc should have been written
    expect(mockHealthDailySet).toHaveBeenCalled();

    const written = mockHealthDailySet.mock.calls[0]?.[0];
    expect(written).toBeDefined();
    expect(written.date).toBe('2026-04-01');
    // 100 samples: values 500..599, sum = 100*500 + (0+99)*100/2 = 50000 + 4950 = 54950
    expect(written.stepsTotal).toBe(54950);
    expect(written.byMetric['steps']).toBeDefined();
    expect(written.byMetric['steps'].count).toBe(100);
    expect(written.byMetric['steps'].sum).toBe(54950);
    expect(written.byMetric['steps'].avg).toBeCloseTo(549.5);
  });

  it('rejects GET method → 405', async () => {
    const { aggregateDailyHealth } = await import('../aggregateDailyHealth.js');

    const req = { method: 'GET', body: {} };
    const res = {
      statusCode: 0,
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    await (aggregateDailyHealth as unknown as Function)(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('invalid day format → 400', async () => {
    const { aggregateDailyHealth } = await import('../aggregateDailyHealth.js');

    const req = {
      method: 'POST',
      body: { uid: 'user-123', day: 'not-a-date' },
    };
    const res = {
      statusCode: 0,
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    await (aggregateDailyHealth as unknown as Function)(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('writes source=[wearable] to healthDaily doc', async () => {
    const { aggregateDailyHealth } = await import('../aggregateDailyHealth.js');

    const req = {
      method: 'POST',
      body: { uid: 'user-123', day: '2026-04-01' },
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    await (aggregateDailyHealth as unknown as Function)(req, res);

    const written = mockHealthDailySet.mock.calls[0]?.[0];
    expect(written.source).toContain('wearable');
  });

  it('writes healthDaily to correct path /users/{uid}/healthDaily/{day}', async () => {
    const { aggregateDailyHealth } = await import('../aggregateDailyHealth.js');

    const req = {
      method: 'POST',
      body: { uid: 'user-abc', day: '2026-04-15' },
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    await (aggregateDailyHealth as unknown as Function)(req, res);

    expect(mockDb.doc).toHaveBeenCalledWith(
      expect.stringContaining('users/user-abc/healthDaily/2026-04-15'),
    );
  });
});
