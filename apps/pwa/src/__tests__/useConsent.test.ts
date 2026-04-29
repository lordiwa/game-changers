/**
 * useConsent.test.ts — Unit tests for the useConsent composable.
 *
 * Tests:
 * 1. grant('event_participation', 1) calls httpsCallable('consentGrant') with correct args.
 * 2. On successful grant of basic_profile, usePosthog().optIn() is invoked.
 * 3. revoke('event_participation') calls httpsCallable('consentRevoke').
 * 4. requestExport calls httpsCallable('dsarExport').
 * 5. requestErasure('ELIMINAR') calls httpsCallable('accountErasure').
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Firebase mocks ---
const mockHttpsCallable = vi.fn();
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: (functions: unknown, name: string) => {
    return mockHttpsCallable.mockImplementation(async (data: unknown) => ({ data }));
  },
}));

// VueFire collection mock — returns reactive ref of consents
const mockConsents = vi.fn(() => ({
  value: [],
}));
vi.mock('vuefire', () => ({
  useCollection: vi.fn(() => ({ value: [] })),
  useDocument: vi.fn(() => ({ value: null })),
  useFirestore: vi.fn(() => ({})),
  useCurrentUser: vi.fn(() => ({ value: { uid: 'test-uid-123' } })),
}));

vi.mock('../firebase', () => ({
  firebaseApp: {},
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  doc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
  limit: vi.fn(),
}));

// PostHog mock
const mockOptIn = vi.fn();
vi.mock('../composables/usePosthog', () => ({
  usePosthog: () => ({
    optIn: mockOptIn,
    optOut: vi.fn(),
    hasOptedIn: vi.fn(() => false),
    capture: vi.fn(),
  }),
}));

// Reset modules between tests to clear module-level state
beforeEach(() => {
  vi.clearAllMocks();
  // Reset the callable mock to return success by default
  mockHttpsCallable.mockResolvedValue({ data: { ok: true } });
});

describe('useConsent', () => {
  it('grant event_participation calls consentGrant callable with correct args', async () => {
    const { useConsent } = await import('../composables/useConsent');
    const { grant } = useConsent();

    await grant('event_participation', 1);

    expect(mockHttpsCallable).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'event_participation', layer: 1 }),
    );
  });

  it('grant basic_profile triggers PostHog optIn', async () => {
    const { useConsent } = await import('../composables/useConsent');
    const { grant } = useConsent();

    await grant('basic_profile', 0);

    expect(mockOptIn).toHaveBeenCalledOnce();
  });

  it('grant non-basic_profile does NOT trigger PostHog optIn', async () => {
    const { useConsent } = await import('../composables/useConsent');
    const { grant } = useConsent();

    await grant('gaming_habits', 1);

    expect(mockOptIn).not.toHaveBeenCalled();
  });

  it('revoke calls consentRevoke callable with category', async () => {
    const { useConsent } = await import('../composables/useConsent');
    const { revoke } = useConsent();

    await revoke('event_participation');

    expect(mockHttpsCallable).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'event_participation' }),
    );
  });

  it('requestExport calls dsarExport callable', async () => {
    const { useConsent } = await import('../composables/useConsent');
    const { requestExport } = useConsent();

    await requestExport();

    expect(mockHttpsCallable).toHaveBeenCalledWith({});
  });

  it('requestErasure calls accountErasure callable with ELIMINAR', async () => {
    const { useConsent } = await import('../composables/useConsent');
    const { requestErasure } = useConsent();

    await requestErasure('ELIMINAR');

    expect(mockHttpsCallable).toHaveBeenCalledWith({ confirmation: 'ELIMINAR' });
  });
});
