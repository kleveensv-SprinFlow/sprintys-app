import { sessionKindOf } from '../workout/sessionKind';
import type { CarbAdviceSession } from './carbAdvice';

export interface SessionFuel {
  before: string;
  after: string;
  note?: string;
}

/**
 * Repères d'alimentation autour de la séance du jour (N6). Généraux, issus des recommandations courantes en
 * nutrition du sport : jamais de consigne de manger moins, jamais d'allégation médicale.
 * Mineur : aucune quantité chiffrée. Pas de séance, ou repos : rien (null).
 */
export function getSessionFuel(workoutsToday: CarbAdviceSession[] | null | undefined, isMinor: boolean): SessionFuel | null {
  const kinds = (workoutsToday || []).map((w) => sessionKindOf(w)).filter((k) => k !== 'rest');
  if (kinds.length === 0) return null;

  const has = (k: string) => kinds.includes(k as any);
  const competition = has('competition');
  const strengthOnly = kinds.every((k) => k === 'strength');
  const light = kinds.every((k) => k === 'technical');

  const before = light
    ? 'Une collation légère si tu as faim, sans te forcer.'
    : isMinor
      ? 'Un vrai repas avec des féculents (riz, pâtes, pain), 2 à 3 h avant. Un fruit ou une compote 30 à 60 min avant si besoin.'
      : 'Un repas avec des féculents et un peu de protéines, 2 à 3 h avant. Une collation légère (fruit, compote) 30 à 60 min avant si besoin.';

  const protein = isMinor ? 'œufs, viande, poisson, laitage ou légumineuses' : 'des protéines (20 à 30 g)';
  const after = strengthOnly
    ? `Dans les 2 h : ${protein} et des féculents pour récupérer.`
    : light
      ? `Au prochain repas : ${protein} et des féculents.`
      : `Dans les 2 h : des féculents pour recharger et ${protein}. Pense à boire.`;

  return {
    before,
    after,
    note: competition ? 'Jour de compétition : pas d’aliment nouveau, reste sur ce que tu connais.' : undefined,
  };
}
