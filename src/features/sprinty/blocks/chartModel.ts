/** Calculs du graphique de Sprinty (purs, testés) : échelle lisible, dates d'axe, tendance. */

export function niceStep(raw: number) {
  if (!(raw > 0)) return 1;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const r = raw / pow;
  return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * pow;
}

export const fmtNum = (v: number) => (Math.abs(v) >= 100 ? Math.round(v).toString() : (Math.round(v * 100) / 100).toString().replace('.', ','));

export const shortDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Bornes arrondies de l'axe, avec un peu d'air, en incluant la ligne de repère si elle existe. */
export function yDomain(values: number[], kind: 'line' | 'bar', reference?: number | null): { min: number; max: number; step: number } {
  const all = reference != null ? [...values, reference] : values;
  let min = Math.min(...all);
  let max = Math.max(...all);
  if (kind === 'bar') min = Math.min(0, min);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  if (kind !== 'bar') min -= span * 0.12;
  max += span * 0.12;
  const step = niceStep((max - min) / 3);
  return { min: Math.floor(min / step) * step, max: Math.ceil(max / step) * step, step };
}

/** Graduations de l'axe vertical (3 ou 4 valeurs rondes). */
export function yTicks(min: number, max: number, step: number): number[] {
  const out: number[] = [];
  for (let v = min; v <= max + step / 1000; v += step) out.push(Math.round(v * 1000) / 1000);
  return out.length > 5 ? out.filter((_, i) => i % 2 === 0) : out;
}

/** 2 à 4 dates réparties sur l'axe horizontal (indices dans xs). */
export function xTickIndexes(count: number): number[] {
  if (count <= 0) return [];
  if (count <= 4) return Array.from({ length: count }, (_, i) => i);
  const n = 4;
  return Array.from({ length: n }, (_, i) => Math.round((i * (count - 1)) / (n - 1)));
}

/** Tendance : moyenne des derniers points moins moyenne des premiers (moins sensible au bruit qu'un point isolé). */
export function trend(values: number[]): { delta: number; window: number } | null {
  const n = values.length;
  if (n < 2) return null;
  const k = n >= 9 ? 3 : n >= 4 ? 2 : 1;
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return { delta: mean(values.slice(-k)) - mean(values.slice(0, k)), window: k };
}

/** Longueur d'un tracé (pour l'animation qui dessine la courbe). */
export function polylineLength(pts: readonly (readonly [number, number])[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return len;
}
