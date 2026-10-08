/**
 * Dictionnaire de portions naturelles et de densités.
 * Hors-ligne. Le mot le plus long gagne, pour ne pas prendre
 * « pain » à la place de « pain au chocolat », ni « pomme » pour « pomme de terre ».
 */

export type InputUnit = 'g' | 'ml' | 'piece' | 'serving';

export interface PortionRule {
  keywords: string[];
  pieceWeight: number;
  pieceLabel: string;
}

interface LiquidRule {
  keywords: string[];
  /** Grammes pour 1 ml. 1 pour l'eau, le lait, les jus. */
  density: number;
  defaultQty: number;
}

const NO_PIECE_KEYWORDS = [
  'riz', 'pate', 'pâte', 'spaghetti', 'coquillette', 'penne', 'semoule', 'quinoa',
  'lentille', 'boulgour', 'avoine', 'flocon', 'huile', 'beurre', 'vinaigre',
  'farine', 'sucre', 'sel', 'eau', 'lait', 'creme', 'crème', 'sauce', 'jus',
  'miel', 'confiture', 'puree', 'purée', 'sirop'
];

/** Un mot court inclus dans une de ces expressions ne doit pas créer de pièce. */
const PIECE_BLOCKLIST = [
  'pomme de terre',
  'oeuf de lump',
  'oeuf de lompe',
  'oeuf de cabillaud',
  'oeuf de poisson',
  'oeuf de truite',
  'oeuf de saumon',
];

export const PIECE_RULES: PortionRule[] = [
  { keywords: ['blanc d\'oeuf', 'blanc d\'œuf'], pieceWeight: 35, pieceLabel: 'blanc' },
  { keywords: ['jaune d\'oeuf', 'jaune d\'œuf'], pieceWeight: 20, pieceLabel: 'jaune' },
  { keywords: ['oeuf', 'œuf'], pieceWeight: 60, pieceLabel: 'œuf' },

  { keywords: ['pomme'], pieceWeight: 150, pieceLabel: 'pomme' },
  { keywords: ['banane'], pieceWeight: 120, pieceLabel: 'banane' },
  { keywords: ['poire'], pieceWeight: 160, pieceLabel: 'poire' },
  { keywords: ['orange'], pieceWeight: 150, pieceLabel: 'orange' },
  { keywords: ['clementine', 'clémentine', 'mandarine'], pieceWeight: 70, pieceLabel: 'pièce' },
  { keywords: ['peche', 'pêche', 'nectarine'], pieceWeight: 130, pieceLabel: 'pêche' },
  { keywords: ['abricot'], pieceWeight: 45, pieceLabel: 'abricot' },
  { keywords: ['kiwi'], pieceWeight: 80, pieceLabel: 'kiwi' },
  { keywords: ['avocat'], pieceWeight: 150, pieceLabel: 'avocat' },
  { keywords: ['citron'], pieceWeight: 100, pieceLabel: 'citron' },

  { keywords: ['tomate'], pieceWeight: 120, pieceLabel: 'tomate' },
  { keywords: ['carotte'], pieceWeight: 100, pieceLabel: 'carotte' },
  { keywords: ['oignon'], pieceWeight: 100, pieceLabel: 'oignon' },
  { keywords: ['courgette'], pieceWeight: 200, pieceLabel: 'courgette' },
  { keywords: ['poivron'], pieceWeight: 160, pieceLabel: 'poivron' },
  { keywords: ['concombre'], pieceWeight: 300, pieceLabel: 'concombre' },

  { keywords: ['yaourt', 'yogourt'], pieceWeight: 125, pieceLabel: 'pot' },
  { keywords: ['petit suisse', 'petit-suisse'], pieceWeight: 60, pieceLabel: 'pot' },
  { keywords: ['compote'], pieceWeight: 90, pieceLabel: 'pot' },

  { keywords: ['pain au chocolat', 'chocolatine'], pieceWeight: 65, pieceLabel: 'pièce' },
  { keywords: ['pain de mie'], pieceWeight: 35, pieceLabel: 'tranche' },
  { keywords: ['pain', 'baguette'], pieceWeight: 35, pieceLabel: 'tranche' },
  { keywords: ['biscotte'], pieceWeight: 10, pieceLabel: 'biscotte' },
  { keywords: ['tortilla', 'wrap', 'galette'], pieceWeight: 60, pieceLabel: 'galette' },
  { keywords: ['crepe', 'crêpe'], pieceWeight: 40, pieceLabel: 'crêpe' },
  { keywords: ['gaufre'], pieceWeight: 50, pieceLabel: 'gaufre' },
  { keywords: ['croissant'], pieceWeight: 50, pieceLabel: 'croissant' },
  { keywords: ['cookie'], pieceWeight: 30, pieceLabel: 'cookie' },

  { keywords: ['tranche de jambon', 'jambon cuit', 'jambon blanc', 'blanc de poulet', 'blanc de dinde'], pieceWeight: 40, pieceLabel: 'tranche' },
  { keywords: ['steak hache', 'steak haché'], pieceWeight: 100, pieceLabel: 'steak' },
  { keywords: ['saucisse'], pieceWeight: 60, pieceLabel: 'saucisse' },
];

const LIQUID_RULES: LiquidRule[] = [
  { keywords: ['huile'], density: 0.92, defaultQty: 15 },
  { keywords: ['miel'], density: 1.4, defaultQty: 15 },
  { keywords: ['sirop'], density: 1.33, defaultQty: 15 },
  { keywords: ['vinaigre'], density: 1, defaultQty: 15 },
  { keywords: ['sauce'], density: 1, defaultQty: 15 },
  { keywords: ['creme liquide', 'crème liquide'], density: 1, defaultQty: 15 },
  { keywords: ['eau', 'lait', 'jus', 'soda', 'coca', 'cafe', 'thé', 'the', 'bouillon', 'boisson', 'infusion', 'tisane'], density: 1, defaultQty: 200 },
];

export interface ResolvedPortion {
  hasPiece: boolean;
  pieceWeight?: number;
  pieceLabel?: string;
  hasServing: boolean;
  servingWeight?: number;
  servingLabel?: string;
  hasLiquid: boolean;
  /** Grammes pour 1 ml. */
  mlDensity: number;
  liquidDefaultQty: number;
  defaultUnit: InputUnit;
  defaultQty: number;
}

export function cleanFoodText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function keywordMatches(foodName: string, keyword: string): boolean {
  const cleanedKw = cleanFoodText(keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!cleanedKw) return false;
  return new RegExp(`(^|[\\s',])${cleanedKw}([\\s',]|$)`, 'i').test(foodName);
}

function longestMatch<T extends { keywords: string[] }>(foodName: string, rules: T[]): { rule: T; keyword: string } | null {
  let best: { rule: T; keyword: string; len: number } | null = null;
  for (const rule of rules) {
    for (const kw of rule.keywords) {
      if (!keywordMatches(foodName, kw)) continue;
      const len = cleanFoodText(kw).length;
      if (!best || len > best.len) best = { rule, keyword: kw, len };
    }
  }
  return best ? { rule: best.rule, keyword: best.keyword } : null;
}

function pieceBlocked(foodName: string, keyword: string): boolean {
  const kw = cleanFoodText(keyword);
  return PIECE_BLOCKLIST.some((phrase) => {
    const blocked = cleanFoodText(phrase);
    return foodName.includes(blocked) && blocked.includes(kw) && blocked.length > kw.length;
  });
}

export function pluralizeLabel(label: string, qty: number): string {
  if (!(qty > 1)) return label;
  if (/[sx]$/i.test(label)) return label;
  return `${label}s`;
}

export function resolveFoodPortion(food: {
  nom?: string;
  name?: string;
  serving_quantity?: number;
  serving_size?: string;
  code_ciqual?: string;
  last_input_qty?: number;
  last_input_unit?: InputUnit;
}): ResolvedPortion {
  const foodName = cleanFoodText(food.nom || food.name || '');

  const hasServing = Boolean(food.serving_quantity && food.serving_quantity > 0);
  const servingWeight = hasServing ? Math.round(Number(food.serving_quantity)) : undefined;
  const servingLabel = hasServing ? 'portion' : undefined;

  const isNoPiece = NO_PIECE_KEYWORDS.some((kw) => keywordMatches(foodName, kw));
  const isRiceCakeOrWrap = foodName.includes('galette') || foodName.includes('wrap');

  let hasPiece = false;
  let pieceWeight: number | undefined;
  let pieceLabel: string | undefined;

  if (!isNoPiece || isRiceCakeOrWrap) {
    const found = longestMatch(foodName, PIECE_RULES);
    if (found && !pieceBlocked(foodName, found.keyword)) {
      hasPiece = true;
      pieceWeight = found.rule.pieceWeight;
      pieceLabel = found.rule.pieceLabel;
    }
  }

  const liquid = longestMatch(foodName, LIQUID_RULES);
  const hasLiquid = Boolean(liquid);
  const mlDensity = liquid?.rule.density ?? 1;
  const liquidDefaultQty = liquid?.rule.defaultQty ?? 200;

  const base = {
    hasPiece,
    pieceWeight,
    pieceLabel,
    hasServing,
    servingWeight,
    servingLabel,
    hasLiquid,
    mlDensity,
    liquidDefaultQty,
  };

  if (food.last_input_qty && food.last_input_unit) {
    return { ...base, defaultUnit: food.last_input_unit, defaultQty: food.last_input_qty };
  }
  if (hasPiece) {
    return { ...base, defaultUnit: 'piece', defaultQty: 1 };
  }
  if (hasServing) {
    return { ...base, defaultUnit: 'serving', defaultQty: 1 };
  }
  if (hasLiquid) {
    return { ...base, defaultUnit: 'ml', defaultQty: liquidDefaultQty };
  }
  return { ...base, defaultUnit: 'g', defaultQty: 100 };
}

/** Poids réel d'une ligne IA. La pièce passe par le dictionnaire, jamais par un 60 g fixe. */
export function quantityFromAiItem(
  item: { qty: number; unit: string; name: string },
  matchedName?: string,
): { weightG: number; gramsPerUnit: number; unitLabel: string } {
  if (item.unit === 'piece') {
    const portion = resolveFoodPortion({ nom: matchedName || item.name });
    const gramsPerUnit = portion.pieceWeight || 60;
    return {
      weightG: item.qty * gramsPerUnit,
      gramsPerUnit,
      unitLabel: portion.pieceLabel || 'pièce',
    };
  }
  return { weightG: item.qty, gramsPerUnit: 1, unitLabel: 'g' };
}

export function formatRecentSubtitle(item: {
  last_input_qty?: number;
  last_input_unit?: InputUnit;
  last_unit_label?: string;
  last_calories?: number;
  last_quantity_g?: number;
}): string {
  const kcal = Math.round(item.last_calories || 0);
  const qty = Number(item.last_input_qty);
  const unit = item.last_input_unit || 'g';
  if (unit === 'piece' && qty) {
    return `${qty} ${pluralizeLabel(item.last_unit_label || 'pièce', qty)} · ${kcal} kcal`;
  }
  if (unit === 'ml' && qty) return `${qty} ml · ${kcal} kcal`;
  if (unit === 'serving' && qty) return `${qty} portion${qty > 1 ? 's' : ''} · ${kcal} kcal`;
  const grams = Math.round(item.last_quantity_g || qty || 0);
  return `${grams} g · ${kcal} kcal`;
}
