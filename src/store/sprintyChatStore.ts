import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

export interface ChatMessage {
  role: string;
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
}

interface SprintyChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  // Actions
  startNewConversation: () => string;
  loadConversation: (id: string) => void;
  addMessage: (message: ChatMessage) => void;
  renameConversation: (id: string, newTitle: string) => void;
  togglePinConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  getCurrentMessages: () => ChatMessage[];
}

const defaultIntro: ChatMessage = {
  role: 'assistant',
  content: "Salut ! Je suis Sprinty, ton assistant neural actif. Que puis-je t'aider à créer aujourd'hui ?"
};

export const useSprintyChatStore = create<SprintyChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,

      startNewConversation: () => {
        const id = String(uuid.v4());
        const newConv: Conversation = {
          id,
          title: 'Nouvelle conversation',
          messages: [defaultIntro],
          isPinned: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          conversations: [newConv, ...state.conversations],
          currentConversationId: id,
        }));
        
        return id;
      },

      loadConversation: (id: string) => {
        set({ currentConversationId: id });
      },

      addMessage: (message: ChatMessage) => {
        const { currentConversationId, conversations } = get();
        if (!currentConversationId) return;

        const updatedConversations = conversations.map(conv => {
          if (conv.id === currentConversationId) {
            
            // Auto-rename on first user message
            let newTitle = conv.title;
            if (message.role === 'user' && conv.messages.length === 1 && conv.title === 'Nouvelle conversation') {
              newTitle = message.content.substring(0, 30) + (message.content.length > 30 ? '...' : '');
            }

            return {
              ...conv,
              title: newTitle,
              messages: [...conv.messages, message],
              updatedAt: Date.now(),
            };
          }
          return conv;
        });

        set({ conversations: updatedConversations });
      },

      renameConversation: (id: string, newTitle: string) => {
        set((state) => ({
          conversations: state.conversations.map(conv => 
            conv.id === id ? { ...conv, title: newTitle, updatedAt: Date.now() } : conv
          )
        }));
      },

      togglePinConversation: (id: string) => {
        set((state) => {
          const conv = state.conversations.find(c => c.id === id);
          if (!conv) return state;

          const currentlyPinnedCount = state.conversations.filter(c => c.isPinned).length;
          
          if (!conv.isPinned && currentlyPinnedCount >= 3) {
            // Unpin the oldest pinned to make room (or just ignore, but better to enforce max 3)
            return state; 
          }

          return {
            conversations: state.conversations.map(c => 
              c.id === id ? { ...c, isPinned: !c.isPinned, updatedAt: Date.now() } : c
            )
          };
        });
      },

      deleteConversation: (id: string) => {
        set((state) => {
          const newConvs = state.conversations.filter(c => c.id !== id);
          return {
            conversations: newConvs,
            currentConversationId: state.currentConversationId === id ? null : state.currentConversationId
          };
        });
      },

      getCurrentMessages: () => {
        const { currentConversationId, conversations } = get();
        if (!currentConversationId) return [];
        const conv = conversations.find(c => c.id === currentConversationId);
        return conv ? conv.messages : [];
      }
    }),
    {
      name: 'sprinty-chat-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
