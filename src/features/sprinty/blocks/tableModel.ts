/**
 * Mise en forme d'un tableau de Sprinty (pur, testé) : colonnes chiffrées alignées à droite, largeur selon le contenu,
 * meilleure valeur repérée quand l'en-tête dit clairement dans quel sens c'est mieux.
 */

const NUMERIC = /^[-+]?\d[\d\s.,']*\s*(s|sec|kg|%|m|km|h|min|kcal|g|cm|bpm|\/\s?\d+)?$/i;

export const isNumericCell = (v: string) => NUMERIC.test(v.trim().replace(/ /g, ' '));

/** Valeur lue d'une cellule (« 12,96 s » → 12.96, « 1'05,20 » → 65.2). */
export function cellValue(v: string): number | null {
  const t = v.trim().replace(/ /g, ' ');
  const mmss = t.match(/^(\d+)'(\d+(?:[.,]\d+)?)/);
  if (mmss) return parseInt(mmss[1], 10) * 60 + parseFloat(mmss[2].replace(',', '.'));
  const m = t.replace(/\s/g, '').match(/^[-+]?\d+(?:[.,]\d+)?/);
  return m ? parseFloat(m[0].replace(',', '.')) : null;
}

export type Better = 'lower' | 'higher' | null;

/** Sens du « mieux » d'après l'en-tête ; null quand on ne peut pas savoir (on ne met alors rien en avant). */
export function betterFor(header: string): Better {
  const h = header.toLowerCase();
  if (/chrono|temps|\(s\)|\bsec|fatigue|stress|douleur/.test(h)) return 'lower';
  if (/kg|charge|forme|score|record|max|séances faites|motivation|sommeil/.test(h)) return 'higher';
  return null;
}

export interface ColumnModel {
  numeric: boolean;
  width: number;
  /** Index de la ligne qui porte la meilleure valeur (null = aucune mise en avant). */
  bestRow: number | null;
}

export function buildColumns(columns: string[], rows: string[][]): ColumnModel[] {
  return columns.map((header, ci) => {
    const cells = rows.map((r) => String(r[ci] ?? '').trim());
    const filled = cells.filter(Boolean);
    const numeric = ci > 0 && filled.length > 0 && filled.filter(isNumericCell).length / filled.length >= 0.6;
    const longest = Math.max(header.length, ...cells.map((c) => c.length));
    const width = Math.round(Math.min(ci === 0 ? 170 : 150, Math.max(ci === 0 ? 96 : 64, longest * 7.6 + 22)));
    let bestRow: number | null = null;
    const better = numeric ? betterFor(header) : null;
    if (better && rows.length >= 2) {
      let best: number | null = null;
      cells.forEach((c, ri) => {
        const v = cellValue(c);
        if (v == null) return;
        if (best == null || (better === 'lower' ? v < best : v > best)) {
          best = v;
          bestRow = ri;
        }
      });
    }
    return { numeric, width, bestRow };
  });
}
