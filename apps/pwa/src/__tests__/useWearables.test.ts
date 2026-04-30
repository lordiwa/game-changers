/**
 * useWearables.test.ts
 *
 * Unit tests for the useWearables composable.
 *
 * Tests:
 *   1. Without consent gate: connect() propagates the HttpsError from the callable.
 *   2. With consent granted: connect('garmin') calls the callable and opens oauthUrl.
 *   3. disconnect('garmin', false) calls callable with retainData=false.
 *   4. SUPPORTED_PROVIDERS list contains exactly the 5 webhook-capable providers.
 *   5. HealthKit and Health Connect are NOT in SUPPORTED_PROVIDERS (D-11 assertion).
 *   6. connectedDevices starts empty; loadConnectedDevices populates it from Firestore.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock firebase/auth ──────────────────────────────────────────────────────
vi.mock('firebase/auth', () => ({
  getAuth: () => ({
    currentUser: { uid: 'test-uid-123' },
  }),
}));

// ── Mock firebase/firestore ─────────────────────────────────────────────────
vi.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  collection: vi.fn((_db, path) => ({ path })),
  doc: vi.fn((_db, path) => ({ path })),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({ status: 'granted' }),
  }),
  getDocs: vi.fn().mockResolvedValue({
    docs: [
      {
        id: 'garmin',
        data: () => ({ connectedAt: '2026-04-01T00:00:00Z', lastSyncAt: '2026-04-28T12:00:00Z' }),
      },
    ],
  }),
}));

// ── Mock firebase/functions ─────────────────────────────────────────────────
const mockConnectDevice = vi.fn();
const mockDisconnectDevice = vi.fn();

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn((_, name: string) => {
    if (name === 'wearables-connectDevice') return mockConnectDevice;
    if (name === 'wearables-disconnectDevice') return mockDisconnectDevice;
    return vi.fn();
  }),
}));

// ── Mock window.open ────────────────────────────────────────────────────────
const mockOpen = vi.fn();
Object.defineProperty(global, 'window', {
  value: { open: mockOpen },
  writable: true,
});

// ── Import composable after mocks ───────────────────────────────────────────
import { useWearables, SUPPORTED_PROVIDERS } from '../composables/useWearables.js';

describe('useWearables', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Test 4 & 5: Provider list assertions ───────────────────────────────────
  it('SUPPORTED_PROVIDERS contains exactly 5 webhook-capable providers', () => {
    expect(SUPPORTED_PROVIDERS).toHaveLength(5);
    expect(SUPPORTED_PROVIDERS).toContain('garmin');
    expect(SUPPORTED_PROVIDERS).toContain('fitbit');
    expect(SUPPORTED_PROVIDERS).toContain('polar');
    expect(SUPPORTED_PROVIDERS).toContain('whoop');
    expect(SUPPORTED_PROVIDERS).toContain('oura');
  });

  it('D-11 deferral: HealthKit and Health Connect are NOT in SUPPORTED_PROVIDERS', () => {
    // Phase 2 must NOT list Apple HealthKit or Android Health Connect
    expect(SUPPORTED_PROVIDERS).not.toContain('healthkit');
    expect(SUPPORTED_PROVIDERS).not.toContain('health_connect');
    expect(SUPPORTED_PROVIDERS).not.toContain('apple_health');
    expect(SUPPORTED_PROVIDERS).not.toContain('android_health_connect');
    expect(SUPPORTED_PROVIDERS).not.toContain('samsung_health');
  });

  // ── Test 6: connectedDevices populates from Firestore ─────────────────────
  it('loadConnectedDevices populates connectedDevices from Firestore', async () => {
    const { connectedDevices, loadConnectedDevices } = useWearables();

    expect(connectedDevices.value).toHaveLength(0);

    await loadConnectedDevices();

    expect(connectedDevices.value).toHaveLength(1);
    expect(connectedDevices.value[0]?.provider).toBe('garmin');
    expect(connectedDevices.value[0]?.lastSyncAt).toBe('2026-04-28T12:00:00Z');
  });

  // ── Test 2: connect with consent granted ──────────────────────────────────
  it('connect(garmin) calls callable and opens oauthUrl in new tab', async () => {
    const TEST_OAUTH_URL = 'https://ow.gamechangers.gg/connect/garmin?uid=test-uid-123';
    mockConnectDevice.mockResolvedValueOnce({
      data: { ok: true, oauthUrl: TEST_OAUTH_URL },
    });

    const { connect } = useWearables();
    await connect('garmin');

    expect(mockConnectDevice).toHaveBeenCalledWith({ provider: 'garmin' });
    expect(mockOpen).toHaveBeenCalledWith(TEST_OAUTH_URL, '_blank', 'noopener,noreferrer');
  });

  // ── Test 1: connect propagates error from callable (simulates consent denial) ──
  it('connect propagates HttpsError when callable rejects (e.g., consent not granted)', async () => {
    const consentError = new Error('Consent not granted for wearable_data');
    (consentError as NodeJS.ErrnoException).code = 'permission-denied';
    mockConnectDevice.mockRejectedValueOnce(consentError);

    const { connect, error } = useWearables();

    await expect(connect('polar')).rejects.toThrow();
    // error ref should be set to the i18n key
    expect(error.value).toBe('wearables.error.oauth_failed');
  });

  // ── Test 3: disconnect with retainData=false ───────────────────────────────
  it('disconnect(garmin, false) calls callable with retainData=false', async () => {
    mockDisconnectDevice.mockResolvedValueOnce({ data: { ok: true } });

    // First populate the connected devices
    const { connectedDevices, disconnect } = useWearables();
    connectedDevices.value = [
      { provider: 'garmin', connectedAt: '2026-04-01T00:00:00Z', lastSyncAt: null },
    ];

    await disconnect('garmin', false);

    expect(mockDisconnectDevice).toHaveBeenCalledWith({
      provider: 'garmin',
      retainData: false,
    });
    // Optimistic removal from local list
    expect(connectedDevices.value.find((d) => d.provider === 'garmin')).toBeUndefined();
  });

  it('disconnect(polar, true) calls callable with retainData=true (data preserved)', async () => {
    mockDisconnectDevice.mockResolvedValueOnce({ data: { ok: true } });

    const { connectedDevices, disconnect } = useWearables();
    connectedDevices.value = [
      { provider: 'polar', connectedAt: '2026-04-01T00:00:00Z', lastSyncAt: null },
    ];

    await disconnect('polar', true);

    expect(mockDisconnectDevice).toHaveBeenCalledWith({
      provider: 'polar',
      retainData: true,
    });
    expect(connectedDevices.value.find((d) => d.provider === 'polar')).toBeUndefined();
  });

  it('isConnected returns true for connected provider, false otherwise', () => {
    const { connectedDevices, isConnected } = useWearables();
    connectedDevices.value = [
      { provider: 'oura', connectedAt: '2026-04-01T00:00:00Z', lastSyncAt: null },
    ];

    expect(isConnected('oura')).toBe(true);
    expect(isConnected('garmin')).toBe(false);
    expect(isConnected('whoop')).toBe(false);
  });
});
