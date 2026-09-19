import { supabase } from './supabase';

export interface AINutritionResult {
  name: string;
  quantity_g: number;
  calories: number;
  proteines: number;
  glucides: number;
  lipides: number;
}

export const aiNutritionService = {
  async analyzeFood(input: { text?: string; base64Image?: string }): Promise<AINutritionResult | null> {
    try {
      const systemPrompt = `Tu es un expert en nutrition diététique. 
Ton rôle est d'analyser le texte de l'utilisateur ou la photo de son assiette, d'identifier la nourriture et d'estimer avec précision les grammes, les calories et les macronutriments (protéines, glucides, lipides). 
Tu dois OBLIGATOIREMENT renvoyer un JSON valide avec cette structure exacte (rien d'autre, pas de markdown) : 
{
  "name": "Nom du plat/aliment estimé court",
  "quantity_g": <nombre en grammes total estimé>,
  "calories": <nombre total de kcal>,
  "proteines": <nombre en grammes>,
  "glucides": <nombre en grammes>,
  "lipides": <nombre en grammes>
}`;

      let userMessageContent: any = [];

      if (input.base64Image) {
        userMessageContent = [
          { type: 'text', text: 'Estime les valeurs nutritionnelles et le poids de cette assiette en respectant le format JSON strict.' },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${input.base64Image}`,
              detail: 'low'
            }
          }
        ];
      } else if (input.text) {
        userMessageContent = `Estime les valeurs nutritionnelles de ce repas en respectant le format JSON strict : "${input.text}"`;
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
      
      // Sometimes AI adds ```json ... ``` markdown blocks, even if told not to. 
      // Let's clean it up before parsing.
      if (content.includes('```json')) {
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
      } else if (content.includes('```')) {
        content = content.replace(/```/g, '').trim();
      }

      return JSON.parse(content) as AINutritionResult;

    } catch (error) {
      console.error('AI Analysis failed:', error);
      return null;
    }
  }
};
