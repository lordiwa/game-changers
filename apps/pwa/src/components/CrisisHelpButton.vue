<script setup lang="ts">
/**
 * CrisisHelpButton.vue — Persistent crisis help button.
 *
 * UI-SPEC §21: ALWAYS visible — bottom-right on mobile (above bottom-tab),
 * or bottom of left-rail on desktop. Uses 'crisis' color (#FF6B7A).
 *
 * Taps open a modal with Línea 171 + "Estás aquí, eso ya cuenta" copy.
 *
 * NEVER hides regardless of route or wearable connection state.
 */
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const isOpen = ref(false);

function open() { isOpen.value = true; }
function close() { isOpen.value = false; }
</script>

<template>
  <!-- Trigger button -->
  <button
    class="crisis-help-btn"
    :aria-label="t('crisis.cta.help')"
    @click="open"
  >
    <span aria-hidden="true">🆘</span>
    <span class="crisis-help-btn__label">{{ t('crisis.cta.help') }}</span>
  </button>

  <!-- Modal overlay -->
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="crisis-modal-overlay"
      role="dialog"
      aria-modal="true"
      :aria-label="t('crisis.cta.help')"
      @click.self="close"
    >
      <div class="crisis-modal">
        <button
          class="crisis-modal__close"
          :aria-label="'Cerrar'"
          @click="close"
        >✕</button>

        <h2 class="crisis-modal__title">{{ t('crisis.cta.help') }}</h2>
        <p class="crisis-modal__body">{{ t('crisis.body') }}</p>

        <ul class="crisis-modal__contacts">
          <li>
            <strong>Línea 171</strong> — Atención en crisis psicológica, 24/7
            <a href="tel:171" class="crisis-modal__call-btn">Llamar</a>
          </li>
          <li>
            <strong>Línea de crisis de salud mental</strong> — 1800-180-000
            <a href="tel:1800180000" class="crisis-modal__call-btn">Llamar</a>
          </li>
        </ul>

        <p class="crisis-modal__footer">Estás aquí, eso ya cuenta.</p>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.crisis-help-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  background-color: #ff6b7a;
  color: white;
  border: none;
  border-radius: 9999px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(255, 107, 122, 0.4);
  transition: transform 0.1s ease;
}

.crisis-help-btn:active {
  transform: scale(0.97);
}

.crisis-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.crisis-modal {
  background: var(--color-surface-1, #12121f);
  border: 2px solid #ff6b7a;
  border-radius: 1rem 1rem 0 0;
  padding: 1.5rem;
  width: 100%;
  max-width: 480px;
  position: relative;
}

.crisis-modal__close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  color: var(--color-text-secondary, #a0a0b0);
  font-size: 1.25rem;
  cursor: pointer;
}

.crisis-modal__title {
  color: #ff6b7a;
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.crisis-modal__body {
  color: var(--color-text-primary, #e8e8f0);
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.crisis-modal__contacts {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.crisis-modal__contacts li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.875rem;
  color: var(--color-text-primary, #e8e8f0);
}

.crisis-modal__call-btn {
  background: #ff6b7a;
  color: white;
  border-radius: 9999px;
  padding: 0.25rem 0.75rem;
  text-decoration: none;
  font-size: 0.8rem;
  font-weight: 600;
}

.crisis-modal__footer {
  color: var(--color-text-secondary, #a0a0b0);
  font-style: italic;
  font-size: 0.85rem;
  text-align: center;
}
</style>
