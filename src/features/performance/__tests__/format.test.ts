import { formatValue } from '../format';

describe('formatValue', () => {
  it('chrono inchangé', () => {
    expect(formatValue(12.96, 's')).toBe('12,96 s');
    expect(formatValue(12.96, 's', 3)).toBe('12,96 s');
  });
  it('charge avec les répétitions quand elles sont connues', () => {
    expect(formatValue(130, 'kg', 5)).toBe('130 kg × 5');
    expect(formatValue(102.5, 'kg', 1)).toBe('102,5 kg × 1');
  });
  it('charge seule sans répétitions', () => {
    expect(formatValue(130, 'kg')).toBe('130 kg');
    expect(formatValue(130, 'kg', null)).toBe('130 kg');
    expect(formatValue(130, 'kg', 0)).toBe('130 kg');
  });
});
