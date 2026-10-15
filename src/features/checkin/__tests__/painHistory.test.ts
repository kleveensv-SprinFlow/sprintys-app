import { sinceLabel, summarizePains, trendsToPains } from '../painHistory';

const p = (muscle_id: string, side: string | undefined, intensity: number, extra: object = {}) => ({
  muscle_id,
  muscle_name: muscle_id,
  side,
  intensity,
  type: 'Autre',
  ...extra,
});

describe('résumé des douleurs pour le coach', () => {
  const today = '2026-10-20';
  const history = [
    { date: '2026-10-20', pains: [p('genoux', 'Gauche', 6, { comment: 'en descente' })] },
    { date: '2026-10-19', pains: [p('genoux', 'Gauche', 7), p('genoux', 'Droit', 2)] },
    { date: '2026-10-17', pains: [p('genoux', 'Gauche', 4)] },
    { date: '2026-10-01', pains: [p('mollets', 'Droit', 9)] }, // hors fenêtre de 14 j
    { date: '2026-10-18', pains: null },
  ];

  it('regroupe par zone et par côté, dans la fenêtre', () => {
    const t = summarizePains(history, today);
    expect(t.map((x) => x.key)).toEqual(['genoux:Gauche', 'genoux:Droit']);
  });

  it('compte les jours, l’intensité max et la dernière', () => {
    const g = summarizePains(history, today)[0];
    expect(g.days).toBe(3);
    expect(g.maxIntensity).toBe(7);
    expect(g.lastIntensity).toBe(6);
    expect(g.lastDate).toBe('2026-10-20');
    expect(g.lastComment).toBe('en descente');
  });

  it('marque une douleur persistante à partir de 3 jours sur 7', () => {
    const [gauche, droit] = summarizePains(history, today);
    expect(gauche.persistent).toBe(true);
    expect(droit.persistent).toBe(false);
  });

  it('ignore les données mal formées', () => {
    expect(summarizePains([{ date: today, pains: [null, 'x', {}] }], today)).toEqual([]);
  });

  it('donne une douleur par zone à son intensité max pour la carte', () => {
    const pains = trendsToPains(summarizePains(history, today));
    expect(pains[0]).toMatchObject({ muscle_id: 'genoux', side: 'Gauche', intensity: 7 });
  });

  it('écrit l’ancienneté en clair', () => {
    expect(sinceLabel('2026-10-20', today)).toBe('aujourd’hui');
    expect(sinceLabel('2026-10-19', today)).toBe('hier');
    expect(sinceLabel('2026-10-16', today)).toBe('il y a 4 j');
  });
});
