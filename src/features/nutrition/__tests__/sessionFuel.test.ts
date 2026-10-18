import { getSessionFuel } from '../sessionFuel';

describe('getSessionFuel (N6)', () => {
  it('rien sans séance ou le jour de repos', () => {
    expect(getSessionFuel(null, false)).toBeNull();
    expect(getSessionFuel([], false)).toBeNull();
    expect(getSessionFuel([{ type_seance: 'Repos' }], false)).toBeNull();
  });

  it('muscu : protéines chiffrées pour un adulte, pas pour un mineur', () => {
    const adult = getSessionFuel([{ type_seance: 'Muscu haut du corps' }], false)!;
    const minor = getSessionFuel([{ type_seance: 'Muscu haut du corps' }], true)!;
    expect(adult.after).toMatch(/20 à 30 g/);
    expect(minor.after).not.toMatch(/\d+ ?g\b|protéines/i);
    expect(minor.before).not.toMatch(/\d+ ?g\b|protéines/i);
  });

  it('compétition : mention de ne rien tester de nouveau', () => {
    expect(getSessionFuel([{ type_seance: 'Compétition 100 m' }], false)!.note).toMatch(/nouveau/);
  });

  it('jamais de consigne de manger moins', () => {
    const f = getSessionFuel([{ type_seance: 'Course piste' }], false)!;
    expect(`${f.before} ${f.after}`).not.toMatch(/moins|réduire|supprim/i);
  });
});
