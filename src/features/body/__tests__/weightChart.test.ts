jest.mock('react-native-svg', () => ({}));

import { rangeOf, MIN_WEIGHT_SPAN, goalInView } from '../components/WeightChart';
import { hoursLabel } from '../../checkin/hoursLabel';

describe('courbe de poids', () => {
  it('une variation de 0,3 kg ne remplit pas tout l’axe', () => {
    const { min, max } = rangeOf([79.1, 79.4, 79.1]);
    expect(max - min).toBeGreaterThanOrEqual(MIN_WEIGHT_SPAN);
  });

  it('une vraie évolution garde son échelle', () => {
    const { min, max } = rangeOf([70, 78]);
    expect(min).toBeLessThan(70);
    expect(max).toBeGreaterThan(78);
    expect(max - min).toBeLessThan(10);
  });

  it('l’objectif éloigné n’écrase pas la courbe', () => {
    expect(goalInView([79.1, 79.4], 75)).toBeNull();
    expect(goalInView([79.1, 79.4], 78.8)).toBe(78.8);
  });
});

describe('durée de sommeil', () => {
  it('décimale à la française', () => {
    expect(hoursLabel(7.5)).toBe('7,5 h');
    expect(hoursLabel(8)).toBe('8 h');
  });
});
