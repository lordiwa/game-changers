/**
 * useTheme.ts — Composable for dark/light theme toggle.
 *
 * Theme is persisted to /users/{uid}/profile/main.theme (server-side, cross-device).
 * Applied to <html data-theme="dark|light">.
 * NOT browser-language-detected — explicit user choice only.
 *
 * ESLint: no onSnapshot — uses one-shot getDoc + reactive ref.
 */
import { ref, watch, type Ref } from 'vue';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { useCurrentUser } from 'vuefire';
import { firebaseApp } from '../firebase';

export type ThemeMode = 'dark' | 'light';

export interface UseThemeReturn {
  theme: Ref<ThemeMode>;
  toggle: () => Promise<void>;
  setTheme: (mode: ThemeMode) => Promise<void>;
}

export function useTheme(): UseThemeReturn {
  const currentUser = useCurrentUser();
  const db = getFirestore(firebaseApp);

  const theme = ref<ThemeMode>('dark'); // Default: dark (per UI-SPEC)

  function applyToDom(mode: ThemeMode) {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', mode);
    }
  }

  async function persistTheme(uid: string, mode: ThemeMode) {
    await setDoc(
      doc(db, `users/${uid}/profile/main`),
      { theme: mode, updatedAt: new Date() },
      { merge: true },
    );
  }

  async function setTheme(mode: ThemeMode): Promise<void> {
    theme.value = mode;
    applyToDom(mode);
    const uid = currentUser.value?.uid;
    if (uid) {
      await persistTheme(uid, mode);
    }
  }

  async function toggle(): Promise<void> {
    await setTheme(theme.value === 'dark' ? 'light' : 'dark');
  }

  // Apply initial theme on mount
  watch(
    () => theme.value,
    (mode) => applyToDom(mode),
    { immediate: true },
  );

  return { theme, toggle, setTheme };
}
