import { create } from 'zustand';

export type MessageRole = 'user' | 'assistant';
export type MessageType = 'text' | 'competition_card' | 'workout_card';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  data?: any; // Pour stocker les données riches (ex: liste de compétitions)
  timestamp: Date;
}

interface AssistantState {
  messages: ChatMessage[];
  isTyping: boolean;
  sendMessage: (text: string) => void;
  simulateAIResponse: (userText: string) => void;
}

// Fonction utilitaire pour générer un ID unique
const generateId = () => Math.random().toString(36).substring(2, 9);

// Message d'accueil par défaut
const initialMessages: ChatMessage[] = [
  {
    id: 'msg-welcome',
    role: 'assistant',
    type: 'text',
    content: "Bonjour Coach ! Je suis ton assistant IA. Je peux analyser ton groupe, créer des séances, ou chercher des compétitions sur le web. Que puis-je faire pour toi aujourd'hui ?",
    timestamp: new Date(),
  }
];

export const useAssistantStore = create<AssistantState>((set, get) => ({
  messages: initialMessages,
  isTyping: false,

  sendMessage: (text: string) => {
    const newMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      type: 'text',
      content: text,
      timestamp: new Date(),
    };

    set((state) => ({
      messages: [newMessage, ...state.messages] // Ordre inversé pour FlatList inverted
    }));

    // Déclencher la réponse de l'IA (Simulation pour l'instant)
    get().simulateAIResponse(text);
  },

  simulateAIResponse: (userText: string) => {
    set({ isTyping: true });

    setTimeout(() => {
      let aiMessage: ChatMessage;

      const lowerText = userText.toLowerCase();

      // Détection de l'intention "Recherche de compétition"
      if (lowerText.includes('compèt') || lowerText.includes('competition') || lowerText.includes('cherche')) {
        aiMessage = {
          id: generateId(),
          role: 'assistant',
          type: 'competition_card',
          content: "J'ai cherché sur le web pour des compétitions (100m/200m) en Île-de-France au mois de mai. Voici ce que j'ai trouvé :",
          data: [
            {
              id: 'comp-1',
              name: 'Meeting Elite de Montreuil',
              date: '14 Mai 2026',
              location: 'Stade Jean Delbert, Montreuil',
              events: '100m, 200m, 400m',
              url: 'https://meeting-montreuil.com'
            },
            {
              id: 'comp-2',
              name: 'Championnats Départementaux (75)',
              date: '22 Mai 2026',
              location: 'Stade Charléty, Paris',
              events: '100m, 200m',
              url: 'https://athle.fr/paris'
            }
          ],
          timestamp: new Date(),
        };
      } 
      // Réponse générique
      else {
        aiMessage = {
          id: generateId(),
          role: 'assistant',
          type: 'text',
          content: "C'est noté. Je peux te préparer ça. Souhaites-tu que j'analyse l'état de fatigue du groupe avant de planifier ?",
          timestamp: new Date(),
        };
      }

      set((state) => ({
        messages: [aiMessage, ...state.messages],
        isTyping: false
      }));
    }, 2000); // Délai de réflexion de 2 secondes
  }
}));
