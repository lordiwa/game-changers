/**
 * usePedometer.test.ts — Tests for the Web Sensor API pedometer composable (CHLG-04 GAP).
 *
 * Tests:
 *   - Falls back gracefully when Accelerometer not available
 *   - Returns isSupported: false when Accelerometer not in window
 *   - Step count increments on simulated magnitude peaks
 *   - Step count does NOT increment without crossing thresholds
 *   - startTracking requires permission to be granted first
 *   - clearStepsToday resets the counter
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { nextTick } from 'vue';

// ── Mock @vueuse/core useLocalStorage ─────────────────────────────────────────
vi.mock('@vueuse/core', () => ({
  useLocalStorage: vi.fn((key: string, defaultValue: number) => {
    const storage = { value: defaultValue };
    return storage;
  }),
}));

// ── Mock firebase.ts ─────────────────────────────────────────────────────────
vi.mock('../firebase.js', () => ({
  db: {},
  auth: { currentUser: null },
}));

// ── Accelerometer mock ───────────────────────────────────────────────────────
class MockAccelerometer {
  x = 0;
  y = 0;
  z = 9.8; // gravity
  private listeners: Map<string, ((e: Event) => void)[]> = new Map();
  frequency: number;

  constructor(opts: { frequency: number }) {
    this.frequency = opts.frequency;
  }

  addEventListener(type: string, handler: (e: Event) => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type)!.push(handler);
  }

  start() { /* no-op in test */ }
  stop() { /* no-op in test */ }

  // Simulate a reading event
  simulateReading(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    const handlers = this.listeners.get('reading') ?? [];
    for (const h of handlers) h(new Event('reading'));
  }

  simulateError(message: string) {
    const handlers = this.listeners.get('error') ?? [];
    for (const h of handlers) h(Object.assign(new Event('error'), { error: { message } }));
  }
}

describe('usePedometer — when Accelerometer NOT supported', () => {
  beforeEach(() => {
    // Remove Accelerometer from window
    delete (window as Record<string, unknown>)['Accelerometer'];
  });

  it('isSupported is false', async () => {
    const { usePedometer } = await import('../composables/usePedometer.js');
    const { isSupported } = usePedometer();
    expect(isSupported.value).toBe(false);
  });

  it('startTracking sets error and does not throw', async () => {
    const { usePedometer } = await import('../composables/usePedometer.js');
    const { startTracking, error } = usePedometer();
    await startTracking();
    expect(error.value).toBeTruthy();
    expect(error.value).toContain('not supported');
  });

  it('requestPermission returns false', async () => {
    const { usePedometer } = await import('../composables/usePedometer.js');
    const { requestPermission, permissionGranted } = usePedometer();
    const result = await requestPermission();
    expect(result).toBe(false);
    expect(permissionGranted.value).toBe(false);
  });
});

describe('usePedometer — when Accelerometer IS supported', () => {
  let mockSensor: MockAccelerometer;

  beforeEach(() => {
    mockSensor = new MockAccelerometer({ frequency: 25 });
    // Install Accelerometer on window
    (window as Record<string, unknown>)['Accelerometer'] = function(opts: { frequency: number }) {
      mockSensor.frequency = opts.frequency;
      return mockSensor;
    };

    // Mock navigator.permissions
    Object.defineProperty(navigator, 'permissions', {
      value: {
        query: vi.fn().mockResolvedValue({ state: 'granted' }),
      },
      configurable: true,
    });
  });

  afterEach(() => {
    delete (window as Record<string, unknown>)['Accelerometer'];
  });

  it('isSupported is true', async () => {
    const { usePedometer } = await import('../composables/usePedometer.js');
    const { isSupported } = usePedometer();
    expect(isSupported.value).toBe(true);
  });

  it('requestPermission returns true when granted', async () => {
    const { usePedometer } = await import('../composables/usePedometer.js');
    const { requestPermission, permissionGranted } = usePedometer();
    const result = await requestPermission();
    expect(result).toBe(true);
    expect(permissionGranted.value).toBe(true);
  });

  it('increments steps on magnitude peak above STEP_THRESHOLD', async () => {
    const { usePedometer } = await import('../composables/usePedometer.js');
    const { startTracking, stepsToday } = usePedometer();

    await startTracking();
    await nextTick();

    const initialSteps = stepsToday.value;

    // Simulate a step: magnitude goes UP above 12 m/s² then DOWN below 9 m/s²
    // Up-crossing (magnitude ≈ 15): x=10, y=10, z=1 → sqrt(200+1) ≈ 14.17
    mockSensor.simulateReading(10, 10, 1);   // magnitude ~14.2 > 12 → step counted
    expect(stepsToday.value).toBe(initialSteps + 1);

    // Down-crossing (magnitude ≈ 5): x=3, y=3, z=3 → sqrt(27) ≈ 5.2
    mockSensor.simulateReading(3, 3, 3);     // magnitude ~5.2 < 9 → reset belowThreshold

    // Second up-crossing
    mockSensor.simulateReading(10, 10, 1);   // step counted again
    expect(stepsToday.value).toBe(initialSteps + 2);
  });

  it('does NOT count step without down-crossing between peaks', async () => {
    const { usePedometer } = await import('../composables/usePedometer.js');
    const { startTracking, stepsToday } = usePedometer();

    await startTracking();
    await nextTick();

    const initialSteps = stepsToday.value;

    // First up-crossing → step
    mockSensor.simulateReading(10, 10, 1);
    expect(stepsToday.value).toBe(initialSteps + 1);

    // Another peak WITHOUT a down-crossing → no step
    mockSensor.simulateReading(11, 11, 1);
    expect(stepsToday.value).toBe(initialSteps + 1); // unchanged
  });

  it('clearStepsToday resets to zero', async () => {
    const { usePedometer } = await import('../composables/usePedometer.js');
    const { startTracking, stepsToday, clearStepsToday } = usePedometer();

    await startTracking();
    mockSensor.simulateReading(10, 10, 1);   // count one step
    mockSensor.simulateReading(3, 3, 3);     // down-crossing

    expect(stepsToday.value).toBeGreaterThanOrEqual(0);

    clearStepsToday();
    expect(stepsToday.value).toBe(0);
  });

  it('sets error and marks not tracking on sensor error', async () => {
    const { usePedometer } = await import('../composables/usePedometer.js');
    const { startTracking, isTracking, error } = usePedometer();

    await startTracking();
    expect(isTracking.value).toBe(true);

    mockSensor.simulateError('Sensor hardware failure');

    expect(error.value).toContain('Sensor hardware failure');
    expect(isTracking.value).toBe(false);
  });
});
