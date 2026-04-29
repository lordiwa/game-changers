/*
 * Plan 02-02 Task 2 — AgeGate.vue component tests.
 *
 * Tests 3 cases (D-14, AUTH-12):
 *  - age 15 → rejected with `auth.age_gate.error.under_16` text visible.
 *  - age 17 → isMinor banner shown (`auth.age_gate.minor_consent_required`).
 *  - age 25 → no error, router.push('/me') called.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { createRouter, createMemoryHistory } from 'vue-router';

// ─── Mock firebase/auth and useAuth composable ────────────────────────────────

const verifyAgeMock = vi.fn();

vi.mock('../composables/useAuth', () => ({
  useAuth: () => ({
    currentUser: { value: null },
    isAnonymous: { value: true },
    hasDiscord: { value: false },
    ageVerified: { value: false },
    isMinor: { value: false },
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    sendPasswordReset: vi.fn(),
    signInWithPhone: vi.fn(),
    confirmPhoneCode: vi.fn(),
    signOut: vi.fn(),
    verifyAge: verifyAgeMock,
  }),
}));

vi.mock('../firebase', () => ({ firebaseApp: {} }));

// ─── i18n setup with required keys ───────────────────────────────────────────

const i18n = createI18n({
  legacy: false,
  locale: 'es',
  messages: {
    es: {
      auth: {
        age_gate: {
          heading: 'Necesitamos saber tu edad',
          body: 'GameChangers es 16+ por la ley LOPDP de Ecuador.',
          date_label: 'Fecha de nacimiento',
          day: 'Día',
          month: 'Mes',
          year: 'Año',
          cta: 'Confirmar mi edad',
          minor_consent_required: 'Necesitamos consentimiento de tu papá/mamá/tutor para activar este permiso.',
          error: {
            under_16: 'Aún no podés crear cuenta',
            under_16_body: 'GameChangers es para 16+ por la ley LOPDP. Volvé cuando cumplas la edad — la comunidad de Discord está abierta para todos los públicos compatibles con el modo teen.',
          },
        },
        signin: { heading: 'Inicia sesión' },
      },
    },
  },
});

// ─── Router ───────────────────────────────────────────────────────────────────

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/auth/age-gate', component: { template: '<div/>' } },
      { path: '/me', component: { template: '<div/>' } },
    ],
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function birthDateForAge(years: number): { day: string; month: string; year: string } {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  d.setDate(d.getDate() - 1); // safely past birthday boundary
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: String(d.getMonth() + 1).padStart(2, '0'),
    year: String(d.getFullYear()),
  };
}

async function mountAgeGate() {
  const router = makeRouter();
  await router.push('/auth/age-gate');
  const { default: AgeGate } = await import('../views/auth/AgeGate.vue');
  const wrapper = mount(AgeGate, {
    global: {
      plugins: [i18n, router],
    },
  });
  return { wrapper, router };
}

async function setDateAndSubmit(
  wrapper: ReturnType<typeof mount>,
  { day, month, year }: { day: string; month: string; year: string },
) {
  await wrapper.find('select[aria-label="Día"]').setValue(day);
  await wrapper.find('select[aria-label="Mes"]').setValue(month);
  await wrapper.find('select[aria-label="Año"]').setValue(year);
  await wrapper.find('button[type="submit"]').trigger('click');
  await flushPromises();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AgeGate.vue', () => {
  beforeEach(() => {
    verifyAgeMock.mockReset();
  });

  it('age 15 → shows under_16 rejection text (AGE_UNDER_16)', async () => {
    verifyAgeMock.mockRejectedValueOnce(new Error('AGE_UNDER_16'));

    const { wrapper } = await mountAgeGate();
    const bd = birthDateForAge(15);
    await setDateAndSubmit(wrapper, bd);

    // Rejection banner must be visible with the exact i18n key text.
    expect(wrapper.text()).toContain('Aún no podés crear cuenta');
    // The body must contain LOPDP reference.
    expect(wrapper.text()).toContain('LOPDP');
    // Form should be hidden (rejected === true hides the form).
    expect(wrapper.find('form').exists()).toBe(false);
  });

  it('age 17 → shows minor consent banner', async () => {
    verifyAgeMock.mockResolvedValueOnce({ ageVerified: true, isMinor: true, parentalConsentRequired: true });

    const { wrapper } = await mountAgeGate();
    const bd = birthDateForAge(17);
    await setDateAndSubmit(wrapper, bd);

    expect(wrapper.text()).toContain('Necesitamos consentimiento de tu papá/mamá/tutor');
  });

  it('age 25 → no error, navigates to /me', async () => {
    verifyAgeMock.mockResolvedValueOnce({ ageVerified: true, isMinor: false, parentalConsentRequired: false });

    const { wrapper, router } = await mountAgeGate();
    const bd = birthDateForAge(25);
    await setDateAndSubmit(wrapper, bd);

    // No rejection text.
    expect(wrapper.text()).not.toContain('Aún no podés crear cuenta');
    // Router navigated to /me.
    expect(router.currentRoute.value.path).toBe('/me');
  });
});
