import {
  microsFromCiqual,
  microsFromOff,
  microsPer100,
  scaleMicros,
  per100FromPortion,
  sumMicros,
  sodiumMgToSaltG,
  cleanMicros,
} from '../micros';

describe('micros (N4)', () => {
  it('convertit le sodium (mg) en sel (g)', () => {
    expect(sodiumMgToSaltG(400)).toBeCloseTo(1, 5);
  });

  it('Ciqual : ignore la colonne fibres (erronée), garde sel/fer/calcium', () => {
    const m = microsFromCiqual({ fibres: 1170, sodium: 429, fer: 0.7, calcium: 88 });
    expect(m).toEqual({ sel_g: 1.1, fer_mg: 0.7, calcium_mg: 88 });
    expect(m).not.toHaveProperty('fibres_g');
  });

  it('Open Food Facts : sel, sucres, fibres, ags, fer et calcium convertis', () => {
    const m = microsFromOff({
      fiber_100g: 3,
      sugars_100g: 5.2,
      salt_100g: 1.2,
      'saturated-fat_100g': 2,
      iron_100g: 0.002,
      calcium_100g: 0.12,
    });
    expect(m).toEqual({ fibres_g: 3, sucres_g: 5.2, sel_g: 1.2, ags_g: 2, fer_mg: 2, calcium_mg: 120 });
  });

  it('OFF : déduit le sel du sodium si le sel manque, et renvoie undefined si rien', () => {
    expect(microsFromOff({ sodium_100g: 0.4 })).toEqual({ sel_g: 1 });
    expect(microsFromOff({})).toBeUndefined();
  });

  it('une valeur inconnue reste inconnue (pas de 0 inventé)', () => {
    expect(cleanMicros({ fibres_g: undefined, sel_g: -3 as any })).toBeUndefined();
    expect(microsPer100({ nom: 'x' })).toBeUndefined();
  });

  it('met à l’échelle une portion et revient aux 100 g', () => {
    const portion = scaleMicros({ fibres_g: 4, sel_g: 1 }, 150);
    expect(portion).toEqual({ fibres_g: 6, sel_g: 1.5 });
    expect(per100FromPortion(portion, 150)).toEqual({ fibres_g: 4, sel_g: 1 });
  });

  it('somme du jour : compte les aliments renseignés', () => {
    const t = sumMicros([{ micros: { sel_g: 1, fibres_g: 2 } }, { micros: { sel_g: 0.5 } }, {}]);
    expect(t.sel_g).toEqual({ total: 1.5, known: 2, count: 3 });
    expect(t.fibres_g).toEqual({ total: 2, known: 1, count: 3 });
    expect(t.fer_mg.known).toBe(0);
  });
});
