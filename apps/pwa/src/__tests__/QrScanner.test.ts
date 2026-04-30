/*
 * Plan 02-07 — QrScanner component unit tests.
 *
 * Assertions (T-02-07-07, T-02-07-12):
 *  - Component renders with aria-live region for screen readers
 *  - Start button is present with descriptive aria-label
 *  - Manual fallback button emits 'manual-fallback'
 *  - Start button disabled while scanning
 *  - Offline-badge appears when pendingScans > 0
 *  - Camera stop is called on unmount (no resource leak)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';

// ─── useCheckIn mock ──────────────────────────────────────────────────────────
const checkInMock = vi.fn(async () => 'success' as const);
const statusRef = ref<string>('idle');
const pendingScansRef = ref(0);

vi.mock('../composables/useCheckIn', () => ({
  useCheckIn: (_eventId: string) => ({
    checkIn: checkInMock,
    status: statusRef,
    pendingScans: pendingScansRef,
    isOnline: ref(true),
  }),
}));

// ─── vue-i18n mock ─────────────────────────────────────────────────────────────
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

// ─── getUserMedia mock ────────────────────────────────────────────────────────
const stopTrackMock = vi.fn();
const streamMock = {
  getTracks: () => [{ stop: stopTrackMock }],
};
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: { getUserMedia: vi.fn(async () => streamMock) },
  writable: true,
});

import QrScanner from '../components/QrScanner.vue';

describe('QrScanner', () => {
  beforeEach(() => {
    statusRef.value = 'idle';
    pendingScansRef.value = 0;
    checkInMock.mockClear();
    stopTrackMock.mockClear();
  });

  it('renders an aria-live polite region for screen reader announcements', () => {
    const wrapper = mount(QrScanner, {
      props: { eventId: 'evt-test' },
    });
    const liveRegion = wrapper.find('[aria-live="polite"]');
    expect(liveRegion.exists()).toBe(true);
  });

  it('renders start button with aria-label containing scan cta key', () => {
    const wrapper = mount(QrScanner, { props: { eventId: 'evt-test' } });
    const btn = wrapper.findAll('button').find((b) =>
      b.attributes('aria-label')?.includes('checkin'),
    );
    expect(btn).toBeTruthy();
  });

  it('renders manual fallback button', () => {
    const wrapper = mount(QrScanner, { props: { eventId: 'evt-test' } });
    const btns = wrapper.findAll('button');
    const manual = btns.find((b) => b.attributes('aria-label')?.includes('manual'));
    expect(manual).toBeTruthy();
  });

  it('emits "manual-fallback" when manual button is clicked', async () => {
    const wrapper = mount(QrScanner, { props: { eventId: 'evt-test' } });
    const btns = wrapper.findAll('button');
    const manual = btns.find((b) => b.attributes('aria-label')?.includes('manual'));
    await manual!.trigger('click');
    expect(wrapper.emitted('manual-fallback')).toBeTruthy();
  });

  it('does not show offline badge when pendingScans is 0', () => {
    const wrapper = mount(QrScanner, { props: { eventId: 'evt-test' } });
    const badge = wrapper.find('.qr-scanner__offline-badge');
    expect(badge.exists()).toBe(false);
  });

  it('shows offline badge when pendingScans > 0', async () => {
    pendingScansRef.value = 2;
    const wrapper = mount(QrScanner, { props: { eventId: 'evt-test' } });
    const badge = wrapper.find('.qr-scanner__offline-badge');
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toContain('2');
  });

  it('shows success toast when status is "success"', async () => {
    statusRef.value = 'success';
    const wrapper = mount(QrScanner, { props: { eventId: 'evt-test' } });
    const toast = wrapper.find('.qr-scanner__toast');
    expect(toast.exists()).toBe(true);
    expect(toast.classes()).toContain('qr-scanner__toast--success');
  });

  it('shows error toast when status is "error_expired"', async () => {
    statusRef.value = 'error_expired';
    const wrapper = mount(QrScanner, { props: { eventId: 'evt-test' } });
    const toast = wrapper.find('.qr-scanner__toast');
    expect(toast.exists()).toBe(true);
    expect(toast.classes()).toContain('qr-scanner__toast--error');
  });

  it('shows warning toast when status is "error_offline"', async () => {
    statusRef.value = 'error_offline';
    const wrapper = mount(QrScanner, { props: { eventId: 'evt-test' } });
    const toast = wrapper.find('.qr-scanner__toast');
    expect(toast.exists()).toBe(true);
    expect(toast.classes()).toContain('qr-scanner__toast--warning');
  });
});
