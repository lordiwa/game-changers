/**
 * useInstallPrompt.ts — Composable for PWA install prompt.
 *
 * Per D-13: Install nudge appears in profile menu ONLY (never popups/banners).
 * SUPPRESSED entirely on iOS Safari (no beforeinstallprompt event + iPhone/iPad/iPod UA).
 *
 * Usage: only mount <InstallNudge> when canInstall is true.
 */
import { ref, onMounted, onUnmounted, type Ref } from 'vue';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface UseInstallPromptReturn {
  canInstall: Ref<boolean>;
  prompt: () => Promise<void>;
}

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/.test(ua);
  const isChromium = /CriOS|FxiOS/.test(ua);
  return isIos && !isChromium;
}

export function useInstallPrompt(): UseInstallPromptReturn {
  const canInstall = ref(false);
  let deferredPrompt: BeforeInstallPromptEvent | null = null;

  function handleBeforeInstallPrompt(e: Event) {
    // Suppress on iOS Safari per D-13
    if (isIosSafari()) return;
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    canInstall.value = true;
  }

  function handleAppInstalled() {
    canInstall.value = false;
    deferredPrompt = null;
  }

  onMounted(() => {
    if (isIosSafari()) return; // Never listen on iOS Safari
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
  });

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', handleAppInstalled);
  });

  async function prompt(): Promise<void> {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      canInstall.value = false;
    }
    deferredPrompt = null;
  }

  return { canInstall, prompt };
}
