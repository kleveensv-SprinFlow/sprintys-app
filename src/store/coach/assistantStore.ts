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

    setTimeout(() => {
      let aiMessage: ChatMessage;
      const lowerText = userText.toLowerCase();

      if (lowerText.includes('compèt') || lowerText.includes('competition') || lowerText.includes('cherche')) {
        aiMessage = {
          id: generateId(),
          role: 'assistant',
          type: 'competition_card',
          content: "J'ai cherché sur le web pour des compétitions. Voici ce que j'ai trouvé :",
          data: [
            {
              id: 'comp-1',
              name: 'Meeting Elite de Montreuil',
              date: '14 Mai 2026',
              location: 'Stade Jean Delbert, Montreuil',
              events: '100m, 200m, 400m',
              url: 'https://meeting-montreuil.com'
            }
          ],
          timestamp: new Date(),
        };
      } 
      else {
        aiMessage = {
          id: generateId(),
          role: 'assistant',
          type: 'text',
          content: "Message bien reçu. L'API est prête à être connectée.",
          timestamp: new Date(),
        };
      }

      set((state) => ({
        messages: [aiMessage, ...state.messages],
        isTyping: false
      }));
    }, 1500); 
  }
}));
