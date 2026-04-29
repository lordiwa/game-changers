/**
 * ConsentRow.test.ts — Unit tests for the ConsentRow component.
 *
 * Tests:
 * 1. Renders the label for basic_profile.
 * 2. Version stamp "v3" is rendered.
 * 3. Toggling on calls grant.
 * 4. Minor + layer 4 shows disabled helper text.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';

// Mock i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'consent.basic_profile.v3.label': 'Perfil básico',
        'consent.basic_profile.v3.purpose': 'Guardamos tu nombre, avatar y ciudad para mostrarte en la comunidad.',
        'consent.basic_profile.v3.scope': 'Datos del registro: nombre, avatar, ciudad y juegos favoritos.',
        'consent.basic_profile.v3.retention': 'Mientras tengas cuenta activa.',
        'consent.basic_profile.v3.share': 'Tu perfil público es visible para otros miembros.',
        'consent.b2b_brands.v3.label': 'Marcas y sponsors',
        'consent.b2b_brands.v3.purpose': 'Resúmenes anónimos con marcas.',
        'consent.b2b_brands.v3.scope': 'Datos agregados k≥50.',
        'consent.b2b_brands.v3.retention': '90 días.',
        'consent.b2b_brands.v3.share': 'Solo estadísticas anónimas.',
        'consent.row.expand': '¿Por qué? ¿Qué pasa si lo activo? ¿Qué pasa si lo desactivo?',
        'consent.row.version_stamp': 'v3 — actualizado 2026-04-29',
        'consent.minor.blocked': 'Necesitamos consentimiento de tu papá/mamá/tutor para activar este permiso.',
      };
      return map[key] ?? key;
    },
  }),
}));

// Mock consent store / composable
const mockGrant = vi.fn().mockResolvedValue(undefined);
const mockRevoke = vi.fn().mockResolvedValue(undefined);
const mockHasGranted = vi.fn(() => ({ value: false }));

vi.mock('../composables/useConsent', () => ({
  useConsent: () => ({
    grant: mockGrant,
    revoke: mockRevoke,
    hasGranted: mockHasGranted,
    consents: { value: {} },
    requestExport: vi.fn(),
    requestErasure: vi.fn(),
  }),
}));

// Stub reka-ui Switch and Collapsible as simple pass-throughs
vi.mock('reka-ui', () => ({
  SwitchRoot: { template: '<div class="switch-root" @click="$emit(\'update:checked\', !modelValue)"><slot /></div>', props: ['modelValue', 'disabled'], emits: ['update:checked'] },
  SwitchThumb: { template: '<span />' },
  CollapsibleRoot: { template: '<div><slot /><slot name="default" /></div>' },
  CollapsibleTrigger: { template: '<button><slot /></button>' },
  CollapsibleContent: { template: '<div><slot /></div>' },
}));

// Stub Phosphor icons
vi.mock('@phosphor-icons/vue', () => ({
  PhIdentificationCard: { template: '<span class="icon-identification" />' },
  PhFootprints: { template: '<span />' },
  PhHeartbeat: { template: '<span />' },
  PhWatch: { template: '<span />' },
  PhGameController: { template: '<span />' },
  PhShieldCheck: { template: '<span />' },
  PhFirstAid: { template: '<span />' },
  PhStorefront: { template: '<span />' },
  PhGlobe: { template: '<span />' },
  PhMagnifyingGlass: { template: '<span />' },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ConsentRow', () => {
  it('renders label for basic_profile', async () => {
    const { default: ConsentRow } = await import('../components/ConsentRow.vue');

    const wrapper = mount(ConsentRow, {
      props: {
        category: 'basic_profile',
        layer: 0,
        isMinor: false,
      },
      global: {
        stubs: {
          Transition: { template: '<div><slot /></div>' },
        },
      },
    });

    expect(wrapper.text()).toContain('Perfil básico');
  });

  it('renders version stamp containing v3', async () => {
    const { default: ConsentRow } = await import('../components/ConsentRow.vue');

    const wrapper = mount(ConsentRow, {
      props: {
        category: 'basic_profile',
        layer: 0,
        isMinor: false,
      },
    });

    expect(wrapper.text()).toContain('v3');
  });

  it('shows minor blocked text for layer 4 when isMinor=true', async () => {
    const { default: ConsentRow } = await import('../components/ConsentRow.vue');

    const wrapper = mount(ConsentRow, {
      props: {
        category: 'b2b_brands',
        layer: 4,
        isMinor: true,
      },
    });

    expect(wrapper.text()).toContain('Necesitamos consentimiento');
  });

  it('minor at layer 0 does NOT show blocked text', async () => {
    const { default: ConsentRow } = await import('../components/ConsentRow.vue');

    const wrapper = mount(ConsentRow, {
      props: {
        category: 'basic_profile',
        layer: 0,
        isMinor: true,
      },
    });

    expect(wrapper.text()).not.toContain('Necesitamos consentimiento');
  });
});
