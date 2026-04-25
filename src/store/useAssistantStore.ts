import { create } from 'zustand';
import { initLlama, LlamaContext } from 'llama.rn';
import { getSystemPrompt } from '../services/assistantService'; // We will create this

// Use any to bypass the missing type declaration issue while keeping functionality
const FileSystem = require('expo-file-system') as any;

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: number;
  isAction?: boolean; // True if this message is an action request (e.g. add food)
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
  isModelLoaded: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  isGenerating: boolean;
  modelContext: LlamaContext | null;

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

const MODEL_URL = 'https://huggingface.co/Qwen/Qwen1.5-0.5B-Chat-GGUF/resolve/main/qwen1_5-0_5b-chat-q4_k_m.gguf'; // Example lightweight model
const MODEL_FILENAME = 'qwen1.5-0.5b-chat.gguf';
const MODEL_PATH = `${FileSystem.documentDirectory || ''}${MODEL_FILENAME}`;

export const useAssistantStore = create<AssistantState>((set, get) => ({
  messages: [],
  memories: [],
  isModelLoaded: false,
  isDownloading: false,
  downloadProgress: 0,
  isGenerating: false,
  modelContext: null,

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
    try {
      const state = get();
      if (state.isModelLoaded && state.modelContext) return;

      const fileInfo = await FileSystem.getInfoAsync(MODEL_PATH);

      if (!fileInfo.exists) {
        set({ isDownloading: true });

        const downloadResumable = FileSystem.createDownloadResumable(
          MODEL_URL,
          MODEL_PATH,
          {},
          (downloadProgress: any) => {
            const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            set({ downloadProgress: progress });
          }
        );

        await downloadResumable.downloadAsync();
        set({ isDownloading: false, downloadProgress: 1 });
      }

      // Initialize Llama context
      const context = await initLlama({
        model: MODEL_PATH,
        use_mlock: true,
        n_ctx: 1024, // Keep context window small for performance
      });

      set({ modelContext: context, isModelLoaded: true });
    } catch (error) {
      console.error('Error loading LLM model:', error);
      set({ isDownloading: false });
    }
  },

  generateResponse: async (userText: string, userContext: string) => {
    const { modelContext, addMessage, addMemory, messages, memories } = get();

    if (!modelContext) {
      console.error("Model not loaded");
      return;
    }

    set({ isGenerating: true });
    addMessage({ text: userText, sender: 'user' });

    try {
      const systemPrompt = getSystemPrompt(userContext);

      // Construct conversation history
      let prompt = `<|im_start|>system\n${systemPrompt}<|im_end|>\n`;

      // Add memories to prompt
      if (memories.length > 0) {
         prompt += `<|im_start|>system\nMémoire actuelle:\n${memories.map(m => `- ${m.content}`).join('\n')}<|im_end|>\n`;
      }

      // Add recent messages (limit to last 4 for context size)
      const recentMessages = messages.slice(-4);
      for (const msg of recentMessages) {
        const role = msg.sender === 'user' ? 'user' : 'assistant';
        prompt += `<|im_start|>${role}\n${msg.text}<|im_end|>\n`;
      }

      // Add current message
      prompt += `<|im_start|>user\n${userText}<|im_end|>\n<|im_start|>assistant\n`;

      let responseText = '';

      // Generate response
      await modelContext.completion(
        {
          prompt,
          n_predict: 200,
          temperature: 0.2, // Low temp for more deterministic/factual responses
          top_k: 40,
          top_p: 0.9,
          stop: ["<|im_end|>"],
        },
        (data) => {
          responseText += data.token;
        }
      );

      // Post-process response to detect Memory additions or Action requests
      let finalResponse = responseText.trim();
      let isAction = false;
      let actionPayload = null;

      // Extract memory
      const memoryMatch = finalResponse.match(/\[MÉMOIRE À AJOUTER : (.*?)\]/i);
      if (memoryMatch && memoryMatch[1]) {
        addMemory(memoryMatch[1].trim());
        finalResponse = finalResponse.replace(memoryMatch[0], '').trim();
      }

      // Detect action confirmation (e.g. food addition)
      if (finalResponse.toLowerCase().includes('confirmé ?') || finalResponse.toLowerCase().includes('ajouter en mémoire')) {
          isAction = true;
          // Very basic parsing for demo, should be more robust
          actionPayload = { type: 'add_food', raw: finalResponse };
      }

      addMessage({
        text: finalResponse || "Je n'ai pas pu formuler de réponse.",
        sender: 'assistant',
        isAction,
        actionPayload
      });

    } catch (error) {
      console.error('Error generating response:', error);
      addMessage({ text: "Erreur de génération. Vérifie que le modèle est bien chargé.", sender: 'assistant' });
    } finally {
      set({ isGenerating: false });
    }
  },

  confirmAction: (messageId: string) => {
    // In a real app, this would trigger the actual DB insertion
    const { messages } = get();
    const message = messages.find(m => m.id === messageId);

    if (message && message.actionPayload) {
      console.log('Action confirmed:', message.actionPayload);
      // TODO: Handle actual insertion into DB

      // Add a system confirmation message
      get().addMessage({ text: "Action validée et enregistrée.", sender: 'assistant' });
    }
  }
}));
