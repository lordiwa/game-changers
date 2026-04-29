<template>
  <div class="consent-row flex flex-col gap-2 py-4 border-b border-surface-2 last:border-0">
    <!-- Toggle row -->
    <div class="flex items-center gap-3">
      <!-- Category icon -->
      <component :is="categoryIcon" class="w-6 h-6 text-muted shrink-0" weight="regular" />

      <!-- Label + purpose snippet -->
      <div class="flex-1 min-w-0">
        <span class="font-medium text-sm">{{ t(`consent.${category}.v3.label`) }}</span>
        <p class="text-xs text-muted mt-0.5 truncate">
          {{ purposeSnippet }}
        </p>
      </div>

      <!-- Switch toggle -->
      <SwitchRoot
        v-model:checked="isEnabled"
        :disabled="isDisabledForMinor"
        class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full
               transition-colors focus-visible:outline-none focus-visible:ring-2
               focus-visible:ring-accent-xp focus-visible:ring-offset-2
               data-[state=checked]:bg-accent-xp
               data-[state=unchecked]:bg-surface-3
               data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
        :aria-label="t(`consent.${category}.v3.label`)"
      >
        <SwitchThumb
          class="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0
                 transition-transform
                 data-[state=checked]:translate-x-5
                 data-[state=unchecked]:translate-x-0"
        />
        <!-- Screen reader label -->
        <span class="sr-only">{{ isEnabled ? 'Activo' : 'Inactivo' }}</span>
      </SwitchRoot>
    </div>

    <!-- Minor blocked message for Layer 4 -->
    <p
      v-if="isDisabledForMinor"
      class="text-xs text-warning ml-9"
    >
      {{ t('consent.minor.blocked') }}
    </p>

    <!-- Expandable details -->
    <CollapsibleRoot class="ml-9">
      <CollapsibleTrigger
        class="text-xs text-accent-xp underline-offset-2 hover:underline cursor-pointer"
      >
        {{ t('consent.row.expand') }}
      </CollapsibleTrigger>
      <CollapsibleContent class="mt-2 space-y-2 text-xs text-muted">
        <div>
          <span class="font-semibold text-text">¿Por qué?</span>
          <p>{{ t(`consent.${category}.v3.purpose`) }}</p>
        </div>
        <div>
          <span class="font-semibold text-text">¿Qué datos?</span>
          <p>{{ t(`consent.${category}.v3.scope`) }}</p>
        </div>
        <div>
          <span class="font-semibold text-text">¿Cuánto tiempo?</span>
          <p>{{ t(`consent.${category}.v3.retention`) }}</p>
        </div>
        <div>
          <span class="font-semibold text-text">¿Con quién?</span>
          <p>{{ t(`consent.${category}.v3.share`) }}</p>
        </div>
      </CollapsibleContent>
    </CollapsibleRoot>

    <!-- Version stamp -->
    <p class="ml-9 text-xs text-muted">
      {{ t('consent.row.version_stamp', { version: 'v3', date: '2026-04-29' }) }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { SwitchRoot, SwitchThumb, CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from 'reka-ui';
import {
  PhIdentificationCard,
  PhFootprints,
  PhHeartbeat,
  PhWatch,
  PhGameController,
  PhShieldCheck,
  PhFirstAid,
  PhStorefront,
  PhGlobe,
  PhMagnifyingGlass,
} from '@phosphor-icons/vue';
import { useConsent } from '../composables/useConsent';
import type { ConsentCategory } from '@gamechangers/shared';

const props = defineProps<{
  category: ConsentCategory;
  layer: 0 | 1 | 2 | 3 | 4;
  isMinor?: boolean;
}>();

const { t } = useI18n();
const { grant, revoke, hasGranted } = useConsent();

// Icon map per category
const CATEGORY_ICONS: Record<ConsentCategory, unknown> = {
  basic_profile: PhIdentificationCard,
  event_participation: PhFootprints,
  health_self_reports: PhHeartbeat,
  wearable_data: PhWatch,
  gaming_habits: PhGameController,
  b2b_insurers: PhShieldCheck,
  b2b_healthcare: PhFirstAid,
  b2b_brands: PhStorefront,
  cross_border: PhGlobe,
  research: PhMagnifyingGlass,
};

const categoryIcon = computed(() => CATEGORY_ICONS[props.category]);

// Whether this toggle is disabled for minor users (Layer 4 only)
const isDisabledForMinor = computed(() => Boolean(props.isMinor) && props.layer === 4);

// Current grant state (reactive)
const grantedRef = hasGranted(props.category);
const isEnabled = ref(grantedRef.value);

// Sync external state changes into local ref
watch(grantedRef, (val) => {
  isEnabled.value = val;
});

// Purpose snippet — truncate to ~80 chars for compact display
const purposeSnippet = computed(() => {
  const full = t(`consent.${props.category}.v3.purpose`);
  return full.length > 80 ? full.slice(0, 79) + '…' : full;
});

// Watch isEnabled for toggle changes; debounce at 500ms
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(isEnabled, async (newVal) => {
  if (newVal === grantedRef.value) return; // No actual change

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    try {
      if (newVal) {
        await grant(props.category, props.layer);
      } else {
        await revoke(props.category);
      }
    } catch {
      // Revert on error
      isEnabled.value = grantedRef.value;
    }
  }, 500);
});
</script>
