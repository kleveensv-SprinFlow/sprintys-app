import { create } from 'zustand';
import * as FileSystem from 'expo-file-system';

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
  
  // Model management
  isModelReady: boolean;
  isDownloadingModel: boolean;
  downloadProgress: number;

  sendMessage: (text: string) => void;
  simulateAIResponse: (userText: string) => void;
  checkModelExists: () => Promise<void>;
  downloadModel: () => Promise<void>;
}

// Model URI (Using a very small model like TinyLlama or Qwen 0.5B for mobile)
const MODEL_URL = 'https://huggingface.co/Qwen/Qwen1.5-0.5B-Chat-GGUF/resolve/main/qwen1_5-0_5b-chat-q4_k_m.gguf';
const MODEL_FILENAME = 'qwen1_5-0_5b-chat-q4_k_m.gguf';
const MODEL_PATH = `${FileSystem.documentDirectory}${MODEL_FILENAME}`;

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
  isModelReady: false,
  isDownloadingModel: false,
  downloadProgress: 0,

  checkModelExists: async () => {
    try {
      const info = await FileSystem.getInfoAsync(MODEL_PATH);
      set({ isModelReady: info.exists });
    } catch (e) {
      console.error('Error checking model:', e);
      set({ isModelReady: false });
    }
  },

  downloadModel: async () => {
    set({ isDownloadingModel: true, downloadProgress: 0 });
    
    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        MODEL_URL,
        MODEL_PATH,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          set({ downloadProgress: progress });
        }
      );

      const result = await downloadResumable.downloadAsync();
      
      if (result?.uri) {
        set({ isModelReady: true, isDownloadingModel: false, downloadProgress: 1 });
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      set({ isDownloadingModel: false, downloadProgress: 0 });
    }
  },

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
