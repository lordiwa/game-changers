<template>
  <li
    class="leaderboard-row"
    :class="{ 'is-self': isSelf }"
    :aria-label="`#${row.rank} ${row.displayName} — ${row.value} puntos`"
  >
    <!-- Rank -->
    <span class="rank" :class="{ 'top-3': row.rank <= 3 }">
      {{ row.rank <= 3 ? rankEmoji : `#${row.rank}` }}
    </span>

    <!-- Avatar placeholder (no photo for anonymous users) -->
    <div class="avatar" :aria-hidden="true">
      {{ row.anonymous ? '?' : row.displayName[0]?.toUpperCase() }}
    </div>

    <!-- Display name -->
    <span class="display-name">
      {{ row.displayName }}
      <span v-if="isSelf" class="self-badge" aria-label="Tú">Tú</span>
    </span>

    <!-- Tier badge if present -->
    <span v-if="row.tier" class="tier-badge" :class="`tier-${row.tier}`">
      {{ row.tier }}
    </span>

    <!-- Value -->
    <span class="value" aria-label="Puntos">{{ formattedValue }}</span>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { LeaderboardRow as LeaderboardRowType } from '@gamechangers/shared';

const props = defineProps<{
  row: LeaderboardRowType;
  isSelf?: boolean;
}>();

const RANK_EMOJIS = ['🥇', '🥈', '🥉'];
const rankEmoji = computed(() => RANK_EMOJIS[props.row.rank - 1] ?? `#${props.row.rank}`);

const formattedValue = computed(() => {
  const v = props.row.value;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return String(v);
});
</script>

<style scoped>
.leaderboard-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background: var(--color-surface-2, #1f2937);
  border: 1px solid transparent;
  transition: border-color 0.15s;
}

.leaderboard-row.is-self {
  background: var(--color-surface-3, #374151);
  border-color: var(--color-accent-xp, #f59e0b);
}

.rank {
  font-size: 0.875rem;
  font-family: 'JetBrains Mono', monospace;
  color: var(--color-text-muted, #9ca3af);
  min-width: 2.5rem;
  text-align: center;
}

.rank.top-3 {
  font-size: 1.25rem;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-border, #374151);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.display-name {
  flex: 1;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.self-badge {
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  background: var(--color-accent-xp, #f59e0b);
  color: #000;
  border-radius: 9999px;
  font-weight: 700;
}

.tier-badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tier-bronce { background: #92400e; color: #fbbf24; }
.tier-plata  { background: #374151; color: #e5e7eb; }
.tier-oro    { background: #78350f; color: #f59e0b; }

.value {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  color: var(--color-accent-xp, #f59e0b);
  font-size: 0.875rem;
}
</style>
