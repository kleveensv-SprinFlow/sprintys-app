import { supabase } from './supabase';
import { openFoodFactsService, OFFProduct } from './openFoodFactsService';
import { matchScore, searchTokens, normalizeSearchText } from './foodSearchRank';

export { normalizeSearchText };

export interface CiqualFood {
  id: string;
  code_ciqual: string;
  nom: string;
  etat?: string;
  synonymes?: string;
  energie_kcal: number;
  proteines: number;
  glucides: number;
  lipides: number;
  fibres: number;
  sodium: number;
}

export type HybridFoodResult = 
  | { type: 'ciqual'; item: CiqualFood }
  | { type: 'off'; item: OFFProduct };

const escapeIlike = (str: string): string => {
  return str.replace(/[%_\\]/g, '\\$&');
};

/** Formes du mot : pluriel, et œ/oe. Jamais une lettre au milieu d'un autre mot. */
function tokenForms(token: string): string[] {
  const forms = new Set<string>([token]);
  if (token.includes('oe')) forms.add(token.replace(/oe/g, 'œ'));
  if (token.length >= 3 && !token.endsWith('s')) forms.add(`${token}s`);
  return [...forms];
}

function boundaryFilters(column: string, token: string): string[] {
  const filters: string[] = [];
  for (const form of tokenForms(token)) {
    const safe = escapeIlike(form);
    filters.push(`${column}.ilike.${safe}%`);
    if (column === 'nom') {
      filters.push(`${column}.ilike.% ${safe}%`);
      filters.push(`${column}.ilike.%'${safe}%`);
      filters.push(`${column}.ilike.%-${safe}%`);
    }
  }
  return filters;
}

const CIQUAL_COLUMNS = 'id, code_ciqual, nom, etat, synonymes, energie_kcal, proteines, glucides, lipides, fibres, sodium, search_text';

async function searchCiqual(rawQ: string): Promise<HybridFoodResult[]> {
  const tokens = searchTokens(rawQ);
  if (tokens.length === 0) return [];

  const filters = tokens.flatMap((token) => [
    ...boundaryFilters('nom', token),
    ...boundaryFilters('search_text', token),
  ]);
  const orFilter = [...new Set(filters)].slice(0, 24).join(',');

  let { data, error } = await supabase
    .from('ciqual_foods')
    .select(CIQUAL_COLUMNS)
    .or(orFilter)
    .limit(60);

  if (error) {
    const retry = await supabase
      .from('ciqual_foods')
      .select('id, code_ciqual, nom, etat, synonymes, energie_kcal, proteines, glucides, lipides, fibres, sodium')
      .or([...new Set(tokens.flatMap((token) => boundaryFilters('nom', token)))].slice(0, 16).join(','))
      .limit(60);
    data = retry.data as typeof data;
    error = retry.error;
  }

  if (error || !data) {
    if (error) console.error('CIQUAL search error:', error);
    return [];
  }

  return data
    .map((item) => ({ item: item as CiqualFood, score: matchScore(tokens, item.nom, `${item.etat || ''} ${item.synonymes || ''}`) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.item.nom.localeCompare(b.item.nom, 'fr'))
    .slice(0, 12)
    .map((row) => ({ type: 'ciqual' as const, item: row.item }));
}

async function searchPackaged(rawQ: string): Promise<HybridFoodResult[]> {
  const tokens = searchTokens(rawQ);
  try {
    const products = await Promise.race([
      openFoodFactsService.searchFood(rawQ),
      new Promise<OFFProduct[]>((resolve) => setTimeout(() => resolve([]), 1600)),
    ]);
    return products
      .map((item) => ({ item, score: matchScore(tokens, item.name, item.brand || '') }))
      .filter((row) => row.score > 0 && row.item.name && row.item.name !== 'Produit inconnu')
      .sort((a, b) => {
        const kcalBias = (row: { item: OFFProduct }) => (row.item.macros_100g.calories > 0 ? 0 : -80);
        return (b.score + kcalBias(b)) - (a.score + kcalBias(a));
      })
      .slice(0, 6)
      .map((row) => ({ type: 'off' as const, item: row.item }));
  } catch (err) {
    console.error('OFF search error:', err);
    return [];
  }
}

export const nutritionService = {
  searchCiqual,
  searchPackaged,

  /**
   * Aliments génériques d'abord, produits emballés ensuite.
   * Les mots peuvent être dans le désordre, au pluriel, ou avec une lettre échangée.
   */
  searchFoodHybrid: async (query: string): Promise<HybridFoodResult[]> => {
    const rawQ = query.trim();
    if (!rawQ) return [];

    if (/^\d{8,13}$/.test(rawQ)) {
      try {
        const product = await openFoodFactsService.getFoodByBarcode(rawQ);
        return product ? [{ type: 'off', item: product }] : [];
      } catch (err) {
        console.error('Barcode fetch error:', err);
        return [];
      }
    }

    const [generic, packaged] = await Promise.all([searchCiqual(rawQ), searchPackaged(rawQ)]);
    return [...generic, ...packaged];
  },
};
