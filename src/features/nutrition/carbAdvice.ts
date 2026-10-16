export type CarbAdviceSession = {
  date_prevue?: string | null;
  type_seance?: string | null;
  status?: string | null;
  measures?: any;
};

/**
 * Phrase calme d'ajustement des féculents selon l'entraînement du jour (N3).
 * Deux cas stricts :
 * 1. Séance prévue aujourd'hui : « Séance aujourd'hui. Les féculents ont plus de place. »
 * 2. Pas de séance, ou type repos : « Pas de séance aujourd'hui. »
 *
 * Règle : Jamais de consigne de manger moins. Aucun gramme inventé.
 */
export function getCarbAdvice(workoutsToday?: CarbAdviceSession[] | null): string {
  if (!workoutsToday || workoutsToday.length === 0) {
    return "Pas de séance aujourd'hui.";
  }

  const activeWorkouts = workoutsToday.filter((w) => {
    const isRest =
      w?.measures?.kind === 'rest' ||
      /repos/i.test(String(w?.type_seance ?? ''));
    return !isRest;
  });

  if (activeWorkouts.length === 0) {
    return "Pas de séance aujourd'hui.";
  }

  return "Séance aujourd'hui. Les féculents ont plus de place.";
}
