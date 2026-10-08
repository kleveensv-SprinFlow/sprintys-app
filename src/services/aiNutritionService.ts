import { supabase } from './supabase';

export interface ParsedFoodItem {
  name: string;
  query: string;
  etat: string | null;
  qty: number;
  unit: 'g' | 'piece';
  fallback_kcal_100g: number;
  fallback_pro_100g: number;
  fallback_glu_100g: number;
  fallback_lip_100g: number;
}

export const aiNutritionService = {
  async analyzeFood(input: { text?: string; base64Image?: string }): Promise<ParsedFoodItem[] | null> {
    try {
      const systemPrompt = `Tu es un expert en nutrition diététique. 
Ton rôle est d'analyser le texte de l'utilisateur ou la photo de son assiette, d'identifier TOUS les aliments présents et d'estimer avec précision les quantités et les macronutriments (protéines, glucides, lipides). 

RÈGLES CRUCIALES :
1. "qty" doit OBLIGATOIREMENT correspondre au poids réel dans l'état préparé ("etat"). Par exemple, si "etat" est "cuit", "qty" est le poids du riz CUIT réellement consommé, pas cru !
2. "query" doit être un mot-clé unique ou très court SANS l'état (ex: "riz", "oeuf", "poulet", "pomme", "saumon") afin de cibler la table CIQUAL.
3. "unit" : utilise "piece" pour les aliments ayant une unité naturelle claire (œuf, pomme, banane, yaourt, tranche de pain), et "g" pour les aliments pesés (riz, pâtes, viande, légumes en vrac).
4. "etat" : "cuit", "cru", "au plat", "brouillé", "rôti", "vapeur", ou null si non applicable.

Tu dois OBLIGATOIREMENT renvoyer un JSON qui contient UNIQUEMENT un tableau (JSON array) avec cette structure exacte pour chaque aliment (aucun markdown, aucun backtick, juste du JSON pur) : 
[
  {
    "name": "Nom de l'aliment pour affichage (ex: Riz basmati cuit, Œuf au plat)",
    "query": "Mot-clé brut court pour la base (ex: riz, oeuf, poulet)",
    "etat": "cru" ou "cuit" ou "au plat" ou "brouillé" ou "rôti" ou null,
    "qty": nombre (quantité dans l'état consommé),
    "unit": "g" ou "piece",
    "fallback_kcal_100g": nombre (estimation pour 100g dans cet état),
    "fallback_pro_100g": nombre,
    "fallback_glu_100g": nombre,
    "fallback_lip_100g": nombre
  }
]`;

      let userMessageContent: any = [];

      if (input.base64Image) {
        userMessageContent = [
          { type: 'text', text: 'Liste tous les aliments présents sur cette photo, estime leur poids et leurs valeurs nutritionnelles (pour 100g). Renvoie un tableau JSON strict.' },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${input.base64Image}`,
              detail: 'low'
            }
          }
        ];
      } else if (input.text) {
        userMessageContent = `Décortique ce repas en respectant le format JSON strict (tableau JSON uniquement) : "${input.text}"`;
      } else {
        return null;
      }

      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          systemPrompt,
          messages: [
            {
              role: 'user',
              content: userMessageContent
            }
          ],
          model: 'gpt-4o-mini'
        }
      });

      if (error) {
        console.error('Edge Function Error:', error);
        throw error;
      }

      let content = data.reply;
      
      // Nettoyage Markdown
      if (content.includes('```json')) {
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
      } else if (content.includes('```')) {
        content = content.replace(/```/g, '').trim();
      }

      return JSON.parse(content) as ParsedFoodItem[];

    } catch (error) {
      console.error('AI Analysis failed:', error);
      return null;
    }
  }
};
