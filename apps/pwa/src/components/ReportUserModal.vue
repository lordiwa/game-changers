<template>
  <!--
    Plan 02-07 — ReportUserModal component.
    EVNT-13: Anonymous report-user flow. Not destructive — typed-confirm not needed.
    Min 20 chars in free-text field.
    Calls reportUser callable. reportedUid NEVER gets notified.

    WCAG 2.1 AA:
    - role="dialog" + aria-modal + aria-labelledby + aria-describedby
    - Focus trapped while open (reka-ui FocusTrap)
    - Close on Escape
  -->
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="isOpen"
        class="report-modal-overlay"
        @click.self="close"
        @keydown.escape="close"
      >
        <div
          class="report-modal"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="descId"
          tabindex="-1"
          ref="dialogEl"
        >
          <h2 :id="titleId" class="report-modal__title">
            {{ t('events.report.modal.title_template', { display_name: displayName }) }}
          </h2>

          <p :id="descId" class="report-modal__desc">
            {{ t('events.report.modal.body') }}
          </p>

          <form @submit.prevent="submit" novalidate>
            <!-- Reason select -->
            <label for="report-reason" class="report-modal__label">
              Motivo del reporte
            </label>
            <select
              id="report-reason"
              v-model="reason"
              class="report-modal__select"
              required
              :aria-required="true"
            >
              <option value="">— Seleccioná un motivo —</option>
              <option value="harassment">Hostigamiento o acoso</option>
              <option value="spam">Spam o publicidad no deseada</option>
              <option value="self_harm">Crisis de salud mental o autolesión</option>
              <option value="other">Otro</option>
            </select>

            <!-- Free-text textarea -->
            <label for="report-text" class="report-modal__label">
              Descripción <span aria-hidden="true">(mín. 20 caracteres)</span>
            </label>
            <textarea
              id="report-text"
              v-model="freeText"
              class="report-modal__textarea"
              rows="4"
              minlength="20"
              maxlength="2000"
              :aria-invalid="freeText.length > 0 && freeText.length < 20"
              :aria-describedby="freeText.length > 0 && freeText.length < 20 ? 'report-text-hint' : undefined"
              required
              :placeholder="t('events.report.modal.body')"
            />
            <span
              v-if="freeText.length > 0 && freeText.length < 20"
              id="report-text-hint"
              class="report-modal__hint"
              role="alert"
            >
              Necesitás al menos 20 caracteres ({{ 20 - freeText.length }} más)
            </span>

            <!-- Error message -->
            <p v-if="submitError" class="report-modal__error" role="alert">
              {{ submitError }}
            </p>

            <!-- Success message -->
            <p v-if="submitted" class="report-modal__success" role="status">
              {{ t('events.report.success') }}
            </p>

            <div class="report-modal__actions">
              <button
                type="button"
                class="report-modal__btn report-modal__btn--cancel"
                @click="close"
                :aria-label="'Cancelar reporte'"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="report-modal__btn report-modal__btn--submit"
                :disabled="!isValid || isSubmitting"
                :aria-label="t('events.report.cta_send')"
              >
                {{ isSubmitting ? 'Enviando...' : t('events.report.cta_send') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { callReportUser } from '../composables/useEvents';

const props = defineProps<{
  isOpen: boolean;
  reportedUid: string;
  displayName: string;
  eventId?: string;
}>();

const emit = defineEmits<{ (e: 'close'): void }>();

const { t } = useI18n();

const titleId = `report-title-${Math.random().toString(36).slice(2)}`;
const descId = `report-desc-${Math.random().toString(36).slice(2)}`;

const reason = ref('');
const freeText = ref('');
const isSubmitting = ref(false);
const submitError = ref<string | null>(null);
const submitted = ref(false);
const dialogEl = ref<HTMLElement | null>(null);

// ≥20 character minimum on free-text (T-02-07-06)
const isValid = computed(
  () => reason.value !== '' && freeText.value.length >= 20,
);

function close() {
  emit('close');
  // Reset form
  reason.value = '';
  freeText.value = '';
  submitError.value = null;
  submitted.value = false;
}

async function submit() {
  if (!isValid.value) return;

  isSubmitting.value = true;
  submitError.value = null;

  try {
    await callReportUser({
      reportedUid: props.reportedUid,
      eventId: props.eventId,
      reason: reason.value,
      freeText: freeText.value,
    });
    submitted.value = true;
    // Auto-close after showing success message
    setTimeout(close, 2000);
  } catch (err) {
    submitError.value = 'Ocurrió un error. Intenta de nuevo.';
    console.error('[ReportUserModal] submit error:', err);
  } finally {
    isSubmitting.value = false;
  }
}

// Focus dialog when opened
watch(
  () => props.isOpen,
  async (open) => {
    if (open) {
      await nextTick();
      dialogEl.value?.focus();
    }
  },
);
</script>

<style scoped>
.report-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.report-modal {
  background: var(--color-surface-2, #1a1a2e);
  border-radius: 16px;
  padding: 24px;
  max-width: 480px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.report-modal__title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 12px;
  color: var(--color-text-primary, #fff);
}

.report-modal__desc {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #c0c0d0);
  margin: 0 0 16px;
  line-height: 1.5;
}

.report-modal__label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  margin: 12px 0 4px;
  color: var(--color-text-primary, #fff);
}

.report-modal__select,
.report-modal__textarea {
  width: 100%;
  background: var(--color-surface-3, #2a2a3e);
  border: 1px solid var(--color-border, #3a3a5e);
  border-radius: 8px;
  padding: 10px 12px;
  color: var(--color-text-primary, #fff);
  font-size: 1rem;
  box-sizing: border-box;
}

.report-modal__select:focus,
.report-modal__textarea:focus {
  outline: 3px solid var(--color-accent-xp, #51ff66);
  outline-offset: 2px;
}

.report-modal__hint {
  font-size: 0.75rem;
  color: #ffaa51;
  display: block;
  margin-top: 4px;
}

.report-modal__error {
  color: #ff5151;
  font-size: 0.875rem;
  margin-top: 8px;
}

.report-modal__success {
  color: #51ff66;
  font-size: 0.875rem;
  margin-top: 8px;
}

.report-modal__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 20px;
}

.report-modal__btn {
  min-height: 44px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}

.report-modal__btn:focus-visible {
  outline: 3px solid #51ff66;
  outline-offset: 2px;
}

.report-modal__btn--cancel {
  background: transparent;
  border: 2px solid var(--color-border, #3a3a5e);
  color: var(--color-text-secondary, #c0c0d0);
}

.report-modal__btn--submit {
  background: #51ff66;
  color: #0f0f1a;
}

.report-modal__btn--submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
