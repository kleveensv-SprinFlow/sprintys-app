import { checkInStreak, dayAdvice, missingPillars, streakLabel } from '../checkinInsights';

describe('série de check-ins', () => {
  it('compte les jours consécutifs jusqu’à aujourd’hui', () => {
    expect(checkInStreak(['2026-10-20', '2026-10-19', '2026-10-18', '2026-10-16'], '2026-10-20')).toBe(3);
  });

  it('part d’hier si aujourd’hui n’est pas encore fait', () => {
    expect(checkInStreak(['2026-10-19', '2026-10-18'], '2026-10-20')).toBe(2);
  });

  it('passe correctement d’un mois à l’autre', () => {
    expect(checkInStreak(['2026-11-01', '2026-10-31', '2026-10-30'], '2026-11-01')).toBe(3);
  });

  it('vaut 0 sans check-in récent', () => {
    expect(checkInStreak(['2026-10-10'], '2026-10-20')).toBe(0);
  });

  it('écrit la série en clair', () => {
    expect(streakLabel(1)).toBe('Premier jour de ta série');
    expect(streakLabel(4)).toBe('4 jours d’affilée');
  });
});

describe('conseil du jour', () => {
  const pain = (intensity: number, type = 'Autre') => ({ muscle_id: 'genoux', muscle_name: 'Genoux', intensity, type });

  it('une douleur forte passe avant le score', () => {
    expect(dayAdvice(90, [pain(8)]).tone).toBe('alert');
  });

  it('suit les paliers de forme', () => {
    expect(dayAdvice(80, [pain(2)]).tone).toBe('good');
    expect(dayAdvice(55, []).tone).toBe('mid');
    expect(dayAdvice(30, []).tone).toBe('low');
  });

  it('signale les piliers passés', () => {
    expect(missingPillars({ sleep_score: null, mental_score: 70 })).toBe('Sommeil non renseigné : la forme est calculée sur le reste.');
    expect(missingPillars({ sleep_score: null, mental_score: null })).toBe('Sommeil et mental non renseignés : la forme est calculée sur le reste.');
    expect(missingPillars({ sleep_score: 60, mental_score: 70 })).toBeNull();
  });
});
