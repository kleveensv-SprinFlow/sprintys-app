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

    try {
      // A. CIQUAL (Aliments bruts) - Prioritaires
      const { data: ciqualData, error } = await supabase
        .from('ciqual_foods')
        .select('*')
        .ilike('search_text', `%${q}%`)
        .limit(50); // Fetch a larger pool to score in JS

      if (error) {
        console.error('CIQUAL search error:', error);
      } else if (ciqualData && ciqualData.length > 0) {
        const scoredData = ciqualData.map((item) => {
          let score = 0;
          const nameLower = item.nom.toLowerCase();
          const searchLower = item.search_text?.toLowerCase() || '';

          // 1. Exact first word match
          if (nameLower === q || nameLower.startsWith(q + ',') || nameLower.startsWith(q + ' ') || nameLower.startsWith(q + '-')) {
            score += 1000;
          } else if (nameLower.startsWith(q)) {
            score += 500;
          } else if (new RegExp(`\\b${q}\\b`).test(searchLower)) {
            score += 200;
          }

          // 2. Malus pour "pomme de terre" si on cherche juste "pomme"
          if (q === 'pomme' && searchLower.includes('pomme de terre')) {
            score -= 800;
          }
          
          // Malus si le mot-clé apparait loin dans le nom
          const idx = searchLower.indexOf(q);
          if (idx !== -1) {
            score -= idx;
          }

          // 3. Aliment simple > plat complexe (plus le nom est court, plus il est simple)
          score -= nameLower.length;

          return { item, score };
        });

        // 4. Tri par score puis par ordre alphabétique
        scoredData.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.item.nom.localeCompare(b.item.nom);
        });

        // On prend les 10 meilleurs
        results.push(...scoredData.slice(0, 10).map(c => ({ type: 'ciqual' as const, item: c.item as CiqualFood })));
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
