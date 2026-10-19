import { parseContentToBlocks, splitInline } from '../../../components/richText';
import { buildColumns, cellValue, isNumericCell, betterFor } from '../blocks/tableModel';

describe('texte de Sprinty', () => {
  it('reconnaît titres, listes, numéros, encadrés, séparateurs et tableaux', () => {
    const md = [
      '**L’essentiel : ta forme remonte.**',
      '## Détail',
      '- Sommeil : 7 h 40',
      '1. Garde la séance de mardi',
      '2) Allège jeudi',
      '> Écoute ton corps.',
      '---',
      '| Distance | Chrono (s) |',
      '|---|---|',
      '| 60 m | 7,42 |',
      '| 100 m | 11,90 |',
    ].join('\n');
    const types = parseContentToBlocks(md).map((b) => b.type);
    expect(types).toEqual(['paragraph', 'heading', 'bullet', 'numbered', 'numbered', 'callout', 'rule', 'table']);
    const table = parseContentToBlocks(md).find((b) => b.type === 'table') as any;
    expect(table.rows).toEqual([['Distance', 'Chrono (s)'], ['60 m', '7,42'], ['100 m', '11,90']]);
  });

  it('gras, italique et code en ligne', () => {
    expect(splitInline('Ta **forme** est *bonne* : `82/100`').map((p) => p.kind)).toEqual(['text', 'bold', 'text', 'italic', 'text', 'code']);
    // une étoile seule n'ouvre pas d'italique
    expect(splitInline('3 * 4 = 12').every((p) => p.kind === 'text')).toBe(true);
  });
});

describe('tableaux', () => {
  it('lit les valeurs chiffrées', () => {
    expect(isNumericCell('12,96 s')).toBe(true);
    expect(isNumericCell('130 kg')).toBe(true);
    expect(isNumericCell('Squat')).toBe(false);
    expect(cellValue("1'05,20")).toBeCloseTo(65.2);
    expect(cellValue('7,42')).toBeCloseTo(7.42);
  });

  it('sens du « mieux » seulement quand l’en-tête est clair', () => {
    expect(betterFor('Chrono (s)')).toBe('lower');
    expect(betterFor('Charge (kg)')).toBe('higher');
    expect(betterFor('Date')).toBeNull();
  });

  it('aligne les colonnes chiffrées et repère la meilleure valeur', () => {
    const cols = buildColumns(['Athlète', 'Chrono (s)', 'Date'], [['Léa', '12,10', '12/10'], ['Tom', '11,95', '13/10'], ['Ana', '12,40', '14/10']]);
    expect(cols[0].numeric).toBe(false);
    expect(cols[1].numeric).toBe(true);
    expect(cols[1].bestRow).toBe(1);
    expect(cols[2].bestRow).toBeNull();
  });
});
