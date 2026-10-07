import { supabase } from './supabase';
import { openFoodFactsService, OFFProduct } from './openFoodFactsService';

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

export const nutritionService = {
  /**
   * Moteur de recherche hybride (Phase 0)
   * - Si 8-13 chiffres -> Code-barres OFF direct.
   * - Sinon -> Recherche locale CIQUAL prioritaire, puis OFF filtré (pays=france).
   */
  searchFoodHybrid: async (query: string): Promise<HybridFoodResult[]> => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    // 1. Détection de code-barres (EAN-8 ou EAN-13)
    if (/^\d{8,13}$/.test(q)) {
      try {
        const product = await openFoodFactsService.getFoodByBarcode(q);
        if (product) return [{ type: 'off', item: product }];
        return [];
      } catch (err) {
        console.error('Barcode fetch error:', err);
        return [];
      }
    }

    // 2. Recherche Textuelle Mixte
    const results: HybridFoodResult[] = [];

    // A. CIQUAL (Aliments bruts) - Prioritaires
    // Recherche simple avec ILIKE pour la flexibilité (pg_trgm en DB gère la perfo)
    try {
      // On cherche soit en début de chaîne (ex: "oeuf..."), soit après un espace (ex: "... oeuf...")
      const { data: ciqualData, error } = await supabase
        .from('ciqual_foods')
        .select('*')
        .or(`search_text.ilike.${q}%,search_text.ilike.% ${q}%,nom.ilike.${q}%,nom.ilike.% ${q}%`)
        .order('nom', { ascending: true })
        .limit(10);

      if (error) {
        console.error('CIQUAL search error:', error);
      } else if (ciqualData) {
        // Boost : si ça commence par le mot exact, on le met en haut
        ciqualData.sort((a, b) => {
          const aStarts = a.search_text?.startsWith(q) ? -1 : 0;
          const bStarts = b.search_text?.startsWith(q) ? -1 : 0;
          return aStarts - bStarts;
        });

        results.push(...ciqualData.map(c => ({ type: 'ciqual' as const, item: c as CiqualFood })));
      }
    } catch (err) {
      console.error('Supabase fetch error:', err);
    }

    // B. OpenFoodFacts (Produits industriels) - Secondaires
    try {
      // NOTE: Dans l'implémentation complète, openFoodFactsService.searchFood
      // devra inclure 'lc=fr' et 'country=france' dans l'URL de son fetch interne.
      const offData = await openFoodFactsService.searchFood(q);
      
      if (offData && offData.length > 0) {
        // Filtrer la salade sodebo si on cherche "oeuf" : on ne garde que ceux 
        // dont le nom du produit contient "oeuf" dans ses premiers mots, 
        // ou on laisse l'utilisateur scroller. Pour l'instant on ajoute max 10 produits.
        results.push(...offData.slice(0, 10).map(o => ({ type: 'off' as const, item: o })));
      }
    } catch (err) {
      console.error('OFF search error:', err);
    }

    return results;
  }
};
