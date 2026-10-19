import { spokenFoodTitle } from '../foodSearchRank';

describe('titres des aliments', () => {
  it('garde l’aliment en premier quand le détail suit', () => {
    expect(spokenFoodTitle('Banane, chair sans peau, crue', ['banane'])).toBe('Banane, chair sans peau, crue');
    expect(spokenFoodTitle('Banane, chair sans peau, sèche', ['banane'])).toBe('Banane, chair sans peau, sèche');
  });
});
