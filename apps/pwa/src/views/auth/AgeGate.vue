<template>
  <main class="flex flex-col min-h-screen bg-surface-0 px-4 py-8">
    <h1 class="text-2xl font-bold text-white mb-2">{{ $t('auth.age_gate.heading') }}</h1>
    <p class="text-gray-400 mb-6">{{ $t('auth.age_gate.body') }}</p>

    <!-- Under-16 rejection banner -->
    <div
      v-if="rejected"
      role="alert"
      class="mb-6 rounded-lg bg-red-900/40 border border-red-500 p-4"
    >
      <p class="text-red-300 font-semibold">{{ $t('auth.age_gate.error.under_16') }}</p>
      <p class="text-red-200 text-sm mt-1">{{ $t('auth.age_gate.error.under_16_body') }}</p>
    </div>

    <!-- Minor banner (16-17) -->
    <div
      v-if="showMinorBanner"
      role="status"
      class="mb-6 rounded-lg bg-yellow-900/40 border border-yellow-500 p-4"
    >
      <p class="text-yellow-300 text-sm">{{ $t('auth.age_gate.minor_consent_required') }}</p>
    </div>

    <form v-if="!rejected" class="flex flex-col gap-6 flex-1" @submit.prevent="onSubmit">
      <!-- Day / Month / Year selects — 3 separate for accessibility per UI-SPEC -->
      <fieldset class="flex gap-3">
        <legend class="text-sm text-gray-400 mb-2 w-full">{{ $t('auth.age_gate.date_label') }}</legend>
        <label class="flex flex-col gap-1 flex-1">
          <span class="sr-only">{{ $t('auth.age_gate.day') }}</span>
          <select
            v-model="day"
            required
            aria-label="Día"
            class="rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-3 min-h-11 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="" disabled>Día</option>
            <option v-for="d in 31" :key="d" :value="String(d).padStart(2, '0')">{{ d }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1 flex-1">
          <span class="sr-only">{{ $t('auth.age_gate.month') }}</span>
          <select
            v-model="month"
            required
            aria-label="Mes"
            class="rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-3 min-h-11 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="" disabled>Mes</option>
            <option v-for="(name, idx) in monthNames" :key="idx" :value="String(idx + 1).padStart(2, '0')">
              {{ name }}
            </option>
          </select>
        </label>
        <label class="flex flex-col gap-1 flex-[2]">
          <span class="sr-only">{{ $t('auth.age_gate.year') }}</span>
          <select
            v-model="year"
            required
            aria-label="Año"
            class="rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-3 min-h-11 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="" disabled>Año</option>
            <option v-for="y in yearRange" :key="y" :value="String(y)">{{ y }}</option>
          </select>
        </label>
      </fieldset>

      <p v-if="errorMsg" role="alert" class="text-red-400 text-sm">{{ errorMsg }}</p>
    </form>

    <div v-if="!rejected" class="mt-6 sticky bottom-6">
      <button
        type="submit"
        :disabled="loading || !day || !month || !year"
        class="w-full min-h-11 flex items-center justify-center px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        @click="onSubmit"
      >
        {{ $t('auth.age_gate.cta') }}
      </button>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../../composables/useAuth';

const router = useRouter();
const { verifyAge } = useAuth();

const day = ref('');
const month = ref('');
const year = ref('');
const loading = ref(false);
const rejected = ref(false);
const showMinorBanner = ref(false);
const errorMsg = ref('');

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Selectable years: 1920 → current year (birth year range)
const yearRange = computed(() => {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current; y >= 1920; y--) years.push(y);
  return years;
});

async function onSubmit() {
  if (!day.value || !month.value || !year.value) return;
  errorMsg.value = '';
  loading.value = true;
  const birthDate = `${year.value}-${month.value}-${day.value}`;
  try {
    const result = await verifyAge(birthDate);
    if (result.isMinor) {
      showMinorBanner.value = true;
    }
    // Age verified — redirect to profile landing (Plan 05 will expand this).
    await router.push('/me');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('AGE_UNDER_16')) {
      rejected.value = true;
    } else {
      errorMsg.value = msg;
    }
  } finally {
    loading.value = false;
  }
}
</script>
