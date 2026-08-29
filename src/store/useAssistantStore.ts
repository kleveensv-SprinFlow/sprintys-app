import { create } from 'zustand';
import { getSystemPrompt } from '../services/assistantService';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: number;
  isAction?: boolean;
  actionPayload?: any;
}

export interface MemoryItem {
  id: string;
  content: string;
  timestamp: number;
}

interface AssistantState {
  messages: Message[];
  memories: MemoryItem[];
  isGenerating: boolean;

  // Actions
  addMessage: (msg: Omit<Message, 'id' | 'timestamp'>) => void;
  addMemory: (content: string) => void;
  removeMemory: (id: string) => void;
  clearMessages: () => void;

  // Model Management
  loadModel: () => Promise<void>;
  generateResponse: (userText: string, userContext: string) => Promise<void>;

  // Action Handler
  confirmAction: (messageId: string) => void;
}

export const useAssistantStore = create<AssistantState>((set, get) => ({
  messages: [],
  memories: [],
  isGenerating: false,

  addMessage: (msg) => {
    const newMessage: Message = {
      ...msg,
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
    };
    set((state) => ({ messages: [...state.messages, newMessage] }));
  },

  addMemory: (content) => {
    const newMemory: MemoryItem = {
      id: Math.random().toString(36).substring(7),
      content,
      timestamp: Date.now(),
    };
    set((state) => ({ memories: [...state.memories, newMemory] }));
  },

  removeMemory: (id) => {
    set((state) => ({
      memories: state.memories.filter((m) => m.id !== id),
    }));
  },

  clearMessages: () => {
    set({ messages: [] });
  },

  loadModel: async () => {
    // API-based models are always ready. No local download needed.
  },

  generateResponse: async (userText: string, userContext: string) => {
    const { addMessage, addMemory, messages, memories } = get();

    set({ isGenerating: true });
    addMessage({ text: userText, sender: 'user' });

    try {
      const systemPrompt = getSystemPrompt(userContext);

      const formattedMessages = [
        ...messages.slice(-4).map(m => ({
          role: m.sender,
          content: m.text
        })),
        { role: 'user', content: userText }
      ];

      const { fetchOpenAIResponse } = require('../services/aiService');
      const responseText = await fetchOpenAIResponse(formattedMessages, systemPrompt);
      
      let finalResponse = responseText.trim();
      let isAction = false;
      let actionPayload = null;

      addMessage({
        text: finalResponse,
        sender: 'assistant',
        isAction,
        actionPayload
      });

    } catch (error) {
      console.error('Error generating response:', error);
      addMessage({ text: "Erreur de connexion à l'API.", sender: 'assistant' });
    } finally {
      set({ isGenerating: false });
    }
  },

  confirmAction: (messageId: string) => {
    const { messages } = get();
    const message = messages.find(m => m.id === messageId);

    if (message && message.actionPayload) {
      console.log('Action confirmed:', message.actionPayload);
      get().addMessage({ text: "Action validée et enregistrée.", sender: 'assistant' });
    }
  }
}));
