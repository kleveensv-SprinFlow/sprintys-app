import { computeCalorieTarget, classifyObjective } from '../calorieTarget';
import { adaptTarget } from '../adaptTarget';
import { ageOn } from '../../../legal/age';

describe('N1 : Sécurité des mineurs sur la nutrition', () => {
  describe('Calcul de l’âge (ageOn)', () => {
    it('calcule exactement l’âge selon la date de naissance réelle', () => {
      const today = new Date('2026-10-16');
      expect(ageOn('2009-10-15', today)).toBe(17);
      expect(ageOn('2008-10-17', today)).toBe(17);
      expect(ageOn('2008-10-16', today)).toBe(18);
    });

    it('renvoie 0 si la date de naissance est absente ou invalide', () => {
      expect(ageOn(null)).toBe(0);
      expect(ageOn(undefined)).toBe(0);
      expect(ageOn('')).toBe(0);
      expect(ageOn('date_invalide')).toBe(0);
    });
  });

  describe('Cible calorique (computeCalorieTarget)', () => {
    const baseInput = {
      weightKg: 65,
      heightCm: 175,
      age: 16,
      sex: 'male',
      neat: 'marche' as const,
      sessionsPerWeek: 4,
      goal: 'cut' as const,
      weeklyKg: 0.5,
    };

    it('bloque tout calcul de déficit et cible automatique adulte pour un mineur (âge < 18)', () => {
      const res = computeCalorieTarget(baseInput);
      expect(res.isMinorProtected).toBe(true);
      expect(res.target).toBe(0);
      expect(res.delta).toBe(0);
      expect(res.note).toContain('moins de 18 ans');
      expect(res.note).toContain('professionnel de santé');
    });

    it('protège un athlète lorsque isMinor est vrai même si l’âge transmis était adulte', () => {
      const res = computeCalorieTarget({ ...baseInput, age: 25, isMinor: true });
      expect(res.isMinorProtected).toBe(true);
      expect(res.target).toBe(0);
    });

    it('protège si l’âge est 0 ou non renseigné (jamais de repli silencieux à 25 ans)', () => {
      const res = computeCalorieTarget({ ...baseInput, age: 0 });
      expect(res.isMinorProtected).toBe(true);
      expect(res.target).toBe(0);
    });

    it('calcule une cible normale pour un adulte majeur (>= 18 ans)', () => {
      const res = computeCalorieTarget({ ...baseInput, age: 20 });
      expect(res.isMinorProtected).toBe(false);
      expect(res.target).toBeGreaterThan(1200);
      expect(res.tdee).toBeGreaterThan(1500);
    });

    it('respecte le plancher adulte pour un adulte', () => {
      const resFemme = computeCalorieTarget({
        weightKg: 40,
        heightCm: 150,
        age: 25,
        sex: 'female',
        neat: 'bureau',
        sessionsPerWeek: 0,
        goal: 'cut',
        weeklyKg: 1,
      });
      expect(resFemme.target).toBeGreaterThanOrEqual(1200);

      const resHomme = computeCalorieTarget({
        weightKg: 45,
        heightCm: 160,
        age: 25,
        sex: 'male',
        neat: 'bureau',
        sessionsPerWeek: 0,
        goal: 'cut',
        weeklyKg: 1,
      });
      expect(resHomme.target).toBeGreaterThanOrEqual(1500);
    });
  });

  describe('Adaptation calorique (adaptTarget)', () => {
    const today = new Date('2026-10-16');
    const weights = [
      { date: '2026-10-01', weight: 70 },
      { date: '2026-10-08', weight: 70.2 },
      { date: '2026-10-15', weight: 70.5 },
    ];

    it('ne propose aucune adaptation baissière si isMinor est vrai', () => {
      const res = adaptTarget({
        objective: 'cut',
        currentTarget: 2200,
        weeklyKg: 0.5,
        weights,
        now: today,
        isMinor: true,
      });
      expect(res.status).toBe('insufficient');
      expect(res.deltaKcal).toBe(0);
      expect(res.newTarget).toBe(2200);
    });

    it('permet l’adaptation chez l’adulte si les conditions de pesée sont réunies', () => {
      const res = adaptTarget({
        objective: 'cut',
        currentTarget: 2200,
        weeklyKg: 0.5,
        weights,
        now: today,
        isMinor: false,
      });
      expect(res.deltaKcal).not.toBe(0);
    });
  });

  describe('Classification des objectifs (classifyObjective)', () => {
    it('identifie correctement la perte de gras', () => {
      expect(classifyObjective('Perte de poids')).toBe('cut');
      expect(classifyObjective('Perte de gras')).toBe('cut');
      expect(classifyObjective('Stabiliser')).toBe('maintain');
      expect(classifyObjective('Prendre du poids')).toBe('bulk');
    });
  });
});
