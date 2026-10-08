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

export const normalizeSearchText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .trim();
};

const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const escapeIlike = (str: string): string => {
  return str.replace(/[%_\\]/g, '\\$&');
};

export const nutritionService = {
  /**
   * Recherche hybride unifiée : CIQUAL (produits bruts) prioritaire + OFF (industriels)
   */
  searchFoodHybrid: async (query: string): Promise<HybridFoodResult[]> => {
    const rawQ = query.trim();
    if (!rawQ) return [];

    // 1. Détection de code-barres (EAN-8 ou EAN-13)
    if (/^\d{8,13}$/.test(rawQ)) {
      try {
        const product = await openFoodFactsService.getFoodByBarcode(rawQ);
        if (product) return [{ type: 'off', item: product }];
        return [];
      } catch (err) {
        console.error('Barcode fetch error:', err);
        return [];
      }
    }

    const q = normalizeSearchText(rawQ);
    if (!q) return [];

    const results: HybridFoodResult[] = [];
    const escapedIlikeQ = escapeIlike(q);

    // Lancer CIQUAL et OpenFoodFacts en parallèle avec promesses pour la rapidité
    const ciqualPromise = (async () => {
      try {
        const { data: ciqualData, error } = await supabase
          .from('ciqual_foods')
          .select('*')
          .ilike('search_text', `%${escapedIlikeQ}%`)
          .limit(100);

        if (error) {
          console.error('CIQUAL search error:', error);
          return [];
        }

        if (!ciqualData || ciqualData.length === 0) return [];

        const escapedQRegex = escapeRegex(q);
        const wordRegex = new RegExp(`(^|[^a-z0-9])${escapedQRegex}([^a-z0-9]|$)`, 'i');

        const scoredData = ciqualData.map((item) => {
          let score = 0;
          const nameNorm = normalizeSearchText(item.nom);
          const searchNorm = normalizeSearchText(item.search_text || item.nom);

          // 1. Match exact ou premier mot
          if (nameNorm === q) {
            score += 2000;
          } else if (nameNorm.startsWith(q + ',') || nameNorm.startsWith(q + ' ') || nameNorm.startsWith(q + '-')) {
            score += 1200;
          } else if (nameNorm.startsWith(q)) {
            score += 800;
          } else if (wordRegex.test(searchNorm)) {
            score += 400;
          }

          // 2. Pénalités de contexte pour requêtes mono-mot (ex: "pomme" vs "pomme de terre")
          if (q.split(' ').length === 1) {
            if (q === 'pomme' && searchNorm.includes('pomme de terre')) {
              score -= 900;
            }
          }
          
          // Malus si le mot apparaît loin dans le nom
          const idx = searchNorm.indexOf(q);
          if (idx !== -1) {
            score -= Math.min(100, idx * 2);
          }

          // 3. Favoriser les aliments simples et courts face aux plats cuisinés complexes
          score -= Math.min(200, nameNorm.length);

          return { item, score };
        });

        scoredData.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.item.nom.localeCompare(b.item.nom, 'fr');
        });

        return scoredData.slice(0, 10).map(c => ({ type: 'ciqual' as const, item: c.item as CiqualFood }));
      } catch (err) {
        console.error('CIQUAL processing error:', err);
        return [];
      }
    })();

    const offPromise = (async () => {
      try {
        const offProducts = await openFoodFactsService.searchFood(rawQ);
        return offProducts.slice(0, 10).map(p => ({ type: 'off' as const, item: p }));
      } catch (err) {
        console.error('OFF search error:', err);
        return [];
      }
    })();

    const [ciqualResults, offResults] = await Promise.all([ciqualPromise, offPromise]);
    results.push(...ciqualResults, ...offResults);

    return results;
  }
};
