/**
 * « Le mot de Sprinty » : une phrase par jour sur l'accueil, calculée à partir des données du check-in.
 * Aucun appel à l'IA (donc gratuit et sans quota). Rien à dire = pas de carte : Sprinty ne parle que s'il a quelque chose d'utile.
 */
import type { CheckInData } from '../../services/checkInService';
import { summarizePains } from '../checkin/painHistory';
import { checkInStreak } from '../checkin/checkinInsights';
import type { MoodKey } from './avatar/poses.generated';

export interface SprintyWord {
  id: string;
  text: string;
  /** Question envoyée à Sprinty quand on touche la carte. */
  prompt: string;
  mood: MoodKey;
}

const shift = (day: string, delta: number) => {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + delta);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export function computeSprintyWord(history: CheckInData[], today: string): SprintyWord | null {
  if (history.length === 0) return null;

  // 1. Une douleur qui dure passe avant tout
  const lasting = summarizePains(history, today, 7).find((t) => t.persistent);
  if (lasting) {
    return {
      id: `pain:${lasting.key}`,
      text: `${lasting.label} te gêne depuis ${lasting.daysLast7} jours. On en parle ?`,
      prompt: `Ma douleur « ${lasting.label} » revient depuis ${lasting.daysLast7} jours. Que me conseilles-tu pour la suite de ma semaine ?`,
      mood: 'perplexed',
    };
  }

  // 2. Sommeil court : au moins 3 nuits sous 7 h sur les 5 derniers check-ins
  const recent = [...history].sort((a, b) => (a.date < b.date ? 1 : -1)).filter((c) => c.date >= shift(today, -6));
  const sleeps = recent.filter((c) => c.sleep_hours != null).slice(0, 5);
  const short = sleeps.filter((c) => Number(c.sleep_hours) < 7).length;
  if (sleeps.length >= 3 && short >= 3) {
    return {
      id: 'sleep',
      text: `${short} nuits sous 7 h cette semaine. On regarde ça ?`,
      prompt: 'Mes nuits sont courtes cette semaine. Comment mieux récupérer ?',
      mood: 'sleep',
    };
  }

  // 3. Forme basse depuis plusieurs jours
  const forms = recent.slice(0, 3).map((c) => c.health_score).filter((v): v is number => v != null);
  if (forms.length >= 2 && forms.reduce((s, v) => s + v, 0) / forms.length < 50) {
    return {
      id: 'form',
      text: `Ta forme est basse depuis ${forms.length} jours. On adapte la semaine ?`,
      prompt: 'Ma forme est basse depuis quelques jours. Comment adapter mon entraînement ?',
      mood: 'caution',
    };
  }

  // 4. Une série à saluer
  const streak = checkInStreak(history.map((c) => c.date), today);
  if (streak >= 3 && history.some((c) => c.date === today)) {
    return {
      id: `streak:${streak}`,
      text: `${streak} jours de check-in d'affilée. Beau travail.`,
      prompt: 'Comment évolue ma forme ces dernières semaines ?',
      mood: 'success',
    };
  }
  return null;
}
