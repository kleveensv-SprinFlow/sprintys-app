import { getCarbAdvice } from '../carbAdvice';

describe('Ajustement des féculents selon la séance du jour (N3 - carbAdvice)', () => {
  it('séance prévue aujourd’hui : indique que les féculents ont plus de place', () => {
    const workouts = [
      { id: 'w1', date_prevue: '2026-10-16', type_seance: 'Sprint & Vitesse' },
    ];
    const phrase = getCarbAdvice(workouts);
    expect(phrase).toBe("Séance aujourd'hui. Les féculents ont plus de place.");
    expect(phrase).not.toMatch(/moins|réduire|diminuer/i);
    expect(phrase).not.toMatch(/\d+\s*g/i);
  });

  it('pas de séance aujourd’hui : indique qu’il n’y a pas de séance', () => {
    expect(getCarbAdvice([])).toBe("Pas de séance aujourd'hui.");
    expect(getCarbAdvice(null)).toBe("Pas de séance aujourd'hui.");
    expect(getCarbAdvice(undefined)).toBe("Pas de séance aujourd'hui.");
  });

  it('séance de type repos : indique qu’il n’y a pas de séance', () => {
    const restByType = [
      { id: 'w2', date_prevue: '2026-10-16', type_seance: 'Jour de repos' },
    ];
    expect(getCarbAdvice(restByType)).toBe("Pas de séance aujourd'hui.");

    const restByKind = [
      { id: 'w3', date_prevue: '2026-10-16', measures: { kind: 'rest' } },
    ];
    expect(getCarbAdvice(restByKind)).toBe("Pas de séance aujourd'hui.");
  });
});
