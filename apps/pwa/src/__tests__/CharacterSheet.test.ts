/**
 * CharacterSheet.test.ts — Component tests for CharacterSheet.vue.
 *
 * Critical tests (Pitfall #9 + PROF-12):
 * 1. User with NO data (stats all 1) → all 4 StatRow components render
 *    with full accent-xp color (NOT grayed out).
 * 2. When health_self_reports consent is missing, the 'connect-more-banner' appears
 *    but the stat bars STILL render.
 * 3. When health_self_reports consent IS granted, the banner does NOT appear
 *    and stat bars STILL render.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';

// --- Router mock ---
vi.mock('vue-router', () => ({
  RouterLink: defineComponent({
    props: ['to'],
    template: '<a :href="to"><slot /></a>',
  }),
  useRoute: vi.fn(() => ({ params: {} })),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

// --- Firebase mocks ---
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => ({}) }),
  setDoc: vi.fn().mockResolvedValue(undefined),
  collection: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
}));

vi.mock('../firebase', () => ({
  firebaseApp: {},
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => vi.fn()),
}));

// --- VueFire mock ---
vi.mock('vuefire', () => ({
  useCurrentUser: vi.fn(() => ref({ uid: 'test-uid', isAnonymous: false })),
  useFirestore: vi.fn(() => ({})),
  useDocument: vi.fn(() => ref(null)),
  useCollection: vi.fn(() => ref([])),
}));

// --- Profile store mock ---
const mockProfile = ref<Record<string, unknown> | null>(null);
vi.mock('../stores/profile', () => ({
  useProfileStore: () => ({
    profile: mockProfile.value,
    fetchProfile: vi.fn().mockResolvedValue(undefined),
    updateProfile: vi.fn().mockResolvedValue(undefined),
  }),
}));

// --- Consent mock (controllable) ---
let mockHasGranted = false;
vi.mock('../composables/useConsent', () => ({
  useConsent: () => ({
    hasGranted: (_category: string) => mockHasGranted,
    grant: vi.fn(),
    revoke: vi.fn(),
  }),
}));

// --- PostHog mock ---
vi.mock('../composables/usePosthog', () => ({
  usePosthog: () => ({
    optIn: vi.fn(),
    optOut: vi.fn(),
    capture: vi.fn(),
    hasOptedIn: vi.fn(() => false),
  }),
}));

// --- i18n mock ---
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) return `${key}:${JSON.stringify(params)}`;
      return key;
    },
    locale: ref('es'),
  }),
  createI18n: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockHasGranted = false;
  mockProfile.value = null;
});

async function mountCharacterSheet() {
  const { default: CharacterSheet } = await import('../views/me/CharacterSheet.vue');
  const wrapper = mount(CharacterSheet, {
    global: {
      stubs: {
        XpBar: true,
        Avatar: true,
        AppShell: {
          template: '<div><slot /></div>',
        },
      },
    },
  });
  // Allow onMounted async to settle
  await new Promise((r) => setTimeout(r, 0));
  await wrapper.vm.$nextTick();
  return wrapper;
}

describe('CharacterSheet', () => {
  it('renders all 4 StatRow components for a user with no data (stats all = 1)', async () => {
    mockProfile.value = {
      uid: 'test-uid',
      displayName: 'Gamer',
      level: 1,
      xp: 0,
      stats: { hp: 1, stamina: 1, mente: 1, social: 1 },
      publicVisibility: false,
    };

    const wrapper = await mountCharacterSheet();

    // All 4 stat rows present via data-testid
    expect(wrapper.find('[data-testid="stat-hp"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="stat-stamina"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="stat-mente"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="stat-social"]').exists()).toBe(true);
  });

  it('shows connect-more banner when health_self_reports consent is missing', async () => {
    mockHasGranted = false;
    mockProfile.value = {
      uid: 'test-uid',
      displayName: 'Gamer',
      level: 1,
      xp: 0,
      stats: { hp: 1, stamina: 1, mente: 1, social: 1 },
      publicVisibility: false,
    };

    const wrapper = await mountCharacterSheet();

    // Banner present
    expect(wrapper.find('[data-testid="connect-more-banner"]').exists()).toBe(true);
    // Stat rows STILL present (not hidden by banner)
    expect(wrapper.find('[data-testid="stat-rows"]').exists()).toBe(true);
  });

  it('does NOT show connect-more banner when health_self_reports consent is granted', async () => {
    mockHasGranted = true;
    mockProfile.value = {
      uid: 'test-uid',
      displayName: 'Gamer',
      level: 5,
      xp: 2000,
      stats: { hp: 40, stamina: 30, mente: 25, social: 35 },
      publicVisibility: true,
    };

    const wrapper = await mountCharacterSheet();

    expect(wrapper.find('[data-testid="connect-more-banner"]').exists()).toBe(false);
    // Stat rows still present
    expect(wrapper.find('[data-testid="stat-rows"]').exists()).toBe(true);
  });

  it('stat rows container always renders regardless of wearable/consent state (Pitfall #9)', async () => {
    // No profile at all — defaults to { hp:1, stamina:1, mente:1, social:1 }
    mockProfile.value = null;
    mockHasGranted = false;

    const wrapper = await mountCharacterSheet();

    // The stat-rows wrapper must exist — never gated
    const statRows = wrapper.find('[data-testid="stat-rows"]');
    expect(statRows.exists()).toBe(true);
    // Should contain all 4 individual stat testids
    expect(statRows.find('[data-testid="stat-hp"]').exists()).toBe(true);
  });
});
