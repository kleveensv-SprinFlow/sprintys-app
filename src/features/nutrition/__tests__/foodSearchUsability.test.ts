import { searchFoodCatalog } from '../data/foodCatalog';
import { resolveFoodPortion } from '../data/portionDictionary';

describe('recherche alimentaire quotidienne', () => {
  it('retrouve un filet de poulet avec les mots courants, dans les deux ordres', () => {
    for (const query of ['filet poulet', 'poulet filet']) {
      const hits = searchFoodCatalog(query);
      expect(hits[0]?.display_name).toBe('Blanc de poulet');
      expect(hits[0]?.energie_kcal).toBeGreaterThan(0);
    }
  });

  it('montre une banane simple et des valeurs issues du catalogue', () => {
    const hits = searchFoodCatalog('banane');
    expect(hits[0]?.display_name).toBe('Banane');
    expect(hits[0]?.energie_kcal).toBe(87.6);
  });

  it('ne réutilise pas le poids d’une banane pour une banane plantain', () => {
    expect(resolveFoodPortion({ nom: 'Banane, chair sans peau, crue' }).defaultUnit).toBe('piece');
    expect(resolveFoodPortion({ nom: 'Banane plantain, cuite' }).defaultUnit).toBe('g');
  });
});
