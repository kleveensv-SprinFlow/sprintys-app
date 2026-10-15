/**
 * Ce que l'athlète voit juste après son check-in : série de jours, conseil du jour, douleurs fortes.
 * Conseils prudents : pas de diagnostic, renvoi vers un professionnel quand une douleur dure ou s'aggrave.
 */
import type { CheckInData, PainInfo } from '../../services/checkInService';
import { isCriticalPain } from './painTaxonomy';

const shift = (day: string, delta: number) => {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + delta);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Jours d'affilée avec un check-in, en comptant aujourd'hui (ou hier si aujourd'hui n'est pas encore fait). */
export const checkInStreak = (dates: string[], today: string): number => {
  const set = new Set(dates);
  let day = set.has(today) ? today : shift(today, -1);
  let n = 0;
  while (set.has(day)) {
    n += 1;
    day = shift(day, -1);
  }
  return n;
};

export const streakLabel = (n: number) =>
  n <= 1 ? 'Premier jour de ta série' : `${n} jours d’affilée`;

export type Tone = 'good' | 'mid' | 'low' | 'alert';

export interface DayAdvice {
  tone: Tone;
  title: string;
  text: string;
}

export const dayAdvice = (score: number | null, pains: PainInfo[]): DayAdvice => {
  if (pains.some(isCriticalPain)) {
    return {
      tone: 'alert',
      title: 'Douleur forte notée',
      text: 'Ne force pas dessus aujourd’hui. Si tu es suivi par un coach, il est prévenu. Si la douleur dure ou s’aggrave, consulte un professionnel de santé.',
    };
  }
  if (score === null) return { tone: 'mid', title: 'Check-in enregistré', text: 'Merci, ton ressenti du jour est noté.' };
  if (score >= 70) return { tone: 'good', title: 'Bonne forme', text: 'Tu peux suivre ta séance prévue.' };
  if (score >= 40)
    return { tone: 'mid', title: 'Forme moyenne', text: 'Garde ta séance, mais écoute tes sensations et ajuste l’intensité si besoin.' };
  return { tone: 'low', title: 'Forme basse', text: 'Privilégie une séance légère ou la récupération, et parles-en à ton coach.' };
};

/** Piliers passés : le score repose sur le reste, on le dit. */
export const missingPillars = (ci: Pick<CheckInData, 'sleep_score' | 'mental_score'>): string | null => {
  const missing = [ci.sleep_score == null ? 'sommeil' : null, ci.mental_score == null ? 'mental' : null].filter(Boolean);
  if (!missing.length) return null;
  return `${missing.join(' et ')[0].toUpperCase()}${missing.join(' et ').slice(1)} non renseigné${missing.length > 1 ? 's' : ''} : la forme est calculée sur le reste.`;
};
