import { create } from 'zustand';

export type MessageRole = 'user' | 'assistant';
export type MessageType = 'text' | 'competition_card' | 'workout_card';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  data?: any;
  timestamp: Date;
}

interface AssistantState {
  messages: ChatMessage[];
  isTyping: boolean;
  
  sendMessage: (text: string) => void;
  simulateAIResponse: (userText: string) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const initialMessages: ChatMessage[] = [
  {
    id: 'msg-welcome',
    role: 'assistant',
    type: 'text',
    content: "Bonjour Coach ! Je suis ton assistant IA (Mode API). Que puis-je faire pour toi aujourd'hui ?",
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
      messages: [newMessage, ...state.messages]
    }));

    get().simulateAIResponse(text);
  },

  simulateAIResponse: (userText: string) => {
    set({ isTyping: true });

    setTimeout(async () => {
      let aiMessage: ChatMessage;
      const lowerText = userText.toLowerCase();

      try {
        const { fetchOpenAIResponse } = require('../../services/aiService');
        
        const formattedMessages = get().messages
          .filter(m => m.id !== 'msg-welcome') // On peut ignorer le message de bienvenue statique si on veut, ou le garder. On le garde pour l'exemple.
          .slice(0, 5) // On prend les 5 derniers messages
          .reverse() // L'ordre dans FlatList est inversé
          .map(m => ({
            role: m.role,
            content: m.content
          }));

        // Ajout du message actuel
        formattedMessages.push({ role: 'user', content: userText });

        const systemPrompt = "Tu es Coach Copilot, un assistant IA expert en athlétisme, conçu pour aider les entraîneurs à gérer leurs athlètes, planifier des entraînements (Lactique, Vitesse, Force, etc.) et trouver des compétitions. Sois concis, professionnel et proactif.";
        
        const responseText = await fetchOpenAIResponse(formattedMessages, systemPrompt);

        aiMessage = {
          id: generateId(),
          role: 'assistant',
          type: 'text',
          content: responseText.trim(),
          timestamp: new Date(),
        };

        // Optionnel : Tu peux toujours injecter des cartes riches si l'IA retourne un JSON spécifique ou un mot-clé (à coder plus tard).
        
      } catch (error) {
        console.error(error);
        aiMessage = {
          id: generateId(),
          role: 'assistant',
          type: 'text',
          content: "Désolé, je n'ai pas pu joindre le serveur d'IA.",
          timestamp: new Date(),
        };
      }

      set((state) => ({
        messages: [aiMessage, ...state.messages],
        isTyping: false
      }));
    }, 100);  
  }
}));
