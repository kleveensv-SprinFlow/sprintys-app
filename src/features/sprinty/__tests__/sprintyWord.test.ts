import type { CheckInData } from '../../../services/checkInService';
import { computeSprintyWord } from '../sprintyWord';

const today = '2026-10-20';
const day = (n: number) => {
  const d = new Date(`${today}T12:00:00`);
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const ci = (n: number, over: Partial<CheckInData> = {}): CheckInData => ({
  athlete_id: 'a',
  date: day(n),
  pains: [],
  health_score: 80,
  sleep_hours: 8,
  ...over,
});

describe('le mot de Sprinty', () => {
  it('ne dit rien sans historique', () => {
    expect(computeSprintyWord([], today)).toBeNull();
  });

  it('ne dit rien quand tout va bien (pas de série ni de souci)', () => {
    expect(computeSprintyWord([ci(0), ci(2)], today)).toBeNull();
  });

  it('signale une douleur qui dure en priorité', () => {
    const pain = { muscle_id: 'genoux', muscle_name: 'Genoux', side: 'Gauche' as const, intensity: 5, type: 'Autre' };
    const history = [ci(0, { pains: [pain] }), ci(1, { pains: [pain] }), ci(2, { pains: [pain] }), ci(3, { sleep_hours: 5 }), ci(4, { sleep_hours: 5 }), ci(5, { sleep_hours: 5 })];
    const w = computeSprintyWord(history, today)!;
    expect(w.id).toContain('pain:');
    expect(w.text).toContain('Genoux');
    expect(w.text).toContain('3 jours');
  });

  it('signale des nuits courtes', () => {
    const history = [ci(0, { sleep_hours: 6 }), ci(1, { sleep_hours: 5.5 }), ci(2, { sleep_hours: 6.5 }), ci(3, { sleep_hours: 8 })];
    const w = computeSprintyWord(history, today)!;
    expect(w.id).toBe('sleep');
    expect(w.text).toBe('3 nuits sous 7 h cette semaine. On regarde ça ?');
    expect(w.mood).toBe('sleep');
  });

  it('signale une forme basse', () => {
    const w = computeSprintyWord([ci(0, { health_score: 40 }), ci(1, { health_score: 45 })], today)!;
    expect(w.id).toBe('form');
  });

  it('salue une série de check-ins', () => {
    const w = computeSprintyWord([ci(0), ci(1), ci(2), ci(3)], today)!;
    expect(w.text).toBe("4 jours de check-in d'affilée. Beau travail.");
    expect(w.mood).toBe('success');
  });

  it('ne salue pas une série si le check-in du jour n’est pas fait', () => {
    expect(computeSprintyWord([ci(1), ci(2), ci(3)], today)).toBeNull();
  });
});
