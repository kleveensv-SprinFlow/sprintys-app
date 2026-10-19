import { yDomain, yTicks, xTickIndexes, trend, polylineLength, fmtNum } from '../blocks/chartModel';

describe('graphique de Sprinty', () => {
  it('axe arrondi qui inclut la ligne de repère', () => {
    const d = yDomain([72.4, 73.1, 72.8], 'line', 70);
    expect(d.min).toBeLessThanOrEqual(70);
    expect(d.max).toBeGreaterThanOrEqual(73.1);
    const ticks = yTicks(d.min, d.max, d.step);
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    expect(ticks.length).toBeLessThanOrEqual(5);
  });

  it('les barres partent de zéro', () => {
    expect(yDomain([5, 8, 6], 'bar').min).toBe(0);
  });

  it('2 à 4 dates sur l’axe', () => {
    expect(xTickIndexes(1)).toEqual([0]);
    expect(xTickIndexes(3)).toEqual([0, 1, 2]);
    expect(xTickIndexes(10)).toEqual([0, 3, 6, 9]);
  });

  it('tendance lissée sur plusieurs points', () => {
    expect(trend([10])).toBeNull();
    const t = trend([12.5, 12.4, 12.3, 12.2, 12.1, 12.0, 11.9, 11.8, 11.7])!;
    expect(t.window).toBe(3);
    expect(t.delta).toBeCloseTo(-0.6, 5);
  });

  it('longueur du tracé et format français', () => {
    expect(polylineLength([[0, 0], [3, 4]])).toBe(5);
    expect(fmtNum(12.96)).toBe('12,96');
    expect(fmtNum(130)).toBe('130');
  });
});
