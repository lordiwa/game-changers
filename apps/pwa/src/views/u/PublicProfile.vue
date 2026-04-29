<script setup lang="ts">
/**
 * PublicProfile.vue — Read-only view of another user's public profile at /u/:uid.
 *
 * Only reads profile/main if publicVisibility === true.
 * If private, shows "Este perfil es privado" message.
 *
 * Uses one-shot getDoc (NOT onSnapshot per ESLint rule).
 * T-02-05-10: publicVisibility checked client-side (defense-in-depth; Rules also check).
 */
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseApp } from '../../firebase';
import { useI18n } from 'vue-i18n';
import Avatar from '../../components/Avatar.vue';
import StatRow from '../../components/StatRow.vue';
import type { ProfileMain } from '@gamechangers/shared';

const route = useRoute();
const { t } = useI18n();
const db = getFirestore(firebaseApp);

const profile = ref<ProfileMain | null>(null);
const loading = ref(true);
const isPrivate = ref(false);

onMounted(async () => {
  const uid = route.params.uid as string;
  if (!uid) { loading.value = false; return; }

  try {
    const snap = await getDoc(doc(db, `users/${uid}/profile/main`));
    if (!snap.exists()) {
      isPrivate.value = true;
      return;
    }
    const data = snap.data() as ProfileMain;
    // T-02-05-10: client-side publicVisibility check (Rules also enforce)
    if (!data.publicVisibility) {
      isPrivate.value = true;
      return;
    }
    profile.value = data;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="public-profile p-4 max-w-lg mx-auto">
    <div v-if="loading" class="text-text-secondary text-center py-8">Cargando...</div>

    <div v-else-if="isPrivate" class="text-center py-12">
      <div class="text-4xl mb-4" aria-hidden="true">🔒</div>
      <p class="text-text-secondary">Este perfil es privado.</p>
    </div>

    <div v-else-if="profile" class="public-profile__content">
      <!-- Avatar + name -->
      <div class="flex items-center gap-3 mb-4">
        <Avatar :display-name="profile.displayName" :image-url="profile.avatar" size="lg" />
        <div>
          <h1 class="text-xl font-bold text-text-primary">{{ profile.displayName }}</h1>
          <div class="text-sm text-text-secondary">Nivel {{ profile.level }}</div>
        </div>
      </div>

      <!-- Stats (HP/Stamina/Mente/Social — these are game stats, not raw health metrics) -->
      <section class="public-profile__stats" aria-label="Estadísticas">
        <h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">
          Estadísticas
        </h2>
        <div class="stats-card">
          <StatRow stat-key="hp" :value="profile.stats?.hp ?? 1" :label="t('stats.hp')" />
          <StatRow stat-key="stamina" :value="profile.stats?.stamina ?? 1" :label="t('stats.stamina')" />
          <StatRow stat-key="mente" :value="profile.stats?.mente ?? 1" :label="t('stats.mente')" />
          <StatRow stat-key="social" :value="profile.stats?.social ?? 1" :label="t('stats.social')" />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.stats-card {
  background-color: var(--color-surface-2, #1e1e2e);
  border-radius: 0.75rem;
  padding: 0.75rem;
}
</style>
