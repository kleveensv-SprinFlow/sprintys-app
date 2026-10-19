import { supabase } from './supabase';
import { openFoodFactsService, OFFProduct } from './openFoodFactsService';
import { matchScore, searchTokens, isStateToken, recallForms, tokenInName, normalizeSearchText, searchVariants, spokenFoodTitle, foodStateLabel } from './foodSearchRank';
import { searchFoodCatalog } from '../features/nutrition/data/foodCatalog';

export { normalizeSearchText };

export interface CiqualFood {
  id: string;
  code_ciqual: string;
  nom: string;
  display_name?: string;
  etat?: string;
  synonymes?: string;
  energie_kcal: number;
  proteines: number;
  glucides: number;
  lipides: number;
  fibres: number;
  sodium: number;
  /** Portion naturelle de la base maison (« 1 œuf » = 50 g), absente des anciennes fiches. */
  master_portion?: { label: string; grams: number } | null;
}

/** Interrupteur : EXPO_PUBLIC_FOOD_MASTER=0 revient à l'ancienne recherche (table ciqual_foods). */
const USE_FOOD_MASTER = process.env.EXPO_PUBLIC_FOOD_MASTER !== '0';

interface FoodMasterRow {
  id: string; source_id: string; nom_origine: string; display_name: string; etat: string | null;
  unite_label: string; poids_moyen_g: number; portion_source: string | null;
  kcal: number; proteines_g: number; glucides_g: number; lipides_g: number; fibres_g: number; sodium_mg: number;
}

function fromFoodMaster(r: FoodMasterRow): CiqualFood {
  const natural = r.portion_source && r.portion_source !== 'defaut' && Number(r.poids_moyen_g) > 0;
  return {
    id: r.id,
    code_ciqual: String(r.source_id),
    nom: r.nom_origine,
    display_name: r.display_name,
    etat: r.etat === 'Cru' ? 'cru' : r.etat === 'Cuit' ? 'cuit' : '',
    energie_kcal: Number(r.kcal) || 0,
    proteines: Number(r.proteines_g) || 0,
    glucides: Number(r.glucides_g) || 0,
    lipides: Number(r.lipides_g) || 0,
    fibres: Number(r.fibres_g) || 0,
    sodium: Number(r.sodium_mg) || 0,
    master_portion: natural ? { label: r.unite_label.replace(/^1\s+/, ''), grams: Number(r.poids_moyen_g) } : null,
  };
}

/** Recherche dans la base maison (classement : niveau, nom exact, mots, popularité). */
async function searchFoodMaster(rawQ: string): Promise<HybridFoodResult[] | null> {
  const { data, error } = await supabase.rpc('search_foods', { p_query: rawQ, p_limit: 20 });
  if (error) {
    console.warn('search_foods indisponible, ancienne recherche utilisée:', error.message);
    return null;
  }
  return (data as FoodMasterRow[]).map((row) => ({ type: 'ciqual' as const, item: fromFoodMaster(row) }));
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

async function rowsForToken(token: string, queryTokens: string[]): Promise<CiqualFood[]> {
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
    if (seen.has(item.id) || !tokenInName(token, item.nom, item.etat || '', queryTokens)) continue;
    seen.add(item.id);
    rows.push(item);
  }
  return rows;
}

/** Variantes rares (exotiques, bébé, séchées) : jamais devant la version courante du même aliment. */
const RARE_VARIANT = /plantain|nectar|bébé|petit pot|prélevé|séch|sèche|lyophilis/i;
/** Fiches Ciqual sans aucune valeur (hors eaux et boissons sans calories) : à ne pas proposer. */
const ZERO_OK = /(^|\s)(eau|boisson|thé|café|infusion|bouillon|sel|vinaigre|édulcor)/i;
function hasNoValues(item: CiqualFood): boolean {
  // Un aliment sans énergie ni glucides n'existe pas (hors eaux et boissons) : la fiche Ciqual est vide
  return (Number(item.energie_kcal) || 0) === 0 && (Number(item.glucides) || 0) === 0 && !ZERO_OK.test(item.nom);
}

async function searchCiqual(rawQ: string): Promise<HybridFoodResult[]> {
  const tokens = searchTokens(rawQ);
  if (tokens.length === 0) return [];

  if (USE_FOOD_MASTER) {
    const master = await searchFoodMaster(rawQ);
    if (master && master.length > 0) return master;
  }

  // The food picker calls searchCiqual directly. Surface curated everyday foods
  // (including their common aliases) before making a network request.
  const fromCatalog = searchFoodCatalog(rawQ);
  if (fromCatalog.length > 0) {
    return fromCatalog.map((item) => ({ type: 'ciqual' as const, item }));
  }

  const distinctive = tokens.filter((token) => !isStateToken(token));
  const lookedUp = distinctive.length > 0 ? distinctive : tokens;
  const lists = await Promise.all(lookedUp.map(async (token) => {
    const variants = searchVariants(token, tokens);
    const found = await Promise.all(variants.map((variant) => rowsForToken(variant, tokens)));
    const byId = new Map<string, CiqualFood>();
    for (const rows of found) for (const row of rows) byId.set(row.id, row);
    return [...byId.values()];
  }));

  let rows = lists[0] || [];
  for (const list of lists.slice(1)) {
    const ids = new Set(list.map((item) => item.id));
    rows = rows.filter((item) => ids.has(item.id));
  }

  const ranked = rows
    .map((item) => ({ item, score: matchScore(tokens, item.nom, item.etat || '') }))
    .filter((row) => row.score > 0 && !hasNoValues(row.item));

  const askedState = tokens.some((token) => isStateToken(token));
  const bestByDish = new Map<string, { item: CiqualFood; score: number }>();
  for (const row of ranked) {
    const title = spokenFoodTitle(row.item.nom, tokens);
    const state = foodStateLabel(row.item.nom, row.item.etat || '');
    const key = `${title}|${state}`;
    const current = bestByDish.get(key);
    const simpler = !current || row.item.nom.length < current.item.nom.length;
    if (!current || row.score > current.score + 40 || (Math.abs(row.score - current.score) <= 40 && simpler)) {
      bestByDish.set(key, row);
    }
  }

  return [...bestByDish.values()]
    .sort((a, b) => {
      const aRare = RARE_VARIANT.test(a.item.nom) && !tokens.some((t) => RARE_VARIANT.test(t)) ? 1 : 0;
      const bRare = RARE_VARIANT.test(b.item.nom) && !tokens.some((t) => RARE_VARIANT.test(t)) ? 1 : 0;
      if (aRare !== bRare) return aRare - bRare;
      if (!askedState) {
        const aCooked = foodStateLabel(a.item.nom, a.item.etat || '') === 'cuit' ? 1 : 0;
        const bCooked = foodStateLabel(b.item.nom, b.item.etat || '') === 'cuit' ? 1 : 0;
        if (aCooked !== bCooked) return bCooked - aCooked;
      }
      return b.score - a.score || a.item.nom.localeCompare(b.item.nom, 'fr');
    })
    .slice(0, 8)
    .map((row) => ({ type: 'ciqual' as const, item: { ...row.item, display_name: spokenFoodTitle(row.item.nom, tokens) } }));
}

async function searchPackaged(rawQ: string): Promise<HybridFoodResult[]> {
  const tokens = searchTokens(rawQ);
  {
    const products = await Promise.race([
      openFoodFactsService.searchFood(rawQ),
      new Promise<OFFProduct[]>((_, reject) => setTimeout(() => reject(new Error('OFF search timeout')), 5000)),
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

    const fromCatalog = searchFoodCatalog(rawQ);
    if (fromCatalog.length) {
      return fromCatalog.map((item) => ({ type: 'ciqual' as const, item }));
    }

    const [generic, packaged] = await Promise.allSettled([searchCiqual(rawQ), searchPackaged(rawQ)]);
    return [
      ...(generic.status === 'fulfilled' ? generic.value : []),
      ...(packaged.status === 'fulfilled' ? packaged.value : []),
    ];
  },
};
