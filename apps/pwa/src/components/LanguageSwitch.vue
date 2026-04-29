<script setup lang="ts">
/**
 * LanguageSwitch.vue — Language toggle (ES / EN).
 *
 * UI-SPEC §22: reka-ui Switch toggling between 'es' and 'en'.
 * Writes to /users/{uid}/profile/main.locale (NOT browser-language-detected).
 * Updates vue-i18n locale reactively.
 *
 * ESLint: no onSnapshot.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseApp } from '../firebase';

const { t, locale } = useI18n();
const db = getFirestore(firebaseApp);

const isEnglish = computed(() => locale.value === 'en');

async function toggle() {
  const newLocale = locale.value === 'es' ? 'en' : 'es';
  locale.value = newLocale;

  const uid = getAuth(firebaseApp).currentUser?.uid;
  if (uid) {
    await setDoc(
      doc(db, `users/${uid}/profile/main`),
      { locale: newLocale, updatedAt: new Date() },
      { merge: true },
    );
  }
}
</script>

<template>
  <div class="lang-switch flex items-center gap-2">
    <span class="lang-switch__label text-sm text-text-secondary">
      {{ isEnglish ? t('lang.toggle.en') : t('lang.toggle.es') }}
    </span>
    <button
      class="lang-switch__btn"
      :aria-label="`Cambiar idioma: ${isEnglish ? 'English' : 'Español'}`"
      :aria-pressed="isEnglish"
      role="switch"
      @click="toggle"
    >
      <span :class="{ 'font-bold text-text-primary': !isEnglish, 'text-text-secondary': isEnglish }">ES</span>
      <span class="lang-switch__separator mx-1 text-text-secondary">/</span>
      <span :class="{ 'font-bold text-text-primary': isEnglish, 'text-text-secondary': !isEnglish }">EN</span>
    </button>
  </div>
</template>

<style scoped>
.lang-switch__btn {
  display: flex;
  align-items: center;
  background: var(--color-surface-2, #1e1e2e);
  border: 1px solid var(--color-surface-3, #2a2a3a);
  border-radius: 0.375rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
  color: var(--color-text-primary, #e8e8f0);
  transition: border-color 0.15s;
}

.lang-switch__btn:hover {
  border-color: var(--color-accent-xp, #f59e0b);
}
</style>
