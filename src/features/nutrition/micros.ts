/**
 * Nutriments supplémentaires (N4). Valeurs pour 100 g côté aliment, pour la portion côté repas.
 * Clé absente = valeur inconnue (jamais 0 par défaut) : on n'affiche et on ne somme que ce qui est connu.
 */
export type MicroKey = 'fibres_g' | 'sucres_g' | 'sel_g' | 'ags_g' | 'fer_mg' | 'calcium_mg';

export type Micros = Partial<Record<MicroKey, number>>;

export const MICRO_KEYS: MicroKey[] = ['fibres_g', 'sucres_g', 'sel_g', 'ags_g', 'fer_mg', 'calcium_mg'];

export interface MicroMeta {
  key: MicroKey;
  label: string;
  unit: 'g' | 'mg';
  /** Repère indicatif adulte par jour (ANSES / OMS), jamais un objectif médical. */
  ref: number;
  /** 'min' = viser au moins ; 'max' = rester en dessous. */
  kind: 'min' | 'max';
}

export const MICRO_META: MicroMeta[] = [
  { key: 'fibres_g', label: 'Fibres', unit: 'g', ref: 30, kind: 'min' },
  { key: 'sucres_g', label: 'Sucres', unit: 'g', ref: 100, kind: 'max' },
  { key: 'sel_g', label: 'Sel', unit: 'g', ref: 5, kind: 'max' },
  { key: 'ags_g', label: 'Graisses saturées', unit: 'g', ref: 22, kind: 'max' },
  { key: 'fer_mg', label: 'Fer', unit: 'mg', ref: 11, kind: 'min' },
  { key: 'calcium_mg', label: 'Calcium', unit: 'mg', ref: 950, kind: 'min' },
];

const num = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

const round = (n: number) => Math.round(n * 10) / 10;

/** Sodium (mg) → sel (g) : sel = sodium × 2,5. */
export const sodiumMgToSaltG = (sodiumMg: number) => (sodiumMg * 2.5) / 1000;

/** Retire les clés inconnues ; renvoie undefined s'il ne reste rien. */
export function cleanMicros(m: Micros | null | undefined): Micros | undefined {
  if (!m || typeof m !== 'object') return undefined;
  const out: Micros = {};
  for (const k of MICRO_KEYS) {
    const v = num((m as any)[k]);
    if (v !== undefined) out[k] = round(v);
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Ligne Ciqual de la base. `fibres` est volontairement ignoré : la colonne est erronée en production.
 * `sodium`, `fer`, `calcium` sont en mg pour 100 g.
 */
export function microsFromCiqual(c: any): Micros | undefined {
  const sodium = num(c?.sodium);
  return cleanMicros({
    sel_g: sodium !== undefined ? sodiumMgToSaltG(sodium) : undefined,
    fer_mg: num(c?.fer),
    calcium_mg: num(c?.calcium),
  });
}

/** Produit Open Food Facts : champs `*_100g` en g (sodium/sel en g, fer/calcium en g aussi). */
export function microsFromOff(nutriments: any): Micros | undefined {
  if (!nutriments) return undefined;
  const salt = num(nutriments['salt_100g']);
  const sodiumG = num(nutriments['sodium_100g']);
  const iron = num(nutriments['iron_100g']);
  const calcium = num(nutriments['calcium_100g']);
  return cleanMicros({
    fibres_g: num(nutriments['fiber_100g']),
    sucres_g: num(nutriments['sugars_100g']),
    sel_g: salt ?? (sodiumG !== undefined ? sodiumG * 2.5 : undefined),
    ags_g: num(nutriments['saturated-fat_100g']),
    fer_mg: iron !== undefined ? iron * 1000 : undefined,
    calcium_mg: calcium !== undefined ? calcium * 1000 : undefined,
  });
}

/** Valeurs pour 100 g d'un aliment de la recherche (catalogue, Ciqual ou Open Food Facts). */
export function microsPer100(product: any): Micros | undefined {
  if (!product) return undefined;
  if (product.micros_100g) return cleanMicros(product.micros_100g);
  if (product.sodium !== undefined || product.fer !== undefined || product.calcium !== undefined) {
    return microsFromCiqual(product);
  }
  return undefined;
}

/** Fiche du catalogue local (fibres uniquement). */
export function microsFromCatalog(fibres100: unknown): Micros | undefined {
  return cleanMicros({ fibres_g: num(fibres100) });
}

/** Fusionne deux sources : les valeurs de `primary` priment. */
export function mergeMicros(primary?: Micros, fallback?: Micros): Micros | undefined {
  return cleanMicros({ ...(fallback || {}), ...(primary || {}) });
}

/** Valeurs pour 100 g → valeurs pour `grams` g. */
export function scaleMicros(per100: Micros | null | undefined, grams: number): Micros | undefined {
  if (!per100 || !(grams > 0)) return undefined;
  const out: Micros = {};
  for (const k of MICRO_KEYS) {
    const v = num(per100[k]);
    if (v !== undefined) out[k] = (v * grams) / 100;
  }
  return cleanMicros(out);
}

/** Valeurs d'une portion → valeurs pour 100 g (pour les « récents »). */
export function per100FromPortion(portion: Micros | null | undefined, grams: number): Micros | undefined {
  if (!portion || !(grams > 0)) return undefined;
  return scaleMicros(portion, 10000 / grams);
}

export interface MicroTotal {
  total: number;
  /** Nombre d'aliments qui renseignent cette valeur. */
  known: number;
  /** Nombre total d'aliments comptés. */
  count: number;
}

/** Total du jour par nutriment, en comptant combien d'aliments le renseignent. */
export function sumMicros(logs: { micros?: Micros | null }[]): Record<MicroKey, MicroTotal> {
  const res = {} as Record<MicroKey, MicroTotal>;
  for (const k of MICRO_KEYS) res[k] = { total: 0, known: 0, count: logs.length };
  for (const l of logs) {
    for (const k of MICRO_KEYS) {
      const v = num(l.micros?.[k]);
      if (v !== undefined) {
        res[k].total += v;
        res[k].known += 1;
      }
    }
  }
  for (const k of MICRO_KEYS) res[k].total = round(res[k].total);
  return res;
}

export function formatMicro(meta: MicroMeta, value: number): string {
  const v = meta.unit === 'mg' ? Math.round(value) : round(value);
  return `${String(v).replace('.', ',')} ${meta.unit}`;
}
