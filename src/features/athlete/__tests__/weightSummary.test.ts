import { calendarDaysAgo, relativeDay, summarizeWeight } from '../weightSummary';

const now = new Date(2026, 10, 4, 10, 0, 0); // 4 nov. 2026, 10:00
const at = (daysBefore: number, hour = 8) => new Date(2026, 10, 4 - daysBefore, hour, 0, 0).toISOString();

describe('relativeDay', () => {
  it('parle en jours calendaires', () => {
    expect(relativeDay(0)).toBe('aujourd’hui');
    expect(relativeDay(1)).toBe('hier');
    expect(relativeDay(6)).toBe('il y a 6 jours');
  });
});

describe('calendarDaysAgo', () => {
  it('compte les jours de calendrier, pas des tranches de 24 h', () => {
    // Weighed yesterday at 23:00, now is 00:30 the next day: that is « hier », not « aujourd’hui »
    expect(calendarDaysAgo(new Date(2026, 10, 3, 23, 0), new Date(2026, 10, 4, 0, 30))).toBe(1);
    expect(calendarDaysAgo(new Date(2026, 10, 4, 0, 5), new Date(2026, 10, 4, 23, 55))).toBe(0);
  });
  it('ne renvoie jamais un nombre négatif', () => {
    expect(calendarDaysAgo(new Date(2026, 10, 6), now)).toBe(0);
  });
});

describe('summarizeWeight', () => {
  it('renvoie null sans pesée exploitable', () => {
    expect(summarizeWeight([], now)).toBeNull();
    expect(summarizeWeight([{ weight: null, created_at: at(1) }, { weight: 80, created_at: null }], now)).toBeNull();
  });

  it('donne le dernier poids, sa date relative et l’écart sur environ 30 jours', () => {
    const s = summarizeWeight(
      [
        { weight: 79.6, created_at: at(31) },
        { weight: 79.0, created_at: at(15) },
        { weight: 79.8, created_at: at(1) },
      ],
      now,
    )!;
    expect(s.value).toBe(79.8);
    expect(s.when).toBe('hier');
    expect(s.stale).toBe(false);
    expect(s.diff).toBeCloseTo(0.2, 5);
  });

  it('ignore un écart négligeable et une pesée unique', () => {
    expect(summarizeWeight([{ weight: 80, created_at: at(20) }, { weight: 80.02, created_at: at(0) }], now)!.diff).toBeNull();
    expect(summarizeWeight([{ weight: 80, created_at: at(0) }], now)!.diff).toBeNull();
  });

  it('signale une pesée de plus de 7 jours', () => {
    expect(summarizeWeight([{ weight: 80, created_at: at(8) }], now)!.stale).toBe(true);
    expect(summarizeWeight([{ weight: 80, created_at: at(7) }], now)!.stale).toBe(false);
  });

  it('range les pesées dans l’ordre même si elles arrivent mélangées', () => {
    const s = summarizeWeight([{ weight: 79.8, created_at: at(1) }, { weight: 79.6, created_at: at(31) }], now)!;
    expect(s.value).toBe(79.8);
    expect(s.diff).toBeCloseTo(0.2, 5);
  });
});
