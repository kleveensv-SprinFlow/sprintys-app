import { parseAiMeal, extractJsonArray } from '../aiMealParse';

const ok = {
  name: 'Riz basmati cuit',
  query: 'riz',
  etat: 'cuit',
  qty: 150,
  unit: 'g',
  fallback_kcal_100g: 130,
  fallback_pro_100g: 2.7,
  fallback_glu_100g: 28,
  fallback_lip_100g: 0.3,
};

describe('parseAiMeal (N8)', () => {
  it('accepte un tableau valide, même entouré de markdown et de texte', () => {
    const raw = 'Voici :\n```json\n' + JSON.stringify([ok]) + '\n```\nBon appétit';
    const r = parseAiMeal(raw);
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe('Riz basmati cuit');
  });

  it('rejette le JSON cassé ou non tableau', () => {
    expect(parseAiMeal('{"a":1}')).toEqual([]);
    expect(parseAiMeal('[{"name":')).toEqual([]);
    expect(extractJsonArray(undefined)).toBeNull();
  });

  it('écarte les aliments aberrants et garde les bons', () => {
    const bad = [
      { ...ok, qty: 0 },
      { ...ok, qty: 99999 },
      { ...ok, fallback_kcal_100g: 5000 },
      { ...ok, fallback_pro_100g: 90, fallback_glu_100g: 90 },
      { ...ok, fallback_lip_100g: -2 },
      { ...ok, name: '', query: '' },
      'texte',
      null,
    ];
    expect(parseAiMeal(JSON.stringify([...bad, ok]))).toHaveLength(1);
  });

  it('convertit les nombres écrits en texte et normalise l’état', () => {
    const r = parseAiMeal(JSON.stringify([{ ...ok, qty: '150,5', etat: 'Inconnu' }]));
    expect(r[0].qty).toBe(150.5);
    expect(r[0].etat).toBeNull();
  });

  it('limite le nombre d’aliments', () => {
    const many = Array.from({ length: 40 }, () => ok);
    expect(parseAiMeal(JSON.stringify(many))).toHaveLength(20);
  });
});
