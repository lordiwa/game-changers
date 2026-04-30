/*
 * Plan 02-07 — usePushNotifications composable.
 *
 * Registers FCM Web Push via Firebase Messaging SDK.
 * Only requests permission AFTER event_participation consent is granted (CLAUDE.md D-12).
 * Stores token at /users/{uid}/fcmTokens/{tokenId}.
 */
import { ref } from 'vue';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const VAPID_KEY = import.meta.env['VITE_FCM_VAPID_KEY'] as string | undefined;

export function usePushNotifications() {
  const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
  const permission = ref<NotificationPermission>(
    isSupported ? Notification.permission : 'denied',
  );
  const isRegistered = ref(false);
  const error = ref<string | null>(null);

  async function register(): Promise<boolean> {
    if (!isSupported) {
      error.value = 'Push notifications not supported';
      return false;
    }

    const auth = getAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) {
      error.value = 'Not authenticated';
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      permission.value = result;

      if (result !== 'granted') {
        error.value = 'Permission denied';
        return false;
      }

      const messaging = getMessaging();
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
      });

      if (!token) {
        error.value = 'No FCM token received';
        return false;
      }

      // Store token in Firestore
      const db = getFirestore();
      await setDoc(doc(db, `users/${uid}/fcmTokens/${token}`), {
        token,
        registeredAt: serverTimestamp(),
        userAgent: navigator.userAgent,
      });

      isRegistered.value = true;
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      return false;
    }
  }

  function onForegroundMessage(callback: (payload: unknown) => void) {
    if (!isSupported) return;
    const messaging = getMessaging();
    return onMessage(messaging, callback);
  }

  return {
    isSupported,
    permission,
    isRegistered,
    error,
    register,
    onForegroundMessage,
  };
}
