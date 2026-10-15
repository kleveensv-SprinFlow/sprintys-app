jest.mock('../../../services/supabase', () => ({ supabase: {} }));

import { checkInService, CheckInDraft, PainInfo } from '../../../services/checkInService';
import { isCriticalPain, painKey, painLabel } from '../painTaxonomy';

const base: CheckInDraft = {
  athlete_id: 'a1',
  date: '2026-10-20',
  bedtime: '23:00',
  wakeup_time: '07:00',
  sleep_hours: 8,
  sleep_quality: 5,
  stress_level: 1,
  fatigue_level: 1,
  motivation_level: 5,
  pains: [],
};

const pain = (over: Partial<PainInfo>): PainInfo => ({
  muscle_id: 'genoux',
  muscle_name: 'Genoux',
  type: 'Contracture',
  intensity: 5,
  ...over,
});

describe('alerte douleur (alignée sur get_team_alerts)', () => {
  it('toute douleur >= 7 est critique, quel que soit le type', () => {
    for (const type of ['Courbature', 'Contracture', 'Autre', 'Articulaire']) {
      expect(isCriticalPain({ type, intensity: 7 })).toBe(true);
    }
  });

  it('un type aigu est critique dès 5', () => {
    expect(isCriticalPain({ type: 'Déchirure', intensity: 5 })).toBe(true);
    expect(isCriticalPain({ type: 'Contracture', intensity: 5 })).toBe(false);
  });

  it('une contracture à 9/10 plafonne la forme à 45 (régression C1)', () => {
    const s = checkInService.calculateDailyScores({ ...base, pains: [pain({ type: 'Contracture', intensity: 9 })] });
    expect(s.isCriticalAlert).toBe(true);
    expect(s.readiness).toBeLessThanOrEqual(45);
  });

  it('une gêne légère ne plafonne pas la forme', () => {
    const s = checkInService.calculateDailyScores({ ...base, pains: [pain({ type: 'Courbature', intensity: 3 })] });
    expect(s.isCriticalAlert).toBe(false);
    expect(s.readiness).toBeGreaterThan(80);
  });

  it('le lissage historique ne masque jamais une douleur critique du jour', () => {
    const history = [1, 2, 3].map(i => ({
      ...base,
      date: `2026-10-${20 - i}`,
      pains: [],
      health_score: 95,
    }));
    const r = checkInService.calculateScores({ ...base, pains: [pain({ intensity: 9 })] }, history);
    expect(r.health).toBeLessThanOrEqual(45);
  });
});

describe('piliers non renseignés (régression C3)', () => {
  it('un sommeil absent est null et exclu du score', () => {
    const s = checkInService.calculateDailyScores({
      ...base,
      bedtime: null,
      wakeup_time: null,
      sleep_hours: null,
      sleep_quality: null,
    });
    expect(s.sleep).toBeNull();
    expect(s.readiness).toBeGreaterThan(90); // physique 100 + mental excellent, pas tiré vers le bas par un sommeil inventé
  });

  it('un mental absent est null', () => {
    const s = checkInService.calculateDailyScores({
      ...base,
      stress_level: null,
      fatigue_level: null,
      motivation_level: null,
    });
    expect(s.mental).toBeNull();
  });

  it('sans aucun pilier hors douleurs, la forme repose sur le physique seul', () => {
    const s = checkInService.calculateDailyScores({
      ...base,
      sleep_hours: null,
      sleep_quality: null,
      stress_level: null,
      fatigue_level: null,
      motivation_level: null,
    });
    expect(s.readiness).toBe(100);
  });

  it('un mental partiel est calculé sur les seules composantes renseignées', () => {
    const s = checkInService.calculateDailyScores({ ...base, stress_level: null, fatigue_level: 1, motivation_level: null });
    expect(s.mental).toBe(100);
  });
});

describe('identifiant de douleur zone + côté (régression C2)', () => {
  it('distingue le genou gauche du genou droit', () => {
    expect(painKey({ muscle_id: 'genoux', side: 'Gauche' })).not.toBe(painKey({ muscle_id: 'genoux', side: 'Droit' }));
  });

  it("garde l'ancien identifiant quand il n'y a pas de côté", () => {
    expect(painKey({ muscle_id: 'abdominaux' })).toBe('abdominaux');
    expect(painKey({ muscle_id: 'abdominaux', side: 'Aucun' })).toBe('abdominaux');
  });

  it('affiche le côté dans le libellé', () => {
    expect(painLabel({ muscle_id: 'genoux', muscle_name: 'Genoux', side: 'Gauche' })).toBe('Genoux (Gauche)');
    expect(painLabel({ muscle_id: 'cou' })).toBe('cou');
  });
});
