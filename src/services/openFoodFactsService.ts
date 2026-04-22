export interface OFFProduct {
  id: string;
  name: string;
  brand: string;
  kcal100g: number;
  protein100g: number;
  carbs100g: number;
  fat100g: number;
}

export const openFoodFactsService = {
  searchFood: async (query: string): Promise<OFFProduct[]> => {
    try {
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
          query
        )}&search_simple=1&action=process&json=1`;
      
      console.log('Fetching OFF URL:', url);
      
      const response = await fetch(url);
      
      console.log('OFF Status:', response.status);
      
      if (!response.ok) {
        console.error('OFF API Error:', response.statusText);
        return [];
      }

      const data = await response.json();
      console.log('OFF Data products length:', data.products?.length || 0);

      if (!data.products) return [];

      const qLower = query.toLowerCase();

      return data.products
        // 1. Filtrage de qualité : Au moins une donnée d'énergie présente
        .filter((p: any) => 
          p.nutriments && 
          (
            (p.nutriments['energy-kcal_100g'] !== undefined && p.nutriments['energy-kcal_100g'] !== null) ||
            (p.nutriments['energy_100g'] !== undefined && p.nutriments['energy_100g'] !== null)
          )
        )
        // 2. Algorithme de tri local (Pertinence)
        .sort((a: any, b: any) => {
          const nameA = (a.product_name || '').toLowerCase();
          const nameB = (b.product_name || '').toLowerCase();

          // Règle 1 : Match exact
          const isExactA = nameA === qLower;
          const isExactB = nameB === qLower;
          if (isExactA && !isExactB) return -1;
          if (!isExactA && isExactB) return 1;

          // Règle 2 : Concision (Nom le plus court)
          return nameA.length - nameB.length;
        })
        // 3. Mapping final et Formatage
        .map((p: any) => {
          const brand = p.brands || '';
          const baseName = p.product_name || 'Aliment inconnu';
          const n = p.nutriments || {};
          
          // Conversion KJ en Kcal si nécessaire
          let kcal = n['energy-kcal_100g'];
          if (kcal === undefined || kcal === null) {
            const kj = n['energy_100g'] || 0;
            kcal = kj / 4.184;
          }

          return {
            id: p._id || Math.random().toString(),
            name: brand ? `${baseName} - ${brand}` : baseName,
            brand: brand || 'Marque inconnue',
            kcal100g: Math.round(kcal),
            protein100g: n.proteins_100g || 0,
            carbs100g: n.carbohydrates_100g || 0,
            fat100g: n.fat_100g || 0,
          };
        })
        // Limiter à 20 résultats pour la performance
        .slice(0, 20);
    } catch (error) {
      console.error('OFF Search Error:', error);
      return [];
    }
  },

  getProductByBarcode: async (barcode: string): Promise<OFFProduct | null> => {
    try {
      const url = `https://fr.openfoodfacts.org/api/v0/product/${barcode}.json`;
      console.log('Fetching OFF Barcode:', url);
      
      const response = await fetch(url);
      if (!response.ok) return null;

      const data = await response.json();
      if (data.status !== 1 || !data.product) return null;

      const p = data.product;
      const n = p.nutriments || {};
      const brand = p.brands || '';
      const baseName = p.product_name || 'Aliment inconnu';

      let kcal = n['energy-kcal_100g'];
      if (kcal === undefined || kcal === null) {
        const kj = n['energy_100g'] || 0;
        kcal = kj / 4.184;
      }

      return {
        id: p._id || barcode,
        name: brand ? `${baseName} - ${brand}` : baseName,
        brand: brand || 'Marque inconnue',
        kcal100g: Math.round(kcal),
        protein100g: n.proteins_100g || 0,
        carbs100g: n.carbohydrates_100g || 0,
        fat100g: n.fat_100g || 0,
      };
    } catch (error) {
      console.error('OFF Barcode Error:', error);
      return null;
    }
  }
};

