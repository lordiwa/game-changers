/**
 * useChallengeNarrative.ts — Gaming-themed challenge value comparisons (CHLG-06).
 *
 * Given a metric + value + optional cluster, returns a gaming-themed narrative string.
 * Example: { metric: 'steps', value: 4200, cluster: 'lol' }
 *   → "Caminaste 4.2km — equivalente a cruzar Summoner's Rift 47 veces"
 *
 * Comparisons use i18n keys so they can be translated. Gaming terms (Summoner's Rift,
 * Verdansk, Dust 2) stay in English per CLAUDE.md language rules.
 *
 * Reference distances used for comparisons:
 *   Summoner's Rift (LoL):    ~900m in-game traversal equivalent
 *   Dust 2 (CS):              ~500m end-to-end
 *   Verdansk (WZ):            ~3km diagonal
 *   Free Fire map:            ~2km cross-map
 */
import { computed, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';

export type NarrativeMetric = 'steps' | 'minutes_meditated' | 'events_attended' | 'sleep_hours' | 'days_active' | 'custom';
export type NarrativeCluster = 'lol' | 'free-fire' | 'dota' | 'minecraft' | 'general';

// Distance constants (meters)
const SUMMONER_RIFT_M = 900;
const DUST_2_M = 500;
const VERDANSK_M = 3000;
const FREE_FIRE_M = 2000;
const STEPS_TO_KM = 0.0008;  // avg step ~0.8m for 1000 steps → 0.8km

interface NarrativeInput {
  metric: NarrativeMetric;
  value: number;
  cluster?: NarrativeCluster;
}

export function useChallengeNarrative() {
  const { t } = useI18n();

  function getNarrative(input: NarrativeInput): string {
    const { metric, value, cluster } = input;

    switch (metric) {
      case 'steps':
        return getStepsNarrative(value, cluster);
      case 'minutes_meditated':
        return getMeditationNarrative(value);
      case 'events_attended':
        return getEventsNarrative(value);
      case 'sleep_hours':
        return getSleepNarrative(value);
      case 'days_active':
        return getDaysActiveNarrative(value);
      default:
        return `${value} puntos acumulados`;
    }
  }

  function getStepsNarrative(steps: number, cluster?: NarrativeCluster): string {
    const km = (steps * STEPS_TO_KM).toFixed(1);
    const distanceM = steps * 0.8; // avg 0.8m per step

    let comparison: string;

    switch (cluster) {
      case 'lol': {
        const n = Math.round(distanceM / SUMMONER_RIFT_M);
        comparison = n > 0
          ? t('challenges.narrative.cluster.lol.summoner_rift_template', { n })
          : 'casi medio Summoner\'s Rift';
        break;
      }
      case 'free-fire': {
        const n = Math.round(distanceM / FREE_FIRE_M);
        comparison = n > 0
          ? t('challenges.narrative.cluster.free_fire.map_template', { n })
          : 'casi cruzar el mapa de Free Fire';
        break;
      }
      case 'dota': {
        // Dota 2 map is roughly similar to LoL's
        const n = Math.round(distanceM / SUMMONER_RIFT_M);
        comparison = n > 0 ? `cruzar el mapa de Dota 2 ${n} veces` : 'casi cruzar el mapa de Dota 2';
        break;
      }
      default: {
        // Generic gaming comparison: use Verdansk (CoD Warzone) as universal reference
        if (distanceM >= VERDANSK_M) {
          const n = Math.round(distanceM / VERDANSK_M);
          comparison = `cruzar Verdansk ${n} veces`;
        } else if (distanceM >= DUST_2_M) {
          const n = Math.round(distanceM / DUST_2_M);
          comparison = `recorrer Dust 2 ${n} veces`;
        } else {
          const blocks = Math.round(distanceM / 100);
          comparison = blocks > 0
            ? t('challenges.narrative.cluster.general.city_block_template', { n: blocks })
            : 'media cuadra';
        }
      }
    }

    return t('challenges.narrative.steps_template', { km, comparison });
  }

  function getMeditationNarrative(minutes: number): string {
    if (minutes >= 30) {
      const sessions = Math.round(minutes / 30);
      return `${minutes} min meditados — equivalente a ${sessions} boss raid${sessions > 1 ? 's' : ''} de 30 min`;
    }
    if (minutes >= 20) {
      return `${minutes} min meditados — equivalente a una partida ranked entera`;
    }
    return `${minutes} min meditados — tu mente está en modo training`;
  }

  function getEventsNarrative(events: number): string {
    if (events >= 5) {
      return `${events} eventos — ya armaste tu propio scrim team`;
    }
    if (events >= 5) {
      return `${events} eventos — ya juntaste un equipo de 5`;
    }
    if (events >= 2) {
      return `${events} eventos — ya tenés duo partner`;
    }
    return `${events} evento — tu primer matchup IRL. ¡GG!`;
  }

  function getSleepNarrative(hours: number): string {
    if (hours >= 8) {
      return `${hours}h de sueño — HP al máximo para el próximo raid`;
    }
    if (hours >= 6) {
      return `${hours}h de sueño — stats en verde, listo para rankear`;
    }
    return `${hours}h de sueño — modo survival activado`;
  }

  function getDaysActiveNarrative(days: number): string {
    if (days >= 30) {
      return `${days} días consecutivos — racha de leyenda 🔥`;
    }
    if (days >= 7) {
      return `${days} días seguidos — tu streak está on fire`;
    }
    return `${days} día${days > 1 ? 's' : ''} activo${days > 1 ? 's' : ''} — empezaste tu racha`;
  }

  function getNarrativeRef(input: Ref<NarrativeInput>) {
    return computed(() => getNarrative(input.value));
  }

  return {
    getNarrative,
    getNarrativeRef,
  };
}
