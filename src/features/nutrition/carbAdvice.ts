import { sessionKindOf } from '../workout/sessionKind';

export type CarbAdviceSession = {
  date_prevue?: string | null;
  type_seance?: string | null;
  status?: string | null;
  measures?: any;
  blocks?: any[];
  exercises?: any[];
};

/**
 * Phrase calme d'ajustement des féculents selon l'entraînement du jour (N3).
 * Deux cas stricts :
 * 1. Séance prévue aujourd'hui : « Séance aujourd'hui. Les féculents ont plus de place. »
 * 2. Pas de séance, ou type repos : « Pas de séance aujourd'hui. »
 *
 * Le repos est reconnu via le helper canonique sessionKindOf (src/features/workout/sessionKind.ts).
 * Règle : Jamais de consigne de manger moins. Aucun gramme inventé.
 */
export function getCarbAdvice(workoutsToday?: CarbAdviceSession[] | null): string {
  if (!workoutsToday || workoutsToday.length === 0) {
    return "Pas de séance aujourd'hui.";
  }

  const activeWorkouts = workoutsToday.filter((w) => sessionKindOf(w) !== 'rest');

  if (activeWorkouts.length === 0) {
    return "Pas de séance aujourd'hui.";
  }

  return "Séance aujourd'hui. Les féculents ont plus de place.";
}
