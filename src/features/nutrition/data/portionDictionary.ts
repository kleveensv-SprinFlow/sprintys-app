/**
 * Dictionnaire de portions naturelles et conversion des unités.
 * Zéro latence, fonctionne hors-ligne.
 */

export interface PortionRule {
  keywords: string[];
  pieceWeight: number; // en grammes
  pieceLabel: string;  // ex: 'œuf', 'pomme', 'tranche', 'pot'
}

// Aliments en vrac, liquides ou féculents qui n'ont JAMAIS d'unité naturelle "pièce"
const NO_PIECE_KEYWORDS = [
  'riz', 'pate', 'pâte', 'spaghetti', 'coquillette', 'penne', 'semoule', 'quinoa',
  'lentille', 'boulgour', 'avoine', 'flocon', 'huile', 'beurre', 'vinaigre',
  'farine', 'sucre', 'sel', 'eau', 'lait', 'creme', 'crème', 'sauce', 'jus',
  'miel', 'confiture', 'puree', 'purée', 'sirop'
];

export const PIECE_RULES: PortionRule[] = [
  // Œufs
  { keywords: ['oeuf', 'œuf'], pieceWeight: 60, pieceLabel: 'œuf' },
  { keywords: ['blanc d\'oeuf', 'blanc d\'œuf'], pieceWeight: 35, pieceLabel: 'blanc' },
  { keywords: ['jaune d\'oeuf', 'jaune d\'œuf'], pieceWeight: 20, pieceLabel: 'jaune' },

  // Fruits
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

  // Légumes individuels
  { keywords: ['tomate'], pieceWeight: 120, pieceLabel: 'tomate' },
  { keywords: ['carotte'], pieceWeight: 100, pieceLabel: 'carotte' },
  { keywords: ['oignon'], pieceWeight: 100, pieceLabel: 'oignon' },
  { keywords: ['courgette'], pieceWeight: 200, pieceLabel: 'courgette' },
  { keywords: ['poivron'], pieceWeight: 160, pieceLabel: 'poivron' },
  { keywords: ['concombre'], pieceWeight: 300, pieceLabel: 'concombre' },

  // Produits laitiers & desserts
  { keywords: ['yaourt', 'yogourt'], pieceWeight: 125, pieceLabel: 'pot' },
  { keywords: ['petit suisse', 'petit-suisse'], pieceWeight: 60, pieceLabel: 'pot' },
  { keywords: ['compote'], pieceWeight: 90, pieceLabel: 'pot/gourde' },

  // Pains, tranches & féculents portionnés
  { keywords: ['pain', 'baguette'], pieceWeight: 35, pieceLabel: 'tranche' },
  { keywords: ['pain de mie'], pieceWeight: 35, pieceLabel: 'tranche' },
  { keywords: ['biscotte'], pieceWeight: 10, pieceLabel: 'biscotte' },
  { keywords: ['tortilla', 'wrap', 'galette'], pieceWeight: 60, pieceLabel: 'galette' },
  { keywords: ['crepe', 'crêpe'], pieceWeight: 40, pieceLabel: 'crêpe' },
  { keywords: ['gaufre'], pieceWeight: 50, pieceLabel: 'gaufre' },
  { keywords: ['croissant'], pieceWeight: 50, pieceLabel: 'croissant' },
  { keywords: ['pain au chocolat', 'chocolatine'], pieceWeight: 65, pieceLabel: 'pièce' },
  { keywords: ['cookie'], pieceWeight: 30, pieceLabel: 'cookie' },

  // Viandes / charcuteries découpées
  { keywords: ['tranche de jambon', 'jambon cuit', 'jambon blanc', 'blanc de poulet', 'blanc de dinde'], pieceWeight: 40, pieceLabel: 'tranche' },
  { keywords: ['steak hache', 'steak haché'], pieceWeight: 100, pieceLabel: 'steak' },
  { keywords: ['saucisse'], pieceWeight: 60, pieceLabel: 'saucisse' },
];

export interface ResolvedPortion {
  hasPiece: boolean;
  pieceWeight?: number;
  pieceLabel?: string;
  hasServing: boolean;
  servingWeight?: number;
  servingLabel?: string;
  defaultUnit: 'g' | 'piece' | 'serving';
  defaultQty: number;
}

/**
 * Normalise un texte (minuscules, sans accents) pour la recherche de mots-clés.
 */
function cleanText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Détermine les portions et l'unité par défaut pour un aliment donné.
 */
export function resolveFoodPortion(food: {
  nom?: string;
  name?: string;
  serving_quantity?: number;
  serving_size?: string;
  last_input_qty?: number;
  last_input_unit?: 'g' | 'piece' | 'serving';
}): ResolvedPortion {
  const foodName = cleanText(food.nom || food.name || '');

  // 1. Portion industrielle (Open Food Facts)
  const hasServing = Boolean(food.serving_quantity && food.serving_quantity > 0);
  const servingWeight = hasServing ? Math.round(Number(food.serving_quantity)) : undefined;
  const servingLabel = hasServing ? 'portion' : undefined;

  // 2. Vérification s'il s'agit d'un aliment strictement en vrac sans pièce
  const isNoPiece = NO_PIECE_KEYWORDS.some(kw => {
    // Si le nom correspond exactement ou commence par le mot-clé (ex: "riz basmati")
    const cleanedKw = cleanText(kw);
    const regex = new RegExp(`(^|\\s)${cleanedKw}(\\s|$)`, 'i');
    return regex.test(foodName);
  });

  // Exception : galette de riz a une pièce
  const isRiceCakeOrWrap = foodName.includes('galette') || foodName.includes('wrap');

  let hasPiece = false;
  let pieceWeight: number | undefined = undefined;
  let pieceLabel: string | undefined = undefined;

  if (!isNoPiece || isRiceCakeOrWrap) {
    for (const rule of PIECE_RULES) {
      const match = rule.keywords.some(kw => {
        const cleanedKw = cleanText(kw);
        const regex = new RegExp(`(^|\\s|[',])${cleanedKw}(\\s|[',]|$)`, 'i');
        return regex.test(foodName);
      });
      if (match) {
        hasPiece = true;
        pieceWeight = rule.pieceWeight;
        pieceLabel = rule.pieceLabel;
        break;
      }
    }
  }

  // 3. Détermination de l'unité et quantité par défaut à l'ouverture
  // Si c'est un aliment récemment consommé, rouvrir sur la dernière saisie
  if (food.last_input_qty && food.last_input_unit) {
    return {
      hasPiece,
      pieceWeight,
      pieceLabel,
      hasServing,
      servingWeight,
      servingLabel,
      defaultUnit: food.last_input_unit,
      defaultQty: food.last_input_qty,
    };
  }

  // Sinon poser dans la langue naturelle de l'aliment
  if (hasPiece) {
    return {
      hasPiece,
      pieceWeight,
      pieceLabel,
      hasServing,
      servingWeight,
      servingLabel,
      defaultUnit: 'piece',
      defaultQty: 1,
    };
  }

  if (hasServing) {
    return {
      hasPiece: false,
      hasServing,
      servingWeight,
      servingLabel,
      defaultUnit: 'serving',
      defaultQty: 1,
    };
  }

  return {
    hasPiece: false,
    hasServing: false,
    defaultUnit: 'g',
    defaultQty: 100,
  };
}
