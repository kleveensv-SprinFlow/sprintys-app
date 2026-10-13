import { supabase } from './supabase';
import { openFoodFactsService, OFFProduct } from './openFoodFactsService';
import { matchScore, searchTokens, isStateToken, recallForms, tokenInName, normalizeSearchText } from './foodSearchRank';

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

const CIQUAL_COLUMNS = 'id, code_ciqual, nom, etat, synonymes, energie_kcal, proteines, glucides, lipides, fibres, sodium, search_text';

/** Formes du mot, avec l'accent et la faute, collées au début d'un mot du nom. */
function boundaryFilters(token: string): string[] {
  const filters: string[] = [];
  for (const form of recallForms(token)) {
    const safe = escapeIlike(form);
    filters.push(`nom.ilike.${safe}%`);
    filters.push(`nom.ilike.% ${safe}%`);
    filters.push(`nom.ilike.%-${safe}%`);
    filters.push(`nom.ilike.%'${safe}%`);
    filters.push(`search_text.ilike.${safe}%`);
  }
  return filters;
}

async function rowsForToken(token: string): Promise<CiqualFood[]> {
  const filters = boundaryFilters(token).slice(0, 40);
  const run = (active: string[]) => supabase
    .from('ciqual_foods')
    .select(CIQUAL_COLUMNS)
    .or(active.join(','))
    .order('nom', { ascending: true })
    .limit(400);

  let { data, error } = await run(filters);
  if (error) {
    const safer = filters.filter((filter) => !filter.includes("'"));
    const retry = await run(safer.length ? safer : filters.slice(0, 12));
    data = retry.data;
    error = retry.error;
  }

  if (error || !data) {
    if (error) console.error('CIQUAL search error:', error);
    return [];
  }

  const seen = new Set<string>();
  const rows: CiqualFood[] = [];
  for (const item of data as CiqualFood[]) {
    if (seen.has(item.id) || !tokenInName(token, item.nom, item.etat || '')) continue;
    seen.add(item.id);
    rows.push(item);
  }
  return rows;
}

async function searchCiqual(rawQ: string): Promise<HybridFoodResult[]> {
  const tokens = searchTokens(rawQ);
  if (tokens.length === 0) return [];

  const distinctive = tokens.filter((token) => !isStateToken(token));
  const lookedUp = distinctive.length > 0 ? distinctive : tokens;
  const lists = await Promise.all(lookedUp.map((token) => rowsForToken(token)));

  let rows = lists[0] || [];
  for (const list of lists.slice(1)) {
    const ids = new Set(list.map((item) => item.id));
    rows = rows.filter((item) => ids.has(item.id));
  }

  return rows
    .map((item) => ({ item, score: matchScore(tokens, item.nom, item.etat || '') }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.item.nom.localeCompare(b.item.nom, 'fr'))
    .slice(0, 15)
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
      .map((item) => ({ item, score: matchScore(tokens, item.name) }))
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
