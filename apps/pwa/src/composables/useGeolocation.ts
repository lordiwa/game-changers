/*
 * Plan 02-07 — useGeolocation composable.
 *
 * Thin wrapper over @vueuse/core useGeolocation with a 3-second timeout.
 * Privacy: coordinates are NEVER persisted client-side. Used only at check-in time.
 */
import { useGeolocation as vueUseGeolocation } from '@vueuse/core';

export interface GeoResult {
  lat: number;
  lng: number;
}

/**
 * Get the device's current coordinates with a 3-second timeout.
 * Returns null if geolocation is denied, unavailable, or times out.
 */
export async function getCurrentPosition(): Promise<GeoResult | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    const timer = setTimeout(() => resolve(null), 3000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { timeout: 3000, maximumAge: 30000 },
    );
  });
}

/**
 * Reactive composable for geolocation state (for UI display only).
 * Uses @vueuse/core under the hood.
 */
export function useGeolocation() {
  return vueUseGeolocation({
    timeout: 3000,
    maximumAge: 30000,
    immediate: false,
  });
}
