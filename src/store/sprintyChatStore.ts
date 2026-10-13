import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

export interface ChatMessage {
  role: string;
  content: string;
  /** Message envoyé automatiquement par l'app (ex : demande d'analyse) — affiché de façon discrète. */
  auto?: boolean;
}

/** Contexte d'une conversation « verrouillée » sur un athlète (mode analyse coach). */
export interface AthleteChatContext {
  athleteId: string;
  name: string;
  avatarUrl?: string | null;
  domains: string[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
  athleteContext?: AthleteChatContext | null;
}

interface SprintyChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  /** Account the history belongs to: another account never sees it. */
  ownerId: string | null;
  ensureOwner: (userId: string) => void;
  /** Wipes the history (logout). */
  reset: () => void;
  /** Removes conversations where nothing was ever asked. */
  pruneEmpty: () => void;
  /** Reopens the latest personal conversation (or none: the next message starts one). */
  resumeLatest: () => void;
  /** Drops the last assistant answer (to regenerate it). */
  removeLastAssistantMessage: () => void;
  // Actions
  startNewConversation: (athleteContext?: AthleteChatContext | null) => string;
  loadConversation: (id: string | null) => void;
  addMessage: (message: ChatMessage) => void;
  renameConversation: (id: string, newTitle: string) => void;
  togglePinConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  getCurrentMessages: () => ChatMessage[];
  getCurrentConversation: () => Conversation | null;
}

const defaultIntro: ChatMessage = {
  role: 'assistant',
  content: "Salut ! Je suis Sprinty, ton assistant d'entraînement. Prêt à planifier une séance, analyser tes athlètes ou préparer une compétition ?"
};

const athleteIntro = (name: string): ChatMessage => ({
  role: 'assistant',
  content: `📊 J'ai chargé tout l'historique de ${name} (séances, résultats, nutrition, forme, poids). Je prépare l'analyse…`,
});

const shortName = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
};

export const useSprintyChatStore = create<SprintyChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,
      ownerId: null,

      ensureOwner: (userId: string) => {
        const { ownerId } = get();
        if (ownerId === userId) return;
        // History saved before this check existed has no owner: it belongs to whoever is signed in
        if (ownerId == null) set({ ownerId: userId });
        else set({ ownerId: userId, conversations: [], currentConversationId: null });
      },

      reset: () => set({ conversations: [], currentConversationId: null, ownerId: null }),

      pruneEmpty: () => {
        set((state) => {
          const conversations = state.conversations.filter(
            (c) => c.isPinned || c.athleteContext || c.messages.some((m) => m.role === 'user')
          );
          return {
            conversations,
            currentConversationId: conversations.some((c) => c.id === state.currentConversationId)
              ? state.currentConversationId
              : null,
          };
        });
      },

      resumeLatest: () => {
        const latest = [...get().conversations]
          .filter((c) => !c.athleteContext)
          .sort((a, b) => b.updatedAt - a.updatedAt)[0];
        set({ currentConversationId: latest ? latest.id : null });
      },

      removeLastAssistantMessage: () => {
        const { currentConversationId } = get();
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== currentConversationId) return c;
            const last = c.messages[c.messages.length - 1];
            return last?.role === 'assistant' ? { ...c, messages: c.messages.slice(0, -1) } : c;
          }),
        }));
      },

      startNewConversation: (athleteContext?: AthleteChatContext | null) => {
        const id = String(uuid.v4());
        const newConv: Conversation = {
          id,
          title: athleteContext ? `Analyse · ${shortName(athleteContext.name)}` : 'Nouvelle conversation',
          messages: [athleteContext ? athleteIntro(athleteContext.name.split(' ')[0]) : defaultIntro],
          isPinned: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          athleteContext: athleteContext || null,
        };

        set((state) => ({
          conversations: [newConv, ...state.conversations],
          currentConversationId: id,
        }));
        
        return id;
      },

      loadConversation: (id: string | null) => {
        set({ currentConversationId: id });
      },

      addMessage: (message: ChatMessage) => {
        const { currentConversationId, conversations } = get();
        if (!currentConversationId) return;

        const updatedConversations = conversations.map(conv => {
          if (conv.id === currentConversationId) {
            
            // Auto-rename on first user message
            let newTitle = conv.title;
            if (message.role === 'user' && !message.auto && conv.messages.length === 1 && conv.title === 'Nouvelle conversation') {
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
      },

      getCurrentConversation: () => {
        const { currentConversationId, conversations } = get();
        if (!currentConversationId) return null;
        return conversations.find(c => c.id === currentConversationId) || null;
      },
    }),
    {
      name: 'sprinty-chat-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
