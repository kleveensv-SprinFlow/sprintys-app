import type { PainInfo } from '../../../services/checkInService';
import { BODY_ZONES, meshSideToPainSide, painForMesh, parseMeshName, zoneLabel } from '../bodyZones';

const pain = (over: Partial<PainInfo>): PainInfo => ({ muscle_id: 'genoux', muscle_name: 'Genoux', type: 'Autre', intensity: 4, ...over });

describe('catalogue des zones', () => {
  it('a des identifiants uniques', () => {
    const ids = BODY_ZONES.map((z) => z.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('garde les identifiants déjà enregistrés en base', () => {
    for (const id of ['quadriceps', 'ischios', 'mollets', 'adducteurs', 'fessiers', 'hanches', 'genoux', 'chevilles', 'pieds', 'lombaires', 'abdominaux', 'obliques', 'pectoraux', 'haut_dos', 'cotes', 'epaules', 'biceps', 'triceps', 'avant_bras', 'poignets', 'mains', 'cou', 'machoire', 'tete']) {
      expect(BODY_ZONES.some((z) => z.id === id)).toBe(true);
    }
  });
});

describe('noms des mailles 3D', () => {
  it('lit zone et côté', () => {
    expect(parseMeshName('genoux__G')).toEqual({ zoneId: 'genoux', side: 'G' });
    expect(parseMeshName('abdominaux__X')).toEqual({ zoneId: 'abdominaux', side: 'X' });
  });

  it('ignore les os neutres et les noms inconnus', () => {
    expect(parseMeshName('os__X')).toBeNull();
    expect(parseMeshName('inconnu__G')).toBeNull();
  });

  it('tolère un suffixe ajouté par le chargeur (doublon de nom)', () => {
    expect(parseMeshName('genoux__D_1')).toEqual({ zoneId: 'genoux', side: 'D' });
  });

  it('convertit le côté de la maille en côté de douleur', () => {
    expect(meshSideToPainSide('genoux', 'G')).toBe('Gauche');
    expect(meshSideToPainSide('genoux', 'D')).toBe('Droit');
    expect(meshSideToPainSide('abdominaux', 'X')).toBeUndefined();
  });
});

describe('douleur affichée sur une maille', () => {
  it('prend le bon côté', () => {
    const pains = [pain({ side: 'Gauche', intensity: 6 }), pain({ side: 'Droit', intensity: 2 })];
    expect(painForMesh(pains, 'genoux', 'G')?.intensity).toBe(6);
    expect(painForMesh(pains, 'genoux', 'D')?.intensity).toBe(2);
  });

  it('colore les deux côtés pour « Bilatéral » et pour une ancienne douleur sans côté', () => {
    expect(painForMesh([pain({ side: 'Bilatéral' })], 'genoux', 'D')).toBeDefined();
    expect(painForMesh([pain({ side: undefined })], 'genoux', 'G')).toBeDefined();
  });

  it('garde la plus forte quand plusieurs douleurs touchent la même maille', () => {
    const pains = [pain({ side: 'Bilatéral', intensity: 3 }), pain({ side: 'Gauche', intensity: 8 })];
    expect(painForMesh(pains, 'genoux', 'G')?.intensity).toBe(8);
  });

  it('ne colore pas une autre zone', () => {
    expect(painForMesh([pain({ side: 'Gauche' })], 'mollets', 'G')).toBeUndefined();
  });
});

describe('libellés', () => {
  it('nomme le côté en clair', () => {
    expect(zoneLabel('genoux', 'Gauche')).toBe('Genoux · côté gauche');
    expect(zoneLabel('genoux', 'Bilatéral')).toBe('Genoux · les deux côtés');
    expect(zoneLabel('cou')).toBe('Cou');
  });
});
