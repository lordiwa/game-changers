/**
 * AppShell.test.ts — Component tests for AppShell.vue.
 *
 * Tests:
 * 1. At 360px viewport (mobile), bottom-tab nav is present and left-rail is absent.
 * 2. At 768px+ viewport (desktop), left-rail is present and bottom-tab nav is absent.
 * 3. CrisisHelpButton is always present in both mobile and desktop layouts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, defineComponent } from 'vue';

// --- Router mock ---
vi.mock('vue-router', () => ({
  RouterLink: defineComponent({
    props: ['to'],
    template: '<a :href="to"><slot /></a>',
  }),
  useRoute: vi.fn(() => ({ params: {}, meta: {} })),
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
vi.mock('../stores/profile', () => ({
  useProfileStore: () => ({
    profile: null,
    fetchProfile: vi.fn().mockResolvedValue(undefined),
    updateProfile: vi.fn().mockResolvedValue(undefined),
  }),
}));

// --- i18n mock ---
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: ref('es'),
  }),
  createI18n: vi.fn(),
}));

// --- Controllable useMediaQuery mock ---
let mockIsDesktop = false;
vi.mock('@vueuse/core', () => ({
  useMediaQuery: vi.fn(() => ref(mockIsDesktop)),
  useOnline: vi.fn(() => ref(true)),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

async function mountAppShell(isDesktop: boolean) {
  mockIsDesktop = isDesktop;

  // Re-import to pick up fresh mock state
  const { default: AppShell } = await import('../components/AppShell.vue');

  const wrapper = mount(AppShell, {
    global: {
      stubs: {
        // Stub child components to keep tests focused on AppShell layout
        CrisisHelpButton: {
          template: '<button data-testid="crisis-help-button">Crisis</button>',
        },
        OfflineBanner: {
          template: '<div data-testid="offline-banner"></div>',
        },
        Avatar: {
          template: '<div data-testid="avatar"></div>',
        },
        XpBar: {
          template: '<div data-testid="xp-bar"></div>',
        },
      },
    },
    slots: {
      default: '<div data-testid="slot-content">Content</div>',
    },
  });

  await new Promise((r) => setTimeout(r, 0));
  await wrapper.vm.$nextTick();
  return wrapper;
}

describe('AppShell', () => {
  it('mobile (<768px): bottom-tab nav is present and left-rail is absent', async () => {
    const wrapper = await mountAppShell(false);

    expect(wrapper.find('.app-shell__bottom-nav').exists()).toBe(true);
    expect(wrapper.find('.app-shell__left-rail').exists()).toBe(false);
  });

  it('desktop (≥768px): left-rail is present and bottom-tab nav is absent', async () => {
    const wrapper = await mountAppShell(true);

    expect(wrapper.find('.app-shell__left-rail').exists()).toBe(true);
    expect(wrapper.find('.app-shell__bottom-nav').exists()).toBe(false);
  });

  it('CrisisHelpButton is always present on mobile', async () => {
    const wrapper = await mountAppShell(false);

    // CrisisHelpButton is rendered inside app-shell__crisis-mobile
    expect(wrapper.find('[data-testid="crisis-help-button"]').exists()).toBe(true);
  });

  it('CrisisHelpButton is always present on desktop', async () => {
    const wrapper = await mountAppShell(true);

    // CrisisHelpButton is rendered inside app-shell__crisis-desktop
    expect(wrapper.find('[data-testid="crisis-help-button"]').exists()).toBe(true);
  });

  it('slot content is rendered in both mobile and desktop layouts', async () => {
    const mobileWrapper = await mountAppShell(false);
    expect(mobileWrapper.find('[data-testid="slot-content"]').exists()).toBe(true);

    const desktopWrapper = await mountAppShell(true);
    expect(desktopWrapper.find('[data-testid="slot-content"]').exists()).toBe(true);
  });
});
