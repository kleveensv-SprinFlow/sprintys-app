const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

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
    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    
    if (!apiKey) {
      console.warn('No OpenAI API Key found. Returning mock data.');
      // Return mock data for testing if no key is present
      return new Promise((resolve) => setTimeout(() => resolve({
        name: input.text ? `Repas: ${input.text.substring(0, 10)}...` : 'Plat analysé (Test)',
        quantity_g: 350,
        calories: 650,
        proteines: 35,
        glucides: 50,
        lipides: 20
      }), 2000));
    }

    try {
      const messages: any[] = [
        {
          role: 'system',
          content: `Tu es un expert en nutrition diététique. 
Ton rôle est d'analyser le texte de l'utilisateur ou la photo de son assiette, d'identifier la nourriture et d'estimer avec précision les grammes, les calories et les macronutriments (protéines, glucides, lipides). 
Tu dois OBLIGATOIREMENT renvoyer un JSON valide avec cette structure exacte (rien d'autre, pas de markdown) : 
{
  "name": "Nom du plat/aliment estimé court",
  "quantity_g": <nombre en grammes total estimé>,
  "calories": <nombre total de kcal>,
  "proteines": <nombre en grammes>,
  "glucides": <nombre en grammes>,
  "lipides": <nombre en grammes>
}`
        }
      ];

      if (input.base64Image) {
        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: 'Estime les valeurs nutritionnelles et le poids de cette assiette.' },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${input.base64Image}`,
                detail: 'low'
              }
            }
          ]
        });
      } else if (input.text) {
        messages.push({
          role: 'user',
          content: `Estime les valeurs nutritionnelles de ce repas : "${input.text}"`
        });
      } else {
        return null;
      }

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: input.base64Image ? 'gpt-4o-mini' : 'gpt-4o-mini', // We can use 4o-mini for fast vision and text
          messages,
          response_format: { type: 'json_object' },
          max_tokens: 300,
          temperature: 0.2
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenAI Error:', errorData);
        throw new Error('Erreur API OpenAI');
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      return JSON.parse(content) as AINutritionResult;

    } catch (error) {
      console.error('AI Analysis failed:', error);
      return null;
    }
  }
};
