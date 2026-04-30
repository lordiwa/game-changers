/**
 * usePedometer.ts — Web Sensor API Accelerometer-based step counter (CHLG-04 GAP).
 *
 * Architecture (Pitfall #9 + T-02-08-04 LOPDP minimization):
 *   - STRICTLY opt-in per session: NO background tracking, NO wake-lock.
 *   - Tracking runs ONLY when user explicitly opens ChallengeProgress + Pedometer tab.
 *   - Steps persisted to localStorage keyed by ISO date (resets at midnight).
 *   - On submit: caller sends stepsToday to logProgress, then clearStepsToday().
 *   - Falls back gracefully on browsers without Accelerometer (returns permissionGranted: false).
 *   - No geolocation API used — Accelerometer only (T-02-08-10).
 *
 * Step detection: simple magnitude peak detection.
 *   magnitude = sqrt(x² + y² + z²)
 *   peak when magnitude crosses STEP_THRESHOLD upward after crossing DOWN_THRESHOLD downward.
 *
 * This is not a certified pedometer — it provides a reasonable estimate for casual
 * challenge logging. Manual entry remains the fallback for all accuracy-sensitive tiers.
 */
import { ref, computed, onUnmounted } from 'vue';
import { useLocalStorage } from '@vueuse/core';

const STEP_THRESHOLD = 12;     // m/s² — peak magnitude to count as step up-crossing
const DOWN_THRESHOLD = 9;      // m/s² — must drop below this before next step
const SENSOR_FREQUENCY = 25;   // Hz — 25 samples/sec, reasonable for step detection

const TODAY_KEY = () => `pedometer_steps_${new Date().toISOString().slice(0, 10)}`;

// Global sensor state — singleton so only one sensor runs at a time
let activeSensor: Accelerometer | null = null;

export function usePedometer() {
  const permissionGranted = ref(false);
  const isTracking = ref(false);
  const error = ref<string | null>(null);
  const stepsDelta = ref(0);   // steps counted in this session (not persisted)

  // Persisted to localStorage, keyed by date — survives page reload within same day
  const stepsToday = useLocalStorage<number>(TODAY_KEY(), 0);

  // Peak detection state
  let belowThreshold = true;

  // ── Feature detection ──────────────────────────────────────────────────────
  const isSupported = computed(() => {
    return typeof window !== 'undefined' && 'Accelerometer' in window;
  });

  // ── Permission request ─────────────────────────────────────────────────────
  async function requestPermission(): Promise<boolean> {
    if (!isSupported.value) {
      error.value = 'Accelerometer not supported on this device/browser';
      return false;
    }

    try {
      // Generic Sensor API requires Permissions API check
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({
          name: 'accelerometer' as PermissionName,
        });
        if (result.state === 'denied') {
          error.value = 'Accelerometer permission denied';
          permissionGranted.value = false;
          return false;
        }
      }
      permissionGranted.value = true;
      return true;
    } catch (err) {
      // Browser doesn't support permission query for accelerometer — try sensor directly
      permissionGranted.value = true;
      return true;
    }
  }

  // ── Start tracking ─────────────────────────────────────────────────────────
  async function startTracking(): Promise<void> {
    if (isTracking.value) return;
    if (!isSupported.value) {
      error.value = 'Accelerometer not supported';
      return;
    }

    const hasPermission = permissionGranted.value || (await requestPermission());
    if (!hasPermission) return;

    // Reset midnight: if stored date differs from today, reset counter
    const todayKey = TODAY_KEY();
    const storedKey = Object.keys(localStorage).find(k => k.startsWith('pedometer_steps_'));
    if (storedKey && storedKey !== todayKey) {
      // Different date key — create fresh for today
      stepsToday.value = 0;
    }

    belowThreshold = true;
    stepsDelta.value = 0;

    try {
      const AccelerometerClass = (window as unknown as { Accelerometer: new (opts: { frequency: number }) => Accelerometer }).Accelerometer;
      activeSensor = new AccelerometerClass({ frequency: SENSOR_FREQUENCY });

      activeSensor.addEventListener('reading', () => {
        if (!activeSensor) return;
        const { x, y, z } = activeSensor;
        const magnitude = Math.sqrt((x ?? 0) ** 2 + (y ?? 0) ** 2 + (z ?? 0) ** 2);

        // Simple peak detection:
        if (belowThreshold && magnitude > STEP_THRESHOLD) {
          // Upward crossing — count step
          stepsToday.value = (stepsToday.value ?? 0) + 1;
          stepsDelta.value++;
          belowThreshold = false;
        } else if (!belowThreshold && magnitude < DOWN_THRESHOLD) {
          // Downward crossing — ready for next step
          belowThreshold = true;
        }
      });

      activeSensor.addEventListener('error', (event: Event & { error?: { message?: string } }) => {
        error.value = event.error?.message ?? 'Accelerometer error';
        stopTracking();
      });

      activeSensor.start();
      isTracking.value = true;
      error.value = null;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to start accelerometer';
      permissionGranted.value = false;
    }
  }

  // ── Stop tracking ──────────────────────────────────────────────────────────
  function stopTracking(): void {
    if (activeSensor) {
      try { activeSensor.stop(); } catch { /* ignore */ }
      activeSensor = null;
    }
    isTracking.value = false;
  }

  // ── Clear today's steps (call after submitting to logProgress) ────────────
  function clearStepsToday(): void {
    stepsToday.value = 0;
    stepsDelta.value = 0;
  }

  // ── Auto-cleanup when component unmounts ───────────────────────────────────
  onUnmounted(() => {
    stopTracking();
  });

  return {
    isSupported,
    permissionGranted,
    isTracking,
    stepsToday,
    stepsDelta,
    error,
    requestPermission,
    startTracking,
    stopTracking,
    clearStepsToday,
  };
}
