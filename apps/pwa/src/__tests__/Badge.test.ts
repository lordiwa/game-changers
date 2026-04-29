/**
 * Badge.test.ts — Component tests for Badge.vue.
 *
 * Tests:
 * 1. Earned badge renders label and does NOT show lock icon.
 * 2. Locked badge shows lock icon (🔒).
 * 3. Tier indicator renders for earned badges with tier prop.
 * 4. Tier indicator does NOT render for locked badges.
 * 5. badge--locked CSS class applied to locked, not to earned.
 */
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Badge from '../components/Badge.vue';

describe('Badge', () => {
  it('renders label text for an earned badge', () => {
    const wrapper = mount(Badge, {
      props: {
        badgeId: 'first-event',
        label: 'First Event',
        earned: true,
      },
    });

    expect(wrapper.text()).toContain('First Event');
    // Lock icon must NOT be present
    expect(wrapper.html()).not.toContain('🔒');
  });

  it('shows lock icon (🔒) for a locked badge', () => {
    const wrapper = mount(Badge, {
      props: {
        badgeId: 'rare-badge',
        label: 'Rare Achievement',
        earned: false,
      },
    });

    expect(wrapper.html()).toContain('🔒');
  });

  it('applies badge--locked class to locked badge', () => {
    const wrapper = mount(Badge, {
      props: {
        badgeId: 'locked-test',
        label: 'Locked',
        earned: false,
      },
    });

    expect(wrapper.classes()).toContain('badge--locked');
  });

  it('does NOT apply badge--locked class to earned badge', () => {
    const wrapper = mount(Badge, {
      props: {
        badgeId: 'earned-test',
        label: 'Earned',
        earned: true,
      },
    });

    expect(wrapper.classes()).not.toContain('badge--locked');
  });

  it('renders tier indicator for earned badge with tier prop', () => {
    const wrapper = mount(Badge, {
      props: {
        badgeId: 'gold-badge',
        label: 'Gold Champion',
        earned: true,
        tier: 'oro',
      },
    });

    // The tier span should be present and contain the capitalized tier name
    const tierEl = wrapper.find('.badge__tier');
    expect(tierEl.exists()).toBe(true);
    expect(tierEl.text()).toBe('Oro');
  });

  it('does NOT render tier indicator for a locked badge even if tier prop provided', () => {
    const wrapper = mount(Badge, {
      props: {
        badgeId: 'locked-gold',
        label: 'Locked Gold',
        earned: false,
        tier: 'oro',
      },
    });

    // Tier element gated behind v-if="tier && earned" — must be absent
    expect(wrapper.find('.badge__tier').exists()).toBe(false);
  });

  it('renders initials from badgeId as fallback when no imageUrl', () => {
    const wrapper = mount(Badge, {
      props: {
        badgeId: 'xy-badge',
        label: 'XY Badge',
        earned: true,
      },
    });

    const initials = wrapper.find('.badge__initials');
    expect(initials.exists()).toBe(true);
    expect(initials.text()).toBe('XY');
  });
});
