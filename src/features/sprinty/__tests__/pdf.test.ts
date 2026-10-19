jest.mock('expo-print', () => ({}));
jest.mock('expo-sharing', () => ({}));
jest.mock('expo-file-system/legacy', () => ({}));

import { buildPdfHtml, chartSvg } from '../pdf';
import { poseToSvg } from '../avatar/poseSvg';
import { POSES } from '../avatar/poses.generated';

describe('export PDF de Sprinty', () => {
  it('en-tête avec Sprinty en vectoriel et mention IA sur chaque page', () => {
    const html = buildPdfHtml([{ kind: 'text', text: '**L’essentiel : ça progresse.**' }], 'Analyse', 'Léa');
    expect(html).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="54"');
    expect(html).toContain('class="page-footer"');
    expect(html).toContain('<strong>L’essentiel : ça progresse.</strong>');
  });

  it('tableaux : chiffres à droite et meilleure valeur repérée', () => {
    const html = buildPdfHtml(
      [{ kind: 'ui', block: { type: 'table', columns: ['Athlète', 'Chrono (s)'], rows: [['Léa', '12,10'], ['Tom', '11,95']] } }],
      'Tableau'
    );
    expect(html).toContain('<td class="num best">11,95</td>');
    expect(html).toContain('<td class="num">12,10</td>');
  });

  it('graphique avec zone, points et ligne de repère', () => {
    const svg = chartSvg({
      type: 'chart',
      title: 'Poids',
      kind: 'line',
      unit: 'kg',
      better: null,
      series: [{ name: 'Poids', points: [{ x: '2026-10-01', y: 72.4 }, { x: '2026-10-08', y: 71.9 }] }],
      reference: { value: 70, label: 'Objectif' },
    });
    expect(svg).toContain('fill="url(#area)"');
    expect(svg).toContain('Objectif 70');
    expect(svg).toContain('<circle');
  });

  it('les attributs SVG passent en kebab-case', () => {
    const svg = poseToSvg(POSES.neutral, 40);
    expect(svg).toContain('stroke-width=');
    expect(svg).not.toContain('strokeWidth=');
  });
});
