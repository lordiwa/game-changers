/**
 * useWearables.ts — Composable for wearable device connect/disconnect.
 *
 * Flow:
 *   1. User must have wearable_data consent (Layer 3) before any connect.
 *   2. connect(provider) → calls connectDevice callable → opens oauthUrl in new tab.
 *   3. Open Wearables handles provider OAuth; samples stream via webhook once connected.
 *   4. disconnect(provider, retainData) → calls disconnectDevice callable.
 *
 * CRITICAL (WEAR-12 anti-feature):
 *   This composable NEVER reads raw health values to surface alerts.
 *   ConnectedDevice shows last-sync timestamp only — no HR/sleep value rendering here.
 *
 * No onSnapshot — uses one-shot getDocs for connected device list.
 * ESLint rule: no-onsnapshot enforced.
 *
 * Providers supported (D-11 deferral — webhook-only in Phase 2):
 *   garmin, fitbit, polar, whoop, oura
 *   Apple HealthKit and Android Health Connect deferred to Phase 3.
 */
import { ref, computed } from 'vue';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Providers available in Phase 2 (webhook-capable via Open Wearables)
// NO HealthKit, NO Health Connect per D-11 deferral.
export const SUPPORTED_PROVIDERS = ['garmin', 'fitbit', 'polar', 'whoop', 'oura'] as const;
export type WearableProvider = typeof SUPPORTED_PROVIDERS[number];

export interface ConnectedDevice {
  provider: WearableProvider;
  connectedAt: string;      // ISO date string
  lastSyncAt: string | null; // ISO date string or null if never synced
}

export interface ConnectResult {
  ok: boolean;
  oauthUrl: string;
}

export interface DisconnectOptions {
  retainData: boolean;
}

export function useWearables() {
  const connectedDevices = ref<ConnectedDevice[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isConnected = (provider: WearableProvider): boolean => {
    return connectedDevices.value.some((d) => d.provider === provider);
  };

  /**
   * Load the list of connected wearable devices for the current user.
   * Uses getDocs (one-shot) — no onSnapshot per ESLint rule.
   */
  async function loadConnectedDevices(): Promise<void> {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      connectedDevices.value = [];
      return;
    }

    loading.value = true;
    error.value = null;
    try {
      const db = getFirestore();
      // connectDevice stores device records in users/{uid}/private/wearable.{provider}
      // For the list view, we read from the _lookup subcollection set by connectDevice.
      // The connectDevice Function writes to users/{uid}/private/wearable_oauth_state
      // and the webhook writes samples. We use the wearable_connections subcollection.
      const connectionsRef = collection(db, `users/${user.uid}/wearable_connections`);
      const snap = await getDocs(connectionsRef);
      connectedDevices.value = snap.docs
        .filter((doc) => SUPPORTED_PROVIDERS.includes(doc.id as WearableProvider))
        .map((doc) => {
          const data = doc.data();
          return {
            provider: doc.id as WearableProvider,
            connectedAt: data['connectedAt'] ?? '',
            lastSyncAt: data['lastSyncAt'] ?? null,
          };
        });
    } catch (err) {
      console.error('[useWearables] loadConnectedDevices error:', err);
      error.value = 'wearables.error.load_failed';
    } finally {
      loading.value = false;
    }
  }

  /**
   * Initiate wearable OAuth connection.
   * Requires wearable_data consent (Layer 3) — the callable enforces this server-side.
   * On success, opens the returned oauthUrl in a new tab.
   */
  async function connect(provider: WearableProvider): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const functions = getFunctions(undefined, 'southamerica-east1');
      const connectDevice = httpsCallable<{ provider: string }, ConnectResult>(
        functions,
        'wearables-connectDevice',
      );
      const result = await connectDevice({ provider });
      const { ok, oauthUrl } = result.data;
      if (ok && oauthUrl) {
        // Open OAuth flow in new tab — OW handles provider OAuth dance.
        // Once connected, OW posts samples to our webhook automatically.
        window.open(oauthUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err: unknown) {
      console.error('[useWearables] connect error:', err);
      // Map Firebase Functions errors to i18n keys
      error.value = 'wearables.error.oauth_failed';
      throw err; // re-throw so component can show toast
    } finally {
      loading.value = false;
    }
  }

  /**
   * Disconnect a wearable device.
   * retainData=true keeps samples (default); retainData=false queues deletion.
   */
  async function disconnect(
    provider: WearableProvider,
    retainData: boolean,
  ): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const functions = getFunctions(undefined, 'southamerica-east1');
      const disconnectDevice = httpsCallable<
        { provider: string; retainData: boolean },
        { ok: boolean }
      >(functions, 'wearables-disconnectDevice');
      await disconnectDevice({ provider, retainData });
      // Remove from local list optimistically
      connectedDevices.value = connectedDevices.value.filter(
        (d) => d.provider !== provider,
      );
    } catch (err) {
      console.error('[useWearables] disconnect error:', err);
      error.value = 'wearables.error.disconnect_failed';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  const hasConnectedDevices = computed(() => connectedDevices.value.length > 0);

  return {
    connectedDevices,
    hasConnectedDevices,
    loading,
    error,
    isConnected,
    loadConnectedDevices,
    connect,
    disconnect,
    SUPPORTED_PROVIDERS,
  };
}
