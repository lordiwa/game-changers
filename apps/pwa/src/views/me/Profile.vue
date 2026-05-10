<script setup lang="ts">
/**
 * Profile.vue — Editable profile form at /me/profile.
 *
 * Per D-17: pronouns are free-text, NEVER required.
 * ESLint: no onSnapshot.
 */
import { ref, onMounted } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useCurrentUser } from 'vuefire';
import { useI18n } from 'vue-i18n';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseApp } from '../../firebase';
import { useProfileStore } from '../../stores/profile';
import Avatar from '../../components/Avatar.vue';
import InstallNudge from '../../components/InstallNudge.vue';
import LanguageSwitch from '../../components/LanguageSwitch.vue';
import ThemeSwitch from '../../components/ThemeSwitch.vue';

const { t } = useI18n();
const router = useRouter();
const currentUser = useCurrentUser();
const profileStore = useProfileStore();

const BIO_MAX = 140;
const GAME_PRESETS = [
  'Free Fire', 'League of Legends', 'Dota 2', 'Valorant', 'Counter-Strike',
  'Fortnite', 'Call of Duty', 'FIFA / EA FC', 'Minecraft', 'Roblox',
  'Among Us', 'Genshin Impact', 'GTA Online', 'Apex Legends', 'Rocket League',
] as const;

type Platform = 'pc' | 'console' | 'mobile';

const form = ref({
  displayName: '',
  bio: '',
  pronouns: '',
  city: 'other' as 'quito' | 'guayaquil' | 'cuenca' | 'other',
  publicVisibility: false,
  favGames: [] as string[],
  gamingPlatforms: [] as Platform[],
  avatar: '' as string | undefined,
});

onMounted(async () => {
  const uid = currentUser.value?.uid;
  if (uid && !profileStore.profile) {
    await profileStore.fetchProfile(uid);
  }
  const p = profileStore.profile;
  if (p) {
    form.value.displayName = p.displayName ?? '';
    form.value.bio = (p.bio as string) ?? '';
    form.value.pronouns = (p.pronouns as string) ?? '';
    form.value.city = p.city ?? 'other';
    form.value.publicVisibility = p.publicVisibility ?? false;
    form.value.favGames = Array.isArray(p.favGames) ? [...p.favGames] : [];
    form.value.gamingPlatforms = Array.isArray(p.gamingPlatforms) ? [...p.gamingPlatforms] : [];
    form.value.avatar = p.avatar;
  }
});

const saving = ref(false);
const saved = ref(false);
const saveError = ref<string | null>(null);
const needsConsent = ref(false);

const uploadingAvatar = ref(false);
const avatarError = ref<string | null>(null);

async function onAvatarSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    avatarError.value = 'La imagen debe pesar menos de 2 MB.';
    return;
  }
  if (!file.type.startsWith('image/')) {
    avatarError.value = 'Solo se permiten imágenes.';
    return;
  }
  const uid = currentUser.value?.uid;
  if (!uid) {
    avatarError.value = 'Debes iniciar sesión.';
    return;
  }
  uploadingAvatar.value = true;
  avatarError.value = null;
  try {
    const storage = getStorage(firebaseApp);
    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
    const path = `avatars/${uid}/main.${ext}`;
    const ref = storageRef(storage, path);
    await uploadBytes(ref, file, { contentType: file.type });
    const url = await getDownloadURL(ref);
    // Stage the URL in form state. The actual Firestore write happens on
    // Save — keeping upload (Storage) and persistence (Firestore) errors
    // separate so a missing basic_profile consent doesn't get reported as
    // an upload failure.
    form.value.avatar = url;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('storage/unauthorized') || msg.includes('permission')) {
      avatarError.value = 'No se pudo subir la foto: permiso denegado por Storage. Revisa que estés logueado.';
    } else if (msg.includes('storage/quota-exceeded')) {
      avatarError.value = 'Cuota de almacenamiento excedida.';
    } else {
      avatarError.value = 'No se pudo subir la foto: ' + msg;
    }
    console.error('[Profile] avatar upload failed:', err);
  } finally {
    uploadingAvatar.value = false;
    input.value = '';
  }
}

function toggleGame(g: string) {
  const i = form.value.favGames.indexOf(g);
  if (i >= 0) form.value.favGames.splice(i, 1);
  else form.value.favGames.push(g);
}

function togglePlatform(p: Platform) {
  const i = form.value.gamingPlatforms.indexOf(p);
  if (i >= 0) form.value.gamingPlatforms.splice(i, 1);
  else form.value.gamingPlatforms.push(p);
}

async function save() {
  saving.value = true;
  saved.value = false;
  saveError.value = null;
  needsConsent.value = false;
  try {
    const trimmedBio = form.value.bio.trim();
    const trimmedPronouns = form.value.pronouns.trim();
    // Build payload conditionally: Firestore rejects literal `undefined`.
    // Optional fields are only included when they have a value.
    const payload: Record<string, unknown> = {
      displayName: form.value.displayName,
      city: form.value.city,
      publicVisibility: form.value.publicVisibility,
      favGames: form.value.favGames,
      gamingPlatforms: form.value.gamingPlatforms,
    };
    if (trimmedBio) payload['bio'] = trimmedBio;
    if (trimmedPronouns) payload['pronouns'] = trimmedPronouns;
    if (form.value.avatar) payload['avatar'] = form.value.avatar;
    await profileStore.updateProfile(payload);
    saved.value = true;
    setTimeout(() => { saved.value = false; }, 2000);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
      saveError.value = 'No se pudo guardar: necesitas otorgar el consentimiento de perfil básico y verificar tu edad.';
      needsConsent.value = true;
    } else {
      saveError.value = 'No se pudo guardar. Inténtalo de nuevo.';
    }
    console.error('[Profile] save failed:', err);
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

const platformOptions: Array<{ value: Platform; label: string; icon: string }> = [
  { value: 'pc', label: 'PC', icon: '🖥️' },
  { value: 'console', label: 'Consola', icon: '🎮' },
  { value: 'mobile', label: 'Móvil', icon: '📱' },
];
</script>

<template>
  <div class="profile-view p-4 max-w-lg mx-auto">
    <h1 class="text-xl font-bold text-text-primary mb-6">Mi perfil</h1>

    <form class="profile-form" @submit.prevent="save">
      <!-- Avatar -->
      <div class="form-group avatar-row">
        <Avatar :image-url="form.avatar" :display-name="form.displayName" size="lg" />
        <div class="avatar-actions">
          <label class="avatar-upload-btn">
            <input
              type="file"
              accept="image/*"
              class="sr-only"
              :disabled="uploadingAvatar"
              @change="onAvatarSelected"
            />
            {{ uploadingAvatar ? 'Subiendo...' : (form.avatar ? 'Cambiar foto' : 'Subir foto') }}
          </label>
          <p class="avatar-hint">JPG / PNG · máx. 2 MB</p>
          <p v-if="avatarError" class="avatar-error" role="alert">{{ avatarError }}</p>
        </div>
      </div>

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

      <!-- Bio -->
      <div class="form-group">
        <label class="form-label" for="bio">
          Bio <span class="text-text-secondary text-xs">(opcional, máx {{ BIO_MAX }} caracteres)</span>
        </label>
        <textarea
          id="bio"
          v-model="form.bio"
          class="form-input form-textarea"
          rows="3"
          :maxlength="BIO_MAX"
          placeholder="¿Qué juegas? ¿Qué te mueve? Cuéntale a la comunidad."
        />
        <div class="bio-counter">{{ form.bio.length }} / {{ BIO_MAX }}</div>
      </div>

      <!-- Pronouns -->
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

      <!-- Platforms -->
      <div class="form-group">
        <div class="form-label">Plataformas <span class="text-text-secondary text-xs">(opcional)</span></div>
        <div class="chip-row">
          <button
            v-for="opt in platformOptions"
            :key="opt.value"
            type="button"
            class="chip"
            :class="{ 'chip--selected': form.gamingPlatforms.includes(opt.value) }"
            :aria-pressed="form.gamingPlatforms.includes(opt.value)"
            @click="togglePlatform(opt.value)"
          >
            <span aria-hidden="true">{{ opt.icon }}</span>
            <span>{{ opt.label }}</span>
          </button>
        </div>
      </div>

      <!-- Favorite games -->
      <div class="form-group">
        <div class="form-label">
          Juegos favoritos
          <span class="text-text-secondary text-xs">(elige los que juegas)</span>
        </div>
        <div class="chip-row">
          <button
            v-for="g in GAME_PRESETS"
            :key="g"
            type="button"
            class="chip"
            :class="{ 'chip--selected': form.favGames.includes(g) }"
            :aria-pressed="form.favGames.includes(g)"
            @click="toggleGame(g)"
          >
            {{ g }}
          </button>
        </div>
      </div>

      <!-- Public visibility -->
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

      <!-- Save -->
      <button type="submit" class="save-btn" :disabled="saving">
        {{ saving ? 'Guardando...' : (saved ? '¡Guardado!' : 'Guardar cambios') }}
      </button>

      <p v-if="saveError" class="save-error" role="alert">{{ saveError }}</p>
      <RouterLink
        v-if="needsConsent"
        to="/consent/layer-0?return=/me/profile"
        class="consent-link"
      >
        Otorgar consentimiento de perfil básico →
      </RouterLink>
    </form>

    <!-- Settings -->
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

      <div class="mt-4">
        <InstallNudge />
      </div>
    </div>
  </div>
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

.form-textarea {
  resize: vertical;
  min-height: 4.5rem;
  font-family: inherit;
}

.bio-counter {
  font-size: 0.7rem;
  color: var(--color-text-secondary, #a0a0b0);
  text-align: right;
  margin-top: 0.25rem;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-accent-xp, #f59e0b);
}

/* Avatar row */
.avatar-row {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  background-color: var(--color-surface-2, #1e1e2e);
  border: 1px solid var(--color-surface-3, #2a2a3a);
  border-radius: 0.75rem;
}
.avatar-actions { display: flex; flex-direction: column; gap: 0.25rem; }
.avatar-upload-btn {
  display: inline-block;
  padding: 0.5rem 0.875rem;
  background-color: var(--color-surface-3, #2a2a3a);
  color: var(--color-text-primary, #e8e8f0);
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background 0.15s;
}
.avatar-upload-btn:hover { background-color: var(--color-accent-xp, #f59e0b); color: #12121f; }
.avatar-hint { font-size: 0.7rem; color: var(--color-text-secondary, #a0a0b0); }
.avatar-error { font-size: 0.75rem; color: #ff6b6b; margin-top: 0.25rem; }

/* Chips */
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  background-color: var(--color-surface-2, #1e1e2e);
  border: 1px solid var(--color-surface-3, #2a2a3a);
  border-radius: 9999px;
  color: var(--color-text-secondary, #a0a0b0);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}
.chip:hover { border-color: var(--color-accent-xp, #f59e0b); color: var(--color-text-primary, #e8e8f0); }
.chip--selected {
  background-color: var(--color-accent-xp, #f59e0b);
  border-color: var(--color-accent-xp, #f59e0b);
  color: #12121f;
  font-weight: 600;
}

/* Toggle */
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
.toggle-btn--on { background-color: var(--color-accent-xp, #f59e0b); }
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
.toggle-btn--on .toggle-btn__thumb { transform: translateX(20px); }

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
.save-btn:disabled { opacity: 0.7; cursor: not-allowed; }

.save-error { margin-top: 0.75rem; color: #ff6b6b; font-size: 0.875rem; }

.consent-link {
  display: inline-block;
  margin-top: 0.5rem;
  color: var(--color-accent-xp, #f59e0b);
  font-weight: 600;
  font-size: 0.875rem;
  text-decoration: underline;
  min-height: 44px;
  line-height: 44px;
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
