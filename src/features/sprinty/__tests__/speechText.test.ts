import { cleanForSpeech, partsToSpeech } from '../voice/speechText';

describe('lecture à voix haute', () => {
  it('retire le markdown et ponctue les lignes', () => {
    expect(cleanForSpeech('## Ta forme\n- **Sommeil** en hausse\n- Fatigue basse')).toBe('Ta forme. Sommeil en hausse. Fatigue basse.');
  });

  it('dit les unités et les chrono à la française', () => {
    expect(cleanForSpeech('Record : 12,96 s au 120 m')).toBe('Record : 12 secondes 96 au 120 mètres.');
    expect(cleanForSpeech('Squat 3 × 5 à 80 %')).toBe('Squat 3 fois 5 à 80 pour cent.');
    expect(cleanForSpeech('Poids 72,4 kg, forme 82/100')).toBe('Poids 72 virgule 4 kilos, forme 82 sur 100.');
  });

  it('ne lit pas les tableaux case par case', () => {
    const t = cleanForSpeech('Voici :\n| A | B |\n|---|---|\n| 1 | 2 |');
    expect(t).toBe('Voici :');
  });

  it('résume les cartes et coupe proprement les réponses longues', () => {
    const s = partsToSpeech([
      { kind: 'text', text: 'Bonne semaine.' },
      { kind: 'ui', block: { type: 'table', title: 'Chronos', columns: ['a'], rows: [['1']] } },
      { kind: 'ui', block: { type: 'stats', items: [{ label: 'Forme', value: '82', unit: '/100' }] } },
    ]);
    expect(s).toBe("Bonne semaine. Je t'affiche un tableau : Chronos. Forme : 82 sur 100.");
    const long = partsToSpeech([{ kind: 'text', text: 'Phrase courte. '.repeat(300) }], '', 200);
    expect(long.length).toBeLessThanOrEqual(200);
    expect(long.endsWith('.')).toBe(true);
  });
});
