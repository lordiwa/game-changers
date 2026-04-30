<template>
  <section class="space-y-6">
    <!-- Layer 2 consent gate — T-02-06-05 -->
    <div
      v-if="!hasHealthConsent"
      class="rounded-xl border border-blue-500/30 bg-blue-500/10 p-6 space-y-4"
    >
      <p class="text-text-secondary text-sm">
        {{ t('content.assessment.consent.required') }}
      </p>
      <router-link
        to="/consent/layer-2"
        class="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        Activar Layer 2
      </router-link>
    </div>

    <!-- Assessment form -->
    <template v-else>
      <!-- Disclaimer — NEVER medical diagnosis per Out-of-Scope rules -->
      <p class="text-xs text-text-muted bg-surface-2 p-3 rounded-lg">
        {{ t('content.assessment.disclaimer') }}
      </p>

      <!-- Questions -->
      <div v-if="!submitted" class="space-y-6">
        <div
          v-for="question in schema.questions"
          :key="question.id"
          class="space-y-3"
        >
          <p class="text-sm font-medium text-text-primary">
            {{ locale === 'en' ? question.text.en : question.text.es }}
          </p>
          <!-- Likert scale -->
          <div class="flex gap-2 flex-wrap">
            <label
              v-for="value in question.scale"
              :key="value"
              class="flex flex-col items-center gap-1 cursor-pointer"
            >
              <input
                type="radio"
                :name="question.id"
                :value="value"
                class="sr-only"
                @change="setAnswer(question.id, value)"
              />
              <span
                class="w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-colors"
                :class="answers[question.id] === value
                  ? 'border-accent-xp bg-accent-xp text-surface-1'
                  : 'border-surface-3 text-text-secondary hover:border-accent-xp/50'"
              >
                {{ value }}
              </span>
            </label>
          </div>
        </div>

        <!-- Submit -->
        <button
          type="button"
          :disabled="!allAnswered || submitting"
          class="w-full py-3 rounded-xl font-semibold text-sm transition-all"
          :class="allAnswered
            ? 'bg-accent-xp text-surface-1 hover:bg-accent-xp/90'
            : 'bg-surface-3 text-text-muted cursor-not-allowed'"
          @click="submitAssessment"
        >
          {{ submitting ? 'Enviando...' : 'Ver mi resultado' }}
        </button>
      </div>

      <!-- Result (after submission) -->
      <div
        v-else-if="result"
        class="rounded-xl border p-6 space-y-3"
        :class="resultBorderClass"
      >
        <p class="font-semibold text-text-primary">{{ result.message }}</p>
        <p class="text-xs text-text-muted">
          Puntuación PSS-4: {{ result.score }} / {{ maxScore }}
        </p>

        <!-- Crisis prompt for high stress — soft prompt only, NOT auto-dial -->
        <div
          v-if="result.band === 'high'"
          class="mt-4 p-3 rounded-lg bg-surface-2 border border-surface-3"
        >
          <p class="text-sm text-text-secondary">
            {{ t('content.assessment.disclaimer') }}
          </p>
          <router-link
            to="/crisis"
            class="mt-2 inline-flex items-center text-sm text-blue-400 hover:text-blue-300"
          >
            {{ t('crisis.cta.help') }}
          </router-link>
        </div>

        <!-- Retake -->
        <button
          type="button"
          class="text-xs text-text-muted hover:text-text-secondary underline"
          @click="resetAssessment"
        >
          Repetir el test
        </button>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import { useConsent } from '../../composables/useConsent';
import { useContentTracking } from '../../composables/useContentTracking';
import type { WellnessAssessmentSchema } from '@gamechangers/shared';

const props = defineProps<{
  assessmentId: string;
  schema: WellnessAssessmentSchema;
}>();

const { t, locale } = useI18n();
const { hasGranted } = useConsent();
const { submitWellnessAssessment } = useContentTracking();

// Consent gate for Layer 2 — health_self_reports (T-02-06-05)
const hasHealthConsent = computed(() => hasGranted('health_self_reports').value);

const answers = ref<Record<string, number>>({});
const submitting = ref(false);
const submitted = ref(false);

interface AssessmentResult {
  score: number;
  band: 'low' | 'moderate' | 'high';
  message: string;
}

const result = ref<AssessmentResult | null>(null);

const allAnswered = computed(() =>
  props.schema.questions.every((q) => answers.value[q.id] !== undefined),
);

const maxScore = computed(() =>
  props.schema.questions.length * Math.max(...(props.schema.questions[0]?.scale ?? [4])),
);

const resultBorderClass = computed(() => {
  switch (result.value?.band) {
    case 'high': return 'border-red-500/40 bg-red-500/5';
    case 'moderate': return 'border-amber-500/40 bg-amber-500/5';
    default: return 'border-accent-xp/40 bg-accent-xp/5';
  }
});

function setAnswer(questionId: string, value: number): void {
  answers.value = { ...answers.value, [questionId]: value };
}

function computeScore(): number {
  return Object.values(answers.value).reduce((sum, v) => sum + v, 0);
}

function bandForScore(score: number): 'low' | 'moderate' | 'high' {
  const { low, moderate } = props.schema.scoring;
  if (score >= low.range[0] && score <= low.range[1]) return 'low';
  if (score >= moderate.range[0] && score <= moderate.range[1]) return 'moderate';
  return 'high';
}

async function submitAssessment(): Promise<void> {
  if (!allAnswered.value || submitting.value) return;

  submitting.value = true;
  try {
    const score = computeScore();
    const band = bandForScore(score);
    const bandData = props.schema.scoring[band];
    const message = locale.value === 'en' ? bandData.message_en : bandData.message_es;

    // Submit to Cloud Function (stores in /users/{uid}/wellnessAssessments/{id})
    await submitWellnessAssessment(props.assessmentId, answers.value);

    result.value = { score, band, message };
    submitted.value = true;
  } finally {
    submitting.value = false;
  }
}

function resetAssessment(): void {
  answers.value = {};
  submitted.value = false;
  result.value = null;
}
</script>
