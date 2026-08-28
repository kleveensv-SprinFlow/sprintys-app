export interface OFFProduct {
  id: string;
  name: string;
  brand?: string;
  image_url?: string;
  macros_100g: {
    calories: number;
    proteines: number;
    glucides: number;
    lipides: number;
  };
  serving_size?: string;
  serving_quantity?: number;
}

const formatProduct = (product: any): OFFProduct | null => {
  if (!product) return null;
  
  const nutriments = product.nutriments || {};
  
  // Extraire les macros, avec fallback à 0 pour éviter les valeurs undefined (crash proof)
  const calories = nutriments['energy-kcal_100g'] || nutriments['energy_100g'] || 0;
  const proteines = nutriments['proteins_100g'] || 0;
  const glucides = nutriments['carbohydrates_100g'] || 0;
  const lipides = nutriments['fat_100g'] || 0;
  
  return {
    id: product.code || product.id,
    name: product.product_name_fr || product.product_name || 'Produit inconnu',
    brand: product.brands,
    image_url: product.image_front_small_url || product.image_url,
    macros_100g: {
      calories: Math.round(calories * 10) / 10,
      proteines: Math.round(proteines * 10) / 10,
      glucides: Math.round(glucides * 10) / 10,
      lipides: Math.round(lipides * 10) / 10,
    },
    serving_size: product.serving_size,
    serving_quantity: product.serving_quantity ? parseFloat(product.serving_quantity) : undefined,
  };
};

export const openFoodFactsService = {
  /**
   * Recherche textuelle d'un produit
   */
  async searchFood(query: string, page: number = 1): Promise<OFFProduct[]> {
    if (!query.trim()) return [];
    
    try {
      // API OFF v2 pour la recherche. fields permet d'alléger drastiquement la requête.
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page=${page}&page_size=20&fields=code,product_name,product_name_fr,brands,image_front_small_url,nutriments,serving_size,serving_quantity`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Erreur réseau OFF');
      
      const data = await response.json();
      
      if (!data.products) return [];
      
      return data.products
        .map(formatProduct)
        .filter((p: OFFProduct | null): p is OFFProduct => p !== null);
        
    } catch (error) {
      console.error('Erreur searchFood OFF:', error);
      return []; // Return empty array on failure instead of crashing
    }
  },

  /**
   * Recherche par code-barres (EAN)
   */
  async getFoodByBarcode(barcode: string): Promise<OFFProduct | null> {
    try {
      const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json?fields=code,product_name,product_name_fr,brands,image_front_small_url,nutriments,serving_size,serving_quantity`;
      
      const response = await fetch(url);
      if (!response.ok) return null;
      
      const data = await response.json();
      
      if (data.status === 0 || !data.product) {
        return null; // Produit non trouvé
      }
      
      return formatProduct(data.product);
      
    } catch (error) {
      console.error('Erreur getFoodByBarcode OFF:', error);
      return null;
    }
  }
};
