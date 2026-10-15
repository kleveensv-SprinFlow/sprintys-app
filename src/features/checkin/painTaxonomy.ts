/**
 * Source unique pour les douleurs du check-in : types, côtés, gravité.
 * La règle d'alerte DOIT rester alignée avec `get_team_alerts` (supabase/migrations/*perf_alerts_fixes.sql) :
 * alerte si intensité >= 7 (tout type) ou >= 5 pour un type aigu.
 */

export const PAIN_TYPES = ['Courbature', 'Contracture', 'Élongation', 'Déchirure', 'Articulaire', 'Autre'] as const;
export type PainType = (typeof PAIN_TYPES)[number];

export const PAIN_SIDES = ['Gauche', 'Droit', 'Bilatéral'] as const;
export type PainSide = (typeof PAIN_SIDES)[number];

/** Types pouvant signaler une lésion (les valeurs historiques « Claquage » et « Tendinite » restent reconnues). */
export const ACUTE_PAIN_TYPES: readonly string[] = ['Déchirure', 'Claquage', 'Articulaire', 'Élongation', 'Tendinite'];

export const ALERT_INTENSITY = 7;
export const ACUTE_ALERT_INTENSITY = 5;

interface PainLike {
  type: string;
  intensity: number;
}

export const isAcutePain = (p: PainLike) => ACUTE_PAIN_TYPES.includes(p.type);

/** Douleur qui doit alerter le coach et plafonner le score de forme. */
export const isCriticalPain = (p: PainLike) =>
  p.intensity >= ALERT_INTENSITY || (p.intensity >= ACUTE_ALERT_INTENSITY && isAcutePain(p));

/**
 * Identifiant d'une douleur : zone + côté, pour pouvoir noter genou gauche ET genou droit.
 * Les anciennes données (sans côté) gardent simplement l'identifiant de la zone.
 */
export const painKey = (p: { muscle_id: string; side?: string | null }) =>
  p.side && p.side !== 'Aucun' ? `${p.muscle_id}:${p.side}` : p.muscle_id;

/** Libellé lisible : « Genoux (Gauche) ». */
export const painLabel = (p: { muscle_name?: string; muscle_id: string; side?: string | null }) => {
  const name = p.muscle_name || p.muscle_id;
  return p.side && p.side !== 'Aucun' ? `${name} (${p.side})` : name;
};
