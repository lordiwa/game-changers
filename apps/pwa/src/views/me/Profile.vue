<script setup lang="ts">
/**
 * Profile.vue — Editable profile form at /me/profile.
 *
 * Per D-17: pronouns are free-text, NEVER required.
 * Save button is enabled even with empty pronouns + empty avatar.
 *
 * Writes directly to /users/{uid}/profile/main via profile store
 * (Plan 01 Rules allow it with basic_profile consent).
 *
 * ESLint: no onSnapshot.
 */
import { ref, computed, onMounted } from 'vue';
import { useCurrentUser } from 'vuefire';
import { useI18n } from 'vue-i18n';
import { useProfileStore } from '../../stores/profile';
import InstallNudge from '../../components/InstallNudge.vue';
import LanguageSwitch from '../../components/LanguageSwitch.vue';
import ThemeSwitch from '../../components/ThemeSwitch.vue';
import AppShell from '../../components/AppShell.vue';

const { t } = useI18n();
const currentUser = useCurrentUser();
const profileStore = useProfileStore();

onMounted(async () => {
  const uid = currentUser.value?.uid;
  if (uid && !profileStore.profile) {
    await profileStore.fetchProfile(uid);
  }
  // Populate form from loaded profile
  if (profileStore.profile) {
    form.value.displayName = profileStore.profile.displayName ?? '';
    form.value.pronouns = (profileStore.profile.pronouns as string) ?? '';
    form.value.city = profileStore.profile.city ?? 'other';
    form.value.publicVisibility = profileStore.profile.publicVisibility ?? false;
  }
});

// Form state
const form = ref({
  displayName: '',
  pronouns: '',    // D-17: free-text, never required
  city: 'other' as 'quito' | 'guayaquil' | 'cuenca' | 'other',
  publicVisibility: false,
});

const saving = ref(false);
const saved = ref(false);

async function save() {
  saving.value = true;
  saved.value = false;
  try {
    await profileStore.updateProfile({
      displayName: form.value.displayName,
      pronouns: form.value.pronouns || undefined,
      city: form.value.city,
      publicVisibility: form.value.publicVisibility,
    });
    saved.value = true;
    setTimeout(() => { saved.value = false; }, 2000);
  } finally {
    saving.value = false;
  }
}

const cityOptions = [
  { value: 'quito', label: 'Quito' },
  { value: 'guayaquil', label: 'Guayaquil' },
  { value: 'cuenca', label: 'Cuenca' },
  { value: 'other', label: 'Otra ciudad' },
];
</script>

<template>
  <AppShell>
    <div class="profile-view p-4 max-w-lg mx-auto">
      <h1 class="text-xl font-bold text-text-primary mb-6">Mi perfil</h1>

      <form class="profile-form" @submit.prevent="save">
        <!-- Display name -->
        <div class="form-group">
          <label class="form-label" for="displayName">Nombre en la comunidad</label>
          <input
            id="displayName"
            v-model="form.displayName"
            type="text"
            class="form-input"
            autocomplete="nickname"
            maxlength="50"
          />
        </div>

        <!-- Pronouns (D-17: free-text, NEVER required) -->
        <div class="form-group">
          <label class="form-label" for="pronouns">
            Pronombres <span class="text-text-secondary text-xs">(opcional)</span>
          </label>
          <input
            id="pronouns"
            v-model="form.pronouns"
            type="text"
            class="form-input"
            :placeholder="t('profile.pronouns.placeholder')"
            autocomplete="off"
            maxlength="50"
          />
          <!-- NEVER mark this field as required -->
        </div>

        <!-- City -->
        <div class="form-group">
          <label class="form-label" for="city">Ciudad</label>
          <select id="city" v-model="form.city" class="form-input">
            <option v-for="opt in cityOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- Public visibility toggle -->
        <div class="form-group form-group--toggle">
          <div>
            <div class="form-label">{{ t('profile.public_toggle') }}</div>
            <div class="text-xs text-text-secondary mt-0.5">{{ t('profile.privacy_explainer') }}</div>
          </div>
          <button
            type="button"
            class="toggle-btn"
            :class="{ 'toggle-btn--on': form.publicVisibility }"
            :aria-pressed="form.publicVisibility"
            role="switch"
            :aria-label="t('profile.public_toggle')"
            @click="form.publicVisibility = !form.publicVisibility"
          >
            <span class="toggle-btn__thumb" />
          </button>
        </div>

        <!-- Save button — always enabled regardless of empty pronouns/avatar -->
        <button type="submit" class="save-btn" :disabled="saving">
          {{ saving ? 'Guardando...' : (saved ? '¡Guardado!' : 'Guardar cambios') }}
        </button>
      </form>

      <!-- Settings section -->
      <div class="profile-settings mt-6 pt-6 border-t border-surface-3">
        <h2 class="text-base font-semibold text-text-primary mb-4">Configuración</h2>

        <div class="settings-row">
          <span class="text-sm text-text-secondary">Idioma</span>
          <LanguageSwitch />
        </div>

        <div class="settings-row mt-3">
          <span class="text-sm text-text-secondary">Tema</span>
          <ThemeSwitch />
        </div>

        <!-- Install nudge (D-13: ONLY in profile menu, never popup) -->
        <div class="mt-4">
          <InstallNudge />
        </div>
      </div>
    </div>
  </AppShell>
</template>

<style scoped>
.form-group {
  margin-bottom: 1rem;
}

.form-group--toggle {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-primary, #e8e8f0);
  margin-bottom: 0.375rem;
}

.form-input {
  width: 100%;
  background-color: var(--color-surface-2, #1e1e2e);
  border: 1px solid var(--color-surface-3, #2a2a3a);
  border-radius: 0.5rem;
  padding: 0.625rem 0.875rem;
  font-size: 0.9rem;
  color: var(--color-text-primary, #e8e8f0);
  transition: border-color 0.15s;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-accent-xp, #f59e0b);
}

.toggle-btn {
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 9999px;
  background-color: var(--color-surface-3, #2a2a3a);
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s;
}

.toggle-btn--on {
  background-color: var(--color-accent-xp, #f59e0b);
}

.toggle-btn__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 9999px;
  background: white;
  transition: transform 0.2s;
}

.toggle-btn--on .toggle-btn__thumb {
  transform: translateX(20px);
}

.save-btn {
  width: 100%;
  background-color: var(--color-accent-xp, #f59e0b);
  color: var(--color-surface-1, #12121f);
  font-weight: 700;
  border: none;
  border-radius: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 0.9rem;
  cursor: pointer;
  margin-top: 0.5rem;
  transition: opacity 0.15s;
}

.save-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
