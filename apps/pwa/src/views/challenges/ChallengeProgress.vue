<template>
  <!-- Modal overlay for progress logging -->
  <div
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    :aria-label="t('challenges.cta.log')"
    @click.self="$emit('close')"
  >
    <div class="modal-panel">
      <div class="modal-header">
        <h2>{{ t('challenges.cta.log') }}</h2>
        <button class="close-btn" :aria-label="t('me.back')" @click="$emit('close')">✕</button>
      </div>

      <!-- Source tabs: manual / pedometer / wearable / photo -->
      <div class="source-tabs" role="tablist">
        <button
          v-for="src in sources"
          :key="src"
          class="tab-btn"
          :class="{ active: activeSource === src }"
          role="tab"
          :aria-selected="activeSource === src"
          @click="activeSource = src"
        >
          {{ t(`challenges.progress.source.${src}`) }}
        </button>
      </div>

      <!-- Manual source -->
      <div v-if="activeSource === 'manual'" class="source-panel">
        <label class="field-label">
          Cantidad
          <div class="input-row">
            <input
              v-model.number="manualValue"
              type="number"
              min="0"
              class="value-input"
              placeholder="0"
            />
          </div>
        </label>

        <!-- Evidence required for Plata/Oro tiers + manual source (T-02-08-01) -->
        <div v-if="needsEvidence" class="evidence-section">
          <p class="evidence-prompt">{{ t('challenges.evidence.required') }}</p>
          <input type="file" accept="image/*" @change="onFileSelected" class="file-input" />
          <p v-if="evidencePath" class="evidence-ok">Foto lista ✓</p>
        </div>

        <button
          class="submit-btn"
          :disabled="submitting || (!manualValue && manualValue !== 0) || (needsEvidence && !evidencePath)"
          @click="submitManual"
        >
          {{ submitting ? 'Guardando...' : 'Guardar' }}
        </button>
      </div>

      <!-- Pedometer source -->
      <div v-else-if="activeSource === 'pedometer'" class="source-panel">
        <div v-if="!pedometer.isSupported.value" class="unsupported">
          <p>Tu dispositivo o navegador no tiene sensor de movimiento compatible.</p>
          <p>Usa el registro manual.</p>
        </div>

        <template v-else>
          <div class="step-counter" aria-live="polite">
            <span class="step-count">{{ pedometer.stepsToday.value }}</span>
            <span class="step-label">pasos hoy</span>
          </div>

          <div class="pedometer-controls">
            <button
              v-if="!pedometer.isTracking.value"
              class="track-btn"
              @click="pedometer.startTracking"
            >
              Iniciar conteo
            </button>
            <button
              v-else
              class="track-btn stop"
              @click="pedometer.stopTracking"
            >
              Pausar conteo
            </button>
          </div>

          <p class="pedometer-disclaimer">
            El conteo es aproximado. Solo se activa mientras tenés esta pantalla abierta.
          </p>

          <button
            class="submit-btn"
            :disabled="submitting || !pedometer.stepsToday.value"
            @click="submitPedometer"
          >
            {{ submitting ? 'Guardando...' : `Guardar ${pedometer.stepsToday.value} pasos` }}
          </button>
        </template>
      </div>

      <!-- Wearable source (Plan 09 stub) -->
      <div v-else-if="activeSource === 'wearable'" class="source-panel wearable-stub">
        <h3>{{ t('challenges.wearable_stub.heading') }}</h3>
        <p>{{ t('challenges.wearable_stub.body') }}</p>
        <router-link to="/me/wearables" class="link-btn">{{ t('challenges.wearable_stub.cta') }}</router-link>
      </div>

      <!-- Photo source -->
      <div v-else-if="activeSource === 'photo'" class="source-panel">
        <p class="photo-prompt">Subí una foto como evidencia de tu progreso.</p>
        <input type="file" accept="image/*" @change="onPhotoSelected" class="file-input" />
        <p v-if="photoPath" class="evidence-ok">Foto lista ✓</p>

        <label class="field-label">
          Cantidad (opcional)
          <input v-model.number="photoValue" type="number" min="0" class="value-input" placeholder="0" />
        </label>

        <button
          class="submit-btn"
          :disabled="submitting || !photoPath"
          @click="submitPhoto"
        >
          {{ submitting ? 'Guardando...' : 'Enviar foto' }}
        </button>
      </div>

      <!-- Flagged message -->
      <div v-if="flaggedResult" class="flagged-notice" role="alert">
        <strong>{{ t('challenges.anti_cheat.flagged') }}</strong>
        <p>{{ t('challenges.anti_cheat.flagged_body') }}</p>
      </div>

      <!-- Error message -->
      <p v-if="submitError" class="error-msg" role="alert">{{ submitError }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth } from '../../firebase.js';
import { usePedometer } from '../../composables/usePedometer.js';
import type { ChallengeTier } from '@gamechangers/shared';

const props = defineProps<{
  challengeId: string;
  tier: ChallengeTier;
}>();

const emit = defineEmits<{
  close: [];
  submitted: [result: { status: string; progress: number; completed: boolean }];
}>();

const { t } = useI18n();
const pedometer = usePedometer();

// Source tabs
const sources = ['manual', 'pedometer', 'wearable', 'photo'] as const;
type Source = typeof sources[number];
const activeSource = ref<Source>('manual');

// Manual entry
const manualValue = ref<number | null>(null);
const evidencePath = ref<string | null>(null);

// Photo entry
const photoPath = ref<string | null>(null);
const photoValue = ref<number | null>(null);

// State
const submitting = ref(false);
const submitError = ref<string | null>(null);
const flaggedResult = ref(false);

// Evidence required for Plata/Oro tiers + manual source (EVIDENCE_REQUIRED check)
const needsEvidence = computed(() =>
  (props.tier === 'plata' || props.tier === 'oro') && activeSource.value === 'manual',
);

async function uploadFile(file: File, folder: string): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  const storage = getStorage();
  const path = `challenge-evidence/${uid}/${folder}/${Date.now()}-${file.name}`;
  const sRef = storageRef(storage, path);
  await uploadBytes(sRef, file);
  return await getDownloadURL(sRef);
}

async function onFileSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    evidencePath.value = await uploadFile(file, 'manual');
  } catch {
    submitError.value = 'Error al subir la foto';
  }
}

async function onPhotoSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    photoPath.value = await uploadFile(file, 'photo');
  } catch {
    submitError.value = 'Error al subir la foto';
  }
}

async function callLogProgress(source: Source, value: number, evidence?: string) {
  const functions = getFunctions(undefined, 'southamerica-east1');
  const logProgress = httpsCallable(functions, 'logProgress');
  const result = await logProgress({
    challengeId: props.challengeId,
    source,
    value,
    unit: 'steps', // Will be resolved server-side from challenge doc
    ...(evidence ? { evidence } : {}),
  });
  return result.data as { status: string; progress: number; completed: boolean };
}

async function submitManual() {
  if (manualValue.value === null) return;
  if (needsEvidence.value && !evidencePath.value) {
    submitError.value = t('challenges.evidence.required');
    return;
  }
  submitting.value = true;
  submitError.value = null;
  try {
    const result = await callLogProgress('manual', manualValue.value, evidencePath.value ?? undefined);
    flaggedResult.value = result.status === 'flagged';
    if (!flaggedResult.value) {
      emit('submitted', result);
    }
  } catch (err) {
    submitError.value = err instanceof Error ? err.message : 'Error al guardar';
  } finally {
    submitting.value = false;
  }
}

async function submitPedometer() {
  const steps = pedometer.stepsToday.value;
  if (!steps) return;
  submitting.value = true;
  submitError.value = null;
  try {
    const result = await callLogProgress('pedometer', steps);
    flaggedResult.value = result.status === 'flagged';
    if (!flaggedResult.value) {
      pedometer.clearStepsToday();
      emit('submitted', result);
    }
  } catch (err) {
    submitError.value = err instanceof Error ? err.message : 'Error al guardar';
  } finally {
    submitting.value = false;
  }
}

async function submitPhoto() {
  if (!photoPath.value) return;
  submitting.value = true;
  submitError.value = null;
  try {
    const result = await callLogProgress('photo', photoValue.value ?? 1, photoPath.value);
    flaggedResult.value = result.status === 'flagged';
    if (!flaggedResult.value) {
      emit('submitted', result);
    }
  } catch (err) {
    submitError.value = err instanceof Error ? err.message : 'Error al guardar';
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 50;
}

.modal-panel {
  background: var(--color-surface-1, #111827);
  border-radius: 1rem 1rem 0 0;
  padding: 1.5rem;
  width: 100%;
  max-width: 48rem;
  max-height: 85vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.modal-header h2 {
  font-size: 1.125rem;
  font-weight: 700;
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-text-muted, #9ca3af);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
  min-width: 44px;
  min-height: 44px;
}

.source-tabs {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  margin-bottom: 1.5rem;
  padding-bottom: 0.25rem;
}

.tab-btn {
  flex-shrink: 0;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  border: 1px solid var(--color-border, #374151);
  background: transparent;
  color: var(--color-text-muted, #9ca3af);
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.15s;
}

.tab-btn.active {
  background: var(--color-accent-xp, #f59e0b);
  border-color: var(--color-accent-xp, #f59e0b);
  color: #000;
  font-weight: 600;
}

.source-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field-label {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-muted, #9ca3af);
}

.value-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border, #374151);
  border-radius: 0.5rem;
  background: var(--color-surface-2, #1f2937);
  color: inherit;
  font-size: 1rem;
}

.evidence-section {
  background: rgba(245, 158, 11, 0.05);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 0.5rem;
  padding: 1rem;
}

.evidence-prompt {
  font-size: 0.875rem;
  color: var(--color-accent-xp, #f59e0b);
  margin-bottom: 0.75rem;
}

.evidence-ok {
  color: #10b981;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.file-input {
  width: 100%;
}

.step-counter {
  text-align: center;
  padding: 2rem;
}

.step-count {
  display: block;
  font-size: 3rem;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  color: var(--color-accent-xp, #f59e0b);
}

.step-label {
  color: var(--color-text-muted, #9ca3af);
  font-size: 0.875rem;
}

.pedometer-controls {
  display: flex;
  justify-content: center;
}

.track-btn {
  padding: 0.75rem 2rem;
  border-radius: 9999px;
  border: 2px solid var(--color-accent-xp, #f59e0b);
  background: transparent;
  color: var(--color-accent-xp, #f59e0b);
  font-weight: 600;
  cursor: pointer;
}

.track-btn.stop {
  border-color: #ef4444;
  color: #ef4444;
}

.pedometer-disclaimer {
  font-size: 0.75rem;
  color: var(--color-text-muted, #9ca3af);
  text-align: center;
}

.wearable-stub {
  text-align: center;
  padding: 2rem;
}

.wearable-stub h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.link-btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  border: 1px solid var(--color-border, #374151);
  border-radius: 0.5rem;
  text-decoration: none;
  margin-top: 1rem;
}

.submit-btn {
  width: 100%;
  padding: 0.875rem;
  background: var(--color-accent-xp, #f59e0b);
  color: #000;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.flagged-notice {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 0.5rem;
  padding: 1rem;
}

.flagged-notice strong {
  color: var(--color-accent-xp, #f59e0b);
}

.error-msg {
  color: #ef4444;
  font-size: 0.875rem;
}

.unsupported {
  text-align: center;
  padding: 1.5rem;
  color: var(--color-text-muted, #9ca3af);
}

.photo-prompt {
  color: var(--color-text-muted, #9ca3af);
}

.input-row {
  display: flex;
  gap: 0.5rem;
}
</style>
